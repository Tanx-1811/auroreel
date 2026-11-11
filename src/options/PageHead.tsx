import type { ReactNode } from 'react';

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="display">{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  hint,
  children,
  actions,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card">
      {title ? (
        <div className="card-head">
          <div>
            <h3>{title}</h3>
            {hint ? (
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                {hint}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
