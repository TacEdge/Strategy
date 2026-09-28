/**
 * Product terminology, in one place. The code keeps its original names
 * (`Milestone`, `StrategicHorizon`); the user-facing words come from here.
 *
 * - A **Key Task** is a condition on a Line of Operation at a point in time.
 * - A **Strategic Objective** is a synchronisation point across every line.
 */
export const TERMS = {
  task: 'Key Task',
  taskLower: 'key task',
  tasks: 'Key Tasks',
  tasksLower: 'key tasks',
  objective: 'Strategic Objective',
  objectiveLower: 'strategic objective',
  objectives: 'Strategic Objectives',
} as const;
