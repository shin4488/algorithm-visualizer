import i18n, { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en/locale.json';
import ja from './ja/locale.json';

function detectInitialLng(): 'en' | 'ja' {
  // URL の指定言語を優先 (/ja/... or /en/...)
  const language = (
    typeof location !== 'undefined' ? location.pathname.split('/')[1] : ''
  ).toLowerCase();
  if (language === 'ja' || language === 'en') return language;

  // ブラウザ言語をみて言語設定する
  const nav = (navigator.language || '').toLowerCase();
  // default: english
  return nav.startsWith('ja') ? 'ja' : 'en';
}

const initialLng = detectInitialLng();

const resources: Resource = {
  en: { translation: en as Record<string, string> },
  ja: { translation: ja as Record<string, string> },
};

/**
 * resources を同期ロードしているため UI ブロックは起きませんが、
 * i18n.init は Promise を返すので no-floating-promises 対策で void を付与
 */
void i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'ja',
  supportedLngs: ['en', 'ja'],
  interpolation: { escapeValue: false },
});

// <html lang> 同期
document.documentElement.lang = initialLng;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
