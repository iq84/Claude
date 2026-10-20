const TITLES: Record<string, string> = {
  '/': 'Agent Workforce Designer',
  '/lab': 'Personality Index',
  '/builder': 'Agent Builder',
  '/playground': 'Playground',
  '/about': 'About',
};

/** Browser-tab title for a route path (or a page name, for pages that know better). */
export function pageTitle(pathOrName: string): string {
  const path = pathOrName.replace(/\/$/, '') || '/';
  const name = path.startsWith('/') ? (TITLES[path] ?? 'Page not found') : pathOrName;
  return `${name} | sooalim.com`;
}
