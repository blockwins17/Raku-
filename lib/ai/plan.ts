import { callLLM, parseJsonLoose } from "./provider";
import { PLAN_SYSTEM } from "./prompts";
import type { PlanResponse, Subtask } from "./types";

type PlanInput = {
  windowMinutes: number;
  startHHMM?: string; // default "now"
  subtasks: Array<Subtask & { id?: string; dueAt?: string | null }>;
};

export async function plan(input: PlanInput): Promise<PlanResponse> {
  const windowMinutes = Math.max(30, Math.min(240, input.windowMinutes));
  const startHHMM = input.startHHMM ?? currentHHMM();

  const user = [
    `Student has ${windowMinutes} minutes, starting at ${startHHMM}.`,
    "Here are candidate subtasks (use their ids in blocks when a block matches one):",
    ...input.subtasks.slice(0, 20).map((s) =>
      JSON.stringify({
        id: s.id ?? null,
        title: s.title,
        estimatedMinutes: s.estimatedMinutes,
        dueAt: s.dueAt ?? null,
      }),
    ),
  ].join("\n");

  const res = await callLLM(PLAN_SYSTEM, user);
  if (res.stub) {
    return stubPlan(windowMinutes, startHHMM, input.subtasks);
  }

  const parsed = parseJsonLoose<PlanResponse>(res.text);
  if (!parsed || parsed.mode !== "plan" || !Array.isArray(parsed.blocks)) {
    return stubPlan(windowMinutes, startHHMM, input.subtasks);
  }

  return {
    mode: "plan",
    windowMinutes,
    blocks: parsed.blocks.slice(0, 6).map((b) => ({
      start: String(b.start ?? ""),
      end: String(b.end ?? ""),
      subtaskId: b.subtaskId ? String(b.subtaskId) : null,
      description: String(b.description ?? "").slice(0, 140),
    })),
  };
}

function currentHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const total = h * 60 + m + minutes;
  const nh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

function stubPlan(
  windowMinutes: number,
  startHHMM: string,
  subtasks: PlanInput["subtasks"],
): PlanResponse {
  const blocks: PlanResponse["blocks"] = [];
  let cursor = startHHMM;
  let remaining = windowMinutes;

  const pool = subtasks.length
    ? subtasks
    : [
        { title: "Pick one tiny thing and start", estimatedMinutes: 15 } as Subtask,
        { title: "Do the 2nd tiny thing", estimatedMinutes: 15 } as Subtask,
      ];

  for (const s of pool) {
    const len = Math.min(25, Math.max(10, s.estimatedMinutes));
    if (remaining < len + 5) break;
    const end = addMinutes(cursor, len);
    blocks.push({
      start: cursor,
      end,
      subtaskId: (s as { id?: string }).id ?? null,
      description: s.title,
    });
    cursor = addMinutes(end, 5);
    remaining -= len + 5;
    if (blocks.length >= 4) break;
  }

  return { mode: "plan", windowMinutes, blocks, stub: true };
}
