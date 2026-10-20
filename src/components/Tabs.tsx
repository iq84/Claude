import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA pattern): arrow keys / Home / End move between tabs, panels are
 * labelled by their tab. Controlled, so callers can keep the active tab in the URL.
 */
export default function Tabs<T extends string>(props: {
  label: string;
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  children: ReactNode;
  size?: 'md' | 'sm';
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    props.tabs.findIndex((t) => t.id === props.active),
  );

  const onKeyDown = (e: KeyboardEvent) => {
    const last = props.tabs.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    props.onChange(props.tabs[next]!.id);
    refs.current[next]?.focus();
  };

  const sm = props.size === 'sm';
  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={props.label}
        onKeyDown={onKeyDown}
        className={`flex gap-1 overflow-x-auto ${sm ? '' : 'border-b border-border'}`}
      >
        {props.tabs.map((t, i) => {
          const selected = i === index;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => props.onChange(t.id)}
              className={
                sm
                  ? `shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                      selected
                        ? 'border-accent bg-accent text-accent-fg'
                        : 'border-border text-muted hover:text-fg'
                    }`
                  : `-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                      selected
                        ? 'border-accent text-fg'
                        : 'border-transparent text-muted hover:text-fg'
                    }`
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${props.tabs[index]!.id}`}
        tabIndex={0}
        className="focus-visible:outline-2 focus-visible:outline-accent"
      >
        {props.children}
      </div>
    </div>
  );
}
