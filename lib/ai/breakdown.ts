import { callLLM, parseJsonLoose } from "./provider";
import { BREAKDOWN_SYSTEM } from "./prompts";
import type { BreakdownResponse } from "./types";

export async function breakdown(input: {
  title: string;
  description?: string;
  dueDate?: string;
  courseName?: string;
}): Promise<BreakdownResponse> {
  const user = [
    `Assignment title: ${input.title}`,
    input.courseName ? `Course: ${input.courseName}` : null,
    input.dueDate ? `Due: ${input.dueDate}` : null,
    input.description ? `Details:\n${input.description.slice(0, 4000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await callLLM(BREAKDOWN_SYSTEM, user);
  if (res.stub) {
    return stubBreakdown(input.title);
  }

  const parsed = parseJsonLoose<BreakdownResponse>(res.text);
  if (!parsed || parsed.mode !== "breakdown" || !Array.isArray(parsed.subtasks)) {
    return stubBreakdown(input.title);
  }

  const subtasks = parsed.subtasks
    .map((s) => ({
      title: String(s.title ?? "").trim(),
      estimatedMinutes: clamp(Number(s.estimatedMinutes) || 10, 5, 20),
    }))
    .filter((s) => s.title.length > 0)
    .slice(0, 8);

  const totalMinutes = subtasks.reduce((a, b) => a + b.estimatedMinutes, 0);
  return { mode: "breakdown", subtasks, totalMinutes };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function stubBreakdown(title: string): BreakdownResponse {
  const subtasks = [
    { title: `Open whatever "${title.slice(0, 40)}" lives in`, estimatedMinutes: 5 },
    { title: "Read the prompt once, top to bottom", estimatedMinutes: 10 },
    { title: "Write a 1-sentence version of the goal", estimatedMinutes: 10 },
    { title: "Do the very first visible step", estimatedMinutes: 15 },
    { title: "Stop. Re-read. Save.", estimatedMinutes: 5 },
  ];
  return {
    mode: "breakdown",
    subtasks,
    totalMinutes: subtasks.reduce((a, b) => a + b.estimatedMinutes, 0),
    stub: true,
  };
}
