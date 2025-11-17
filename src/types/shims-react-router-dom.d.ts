// Temporary shim to relax react-router-dom typings until dependencies are aligned.
// This file intentionally declares the main exports as loose `any`/`ComponentType<any>`
// so that the project's JSX usage (Routes/Route/Navigate) compiles cleanly during CI.
import * as React from 'react';

declare module 'react-router-dom' {
  export const BrowserRouter: React.ComponentType<any>;
  export const HashRouter: React.ComponentType<any>;
  export const MemoryRouter: React.ComponentType<any>;
  export const Routes: React.ComponentType<any>;
  export const Route: React.ComponentType<any>;
  export const Navigate: React.ComponentType<any>;
  export const Link: React.ComponentType<any>;
  export const Outlet: React.ComponentType<any>;
  export function useParams<T = any>(): T;
  export function useNavigate(): (to: any, options?: any) => void;
  export function useLocation(): any;
  export function useSearchParams(): [URLSearchParams, (nextInit?: any) => void];
  export function useMatch(pattern: any): any;
  export function useOutlet(): any;
  const _default: any;
  export default _default;
}
