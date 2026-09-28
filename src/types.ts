/**
 * TACEDGE Strategy — strategic model types.
 *
 * Deliberately small. The diagram is read at a glance: a milestone is a
 * labelled condition on a Line of Operation at a point in time, and a
 * Strategic Horizon is a labelled synchronisation point across all lines.
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

/** A vertical synchronisation point. Lines continue through and beyond it. */
export interface StrategicHorizon {
  id: string;
  date: string; // ISO date
  theme: string;
}

/** A condition that must become true, not an activity. */
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
