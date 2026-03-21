// Tento modul znovu použije stávající front-endový kód
// z js/checklist.js bez jakýchkoliv úprav originálního souboru.
// Pomocí Node.js VM spustíme skript v sandboxu, kde definujeme
// window.bookingState, a pak zavoláme buildChecklist().

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CHECKLIST_PATH = path.join(__dirname, '..', 'js', 'checklist.js');

let checklistScriptCode = null;

function loadChecklistScript() {
  if (!checklistScriptCode) {
    checklistScriptCode = fs.readFileSync(CHECKLIST_PATH, 'utf8');
  }
  return checklistScriptCode;
}

async function generateChecklistHtml(bookingState) {
  const code = loadChecklistScript();

  // Vytvoříme nový sandbox pro každé volání, aby se stavy nemíchaly
  const sandbox = {
    window: {
      bookingState
    },
    console
  };

  const context = vm.createContext(sandbox);
  const script = new vm.Script(code, { filename: 'checklist.js' });

  // Spustíme skript – v sandboxu vznikne funkce buildChecklist
  script.runInContext(context);

  if (typeof sandbox.buildChecklist !== 'function') {
    throw new Error('buildChecklist() not found in checklist.js');
  }

  const html = sandbox.buildChecklist();
  return html;
}

module.exports = {
  generateChecklistHtml
};
