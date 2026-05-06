let currentLang = 'cs';
let translations = {};

async function loadTranslations(lang) {
  const res = await fetch(`/js/translations/${lang}.json`);
  translations = await res.json();
  currentLang = lang;
  applyTranslations();
}

function t(key) {
  return translations[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}

// globálně dostupné
window.setLang = loadTranslations;
window.t = t;
