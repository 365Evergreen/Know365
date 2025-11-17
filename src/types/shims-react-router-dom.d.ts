declare module 'react-router-dom' {
  import * as React from 'react';
  export const Routes: React.ComponentType<any>;
  export const Route: React.ComponentType<any>;
  export const Navigate: React.ComponentType<any>;
  export const BrowserRouter: React.ComponentType<any>;
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
