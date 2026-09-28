/**
 * TACEDGE Strategy — strategic model types.
 *
 * Deliberately small. The diagram is read at a glance: a key task is a
 * labelled condition on a Line of Operation at a point in time, and a
 * strategic milestone is a labelled synchronisation point across all lines.
 * Nothing here needs opening to be understood.
 */

export type MilestoneStatus =
  | 'future'
  | 'active'
  | 'at-risk'
  | 'blocked'
  | 'complete';

export interface Campaign {
  id: string;
  name: string;
  vision: string;
}

export interface LineOfOperation {
  id: string;
  number: number;
  name: string;
  description: string;
  owner: string;
  archived: boolean;
}

/**
 * Shown in the product as a **Strategic Milestone**: a vertical
 * synchronisation point. Lines continue through and beyond it.
 */
export interface StrategicHorizon {
  id: string;
  date: string; // ISO date
  theme: string;
}

/**
 * Shown in the product as a **Key Task**: a condition that must become
 * true on one line at a point in time.
 */
export interface Milestone {
  id: string;
  title: string;
  looId: string;
  targetDate: string; // ISO date
  status: MilestoneStatus;
  owner: string;
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
  milestones: Milestone[];
  weekly: WeeklyPlan;
}
