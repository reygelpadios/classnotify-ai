"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { StudyPlanItem } from "@/lib/types";

interface AiResult {
  estimatedMinutes: number;
  difficulty: string;
  studyPlan: StudyPlanItem[];
}

interface Props {
  assignmentId: string;
  initial?: {
    aiEstimatedMinutes?: number | null;
    aiDifficulty?: string | null;
    aiStudyPlan?: StudyPlanItem[] | null;
  };
}

const difficultyColor: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Hard: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.round((mins / 60) * 10) / 10;
  return `${hours} hr`;
}

export function AiStudyAssistant({ assignmentId, initial }: Props) {
  const [result, setResult] = useState<AiResult | null>(
    initial?.aiEstimatedMinutes != null && initial.aiDifficulty
      ? {
          estimatedMinutes: initial.aiEstimatedMinutes,
          difficulty: initial.aiDifficulty,
          studyPlan: initial.aiStudyPlan ?? [],
        }
      : null
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ analysis: AiResult }>(`/ai/analyze/${assignmentId}`, { method: "POST" });
      setResult(data.analysis);
      setOpen(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError("AI assistant isn't configured yet — add an ANTHROPIC_API_KEY on the server to enable this.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!result && !loading && !error) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          runAnalysis();
        }}
        className="w-fit rounded-lg border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ✨ AI Study Assistant
      </button>
    );
  }

  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/50"
      onClick={(e) => e.stopPropagation()}
    >
      {loading && <p className="text-gray-400">Analyzing…</p>}

      {error && (
        <div className="flex flex-col gap-1">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={runAnalysis} className="w-fit text-xs text-gray-500 underline">
            Try again
          </button>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
            }}
            className="flex items-center justify-between text-left font-medium text-gray-700 dark:text-gray-200"
          >
            <span>🤖 AI Study Assistant</span>
            <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
          </button>

          {open && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  ⏱ {formatMinutes(result.estimatedMinutes)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    difficultyColor[result.difficulty] ?? difficultyColor.Medium
                  }`}
                >
                  {result.difficulty}
                </span>
              </div>

              {result.studyPlan.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {result.studyPlan.map((item, i) => (
                    <li key={i} className="flex gap-2 text-gray-600 dark:text-gray-300">
                      <span className="min-w-[70px] shrink-0 font-medium text-gray-400 dark:text-gray-500">
                        {item.day}:
                      </span>
                      <span>{item.task}</span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  runAnalysis();
                }}
                className="w-fit text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
              >
                Re-analyze
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
