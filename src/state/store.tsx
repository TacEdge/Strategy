import {
  createContext, useContext, useEffect, useMemo, useReducer,
} from 'react';
import type { ReactNode, Dispatch } from 'react';
import type {
  CampaignState, Milestone, LineOfOperation, StrategicHorizon, WeeklyPlan,
} from '../types';
import { seedState } from '../data/seed';

const STORAGE_KEY = 'tacedge-strategy-campaign-v1';

let idCounter = 0;
export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export type Action =
  | { type: 'milestone/add'; milestone: Milestone }
  | { type: 'milestone/update'; id: string; patch: Partial<Milestone> }
  | { type: 'milestone/delete'; id: string }
  | { type: 'loo/update'; id: string; patch: Partial<LineOfOperation> }
  | { type: 'loo/add'; loo: LineOfOperation }
  | { type: 'loo/reorder'; id: string; direction: -1 | 1 }
  | { type: 'loo/archive'; id: string }
  | { type: 'loo/delete'; id: string }
  | { type: 'horizon/add'; horizon: StrategicHorizon }
  | { type: 'horizon/update'; id: string; patch: Partial<StrategicHorizon> }
  | { type: 'horizon/delete'; id: string }
  | { type: 'weekly/update'; patch: Partial<WeeklyPlan> }
  | { type: 'campaign/reset' };

export const reducer = (state: CampaignState, action: Action): CampaignState => {
  switch (action.type) {
    case 'milestone/add':
      return { ...state, milestones: [...state.milestones, action.milestone] };
    case 'milestone/update':
      return {
        ...state,
        milestones: state.milestones.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      };
    case 'milestone/delete':
      return { ...state, milestones: state.milestones.filter((m) => m.id !== action.id) };

    case 'loo/update':
      return {
        ...state,
        loos: state.loos.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      };
    case 'loo/add':
      return {
        ...state,
        loos: [...state.loos, action.loo],
        looOrder: [...state.looOrder, action.loo.id],
      };
    case 'loo/reorder': {
      const order = [...state.looOrder];
      const i = order.indexOf(action.id);
      const j = i + action.direction;
      if (i < 0 || j < 0 || j >= order.length) return state;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...state, looOrder: order };
    }
    case 'loo/archive':
      return {
        ...state,
        loos: state.loos.map((l) => (l.id === action.id ? { ...l, archived: true } : l)),
      };
    case 'loo/delete':
      return {
        ...state,
        loos: state.loos.filter((l) => l.id !== action.id),
        looOrder: state.looOrder.filter((id) => id !== action.id),
        milestones: state.milestones.filter((m) => m.looId !== action.id),
      };

    case 'horizon/add':
      return { ...state, horizons: [...state.horizons, action.horizon] };
    case 'horizon/update':
      return {
        ...state,
        horizons: state.horizons.map((h) => (h.id === action.id ? { ...h, ...action.patch } : h)),
      };
    case 'horizon/delete':
      return { ...state, horizons: state.horizons.filter((h) => h.id !== action.id) };

    case 'weekly/update':
      return { ...state, weekly: { ...state.weekly, ...action.patch } };

    case 'campaign/reset':
      return seedState;

    default:
      return state;
  }
};

/* ------------------------------------------------------------------ */
/* Persistence and migration                                            */
/* ------------------------------------------------------------------ */

/** Loose shape of any earlier stored campaign (schema 8-10). */
interface LegacyState {
  schemaVersion?: number;
  campaign?: { id?: string; name?: string; vision?: { statement?: string } | string };
  loos?: LineOfOperation[];
  looOrder?: string[];
  horizons?: { id: string; date: string; theme: string; archived?: boolean }[];
  milestones?: {
    id: string; title: string; looId: string; targetDate: string;
    status: string; owner?: string;
  }[];
  weekly?: Partial<WeeklyPlan>;
}

/** Stored shape from schema 11 and 12: tasks carried a five-way status. */
interface V12State extends Omit<CampaignState, 'milestones' | 'horizons'> {
  milestones: (Omit<Milestone, 'outcome'> & { status: string })[];
  horizons: Omit<StrategicHorizon, 'outcome'>[];
}

/** Seeded fixture records from schema 8 are identified by their ID patterns. */
const SEED_ID = [/^ms-(mv|pt|cr|sr|cc)-\d+$/, /^hz-\d+$/];
const isSeedId = (id: string) => SEED_ID.some((r) => r.test(id));

const SEEDED_OUTCOMES = [
  'Fulton Hogan pilot scope agreed in principle',
  'Technical-lead package decision made and candidates re-engaged',
  'Pilot pricing structure tested with the design partner',
];

/**
 * Bring any earlier schema up to the current one. Everything the reduced
 * model no longer carries (purpose, criteria, tasks, risks, evidence,
 * dependencies, objectives, history, priority, confidence, progress) is
 * dropped. Milestones keep their title, line, date, owner and status;
 * archived and superseded milestones are removed, as they left the diagram
 * already. Schema 8 additionally drops its notional seed records and
 * renames the default lines, as the v9 migration used to.
 */
