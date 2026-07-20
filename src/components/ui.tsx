import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Confidence, LooRole, MilestoneStatus } from '../types';
import { statusIcon } from './icons';

export const STATUS_LABEL: Record<MilestoneStatus, string> = {
  complete: 'Complete',
  active: 'Active',
  'at-risk': 'At risk',
  blocked: 'Blocked',
  future: 'Future',
  superseded: 'Superseded',
  archived: 'Archived',
};

export const ROLE_LABEL: Record<LooRole, string> = {
  'main-effort': 'Main Effort',
  supporting: 'Supporting',
  sustaining: 'Sustaining',
  paused: 'Paused',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const StatusBadge = ({ status, compact = false }: { status: MilestoneStatus; compact?: boolean }) => (
  <span className={`status-badge status-${status}`} title={STATUS_LABEL[status]}>
    {statusIcon(status, 14)}
    {!compact && <span>{STATUS_LABEL[status]}</span>}
  </span>
);

export const RoleTag = ({ role }: { role: LooRole }) => (
  <span className={`role-tag role-${role}`}>{ROLE_LABEL[role]}</span>
);

/** Confidence as a three-segment meter plus text — never colour alone. */
export const ConfidenceMeter = ({ value, label = true }: { value: Confidence; label?: boolean }) => {
  const filled = value === 'high' ? 3 : value === 'medium' ? 2 : 1;
  return (
    <span className="confidence-meter" title={`Confidence: ${CONFIDENCE_LABEL[value]}`}>
      <span className="confidence-bars" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= filled ? 'bar on' : 'bar'} />
        ))}
      </span>
      {label && <span className="confidence-text">{CONFIDENCE_LABEL[value]}</span>}
    </span>
  );
};

export const ProgressBar = ({ value }: { value: number }) => (
  <span className="progress-track" role="img" aria-label={`Progress ${value} percent`}>
    <span className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </span>
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
