import { useState } from 'react';
import type { LooRole } from '../types';
import { useStore, newId } from '../state/store';
import { Modal, ConfirmDialog, ROLE_LABEL } from './ui';
import { IconArrowUp, IconArrowDown, IconArchive, IconTrash, IconPlus, IconEdit } from './icons';

const ROLES: LooRole[] = ['main-effort', 'supporting', 'sustaining', 'paused'];

export const LooManager = ({
  onClose, onOpenNow,
}: { onClose: () => void; onOpenNow: () => void }) => {
  const { state, dispatch } = useStore();
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'delete'; id: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const ordered = state.looOrder
    .map((id) => state.loos.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const addLoo = () => {
    const number = Math.max(0, ...state.loos.map((l) => l.number)) + 1;
    dispatch({
      type: 'loo/add',
      loo: {
        id: newId('loo'), number, name: `New Line of Operation`,
        description: '', owner: 'Mike', role: 'sustaining', archived: false,
      },
    });
  };

  const commitRename = (id: string) => {
    const n = nameDraft.trim();
    if (n) dispatch({ type: 'loo/update', id, patch: { name: n } });
    setRenaming(null);
  };

  const confirmTarget = confirm && state.loos.find((l) => l.id === confirm.id);

  return (
    <Modal title="Lines of Operation" onClose={onClose} wide>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        Lines of Operation endure through time. One line carries the Main Effort;
        setting a new Main Effort moves the previous one to Supporting.
        Prefer pause or archive over deletion.
      </p>
      {ordered.map((loo, idx) => (
        <div key={loo.id} className={`loo-row${loo.archived ? ' archived' : ''}`}>
          <span className="lane-num">{String(loo.number).padStart(2, '0')}</span>
          <div className="loo-row-name">
            {renaming === loo.id ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => commitRename(loo.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(loo.id);
                  if (e.key === 'Escape') setRenaming(null);
                }}
                aria-label="Line of Operation name"
                autoFocus
              />
            ) : (
              <strong>
                {loo.name}
                {loo.archived && ' (archived)'}
              </strong>
            )}
            <span className="sub">{loo.description || 'No description'}</span>
          </div>
          <input
            style={{ width: 120, border: '1px solid var(--te-line-2)', borderRadius: 'var(--te-r-sm)', padding: '5px 8px', fontSize: 13 }}
            value={loo.owner}
            onChange={(e) => dispatch({ type: 'loo/update', id: loo.id, patch: { owner: e.target.value } })}
            aria-label={`${loo.name} owner`}
            title="Owner"
          />
          <select
            value={loo.role}
            onChange={(e) => dispatch({ type: 'loo/update', id: loo.id, patch: { role: e.target.value as LooRole } })}
            aria-label={`${loo.name} role`}
            title="Role"
          >
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button
            type="button" className="icon-btn"
            onClick={() => { setRenaming(loo.id); setNameDraft(loo.name); }}
            title="Rename" aria-label={`Rename ${loo.name}`}
          >
            <IconEdit size={14} />
          </button>
          <button
            type="button" className="icon-btn" disabled={idx === 0}
            style={{ opacity: idx === 0 ? 0.3 : 1 }}
            onClick={() => dispatch({ type: 'loo/reorder', id: loo.id, direction: -1 })}
            title="Move up" aria-label={`Move ${loo.name} up`}
          >
            <IconArrowUp size={14} />
          </button>
          <button
            type="button" className="icon-btn" disabled={idx === ordered.length - 1}
            style={{ opacity: idx === ordered.length - 1 ? 0.3 : 1 }}
            onClick={() => dispatch({ type: 'loo/reorder', id: loo.id, direction: 1 })}
            title="Move down" aria-label={`Move ${loo.name} down`}
          >
            <IconArrowDown size={14} />
          </button>
          <button
            type="button" className="icon-btn"
            onClick={() => setConfirm({ kind: 'archive', id: loo.id })}
            title="Archive" aria-label={`Archive ${loo.name}`}
          >
            <IconArchive size={14} />
          </button>
          <button
            type="button" className="icon-btn"
            onClick={() => setConfirm({ kind: 'delete', id: loo.id })}
            title="Delete" aria-label={`Delete ${loo.name}`}
          >
            <IconTrash size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={addLoo}>
          <IconPlus size={14} /> Add Line of Operation
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { onClose(); onOpenNow(); }}
        >
          What should I do now?
        </button>
      </div>

      {confirm && confirmTarget && confirm.kind === 'archive' && (
        <ConfirmDialog
          title="Archive Line of Operation"
          message={`Archive "${confirmTarget.name}"? It leaves the diagram but keeps its milestones and history.`}
          confirmLabel="Archive"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { dispatch({ type: 'loo/archive', id: confirm.id }); setConfirm(null); }}
        />
      )}
      {confirm && confirmTarget && confirm.kind === 'delete' && (
        <ConfirmDialog
          title="Delete Line of Operation"
          message={`Permanently delete "${confirmTarget.name}" and all its milestones and objectives? Archiving preserves strategic history; deletion does not.`}
          confirmLabel="Delete permanently"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { dispatch({ type: 'loo/delete', id: confirm.id }); setConfirm(null); }}
        />
      )}
    </Modal>
  );
};
