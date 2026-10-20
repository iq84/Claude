import { useId, useState, type ReactNode } from 'react';
import { linesToList } from '../../lib/builder';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-fg placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-accent';

export function Field({
  label,
  hint,
  children,
  id,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

export function TextInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <Field label={props.label + (props.required ? ' *' : '')} hint={props.hint} id={id}>
      <input
        id={id}
        className={inputClass}
        value={props.value}
        placeholder={props.placeholder}
        required={props.required}
        aria-describedby={props.hint ? `${id}-hint` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

/** A textarea edited as one item per line. Keeps its own text so blank lines survive typing. */
export function ListInput(props: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  hint?: string;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  const [text, setText] = useState(props.items.join('\n'));
  const [synced, setSynced] = useState(props.items);
  // Adopt outside changes (e.g. suggestions merged in) without clobbering in-progress typing.
  if (props.items !== synced && props.items.join('\n') !== linesToList(text).join('\n')) {
    setSynced(props.items);
    setText(props.items.join('\n'));
  }
  return (
    <Field label={props.label} hint={props.hint ?? 'One item per line.'} id={id}>
      <textarea
        id={id}
        rows={props.rows ?? 4}
        className={inputClass}
        value={text}
        placeholder={props.placeholder}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          setText(e.target.value);
          const items = linesToList(e.target.value);
          setSynced(items);
          props.onChange(items);
        }}
      />
    </Field>
  );
}

export function Slider(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
  badge?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-medium">
          {props.label} {props.badge}
        </label>
        <output htmlFor={id} className="tabular-nums text-muted">
          {props.value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={props.value}
        aria-valuetext={`${props.value}: ${props.value < 34 ? props.low : props.value < 67 ? 'balanced' : props.high}`}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-accent focus-visible:outline-2 focus-visible:outline-accent"
      />
      <div className="flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{props.low}</span>
        <span>{props.high}</span>
      </div>
    </div>
  );
}

export function RadioGroup<T extends string>(props: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
}) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 font-medium">{props.legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {props.options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer gap-2 rounded-lg border border-border p-3 has-[:checked]:border-accent has-[:checked]:bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
              className="mt-1 accent-accent"
            />
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              {o.description && <span className="block text-xs text-muted">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Select(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={props.label} hint={props.hint} id={id}>
      <select
        id={id}
        className={inputClass}
        value={props.value}
        aria-describedby={props.hint ? `${id}-hint` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
