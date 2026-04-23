import { callLLM, parseJsonLoose } from "./provider";
import { EXPLAIN_SYSTEM } from "./prompts";
import type { ExplainResponse } from "./types";

export async function explain(input: {
  rawText: string;
  url?: string;
  courseName?: string;
}): Promise<ExplainResponse> {
  const trimmed = (input.rawText ?? "").slice(0, 8000).trim();
  const user = [
    input.courseName ? `Course: ${input.courseName}` : null,
    input.url ? `Source URL: ${input.url}` : null,
    "Text to explain:",
    trimmed || "(no text provided)",
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await callLLM(EXPLAIN_SYSTEM, user);

  if (res.stub) {
    return stubExplain(trimmed, input.courseName);
  }

  const parsed = parseJsonLoose<ExplainResponse>(res.text);
  if (!parsed || parsed.mode !== "explain") {
    return stubExplain(trimmed, input.courseName, "(couldn't parse AI response)");
  }

  return {
    mode: "explain",
    summary: String(parsed.summary ?? ""),
    whatToDo: Array.isArray(parsed.whatToDo) ? parsed.whatToDo.map(String) : [],
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map(String)
      : [],
  };
}

function stubExplain(
  raw: string,
  course?: string,
  note?: string,
): ExplainResponse {
  const snippet = raw.slice(0, 140).replace(/\s+/g, " ");
  return {
    mode: "explain",
    summary: `${course ? `[${course}] ` : ""}Looks like a course page or assignment. ${snippet ? `It starts with: "${snippet}…"` : ""} ${note ?? ""}`.trim(),
    whatToDo: [
      "Open the page and read the top once",
      "Note the due date somewhere you'll see it",
      "Pick one tiny first step you can do now",
    ],
    keyPoints: [
      "Find the due date — write it down",
      "Find what's being submitted (file? essay? quiz?)",
      "Find any rubric / point breakdown",
      "If unclear, message the prof — short email",
    ],
    stub: true,
  };
}
