// tsxファイル内で.cssファイルをimportできるようにする
declare module '*.css';

declare global {
  interface Window {
    // 今回使うのは 'event' だけなので最小のシグネチャで定義
    gtag?: (command: 'event', eventName: string, params?: Record<string, unknown>) => void;
  }
}
