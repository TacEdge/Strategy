import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Outcome } from '../types';
import { OutcomeBox, OUTCOME_LABEL } from './icons';

export const OUTCOMES: Outcome[] = ['open', 'done', 'missed'];

export const OutcomeBadge = ({ outcome, overdue = false, compact = false }: { outcome: Outcome; overdue?: boolean; compact?: boolean }) => (
  <span className={`outcome-badge outcome-${outcome}${overdue ? ' overdue' : ''}`} title={OUTCOME_LABEL[outcome]}>
    <OutcomeBox outcome={outcome} overdue={overdue} size={15} />
    {!compact && <span>{overdue && outcome === 'open' ? 'Open · overdue' : OUTCOME_LABEL[outcome]}</span>}
  </span>
);

/** Three-way choice: open, completed, didn't complete. */
export const OutcomePicker = ({ value, onChange }: { value: Outcome; onChange: (o: Outcome) => void }) => (
  <div className="outcome-picker" role="radiogroup" aria-label="Outcome">
    {OUTCOMES.map((o) => (
      <button
        type="button"
        key={o}
        role="radio"
        aria-checked={value === o}
        className={`outcome-option outcome-${o}${value === o ? ' on' : ''}`}
        onClick={() => onChange(o)}
      >
        <OutcomeBox outcome={o} size={15} />
        {OUTCOME_LABEL[o]}
      </button>
    ))}
  </div>
);

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="eyebrow">{children}</span>
);

/** Modal with focus handling and Escape to close. */
export const Modal = ({
  title, onClose, children, wide = false,
}: {
  title: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={wide ? 'modal modal-wide' : 'modal'} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

/** Confirmation for destructive actions. */
export const ConfirmDialog = ({
  title, message, confirmLabel, onConfirm, onCancel, danger = false,
}: {
  title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) => (
  <Modal title={title} onClose={onCancel}>
    <p className="confirm-message">{message}</p>
    <div className="modal-actions">
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
  </label>
);

export const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="detail-section-heading">{children}</h3>
);
