import '@testing-library/jest-dom/vitest';

// ===== ResizeObserver polyfill (Mantine の ScrollArea 等で必要) =====
// 型安全に globalThis を拡張して代入（eslint の unsafe 系回避）
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
  G.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// ===== matchMedia polyfill (Mantine が参照する場合がある) =====
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // 互換API
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// ===== i18n: テストは日本語UIで固定 =====
import i18n from '@/plugins/i18n';

// 非同期を「無視」して初期化（eslint no-floating-promises 対策に void）
void i18n.changeLanguage('ja');
if (typeof document !== 'undefined') {
  document.documentElement.lang = 'ja';
}
