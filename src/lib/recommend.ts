/**
 * TACEDGE Strategy — founder recommendation engine.
 *
 * Deterministic and transparent. Walks the daily decision chain:
 * horizon -> Integrated Horizon State -> Main Effort -> least secure
 * objective -> most material milestone -> blocker -> best action for the
 * time actually available -> what not to work on.
 *
 * Kept as a pure function over CampaignState so an AI reasoning layer can
 * replace or augment it without touching the UI.
 */
import type {
  CampaignState, Milestone, LineOfOperation, StrategicHorizon,
  HorizonObjective, CandidateAction, EnergyLevel, FounderRecommendation,
} from '../types';
import { parseDate, daysBetween, todayIso, fmtDateLong, fmtDate } from './time';
import { STATUS_LABEL } from '../components/ui';

export interface NowInput {
  minutes?: number;
  energy?: EnergyLevel;
  note?: string;
}

export interface RankedMilestone {
  milestone: Milestone;
  loo: LineOfOperation | undefined;
  score: number;
  reasons: string[];
}

export interface ReasoningStep {
  question: string;
  answer: string;
}

export interface NextAction {
  text: string;
  milestoneId: string;
}

export interface RecommendationResult {
  horizon: StrategicHorizon;
  mainEffort: LineOfOperation | undefined;
  objective: HorizonObjective | undefined;
  daysToHorizon: number;
  recommendation: FounderRecommendation;
  next: NextAction[];
  ranked: RankedMilestone[];
  reasoning: ReasoningStep[];
  /** Echo of a user-supplied note or constraint, acknowledged not parsed. */
  noted?: string;
}

const OPEN = (m: Milestone) =>
  !['complete', 'archived', 'superseded'].includes(m.status);

const CONF_RANK = { low: 0, medium: 1, high: 2 } as const;

/** Score one open milestone against the strategic picture. */
const scoreMilestone = (
  m: Milestone,
  state: CampaignState,
  mainEffort: LineOfOperation | undefined,
  horizon: StrategicHorizon,
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];
  const today = todayIso();

  if (mainEffort && m.looId === mainEffort.id) {
    score += 30; reasons.push('On the Main Effort');
  }
  if (m.targetDate <= horizon.date) {
    score += 8; reasons.push('Lands before the active horizon');
  }
  switch (m.status) {
    case 'blocked': score += 18; reasons.push('Currently blocked'); break;
    case 'at-risk': score += 12; reasons.push('At risk'); break;
    case 'active': score += 8; reasons.push('Active now'); break;
    default: score += 2;
  }
  if (m.founderAction) {
    score += 16; reasons.push('Requires founder authority or relationships');
  }
  const unlocked = state.dependencies.filter((d) => {
    if (d.fromMilestoneId !== m.id) return false;
    const to = state.milestones.find((x) => x.id === d.toMilestoneId);
    return Boolean(to && OPEN(to));
  }).length;
  if (unlocked > 0) {
    score += Math.min(18, unlocked * 6);
    reasons.push(`Unlocks ${unlocked} downstream milestone${unlocked > 1 ? 's' : ''}`);
  }
  const days = daysBetween(parseDate(today), parseDate(m.targetDate));
  if (days <= 60) { score += 10; reasons.push(`Lands within ${Math.max(days, 0)} days`); }
  else if (days <= 120) { score += 6; }
  else { score += 2; }
  if (m.confidence === 'low') { score += 8; reasons.push('Low confidence — needs securing'); }
  else if (m.confidence === 'medium') { score += 4; }

  return { score, reasons };
};

/** Pick the largest candidate action that genuinely fits the window. */
const fitAction = (m: Milestone, minutes: number): CandidateAction => {
  const actions = [...(m.actions ?? [])].sort((a, b) => b.block - a.block);
  const fitting = actions.find((a) => a.block <= minutes);
  if (fitting) return fitting;
  if (actions.length > 0) return actions[actions.length - 1]; // smallest available
  return {
    id: `synth-${m.id}`,
    block: Math.min(90, minutes),
    text: m.nextBestAction || `Materially advance "${m.title}".`,
    completion: m.successCriteria[0]
      ?? `A concrete step toward "${m.title}" is complete and recorded.`,
  };
};

/** Unresolved conditions standing in front of a milestone. */
const openBlockers = (m: Milestone, state: CampaignState): string[] => {
  const blockers: string[] = [];
  state.dependencies
    .filter((d) => d.toMilestoneId === m.id)
    .forEach((d) => {
      if (d.fromMilestoneId) {
        const from = state.milestones.find((x) => x.id === d.fromMilestoneId);
        if (from && OPEN(from)) blockers.push(from.title);
      } else if (d.label) {
        blockers.push(d.label);
      }
    });
  m.decisions.filter((d) => !d.resolved).forEach((d) => blockers.push(`Decision: ${d.text}`));
  return blockers;
};

