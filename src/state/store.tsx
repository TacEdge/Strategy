import {
  createContext, useContext, useEffect, useMemo, useReducer,
} from 'react';
import type { ReactNode, Dispatch } from 'react';
import type {
  CampaignState, Milestone, MilestoneStatus, LineOfOperation, StrategicHorizon, WeeklyPlan,
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

const STATUSES: MilestoneStatus[] = ['future', 'active', 'at-risk', 'blocked', 'complete'];

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
const migrate = (raw: LegacyState): CampaignState => {
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
    schemaVersion: seedState.schemaVersion,
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
        status: STATUSES.includes(m.status as MilestoneStatus) ? (m.status as MilestoneStatus) : 'future',
        owner: m.owner ?? '',
      })),
    weekly: {
      outcomes: v8 ? outcomes.map((o) => (SEEDED_OUTCOMES.includes(o) ? '' : o)) : outcomes,
      updatedAt: raw.weekly?.updatedAt ?? '',
    },
  };
};

const load = (): CampaignState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as LegacyState;
    if (parsed.schemaVersion === seedState.schemaVersion) return parsed as unknown as CampaignState;
    return migrate(parsed);
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
