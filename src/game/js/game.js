// Core game model and rules for Scoundrel
// Card representation: { suit: '♣|♠|♦|♥', rank: 2-10 or 'J','Q','K','A', value: number, type: 'monster'|'weapon'|'potion', id: string }
// Weapon state: { card: Card, value: number, stack: Card[], lastDefeated: number|null }
// Room state: up to 4 visible cards, resolve 3, carry 1

import { makeRNG, shuffle, clamp, sum } from './utils.js';

export const MAX_HEALTH = 20;
const STORAGE_KEY = 'scoundrel.save.v1';

export function rankToValue(rank) {
  if (typeof rank === 'number') return rank;
  return { J: 11, Q: 12, K: 13, A: 14 }[rank] || 0;
}

export function makeDeck() {
  // Build 52-card deck, then remove red faces and red Aces, and Jokers aren't present.
  const suits = ['♣', '♠', '♦', '♥'];
  const ranks = [2,3,4,5,6,7,8,9,10,'J','Q','K','A'];
  const all = [];
  let idCounter = 0;
  for (const s of suits) {
    for (const r of ranks) {
      const v = rankToValue(r);
      const type = (s === '♦') ? 'weapon' : (s === '♥') ? 'potion' : 'monster';
      all.push({ suit: s, rank: r, value: v, type, id: `${s}${r}-${idCounter++}` });
    }
  }
  // Remove red face cards and red Aces
  const filtered = all.filter(c => {
    if (c.suit === '♦' || c.suit === '♥') {
      if (['J','Q','K','A'].includes(c.rank)) return false;
    }
    return true;
  });
  // Validate counts: should be 44 cards
  return filtered;
}

function canUseWeaponOn(weapon, monsterValue) {
  if (!weapon) return false;
  if (weapon.lastDefeated == null) return true; // no restriction until first defeat
  return monsterValue <= weapon.lastDefeated;
}

export class Game {
  constructor() {
    this.rng = makeRNG(Date.now());
    this.resetState();
  }

  resetState() {
    this.turn = 1;
    this.health = MAX_HEALTH;
    this.weapon = null; // { value, stack: number[], lastDefeated }
    this.potionUsedThisRoom = false;
    this.avoidedLastTurn = false;
    this.carryCard = null; // card to carry as first in next room
    this.killerCard = null; // monster card that caused death

    const base = makeDeck();
    this.deck = shuffle([...base], this.rng);
    this.discard = [];
    this.room = [];
    this.log = [];
    this.status = 'playing'; // 'playing' | 'won' | 'lost'
  }

  static fromSaved(data) {
    const g = new Game();
    Object.assign(g, data);
    // reattach RNG
    g.rng = makeRNG(Date.now());
    // Ensure weapon shape consistency across versions
    if (g.weapon && !g.weapon.card) {
      // Older save stored { value, stack: number[] }; rebuild minimal shape without card
      g.weapon = { card: { suit: '♦', rank: g.weapon.value, value: g.weapon.value, type: 'weapon', id: `restored-♦${g.weapon.value}` }, value: g.weapon.value, stack: [], lastDefeated: g.weapon.lastDefeated ?? null };
    }
    // Ensure killerCard exists for older saves
    if (typeof g.killerCard === 'undefined') g.killerCard = null;
    return g;
  }

  serialize() {
    return {
      turn: this.turn,
      health: this.health,
      weapon: this.weapon,
      potionUsedThisRoom: this.potionUsedThisRoom,
      avoidedLastTurn: this.avoidedLastTurn,
      carryCard: this.carryCard,
      killerCard: this.killerCard,
      deck: this.deck,
      discard: this.discard,
      room: this.room,
      log: this.log,
      status: this.status,
    };
  }

  drawToRoom() {
    // Draw until room has 4 cards, preserving carryCard as first if present
    if (this.room.length === 0 && this.carryCard) {
      this.room.push(this.carryCard);
      this.carryCard = null;
    }
    while (this.room.length < 4 && this.deck.length > 0) {
      this.room.push(this.deck.shift());
    }
  }

  startTurn() {
    if (this.status !== 'playing') return;
    this.potionUsedThisRoom = false;
    // Add a clear log separator for the new turn
    this.logMsg(`Turn ${this.turn}`, 'turn');
    this.drawToRoom();
  }

  logMsg(msg, kind = 'info') {
    const line = { t: Date.now(), msg, kind };
    this.log.push(line);
    return line;
  }

  avoidRoom() {
    if (this.status !== 'playing') return { ok: false, reason: 'not-playing' };
    if (this.avoidedLastTurn) return { ok: false, reason: 'avoid-twice' };
    if (this.room.length < 4) this.drawToRoom();
    const toBottom = [...this.room];
    this.room = [];
    // Place to bottom preserving order
    this.deck.push(...toBottom);
    this.avoidedLastTurn = true;
    this.turn += 1;
    this.logMsg('Avoided the room. The four cards go to the bottom.', 'info');
    this.checkEnd();
    return { ok: true };
  }

  canResolveCard(index) {
    if (this.status !== 'playing') return false;
    if (index < 0 || index >= this.room.length) return false;
    return true;
  }

