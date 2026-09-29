import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui';
import { IconExport } from './icons';
import { buildDiagramPdf, pdfFileName, rangeLabel } from '../lib/exportPdf';
import type { PdfInput } from '../lib/exportPdf';

type Phase = 'building' | 'ready' | 'error';

/**
 * Builds the PDF as soon as it opens, then offers Share (the iPad share
 * sheet: Mail, Messages, AirDrop, Save to Files) or Download. Sharing needs
 * a fresh tap, so the file is prepared first and shared on the second tap.
 */
export const ExportSheet = ({ input, onClose }: { input: PdfInput; onClose: () => void }) => {
  const [phase, setPhase] = useState<Phase>('building');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const inputRef = useRef(input);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    buildDiagramPdf(inputRef.current)
      .then((blob) => {
        if (cancelled) return;
        const f = new File([blob], pdfFileName(inputRef.current.today), { type: 'application/pdf' });
        made = URL.createObjectURL(f);
        setFile(f);
        setUrl(made);
        setPhase('ready');
      })
      .catch((e: unknown) => { console.error('PDF export failed', e); if (!cancelled) setPhase('error'); });
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
  }, []);

  const canShare = (() => {
    try {
      return Boolean(file && navigator.canShare?.({ files: [file] }));
    } catch {
      return false;
    }
  })();

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'TACEDGE Lines of Operation' });
      onClose();
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setNote('Sharing did not open. Use Download instead.');
    }
  };

  const download = () => {
    if (!url || !file) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const summary = `${rangeLabel(input.startDay, input.days)} · ${input.view.label} view · ${input.loos.length} line${input.loos.length === 1 ? '' : 's'}`;

  return (
    <Modal title="Export PDF" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        One A4 landscape page of the diagram as it is on screen.
      </p>
      <p className="export-summary">{summary}</p>
      {phase === 'building' && <p className="export-status" aria-live="polite">Preparing the PDF…</p>}
      {phase === 'error' && (
        <p className="export-status error" aria-live="polite">The PDF could not be made. Check the connection and try again.</p>
      )}
      {phase === 'ready' && <p className="export-status" aria-live="polite">Ready: {file?.name}</p>}
      {note && <p className="export-status error">{note}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        {phase === 'ready' && (canShare ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={download}>Download</button>
            <button type="button" className="btn btn-primary" onClick={share}>
              <IconExport size={15} /> Share PDF
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={download}>
            <IconExport size={15} /> Download PDF
          </button>
        ))}
      </div>
    </Modal>
  );
};
