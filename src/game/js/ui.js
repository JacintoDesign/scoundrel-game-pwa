// Rendering and UI interactions
import { MAX_HEALTH, Game, displayRank } from './game.js';
import { el, save, load, prefersReducedMotion } from './utils.js';

const SAVE_KEY = 'scoundrel.save.v1';

export class UI {
  constructor(root) {
    this.root = root;
    this.refs = this.cacheRefs();
    this.game = null;
    this.selected = new Set(); // indices in current room

    this.bindControls();
  }

  cacheRefs() {
    return {
      healthBar: document.getElementById('healthBar'),
      healthText: document.getElementById('healthText'),
      weaponValue: document.getElementById('weaponValue'),
      lastDefeated: document.getElementById('lastDefeated'),
      turnCounter: document.getElementById('turnCounter'),
      deckCount: document.getElementById('deckCount'),
  discardCount: document.getElementById('discardCount'),
      roomGrid: document.getElementById('roomGrid'),
      roomActions: document.getElementById('roomActions'),
      log: document.getElementById('log'),
      avoidBtn: document.getElementById('avoidBtn'),
      newGameBtn: document.getElementById('newGameBtn'),
      helpBtn: document.getElementById('helpBtn'),
  toggleControlsBtn: document.getElementById('toggleControlsBtn'),
  topControls: document.getElementById('topControls'),
      helpModal: document.getElementById('helpModal'),
      closeHelpBtn: document.getElementById('closeHelpBtn'),
      endModal: document.getElementById('endModal'),
      endTitle: document.getElementById('endTitle'),
      endSummary: document.getElementById('endSummary'),
      endNewBtn: document.getElementById('endNewBtn'),
    };
  }

