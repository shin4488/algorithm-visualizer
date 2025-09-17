declare module '*.css';

// Minimal React ambient types to satisfy TS without using `any`.
declare module 'react' {
  export type ReactNode = unknown;
  export type PropsWithChildren = { children?: ReactNode };
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export interface FunctionComponent<P = object> {
    (props: P & PropsWithChildren): ReactNode;
  }
  const React: {
    createElement: (...args: unknown[]) => unknown;
  };
  export default React;
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: unknown): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module 'react/jsx-runtime' {
  export const jsx: (...args: unknown[]) => unknown;
  export const jsxs: (...args: unknown[]) => unknown;
  export const Fragment: unique symbol;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
