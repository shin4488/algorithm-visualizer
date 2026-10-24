import '@testing-library/jest-dom/vitest';

// ===== ResizeObserver polyfill (Mantine の ScrollArea 等で必要) =====
type GlobalWithRO = typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver;
};

const G = globalThis as GlobalWithRO;

if (typeof G.ResizeObserver === 'undefined') {
  // 最小実装でOK（観測しないダミー）
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  G.ResizeObserver = ResizeObserverPolyfill;
}

// ===== matchMedia polyfill (Mantine が参照する場合がある) =====
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // 互換API
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// ===== i18n: テストは日本語UIで固定 =====
import i18n from '@/plugins/i18n';

// i18n は resources を直接渡して初期化しているため、言語の切り替えは同期的に終わる。返る Promise は待たない
void i18n.changeLanguage('ja');
if (typeof document !== 'undefined') {
  document.documentElement.lang = 'ja';
}
