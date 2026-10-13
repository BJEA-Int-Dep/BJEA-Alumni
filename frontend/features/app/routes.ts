export type View = 'home' | 'detail' | 'create' | 'complete';

export interface AppRoute {
  view: View;
  profileId?: string;
}

export interface ExitDestination {
  path: string;
  route: AppRoute;
}

export function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export function readRoute(): AppRoute {
  const path = currentPath();
  if (path === '/create') return { view: 'create' };
  if (path === '/profile/my-profile') return { view: 'complete' };
  if (path.startsWith('/alumni/')) return {
    view: 'detail',
    profileId: decodeURIComponent(path.slice('/alumni/'.length)),
  };
  return { view: 'home' };
}
