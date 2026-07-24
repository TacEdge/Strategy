/**
 * TACEDGE Strategy — strategic model types.
 * Lines of Operation endure; Strategic Horizons synchronise them;
 * milestones are conditions that must become true.
 */

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
}

export interface LineOfOperation {
  id: string;
  number: number;
  name: string;
  description: string;
  owner: string;
  archived: boolean;
}

export interface HorizonObjective {
  id: string;
  horizonId: string;
  looId: string;
  statement: string;
  /** Short form shown at the horizon marker on the diagram. */
  summary: string;
  confidence: Confidence;
}

export interface StrategicHorizon {
  id: string;
  date: string; // ISO date
  theme: string;
  /** The Endstate: what TACEDGE looks like at this horizon. */
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

export interface Milestone {
  id: string;
  title: string;
  /** Concise diagram label, 1-3 words. The full title lives in the drawer. */
  shortLabel?: string;
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
  weekly: WeeklyPlan;
}
