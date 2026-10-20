import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { pageTitle } from '../lib/titles';
import ThemeToggle from './ThemeToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-1.5 py-1 text-sm sm:px-2 focus-visible:outline-2 focus-visible:outline-accent ${
    isActive ? 'font-semibold text-fg' : 'text-muted hover:text-fg'
  }`;

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Model pages set their own, more specific title.
    if (!pathname.startsWith('/lab/')) document.title = pageTitle(pathname);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <NavLink to="/" className="font-bold tracking-tight">
            sooalim<span className="text-accent">.com</span>
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            {/* The logo links home, so the Home link only shows where there's room. */}
            <NavLink to="/" end className={(a) => `${navClass(a)} hidden sm:inline`}>
              Home
            </NavLink>
            <NavLink to="/lab" className={navClass}>
              Lab
            </NavLink>
            <NavLink to="/builder" className={navClass}>
              Builder
            </NavLink>
            <NavLink to="/playground" className={navClass}>
              Playground
            </NavLink>
            <NavLink to="/about" className={(a) => `${navClass(a)} hidden sm:inline`}>
              About
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
          © {new Date().getFullYear()} Sooa Lim ·{' '}
          <NavLink to="/about" className="hover:text-fg hover:underline">
            About
          </NavLink>
        </div>
      </footer>
    </div>
  );
}
