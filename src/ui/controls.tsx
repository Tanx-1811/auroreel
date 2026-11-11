import { useId, useState, type ReactNode } from 'react';
import { isHexColor } from '../core/color.ts';
import { useDraft } from './store.ts';

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  full,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  full?: boolean;
}) {
  return (
    <div className={`seg${full ? ' full' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = (v) => String(v),
  delay,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => string;
  delay?: number;
}) {
  const [draft, setDraft] = useDraft(value, onChange, delay);
  const id = useId();
  const pct = ((draft - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-label={label}
        style={{ ['--pct' as string]: `${pct}%` }}
        onChange={(e) => setDraft(Number(e.target.value))}
      />
      <output htmlFor={id}>{format(draft)}</output>
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <select className="select" value={value} aria-label={label} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Shown (dimmed) when the value is empty: the derived colour. */
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    // A new value from outside (picker, preset, undo): show it in the text box.
    setPrev(value);
    setText(value);
  }
  const id = useId();
  const shown = isHexColor(value) ? value : placeholder && isHexColor(placeholder) ? placeholder : '#000000';
  return (
    <div className="color-field">
      <span className="swatch" style={{ background: shown, opacity: isHexColor(value) ? 1 : 0.6 }}>
        <input type="color" value={shown} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      </span>
      <span className="meta">
        <label htmlFor={id}>
          <span>{label}</span>
        </label>
        <input
          id={id}
          spellCheck={false}
          value={text}
          placeholder={placeholder}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            const withHash = (v.startsWith('#') ? v : `#${v}`).toLowerCase();
            if (isHexColor(withHash)) onChange(withHash);
          }}
          onBlur={() => setText(value)}
        />
      </span>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  stack,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  stack?: boolean;
}) {
  return (
    <div className={`field${stack ? ' stack' : ''}`}>
      <div className="grow">
        <div className="label">{label}</div>
        {hint ? <div className="hint">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}
