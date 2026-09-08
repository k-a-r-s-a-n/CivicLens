/**
 * Global window & DOM polyfill for Node.js / Server-Side Rendering (SSR).
 * Ensures that any server-side evaluation of browser-only libraries (e.g. Leaflet)
 * or window references never throws "ReferenceError: window is not defined".
 */
if (typeof globalThis.window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyEl: any = {
    style: {},
    setAttribute: noop,
    removeAttribute: noop,
    appendChild: noop,
    removeChild: noop,
    addEventListener: noop,
    removeEventListener: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }),
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dummyDoc: any = {
    createElement: () => dummyEl,
    createElementNS: () => dummyEl,
    createTextNode: () => dummyEl,
    documentElement: { style: {}, clientWidth: 1024, clientHeight: 768 },
    body: dummyEl,
    head: dummyEl,
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    cookie: "",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polyfillWindow: any = globalThis;

  polyfillWindow.window = polyfillWindow;
  polyfillWindow.document = polyfillWindow.document || dummyDoc;
  polyfillWindow.navigator = polyfillWindow.navigator || {
    userAgent: "node",
    platform: "node",
  };
  polyfillWindow.location = polyfillWindow.location || {
    href: "",
    origin: "",
    protocol: "https:",
    host: "",
    hostname: "",
    port: "",
    pathname: "/",
    search: "",
    hash: "",
  };
  polyfillWindow.matchMedia =
    polyfillWindow.matchMedia ||
    (() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }));
  polyfillWindow.innerWidth = polyfillWindow.innerWidth || 1024;
  polyfillWindow.innerHeight = polyfillWindow.innerHeight || 768;
  polyfillWindow.addEventListener = polyfillWindow.addEventListener || noop;
  polyfillWindow.removeEventListener = polyfillWindow.removeEventListener || noop;
  polyfillWindow.requestAnimationFrame =
    polyfillWindow.requestAnimationFrame || ((cb: () => void) => setTimeout(cb, 16));
  polyfillWindow.cancelAnimationFrame =
    polyfillWindow.cancelAnimationFrame || ((id: number) => clearTimeout(id));
}
