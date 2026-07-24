import { useStore } from '../state/store';
import { Modal, StatusBadge } from './ui';
import { fmtDate } from '../lib/time';

export const MilestoneListModal = ({
  onClose, onOpen,
}: { onClose: () => void; onOpen: (id: string) => void }) => {
  const { state } = useStore();
  const ms = [...state.milestones]
    .filter((m) => m.status !== 'archived')
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return (
    <Modal title="Milestones" onClose={onClose} wide>
      {ms.length === 0 && (
        <p className="detail-text muted" style={{ fontSize: 14 }}>
          No milestones yet. Add the first milestone to begin building the campaign.
        </p>
      )}
      {ms.map((m) => {
        const loo = state.loos.find((l) => l.id === m.looId);
        return (
          <button type="button" key={m.id} className="list-modal-row" onClick={() => { onClose(); onOpen(m.id); }}>
            <span className="row-loo">{loo?.name ?? ''}</span>
            <StatusBadge status={m.status} compact />
            <span>{m.title}</span>
            <span className="row-date">{fmtDate(m.targetDate)}</span>
          </button>
        );
      })}
    </Modal>
  );
};
