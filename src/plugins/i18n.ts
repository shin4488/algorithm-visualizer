import i18n, { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../en/locale.json';
import ja from '../ja/locale.json';

function detectInitialLng(): 'en' | 'ja' {
  // URL の指定言語を優先 (/ja/... or /en/...)
  const language = (
    typeof location !== 'undefined' ? location.pathname.split('/')[1] : ''
  ).toLowerCase();
  if (language === 'ja' || language === 'en') return language;

  // URL に言語がなければブラウザの言語に合わせ、日本語以外は英語にする
  const nav = (navigator.language || '').toLowerCase();
  return nav.startsWith('ja') ? 'ja' : 'en';
}

const initialLng = detectInitialLng();

const resources: Resource = {
  en: { translation: en },
  ja: { translation: ja },
};

// resources を直接渡すと init は同期的に終わるため、返る Promise は待たない
void i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'ja',
  supportedLngs: ['en', 'ja'],
  interpolation: { escapeValue: false },
});

document.documentElement.lang = initialLng;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
