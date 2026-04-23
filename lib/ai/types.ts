// Shared types for Raku AI chat modes.

export type ExplainResponse = {
  mode: "explain";
  summary: string;
  whatToDo: string[];
  keyPoints: string[];
  stub?: boolean;
};

export type Subtask = {
  title: string;
  estimatedMinutes: number;
};

export type BreakdownResponse = {
  mode: "breakdown";
  subtasks: Subtask[];
  totalMinutes: number;
  stub?: boolean;
};

export type PlanBlock = {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  subtaskId: string | null;
  description: string;
};

export type PlanResponse = {
  mode: "plan";
  windowMinutes: number;
  blocks: PlanBlock[];
  stub?: boolean;
};

export type PauseResponse = {
  mode: "pause";
  pauseUntil: string | null; // ISO
  message: string;
};

export type CaptureResponse =
  | { status: "ok"; captureId: string; explanation?: ExplainResponse }
  | { status: "error"; error: string };

export type AiError = { error: string };