  bindControls() {
    const r = this.refs;
    r.newGameBtn.addEventListener('click', () => this.newGame());
  // Avoid button is rendered dynamically next to Face in room; handler is attached there.

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideDialog(r.helpModal);
        this.hideDialog(r.endModal);
      }
    });

    // Help modal
    r.helpBtn.addEventListener('click', () => this.showDialog(r.helpModal));
    r.closeHelpBtn.addEventListener('click', () => this.hideDialog(r.helpModal));

    // End modal actions
    r.endNewBtn.addEventListener('click', () => { this.hideDialog(r.endModal); this.newGame(); });
    
      // Mobile controls toggle
      if (r.toggleControlsBtn && r.topControls) {
        r.toggleControlsBtn.addEventListener('click', () => {
          const expanded = r.toggleControlsBtn.getAttribute('aria-expanded') === 'true';
          const next = !expanded;
          r.toggleControlsBtn.setAttribute('aria-expanded', String(next));
          r.topControls.classList.toggle('open', next);
        });
      }
  }

  showDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.classList.add('dialog-open');
      dialog.setAttribute('open', '');
    }
  }
  hideDialog(dialog) {
    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
    } else {
      dialog.classList.remove('dialog-open');
      dialog.removeAttribute('open');
    }
  }

  newGame() {
    this.game = new Game();
    this.game.startTurn();
    this.selected.clear();
    save(SAVE_KEY, this.game.serialize());
    this.renderAll(true);
    this.logLine('New game started.', 'info');
  }


  resumeOrNew() {
    const saved = load(SAVE_KEY);
    if (saved) {
      this.game = Game.fromSaved(saved);
      this.renderAll(false);
    } else {
      this.newGame();
    }
  }

  onAvoid() {
    if (!this.game || this.game.status !== 'playing') return;
    const res = this.game.avoidRoom();
    if (!res.ok) {
      if (res.reason === 'avoid-twice') this.logLine('You cannot avoid two rooms in a row.', 'bad');
      return;
    }
    // Clear any selections when avoiding so the next room starts clean
    this.selected.clear();
    this.afterAction();
  }

  onFace() {
    if (!this.game || this.game.status !== 'playing') return;
    const need = Math.min(3, this.game.room.length);
    if (this.selected.size !== need) {
      this.logLine(`Select exactly ${need} card${need===1?'':'s'} to face.`, 'info');
      return;
    }
    const indices = Array.from(this.selected); // Set preserves insertion order (click order)
    const result = this.game.faceRoom(indices);
    this.selected.clear();
    this.afterAction();
  }

  afterAction() {
    this.game.startTurn();
    save(SAVE_KEY, this.game.serialize());
    this.renderAll(true);
    this.checkEnd();
  }

  checkEnd() {
    if (this.game.status === 'won' || this.game.status === 'lost') {
      this.renderAll(false);
      const score = this.game.computeScore();
      const container = this.refs.endSummary;
      container.innerHTML = '';
      // Set modal title based on outcome
      if (this.refs.endTitle) this.refs.endTitle.textContent = this.game.status === 'won' ? 'You Win!' : 'Game Over';
      if (this.game.status === 'won') {
        const p = el('p', { text: `You cleared the dungeon with ${this.game.health} health.` });
        container.appendChild(p);
        const s = el('h3', { class: 'score', text: `Score: ${score}` });
        container.appendChild(s);

        // Show the last enemy defeated, if any
        const g = this.game;
        const lastDefeatedCard = g.weapon && g.weapon.stack && g.weapon.stack.length > 0 ? g.weapon.stack[g.weapon.stack.length - 1] : null;
        if (lastDefeatedCard) {
          const wrap = el('div', { class: 'end-killer' });
          wrap.appendChild(el('div', { class: 'small', text: 'Last enemy defeated' }));
          wrap.appendChild(this.renderMiniCard(lastDefeatedCard));
          container.appendChild(wrap);
        }
      } else {
        const killer = this.game.killerCard;
        const p = el('p', { text: killer ? `You were defeated by ${killer.suit}${displayRank(killer)}.` : `You died.` });
        container.appendChild(p);
        const s = el('h3', { class: 'score', text: `Score: ${score}` });
        container.appendChild(s);
        if (killer) {
          const wrap = el('div', { class: 'end-killer' });
          wrap.appendChild(this.renderMiniCard(killer));
          container.appendChild(wrap);
        }
      }
      this.showDialog(this.refs.endModal);
    }
  }

  renderMiniCard(card) {
    const li = el('div', { class: 'card mini', attrs: { role: 'img', 'aria-label': `${card.suit}${displayRank(card)} ${labelFor(card)}` } });
    li.classList.add(card.type);
    if (card.suit === '♣') li.classList.add('club');
    if (card.suit === '♠') li.classList.add('spade');
    if (card.suit === '♦') li.classList.add('diamond');
    if (card.suit === '♥') li.classList.add('heart');

    const inner = el('div', { class: 'card-inner' });
    const art = el('div', { class: 'art' });
    art.style.backgroundImage = `url('${this.artFor(card)}')`;
    inner.append(el('div', { class: 'suit', text: card.suit }));
    inner.append(el('div', { class: 'value', text: displayRank(card) }));
    inner.append(el('div', { class: 'badge', text: labelFor(card) }));
    li.append(art, inner);
    return li;
  }

  renderAll(animate = false) {
    this.renderHUD();
    this.renderRoom(animate);
    this.renderLog();
    this.updateActions();
  }

  renderHUD() {
    const g = this.game;
    const r = this.refs;
    const pct = (g.health / MAX_HEALTH) * 100;
    r.healthBar.style.width = pct + '%';
    r.healthBar.setAttribute('aria-valuenow', String(g.health));
    r.healthText.textContent = `${g.health} / ${MAX_HEALTH}`;

    if (g.weapon) {
      r.weaponValue.textContent = `♦${g.weapon.value}`;
      r.lastDefeated.textContent = g.weapon.lastDefeated != null ? `last ${g.weapon.lastDefeated}` : '—';
    } else {
      r.weaponValue.textContent = '—';
      r.lastDefeated.textContent = '—';
    }

    r.turnCounter.textContent = String(g.turn);
    r.deckCount.textContent = String(g.deck.length);
    r.discardCount.textContent = String(g.discard.length);
  // Carry panel removed; no display for carry card in HUD
  }

  renderRoom(animate) {
    const grid = this.refs.roomGrid;
    grid.innerHTML = '';
    const g = this.game;

    // Render 4 slots; if less than 4, fill with placeholders
    const cards = [...g.room];
    while (cards.length < 4) cards.push(null);

    cards.forEach((card, idx) => {
      const item = this.renderCard(card, idx, animate);
      grid.appendChild(item);
    });

    // Face button inline; at end-of-deck we might have < 4 cards
    const actions = this.refs.roomActions;
    actions.innerHTML = '';
    const realCount = g.room.length;
    if (g.status === 'playing' && realCount > 0) {
      const needNow = Math.max(0, Math.min(3, realCount) - this.selected.size);
      const btnText = needNow === 0 ? 'Face Selected' : `Face Selected (${needNow} more)`;
  const btn = el('button', { class: 'btn primary', text: btnText, attrs: { type: 'button' } });
      btn.addEventListener('click', () => this.onFace());
      actions.appendChild(btn);

  const canAvoid = !g.avoidedLastTurn && g.room.length === 4;
  const avoid = el('button', { class: 'btn danger', text: 'Avoid Room', attrs: { type: 'button' } });
      avoid.disabled = !canAvoid;
      avoid.title = canAvoid ? '' : 'You cannot avoid now';
      avoid.addEventListener('click', () => this.onAvoid());
      actions.appendChild(avoid);
      const need = Math.min(3, realCount);
      const hint = el('p', { class: 'hint' });
      hint.textContent = `Choose ${need} card${need===1?'':'s'} to resolve. ${realCount===4? '1 will carry forward.' : 'No carry at deck end.'}`;
      actions.appendChild(hint);
    }
  }

  renderCard(card, idx, animate) {
    const isPlaceholder = !card;
  const li = el('div', { class: 'card', attrs: { role: 'listitem', tabindex: isPlaceholder ? '-1' : '0' } });

    if (isPlaceholder) {
      li.classList.add('disabled', 'placeholder');
      const art = el('div', { class: 'art' });
      art.style.backgroundImage = `url('/assets/deck.jpg')`;
      const inner = el('div', { class: 'card-inner' });
      inner.append(el('div', { class: 'suit', text: '' }));
      inner.append(el('div', { class: 'value', text: '' }));
      inner.append(el('div', { class: 'badge', text: '' }));
      li.append(art, inner);
      return li;
    }

    li.classList.add(card.type);
    if (card.suit === '♣') li.classList.add('club');
    if (card.suit === '♠') li.classList.add('spade');
    if (card.suit === '♦') li.classList.add('diamond');
    if (card.suit === '♥') li.classList.add('heart');

    // Build 3D flip structure: back face and front face
    const flip = el('div', { class: 'flip' });
    const back = el('div', { class: 'face back' });
    const backArt = el('div', { class: 'art' });
    backArt.style.backgroundImage = `url('/assets/deck.jpg')`;
    back.append(backArt);

    const front = el('div', { class: 'face front' });
    const art = el('div', { class: 'art' });
    art.style.backgroundImage = `url('${this.artFor(card)}')`;
    const inner = el('div', { class: 'card-inner' });
    inner.append(el('div', { class: 'suit', text: card.suit }));
    inner.append(el('div', { class: 'value', text: displayRank(card) }));
    inner.append(el('div', { class: 'badge', text: labelFor(card) }));
    front.append(art, inner);

    flip.append(back, front);
    li.append(flip);

  const selectable = this.game.status === 'playing' && this.game.room.length > 0;
    if (selectable) {
      li.addEventListener('click', () => this.toggleSelect(idx));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleSelect(idx); }
      });
      li.setAttribute('aria-pressed', this.selected.has(idx) ? 'true' : 'false');
    }

    if (this.selected.has(idx)) li.classList.add('selected');
    if (animate && !prefersReducedMotion()) requestAnimationFrame(() => {
      li.classList.add('flip-enter');
      requestAnimationFrame(() => li.classList.add('flip-enter-active'));
      setTimeout(() => { li.classList.remove('flip-enter'); li.classList.remove('flip-enter-active'); }, 760);
    });

    return li;
  }

  artFor(card) {
    // Map images per user: heart.jpg for hearts; clubs/spades tiered by value; diamonds tiered by ranges.
    const v = card.value;
    switch (card.suit) {
      case '♥':
        return '/assets/heart.jpg';
      case '♣': {
        const tier = v <= 5 ? 1 : v <= 10 ? 2 : 3; // 2-5 => 1, 6-10 => 2, J-A => 3
        return `/assets/club-${tier}.jpg`;
      }
      case '♠': {
        const tier = v <= 5 ? 1 : v <= 10 ? 2 : 3;
        return `/assets/spade-${tier}.jpg`;
      }
      case '♦': {
        // diamond tiers: 2-4 => 1, 5-7 => 2, 8-10 => 3
        const tier = v <= 4 ? 1 : v <= 7 ? 2 : 3;
        return `/assets/diamond-${tier}.jpg`;
      }
      default:
      return '/assets/deck.jpg';
    }
  }

  toggleSelect(idx) {
    if (this.selected.has(idx)) this.selected.delete(idx);
    else this.selected.add(idx);

    // Keep to max 3 selected
    if (this.selected.size > 3) {
      // remove the earliest selected
      const first = this.selected.values().next().value;
      this.selected.delete(first);
    }
    this.renderRoom(false);
    this.updateActions();
  }

  updateActions() {
    const realCount = this.game.room.length;
    const btn = this.refs.roomActions.querySelector('button');
    if (!btn) return;
    const needed = Math.max(0, Math.min(3, realCount) - this.selected.size);
    btn.textContent = needed === 0 ? 'Face Selected' : `Face Selected (${needed} more)`;
    btn.disabled = needed !== 0;
  }

  renderLog() {
    const log = this.refs.log;
    log.innerHTML = '';
    const frag = document.createDocumentFragment();
    this.game.log.slice(-200).forEach(entry => {
      const p = el('p', { text: entry.msg });
      p.classList.add(entry.kind || 'info');
      frag.appendChild(p);
    });
    log.appendChild(frag);
    log.scrollTop = log.scrollHeight;
  }

  logLine(msg, kind = 'info') {
    const p = el('p', { text: msg });
    p.classList.add(kind);
    this.refs.log.appendChild(p);
    this.refs.log.scrollTop = this.refs.log.scrollHeight;
  }
}

function labelFor(card) {
  if (card.type === 'weapon') return 'Weapon';
  if (card.type === 'potion') return 'Potion';
  return card.suit === '♣' || card.suit === '♠' ? 'Monster' : '';
}
