import { NavLink, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
    isActive ? 'font-semibold text-fg' : 'text-muted hover:text-fg'
  }`;

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="font-bold tracking-tight">
            sooalim<span className="text-accent">.com</span>
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-2">
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">
          © {new Date().getFullYear()} Sooa Lim
        </div>
      </footer>
    </div>
  );
}
