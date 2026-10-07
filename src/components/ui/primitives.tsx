import { useId, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, Info, Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/* ------------------------------------------------------------------ Panel */

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
}

export function Panel({ eyebrow, title, actions, padded = true, as: Tag = 'section', className, children, ...rest }: PanelProps) {
  return (
    <Tag className={cn('surface', padded && 'p-5', className)} {...rest}>
      {(eyebrow || title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
            {title && <h3 className="text-[15px] font-semibold text-fg">{title}</h3>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ Badge */

export type Tone = 'neutral' | 'amber' | 'data' | 'danger' | 'info';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-raised text-muted border-line',
  amber: 'bg-amber-soft text-amber border-amber/30',
  data: 'bg-data-soft text-data border-data/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('osd inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide', toneClass[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Button */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-amber text-ink hover:bg-amber-strong',
        variant === 'secondary' && 'border border-line-strong bg-raised text-fg hover:border-faint',
        variant === 'ghost' && 'text-muted hover:bg-panel-2 hover:text-fg',
        variant === 'danger' && 'border border-danger/40 bg-danger-soft text-danger hover:border-danger',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 text-muted transition-colors hover:border-line-strong hover:text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Switch */

export interface SwitchProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({ label, checked, onChange, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-faint">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 disabled:opacity-40',
          checked ? 'border-amber bg-amber' : 'border-line-strong bg-ink',
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full transition-transform duration-150',
            checked ? 'translate-x-[18px] bg-ink' : 'translate-x-[2px] bg-muted',
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Stat */

export function Stat({ label, value, tone, hint, className }: { label: ReactNode; value: ReactNode; tone?: Tone; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="eyebrow mb-1">{label}</div>
      <div
        className={cn(
          'osd text-base font-medium',
          tone === 'amber' && 'text-amber',
          tone === 'data' && 'text-data',
          tone === 'danger' && 'text-danger',
          tone === 'info' && 'text-info',
          (!tone || tone === 'neutral') && 'text-fg',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Callout */

const calloutIcon = {
  info: Info,
  tip: Lightbulb,
  warning: AlertTriangle,
  success: CheckCircle2,
} as const;

export function Callout({
  kind = 'info',
  title,
  children,
  className,
}: {
  kind?: keyof typeof calloutIcon;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const Icon = calloutIcon[kind];
  return (
    <div
      role={kind === 'warning' ? 'alert' : undefined}
      className={cn(
        'flex gap-3 rounded-md border p-3.5 text-[13px] leading-relaxed',
        kind === 'info' && 'border-info/25 bg-info-soft text-fg',
        kind === 'tip' && 'border-amber/25 bg-amber-soft text-fg',
        kind === 'warning' && 'border-danger/30 bg-danger-soft text-fg',
        kind === 'success' && 'border-data/30 bg-data-soft text-fg',
        className,
      )}
    >
      <Icon
        size={16}
        className={cn(
          'mt-0.5 shrink-0',
          kind === 'info' && 'text-info',
          kind === 'tip' && 'text-amber',
          kind === 'warning' && 'text-danger',
          kind === 'success' && 'text-data',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0">
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        <div className="text-muted [&_strong]:text-fg">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ InfoTip */

/** Pequeño "i" con explicación al pasar el puntero o enfocar con teclado. */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="Más información"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-faint hover:text-fg"
      >
        <Info size={13} aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-line-strong bg-raised p-2.5 text-xs leading-relaxed text-muted shadow-[var(--shadow-raise)]"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ Kbd */

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="osd rounded-xs border border-line-strong bg-raised px-1.5 py-px text-[11px] text-muted">{children}</kbd>;
}

/* ------------------------------------------------------------------ SectionHeader */

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-2 text-amber">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold text-fg md:text-[28px]">{title}</h1>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
