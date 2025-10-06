import { useEffect } from 'react';
import '../game/css/styles.css';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – provided by JS module
import { UI } from '../game/js/ui.js';

function Game() {
  useEffect(() => {
    // Guard against React StrictMode double-invoking effects in dev,
    // which can otherwise bind the toggle click handler twice.
    // Reuse a single UI instance across renders.
    const anyWindow = window as unknown as { __scoundrel_ui?: any };
    if (!anyWindow.__scoundrel_ui) {
      anyWindow.__scoundrel_ui = new UI(document.body);
    }
    anyWindow.__scoundrel_ui.resumeOrNew();
  }, []);

  return (
    <>
      <header className="app-header" role="banner">
        <h1 className="app-title" aria-label="Scoundrel">Scoundrel</h1>
        <button id="toggleControlsBtn" className="btn icon toggle-controls" type="button" aria-label="Show menu" aria-controls="topControls" aria-expanded="false" title="Menu">▾</button>
        <div className="controls" id="topControls">
          <button id="newGameBtn" className="btn primary" type="button" aria-label="Start a new game">New Game</button>
          <button id="helpBtn" className="btn" type="button" aria-haspopup="dialog" aria-controls="helpModal">How to Play</button>
        </div>
      </header>

      <main id="main" className="layout" role="main">
        <section className="hud" aria-label="Heads up display">
          <div className="meter" aria-live="polite">
            <label htmlFor="healthBar">Health</label>
            <div className="health-wrapper">
              <div id="healthBar" className="health" role="progressbar" aria-valuemin={0} aria-valuemax={20} aria-valuenow={20} aria-label="Health"></div>
              <div id="healthText" className="health-text">20 / 20</div>
            </div>
          </div>
          <div className="panel" id="weaponPanel" aria-label="Equipped weapon">
            <div className="panel-title">Weapon</div>
            <div className="panel-body">
              <span id="weaponValue">—</span>
              <span className="divider">•</span>
              <span id="lastDefeated">—</span>
            </div>
          </div>
          <div className="panel" aria-label="Turn info">
            <div className="panel-title">Turn</div>
            <div className="panel-body"><span id="turnCounter">1</span></div>
          </div>
          <div className="panel" aria-label="Deck count">
            <div className="panel-title">Deck</div>
            <div className="panel-body"><span id="deckCount">0</span></div>
          </div>
          <div className="panel" aria-label="Discard count">
            <div className="panel-title">Discard</div>
            <div className="panel-body"><span id="discardCount">0</span></div>
          </div>
          <div className="actions"></div>
        </section>

        <section className="room" aria-label="Current room">
          <div id="roomGrid" className="room-grid" role="list" aria-live="polite" aria-relevant="additions removals"></div>
          <div className="room-actions" id="roomActions" aria-live="polite">
            <p className="hint">Choose 3 of the 4 cards to resolve. 1 will carry to the next room.</p>
          </div>
        </section>

        <section className="log" aria-label="Action log">
          <h2 className="visually-hidden">Action Log</h2>
          <div id="log" className="log-feed" aria-live="polite" aria-atomic="false"></div>
        </section>
      </main>

      <dialog id="helpModal" aria-labelledby="helpTitle" aria-modal="true">
        <h2 id="helpTitle">How to Play</h2>
        <div className="modal-body">
          <p>Survive the dungeon by managing health, weapons, and potions. Clear all cards to win; reach 0 health and you lose.</p>
          <h3>Turn</h3>
          <ul>
            <li>Reveal up to 4 cards — this is the Room.</li>
            <li>Either <strong>Avoid Room</strong> (put the 4 cards on the bottom; can’t avoid twice) or <strong>Face</strong> the room: pick 3 cards to resolve in any order. The unpicked 4th card carries forward.</li>
          </ul>
          <h3>Cards</h3>
          <ul>
            <li><strong>Weapons (♦)</strong>: Equip immediately. Your old weapon and its defeated stack are discarded.</li>
            <li><strong>Potions (♥)</strong>: Heal by the value (max health 20). Only one potion per room heals; extras are discarded.</li>
            <li><strong>Monsters (♣/♠)</strong>: Without a weapon, take damage equal to the value. With a weapon, damage = monster − weapon (min 0). If damage ≤ 0, the monster is defeated and stacked on your weapon.</li>
          </ul>
          <h3>Weapon Rule</h3>
          <p>You can only use your weapon on a non‑increasing sequence of monster values. After you defeat a monster of value X, the next monster you use the weapon on must be ≤ X.</p>
          <h3>Scoring</h3>
          <ul>
            <li>Win: score equals remaining health.</li>
            <li>Lose: score is negative sum of remaining monster values.</li>
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn primary" id="closeHelpBtn" type="button">Close</button>
        </div>
      </dialog>

      <dialog id="endModal" aria-labelledby="endTitle" aria-modal="true">
        <h2 id="endTitle">Game Over</h2>
        <div className="modal-body" id="endSummary"></div>
        <div className="modal-actions">
          <button className="btn primary" id="endNewBtn" type="button">New Game</button>
        </div>
      </dialog>
    </>
  );
}

export default Game;


