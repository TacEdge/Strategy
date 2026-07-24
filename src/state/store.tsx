import {
  createContext, useContext, useEffect, useMemo, useReducer,
} from 'react';
import type { ReactNode, Dispatch } from 'react';
import type {
  CampaignState, Milestone, LineOfOperation, StrategicHorizon,
  HorizonObjective, Dependency, ChangeHistoryEntry, WeeklyPlan,
} from '../types';
import { seedState } from '../data/seed';
import { nowStamp, fmtDate } from '../lib/time';

const STORAGE_KEY = 'tacedge-strategy-campaign-v1';

let idCounter = 0;
export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const entry = (summary: string): ChangeHistoryEntry => ({
  id: newId('ch'),
  at: nowStamp(),
  summary,
});

export type Action =
  | { type: 'milestone/update'; id: string; patch: Partial<Milestone>; historySummary?: string }
  | { type: 'milestone/move-date'; id: string; targetDate: string }
  | { type: 'milestone/move-loo'; id: string; looId: string }
  | { type: 'milestone/add'; milestone: Milestone }
  | { type: 'milestone/duplicate'; id: string }
  | { type: 'milestone/archive'; id: string }
  | { type: 'milestone/delete'; id: string }
  | { type: 'loo/update'; id: string; patch: Partial<LineOfOperation> }
  | { type: 'loo/add'; loo: LineOfOperation }
  | { type: 'loo/reorder'; id: string; direction: -1 | 1 }
  | { type: 'loo/archive'; id: string }
  | { type: 'loo/delete'; id: string }
  | { type: 'horizon/update'; id: string; patch: Partial<StrategicHorizon> }
  | { type: 'horizon/add'; horizon: StrategicHorizon; objectives: HorizonObjective[] }
  | { type: 'horizon/archive'; id: string }
  | { type: 'horizon/delete'; id: string }
  | { type: 'objective/update'; id: string; patch: Partial<HorizonObjective> }
  | { type: 'dependency/add'; dependency: Dependency }
  | { type: 'dependency/remove'; id: string }
  | { type: 'weekly/update'; patch: Partial<WeeklyPlan> }
  | { type: 'campaign/reset' };

const withHistory = (m: Milestone, summary: string): Milestone => ({
  ...m,
  history: [...m.history, entry(summary)],
});

const mapMilestone = (
  state: CampaignState, id: string, fn: (m: Milestone) => Milestone,
): CampaignState => ({
  ...state,
  milestones: state.milestones.map((m) => (m.id === id ? fn(m) : m)),
});

export const reducer = (state: CampaignState, action: Action): CampaignState => {
  switch (action.type) {
    case 'milestone/update': {
      return mapMilestone(state, action.id, (m) => {
        const next = { ...m, ...action.patch };
        const summary =
          action.historySummary ??
          (action.patch.title !== undefined && action.patch.title !== m.title
            ? `Title changed to "${action.patch.title}".`
            : action.patch.status !== undefined && action.patch.status !== m.status
              ? `Status changed from ${m.status} to ${action.patch.status}.`
              : action.patch.confidence !== undefined && action.patch.confidence !== m.confidence
                ? `Confidence changed to ${action.patch.confidence}.`
                : 'Milestone updated.');
        return withHistory(next, summary);
      });
    }
    case 'milestone/move-date': {
      return mapMilestone(state, action.id, (m) =>
        m.targetDate === action.targetDate
          ? m
          : withHistory(
              { ...m, targetDate: action.targetDate },
              `Target date moved from ${fmtDate(m.targetDate)} to ${fmtDate(action.targetDate)}.`,
            ));
    }
    case 'milestone/move-loo': {
      const loo = state.loos.find((l) => l.id === action.looId);
      return mapMilestone(state, action.id, (m) =>
        withHistory({ ...m, looId: action.looId }, `Moved to ${loo?.name ?? 'another line'}.`));
    }
    case 'milestone/add':
      return { ...state, milestones: [...state.milestones, action.milestone] };
    case 'milestone/duplicate': {
      const src = state.milestones.find((m) => m.id === action.id);
      if (!src) return state;
      const copy: Milestone = {
        ...src,
        id: newId('ms'),
        title: `${src.title} (copy)`,
        history: [entry(`Duplicated from "${src.title}".`)],
      };
      return { ...state, milestones: [...state.milestones, copy] };
    }
    case 'milestone/archive':
      return mapMilestone(state, action.id, (m) =>
        withHistory({ ...m, status: 'archived' }, 'Milestone archived.'));
    case 'milestone/delete':
      return {
        ...state,
        milestones: state.milestones.filter((m) => m.id !== action.id),
        dependencies: state.dependencies.filter(
          (d) => d.toMilestoneId !== action.id && d.fromMilestoneId !== action.id,
        ),
      };

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
        objectives: state.objectives.filter((o) => o.looId !== action.id),
      };

    case 'horizon/update':
      return {
        ...state,
        horizons: state.horizons.map((h) => (h.id === action.id ? { ...h, ...action.patch } : h)),
      };
    case 'horizon/add':
      return {
        ...state,
        horizons: [...state.horizons, action.horizon],
        objectives: [...state.objectives, ...action.objectives],
      };
    case 'horizon/archive':
      return {
        ...state,
        horizons: state.horizons.map((h) =>
          h.id === action.id ? { ...h, archived: true, status: 'archived' } : h),
      };
    case 'horizon/delete':
      return {
        ...state,
        horizons: state.horizons.filter((h) => h.id !== action.id),
        objectives: state.objectives.filter((o) => o.horizonId !== action.id),
      };

    case 'objective/update':
      return {
        ...state,
        objectives: state.objectives.map((o) => (o.id === action.id ? { ...o, ...action.patch } : o)),
      };

    case 'dependency/add':
      return { ...state, dependencies: [...state.dependencies, action.dependency] };
    case 'dependency/remove':
      return { ...state, dependencies: state.dependencies.filter((d) => d.id !== action.id) };

    case 'weekly/update':
      return { ...state, weekly: { ...state.weekly, ...action.patch } };

    case 'campaign/reset':
      return seedState;

    default:
      return state;
  }
};

const load = (): CampaignState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as CampaignState;
    if (parsed.schemaVersion !== seedState.schemaVersion) return seedState;
    return parsed;
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