const migrateLegacy = (raw: LegacyState): V12State => {
  const version = raw.schemaVersion ?? 0;
  const v8 = version <= 8;

  const loos = (raw.loos ?? seedState.loos).map((l) => {
    if (!v8) return l;
    if (l.id === 'loo-mv' && l.name === 'Customers') {
      return { ...l, name: 'Market', description: 'Prove demand and secure reference customers.' };
    }
    if (l.id === 'loo-cr' && l.name === 'Revenue') {
      return { ...l, name: 'Commercial', description: 'Convert customer value into repeatable recurring revenue.' };
    }
    if (l.id === 'loo-pt' && l.name === 'Product' && l.description === 'Build and validate the platform.') {
      return { ...l, description: 'Build and validate a trusted field-to-record platform.' };
    }
    if (l.id === 'loo-sr' && l.name === 'Partnerships' && l.description === 'Create leverage and routes to market.') {
      return { ...l, description: 'Create leverage, capability and routes to market.' };
    }
    return l;
  });

  const vision = raw.campaign?.vision;
  const outcomes = raw.weekly?.outcomes ?? seedState.weekly.outcomes;

  return {
    schemaVersion: 11,
    campaign: {
      id: raw.campaign?.id ?? seedState.campaign.id,
      name: raw.campaign?.name ?? seedState.campaign.name,
      vision: typeof vision === 'string' ? vision : vision?.statement ?? seedState.campaign.vision,
    },
    loos,
    looOrder: raw.looOrder ?? loos.map((l) => l.id),
    horizons: (raw.horizons ?? [])
      .filter((h) => !h.archived && !(v8 && isSeedId(h.id)))
      .map((h) => ({ id: h.id, date: h.date, theme: h.theme })),
    milestones: (raw.milestones ?? [])
      .filter((m) => !(v8 && isSeedId(m.id)))
      .filter((m) => m.status !== 'archived' && m.status !== 'superseded')
      .map((m) => ({
        id: m.id,
        title: m.title,
        looId: m.looId,
        targetDate: m.targetDate,
        status: m.status,
        owner: m.owner ?? '',
      })),
    weekly: {
      outcomes: v8 ? outcomes.map((o) => (SEEDED_OUTCOMES.includes(o) ? '' : o)) : outcomes,
      updatedAt: raw.weekly?.updatedAt ?? '',
    },
  };
};

/**
 * Migration 11 -> 12: three default Lines of Operation instead of five.
 * Product, Commercial and Company remain; the default Market and
 * Partnerships lines are removed and their milestones move to Commercial,
 * which now covers customers, contracts and agreements. Only lines still
 * carrying their default ID are touched; lines the user created stay.
 * Descriptions are refreshed only where they still read as the old default.
 */
const FOLDED_INTO_COMMERCIAL = ['loo-mv', 'loo-sr'];
const OLD_DEFAULT_DESCRIPTION: Record<string, string> = {
  'loo-pt': 'Build and validate a trusted field-to-record platform.',
  'loo-cr': 'Convert customer value into repeatable recurring revenue.',
  'loo-cc': 'Build the team, runway and delivery system.',
};

const migrateV11toV12 = (s: V12State): V12State => {
  const commercial = s.loos.find((l) => l.id === 'loo-cr');
  const folded = new Set(commercial ? FOLDED_INTO_COMMERCIAL : []);
  const loos = s.loos
    .filter((l) => !folded.has(l.id))
    .map((l) => {
      const fresh = seedState.loos.find((d) => d.id === l.id);
      return fresh && l.description === OLD_DEFAULT_DESCRIPTION[l.id]
        ? { ...l, description: fresh.description }
        : l;
    });
  const looOrder = s.looOrder.filter((id) => !folded.has(id) && loos.some((l) => l.id === id));
  // Renumber to match the visible order.
  const numbered = loos.map((l) => ({ ...l, number: looOrder.indexOf(l.id) + 1 || l.number }));
  return {
    ...s,
    schemaVersion: 12,
    loos: numbered,
    looOrder,
    milestones: s.milestones.map((m) => (folded.has(m.looId) ? { ...m, looId: 'loo-cr' } : m)),
  };
};

/**
 * Migration 12 -> 13: the five-way status becomes an outcome. Every Key
 * Task and Strategic Objective is open, completed (tick) or didn't
 * complete (cross). Complete maps to done; everything else to open.
 * Objectives gain the same field, starting open.
 */
const migrateV12toV13 = (s: V12State): CampaignState => ({
  ...s,
  schemaVersion: 13,
  milestones: s.milestones.map(({ status, ...m }) => ({ ...m, outcome: status === 'complete' ? 'done' : 'open' })),
  horizons: s.horizons.map((h) => ({ ...h, outcome: 'open' })),
});

const load = (): CampaignState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as LegacyState;
    if (parsed.schemaVersion === seedState.schemaVersion) return parsed as unknown as CampaignState;
    const v12 = parsed.schemaVersion === 12 ? (parsed as unknown as V12State)
      : migrateV11toV12(parsed.schemaVersion === 11 ? (parsed as unknown as V12State) : migrateLegacy(parsed));
    return migrateV12toV13(v12);
  } catch {
    return seedState;
  }
};

interface StoreValue {
  state: CampaignState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable; the session still works in memory.
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreValue => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};

/** Ordered, non-archived Lines of Operation. */
export const useLoos = (): LineOfOperation[] => {
  const { state } = useStore();
  return useMemo(
    () =>
      state.looOrder
        .map((id) => state.loos.find((l) => l.id === id))
        .filter((l): l is LineOfOperation => Boolean(l) && !l!.archived),
    [state.looOrder, state.loos],
  );
};