export const recommend = (state: CampaignState, input: NowInput = {}): RecommendationResult | null => {
  // 1. Current Strategic Horizon
  const horizon =
    state.horizons.find((h) => h.id === state.campaign.activeHorizonId && !h.archived)
    ?? state.horizons.filter((h) => !h.archived).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!horizon) return null;
  const daysToHorizon = daysBetween(parseDate(todayIso()), parseDate(horizon.date));

  // 3. Main Effort
  const mainEffort = state.loos.find((l) => l.role === 'main-effort' && !l.archived);

  // 4. Least secure objective on the Main Effort at this horizon
  const horizonObjectives = state.objectives.filter((o) => o.horizonId === horizon.id);
  const objective =
    horizonObjectives.filter((o) => o.looId === mainEffort?.id)
      .sort((a, b) => CONF_RANK[a.confidence] - CONF_RANK[b.confidence])[0]
    ?? horizonObjectives.sort((a, b) => CONF_RANK[a.confidence] - CONF_RANK[b.confidence])[0];

  // 5. Which milestone most materially advances the picture
  const ranked: RankedMilestone[] = state.milestones
    .filter(OPEN)
    .map((m) => {
      const { score, reasons } = scoreMilestone(m, state, mainEffort, horizon);
      return { milestone: m, loo: state.loos.find((l) => l.id === m.looId), score, reasons };
    })
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  const m = top.milestone;

  // 9. What fits the time actually available
  let minutes = input.minutes ?? state.capacity.minutes;
  if ((input.energy ?? state.capacity.energy) === 'low') {
    minutes = Math.min(minutes, 60); // low energy: a bounded, completable piece
  }
  const action = fitAction(m, minutes);

  // 6. What is blocking or delaying it
  const blockers = openBlockers(m, state);

  const unlocked = m.unlocks
    ?? state.dependencies
      .filter((d) => d.fromMilestoneId === m.id)
      .map((d) => state.milestones.find((x) => x.id === d.toMilestoneId)?.title)
      .filter((t): t is string => Boolean(t));

  const looName = top.loo?.name ?? 'its line';
  const whyThis = mainEffort && m.looId === mainEffort.id
    ? `This is the next founder-owned action on the current Main Effort (${mainEffort.name}). It removes the primary blocker from "${m.title}", which carries the ${fmtDate(horizon.date)} ${looName} objective${unlocked.length > 0 ? ', and it unlocks dependent decisions on other lines' : ''}.`
    : `"${m.title}" is currently the highest-leverage open milestone: ${top.reasons.slice(0, 3).join(', ').toLowerCase()}.`;

  const days = daysBetween(parseDate(todayIso()), parseDate(m.targetDate));
  const whyNow = `"${m.title}" is due ${fmtDate(m.targetDate)} (${Math.max(days, 0)} days), reads ${STATUS_LABEL[m.status].toLowerCase()} at ${m.confidence} confidence, and ${daysToHorizon} days remain to the active horizon.${blockers.length > 0 ? ` In front of it: ${blockers.slice(0, 2).join('; ').toLowerCase()}.` : ''}`;

  const whyFounder = m.founderAction
    ? 'It needs founder-level judgement, authority or relationships. It cannot be delegated.'
    : 'It could be delegated if capacity existed; today the founder is the fastest path.';

  const recommendation: FounderRecommendation = {
    action,
    milestoneId: m.id,
    looId: m.looId,
    horizonId: horizon.id,
    objectiveId: objective?.id ?? '',
    whyThis,
    whyNow,
    whyFounder,
    unlocked,
    consequenceOfDelay: m.consequenceOfDelay
      ?? `"${m.title}" slips, and everything that depends on it compresses toward the horizon.`,
    notToday: state.campaign.notToday,
  };

  // Next two actions: sequenced, from the next-ranked milestones
  const next: NextAction[] = ranked.slice(1, 3).map((r) => {
    const a = fitAction(r.milestone, 60);
    return { text: a.text, milestoneId: r.milestone.id };
  });

  const reasoning: ReasoningStep[] = [
    { question: 'Current Strategic Horizon', answer: `${fmtDateLong(horizon.date)} · ${horizon.theme} (${daysToHorizon} days remaining)` },
    { question: 'Integrated Horizon State', answer: horizon.integratedState },
    { question: 'Main Effort', answer: mainEffort ? `${mainEffort.name} (${mainEffort.owner})` : 'Not set' },
    { question: 'Least secure objective', answer: objective ? `${objective.statement} (confidence ${objective.confidence})` : 'None defined' },
    { question: 'Most material milestone', answer: `${m.title} — ${top.reasons.join('; ').toLowerCase()}` },
    { question: 'Currently in front of it', answer: blockers.length > 0 ? blockers.join('; ') : 'No recorded blockers' },
    { question: 'Best action for the time available', answer: `${action.text} (${action.block} minutes against ${minutes} available)` },
    { question: 'Why the founder', answer: whyFounder },
    { question: 'Consciously not today', answer: state.campaign.notToday.join('; ') },
  ];

  return {
    horizon,
    mainEffort,
    objective,
    daysToHorizon,
    recommendation,
    next,
    ranked,
    reasoning,
    noted: input.note?.trim() || undefined,
  };
};
