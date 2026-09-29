import { useCallback, useEffect, useRef, useState } from 'react';
import type { Milestone, StrategicHorizon } from '../types';
import { useStore, useLoos, newId } from '../state/store';
import { parseCommands, spokenDate } from '../lib/voice';
import type { ParsedCommand } from '../lib/voice';
import { parseDate, todayIso } from '../lib/time';
import { TERMS } from '../lib/terms';
import { IconClose } from './icons';

/* ---- Minimal typing for the Web Speech API (not in TypeScript's DOM lib). ---- */
interface SpeechAlternative { transcript: string }
interface SpeechResult { isFinal: boolean; 0: SpeechAlternative; length: number }
interface SpeechEvent { resultIndex: number; results: { length: number; [i: number]: SpeechResult } }
interface SpeechErrorEvent { error: string }
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

const getRecognition = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const say = (text: string) => {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-NZ';
    u.rate = 1.02;
    synth.speak(u);
  } catch {
    // Speech output is a courtesy; the card shows the same thing.
  }
};

/** Ask the diagram, if it is on screen, to scroll a date into view. */
const reveal = (iso: string) => window.dispatchEvent(new CustomEvent('tacedge:reveal', { detail: { date: iso } }));

type Added = ParsedCommand & { id: string };
type Phase = 'listening' | 'typing' | 'done';

const EXAMPLES = [
  'Key task next Friday to meet with Rutledge',
  'Strategic objective at the end of next month, second customer signed',
];

export const IconMic = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

/**
 * One tap, then speak. Commands are added straight away and read back,
 * with Undo, so nothing needs reading or a second tap. Where live speech
 * recognition is unavailable (some home-screen web apps), the sheet opens
 * a text box instead; the keyboard's own dictation mic works there.
 */