  resolveCard(index) {
    if (!this.canResolveCard(index)) return { ok: false };
    const card = this.room.splice(index, 1)[0];
    let summary = '';
    if (card.type === 'weapon') {
      // Equip new weapon, discard old and its stack
      if (this.weapon) {
        // Discard the old weapon card and all monsters stacked on it
        this.discard.push(this.weapon.card, ...this.weapon.stack);
      }
      this.weapon = { card, value: card.value, stack: [], lastDefeated: null };
      summary = `Equipped ♦${card.value}`;
      this.logMsg(summary, 'good');
    } else if (card.type === 'potion') {
      if (this.potionUsedThisRoom) {
        summary = `Discarded extra potion ♥${card.value}`;
        this.discard.push(card);
        this.logMsg(summary, 'info');
      } else {
        const before = this.health;
        this.health = clamp(this.health + card.value, 0, MAX_HEALTH);
        const healed = this.health - before;
        summary = `Drank ♥${card.value} and healed ${healed}`;
        this.potionUsedThisRoom = true;
        this.discard.push(card);
        this.logMsg(summary, 'good');
      }
    } else if (card.type === 'monster') {
      const monsterValue = card.value;
      if (!this.weapon) {
        this.health -= monsterValue;
        summary = `Bare-handed vs ${card.suit}${displayRank(card)} → took ${monsterValue} damage`;
        this.discard.push(card);
        this.logMsg(summary, 'bad');
      } else {
        // Enforce non-increasing rule
        if (!canUseWeaponOn(this.weapon, monsterValue)) {
          // Cannot use weapon; must take full damage
          this.health -= monsterValue;
          summary = `Weapon blocked (last ${this.weapon.lastDefeated}). Took ${monsterValue} from ${card.suit}${displayRank(card)}`;
          this.discard.push(card);
          this.logMsg(summary, 'bad');
        } else {
          const damage = Math.max(0, monsterValue - this.weapon.value);
          if (damage > 0) {
            this.health -= damage;
            summary = `Hit ${card.suit}${displayRank(card)} with ♦${this.weapon.value} → took ${damage}`;
            this.discard.push(card);
            this.logMsg(summary, 'bad');
          } else {
            // Defeated
            this.weapon.stack.push(card);
            this.weapon.lastDefeated = monsterValue;
            summary = `Defeated ${card.suit}${displayRank(card)} with ♦${this.weapon.value}`;
            this.logMsg(summary, 'good');
          }
        }
      }
    }

    // After each resolution while facing room, check death
    if (this.health <= 0) {
      // Record the killer monster card if available
      if (card && card.type === 'monster' && !this.killerCard) {
        this.killerCard = card;
      }
      this.status = 'lost';
      this.logMsg('You died…', 'bad');
    }

    return { ok: true, card, summary };
  }

  faceRoom(selectedIndices) {
    // selectedIndices: indices in the current room to resolve. Normally 3 of 4; if fewer than 4 are present (end of deck), you must select all but at most 1.
    if (this.status !== 'playing') return { ok: false, reason: 'not-playing' };
    if (this.room.length === 0) return { ok: false, reason: 'no-cards' };
    this.drawToRoom();
    const need = Math.min(3, this.room.length);
    if (selectedIndices.length !== need) return { ok: false, reason: 'need-n' };

    // Normalize: resolve based on indices on a copy snapshot.
  const original = [...this.room];
    const chosen = selectedIndices.map(i => original[i]);
  const carry = original.length === 4 ? original.find((_, idx) => !selectedIndices.includes(idx)) : null;

    // Reset state for the room
    this.potionUsedThisRoom = false;

    // Resolve the chosen cards in order
    for (const chosenCard of chosen) {
      if (this.status !== 'playing') break;
      const index = this.room.findIndex(c => c.id === chosenCard.id);
      if (index !== -1) this.resolveCard(index);
    }

    // Carry the leftover card to next room
    if (this.status === 'playing') {
      this.carryCard = carry || null;
      // Any remaining card in room should be removed; the carry will be re-inserted next turn
      this.room = [];
      this.turn += 1;
      this.avoidedLastTurn = false;
      if (carry) this.logMsg(`Carrying ${carry.suit}${displayRank(carry)} forward`, 'info');
    }

    this.checkEnd();
    return { ok: true };
  }

  checkEnd() {
    if (this.status !== 'playing') return;
    if (this.health <= 0) {
      this.status = 'lost';
      return;
    }

    if (this.deck.length === 0 && this.room.length === 0 && !this.carryCard) {
      // Cleared dungeon
      this.status = 'won';
      return;
    }
  }

  computeScore() {
    if (this.status === 'won') return this.health;
    if (this.status === 'lost') {
      const remainingMonsters = [...this.deck, ...this.room, ...(this.carryCard ? [this.carryCard] : [])]
        .filter(c => c.type === 'monster')
        .map(c => c.value);
      return -sum(remainingMonsters);
    }
    return 0;
  }
}

export function displayRank(card) {
  return typeof card.rank === 'number' ? String(card.rank) : card.rank;
}
