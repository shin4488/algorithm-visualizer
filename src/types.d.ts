declare module 'react' {
  export const useState: any;
  export const useEffect: any;
  export const useRef: any;
  const React: any;
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(element: Element | DocumentFragment): {
    render(children: any): void;
  };
}
