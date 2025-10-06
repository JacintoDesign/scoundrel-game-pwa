import { UI } from './ui.js';

// Entry point
window.addEventListener('DOMContentLoaded', () => {
  const ui = new UI(document.body);
  ui.resumeOrNew();
});
