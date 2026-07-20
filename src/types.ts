/**
 * TACEDGE Strategy — strategic model types.
 * Lines of Operation endure; Strategic Horizons synchronise them;
 * milestones are conditions that must become true.
 */

export type LooRole = 'main-effort' | 'supporting' | 'sustaining' | 'paused';

export type MilestoneStatus =
  | 'complete'
  | 'active'
  | 'at-risk'
  | 'blocked'
  | 'future'
  | 'superseded'
  | 'archived';

export type Confidence = 'high' | 'medium' | 'low';

export type HorizonStatus = 'on-track' | 'at-risk' | 'forming' | 'archived';

export type EnergyLevel = 'high' | 'medium' | 'low';

export interface Vision {
  statement: string;
  note: string;
}

export interface Campaign {
  id: string;
  name: string;
  theme: string;
  vision: Vision;
  activeHorizonId: string;
  /** The most important company constraint right now. */
  primaryConstraint: string;
  /** Attractive but lower-value work that should not consume founder time. */
  notToday: string[];
}

export interface LineOfOperation {
  id: string;
  number: number;
  name: string;
  description: string;
  owner: string;
  role: LooRole;
  archived: boolean;
}

export interface HorizonObjective {
  id: string;
  horizonId: string;
  looId: string;
  statement: string;
  confidence: Confidence;
}

export interface StrategicHorizon {
  id: string;
  date: string; // ISO date
  theme: string;
  integratedState: string;
  status: HorizonStatus;
  confidence: Confidence;
  assumptions: string[];
  risks: string[];
  assessment: string;
  archived: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  owner?: string;
  week?: string; // month view sequencing, e.g. "Week of 21 Jul"
}

export interface Risk {
  id: string;
  text: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Decision {
  id: string;
  text: string;
  due?: string;
  resolved: boolean;
}

export interface EvidenceItem {
  id: string;
  text: string;
  date?: string;
}

export interface ChangeHistoryEntry {
  id: string;
  at: string; // ISO datetime
  summary: string;
}

/**
 * A dependency feeding a milestone. Usually another milestone
 * (fromMilestoneId); occasionally a named condition that is not
 * yet tracked as a milestone (label).
 */
export interface Dependency {
  id: string;
  toMilestoneId: string;
  fromMilestoneId?: string;
  label?: string;
  note?: string;
}

/**
 * A concrete, completable action on a milestone at a given time scale.
 * The recommendation engine picks the largest action that genuinely fits
 * the available window — a 30-minute action is a different action, not a
 * shortened project.
 */
export interface CandidateAction {
  id: string;
  block: number; // minutes
  text: string;
  completion: string;
}

export interface Milestone {
  id: string;
  title: string;
  looId: string;
  targetDate: string; // ISO date
  status: MilestoneStatus;
  confidence: Confidence;
  owner: string;
  progress: number; // 0..100
  purpose: string;
  strategicImportance: string;
  successCriteria: string[];
  risks: Risk[];
  decisions: Decision[];
  tasks: Task[];
  evidence: EvidenceItem[];
  notes: string;
  nextBestAction: string;
  founderAction: boolean;
  major: boolean; // shown in year view and wider
  history: ChangeHistoryEntry[];
  /** Time-scaled candidate actions for the recommendation engine. */
  actions?: CandidateAction[];
  /** What becomes possible once this milestone is achieved. */
  unlocks?: string[];
  consequenceOfDelay?: string;
}

export interface Insight {
  id: string;
  text: string;
  kind: 'congestion' | 'founder' | 'sequencing' | 'resource' | 'momentum';
}

/** Produced by the recommendation engine (src/lib/recommend.ts). */
export interface FounderRecommendation {
  action: CandidateAction;
  milestoneId: string;
  looId: string;
  horizonId: string;
  objectiveId: string;
  whyThis: string;
  whyNow: string;
  whyFounder: string;
  unlocked: string[];
  consequenceOfDelay: string;
  notToday: string[];
}

/** Something that needs another person or event before the founder can act. */
export interface WaitingItem {
  id: string;
  text: string;
  who?: string;
}

/** Today's stated working capacity. The recommendation responds to it. */
export interface CapacityProfile {
  minutes: number; // 30 | 60 | 90 | 240 (half day) | 420 (full day)
  blocks: number; // focused work blocks available
  energy: EnergyLevel;
  meetings: string; // fixed commitments, free text
  together: boolean; // working with another founder
  constrainedDay: boolean; // constrained by military work
}

export interface DailyCloseout {
  id: string;
  date: string; // ISO date
  becameTrue: string;
  changed: string;
  primaryBlocker: string;
  newInformation: string;
  recommendationCorrect: boolean | null;
  mainEffortCorrect: boolean;
  carryForward: string;
}

export interface WeeklyPlan {
  /** The three most important outcomes for the next seven days. */
  outcomes: string[];
  updatedAt: string;
}

export interface CampaignState {
  schemaVersion: number;
  campaign: Campaign;
  loos: LineOfOperation[];
  looOrder: string[];
  horizons: StrategicHorizon[];
  objectives: HorizonObjective[];
  milestones: Milestone[];
  dependencies: Dependency[];
  insights: Insight[];
  waiting: WaitingItem[];
  capacity: CapacityProfile;
  closeouts: DailyCloseout[];
  weekly: WeeklyPlan;
}