export const VoiceCommand = () => {
  const { state, dispatch } = useStore();
  const loos = useLoos();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('listening');
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [added, setAdded] = useState<Added[]>([]);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const loosRef = useRef(loos);
  loosRef.current = loos;

  const clearCloseTimer = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  const stopListening = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { rec.onend = null; rec.onresult = null; rec.onerror = null; try { rec.abort(); } catch { /* already stopped */ } }
  };

  const close = useCallback(() => {
    stopListening();
    clearCloseTimer();
    setOpen(false);
  }, []);

  const toTyping = (message: string) => {
    stopListening();
    setNotice(message);
    setPhase('typing');
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const run = (text: string) => {
    const s = stateRef.current;
    const lines = loosRef.current;
    const commands = parseCommands(text, {
      today: parseDate(todayIso()),
      loos: lines.map((l) => ({ id: l.id, name: l.name })),
      tasks: s.milestones.map((m) => ({ title: m.title, looId: m.looId })),
      defaultLooId: lines[0]?.id ?? '',
      defaultOwner: 'Mike',
    });
    if (commands.length === 0) {
      setDraft(text);
      toTyping(text
        ? `Couldn't find a ${TERMS.taskLower} or ${TERMS.objectiveLower} in that. Edit it below, or try again.`
        : "Didn't catch anything. Try again, or type it below.");
      say("Sorry, I didn't catch that.");
      return;
    }
    const made: Added[] = commands.map((c) => {
      const id = newId(c.kind === 'task' ? 'ms' : 'hz');
      if (c.kind === 'task') {
        const milestone: Milestone = {
          id, title: c.title, looId: c.looId, targetDate: c.date, outcome: 'open', owner: c.owner,
        };
        dispatch({ type: 'milestone/add', milestone });
      } else {
        const horizon: StrategicHorizon = { id, date: c.date, theme: c.title, outcome: 'open' };
        dispatch({ type: 'horizon/add', horizon });
      }
      return { ...c, id };
    });
    reveal(made[0].date);
    setAdded(made);
    setDraft('');
    setNotice('');
    setPhase('done');
    const lineName = (id: string) => lines.find((l) => l.id === id)?.name ?? '';
    say(made.map((c) => (c.kind === 'task'
      ? `Added ${TERMS.taskLower}: ${c.title}, ${spokenDate(c.date)}, ${lineName(c.looId)}.`
      : `Added ${TERMS.objectiveLower}: ${c.title}, ${spokenDate(c.date)}.`)).join(' '));
    // Eyes-free: the sheet clears itself unless touched.
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 9000);
  };

  const listen = () => {
    clearCloseTimer();
    setAdded([]);
    setTranscript('');
    setNotice('');
    finalRef.current = '';
    const Ctor = getRecognition();
    if (!Ctor) {
      toTyping('Live listening isn\'t available here. Tap the mic on your keyboard to dictate, then Add.');
      return;
    }
    let rec: Recognition;
    try {
      rec = new Ctor();
      rec.lang = 'en-NZ';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
    } catch {
      toTyping('Live listening isn\'t available here. Tap the mic on your keyboard to dictate, then Add.');
      return;
    }
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setTranscript(`${finalRef.current}${interim}`.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      const blocked = e.error === 'not-allowed' || e.error === 'service-not-allowed';
      toTyping(blocked
        ? 'Microphone access is off for this app. Allow it in Settings, or tap the mic on your keyboard to dictate.'
        : 'Listening stopped. Tap the mic on your keyboard to dictate, or try again.');
    };
    rec.onend = () => {
      recRef.current = null;
      run(finalRef.current.trim());
    };
    recRef.current = rec;
    setPhase('listening');
    try {
      rec.start();
    } catch {
      toTyping('Live listening isn\'t available here. Tap the mic on your keyboard to dictate, then Add.');
    }
  };

  const openAndListen = () => {
    setOpen(true);
    listen();
  };

  const undo = (item: Added) => {
    clearCloseTimer();
    dispatch(item.kind === 'task'
      ? { type: 'milestone/delete', id: item.id }
      : { type: 'horizon/delete', id: item.id });
    setAdded((list) => list.filter((a) => a.id !== item.id));
    say('Removed.');
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => () => { stopListening(); clearCloseTimer(); }, []);

  const lineName = (id: string) => state.loos.find((l) => l.id === id)?.name ?? '';

  return (
    <>
      <button
        type="button"
        className="topbar-icon-btn topbar-mic"
        onClick={openAndListen}
        title={`Speak a ${TERMS.taskLower} or ${TERMS.objectiveLower}`}
        aria-label={`Speak a ${TERMS.taskLower} or ${TERMS.objectiveLower}`}
      >
        <IconMic size={18} />
      </button>

      {open && (
        <div
          className="voice-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="voice-sheet" role="dialog" aria-modal="true" aria-label="Voice command" onPointerDown={clearCloseTimer}>
            <div className="voice-head">
              <span className="eyebrow">
                {phase === 'listening' ? 'Listening' : phase === 'done' ? 'Added' : 'Say or type a command'}
              </span>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close">
                <IconClose size={16} />
              </button>
            </div>

            {phase === 'listening' && (
              <div className="voice-listening">
                <button
                  type="button"
                  className="voice-mic-big listening"
                  onClick={() => recRef.current?.stop()}
                  aria-label="Stop listening"
                >
                  <IconMic size={30} />
                </button>
                <p className="voice-transcript" aria-live="polite">
                  {transcript || <span className="muted">e.g. "{EXAMPLES[0]}"</span>}
                </p>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => toTyping('')}>
                  Type instead
                </button>
              </div>
            )}

            {phase === 'typing' && (
              <div className="voice-typing">
                {notice && <p className="voice-notice">{notice}</p>}
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (draft.trim()) run(draft.trim()); }
                  }}
                  placeholder={EXAMPLES.join('\n')}
                  rows={3}
                  aria-label="Command"
                />
                <div className="voice-actions">
                  {getRecognition() && (
                    <button type="button" className="btn btn-secondary" onClick={listen}>
                      <IconMic size={15} /> Listen again
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" disabled={!draft.trim()} onClick={() => run(draft.trim())}>
                    Add
                  </button>
                </div>
              </div>
            )}

            {phase === 'done' && (
              <div className="voice-done" aria-live="polite">
                {added.length === 0 && <p className="voice-notice">Nothing left to add.</p>}
                {added.map((a) => (
                  <div key={a.id} className="voice-item">
                    <div className="voice-item-text">
                      <span className="voice-item-kind">
                        {a.kind === 'task' ? TERMS.task : TERMS.objective}
                        {a.kind === 'task' && ` · ${lineName(a.looId)}`}
                      </span>
                      <span className="voice-item-title">{a.title}</span>
                      <span className="voice-item-meta">
                        {spokenDate(a.date)}{a.dateHeard ? '' : ' · no date heard'}
                        {a.kind === 'task' && a.looSource === 'default' ? ' · line not heard' : ''}
                        {a.kind === 'task' && a.owner ? ` · ${a.owner}` : ''}
                      </span>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => undo(a)}>Undo</button>
                  </div>
                ))}
                <div className="voice-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setDraft(''); toTyping(''); }}>
                    Type
                  </button>
                  <button type="button" className="btn btn-primary" onClick={listen}>
                    <IconMic size={15} /> Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
