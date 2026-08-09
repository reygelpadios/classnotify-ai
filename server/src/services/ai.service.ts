import { env } from "@config/env";
import { prisma } from "@config/prisma";
import { logger } from "@utils/logger";
import { GoogleGenAI } from "@google/genai";

interface AiAnalysis {
  estimatedMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  studyPlan: { day: string; task: string }[];
}

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY!,
});

const SYSTEM_PROMPT = `You are a study-planning assistant for a student. Given an assignment's
title, description, and due date, respond with ONLY a JSON object (no prose, no markdown fences):
{"estimatedMinutes": number, "difficulty": "Easy"|"Medium"|"Hard", "studyPlan": [{"day": string, "task": string}]}`;

/**
 * Calls the Anthropic API to estimate effort/difficulty and suggest a study plan.
 * No-ops (returns null) if ANTHROPIC_API_KEY isn't configured yet — safe to call
 * from the sync pipeline without breaking anything in stub mode.
 */
export async function analyzeAssignment(
  title: string,
  description: string | null,
  dueAt: Date | null
): Promise<AiAnalysis | null> {
  export async function analyzeAssignment(
  title: string,
  description: string | null,
  dueAt: Date | null
): Promise<AiAnalysis | null> {
  if (!env.GEMINI_API_KEY) {
    logger.debug("[ai] GEMINI_API_KEY not set.");
    return null;
  }

  const prompt = `
${SYSTEM_PROMPT}

Title: ${title}

Description:
${description ?? "(none)"}

Due:
${dueAt ? dueAt.toISOString() : "(none)"}

Today:
${new Date().toISOString()}
`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = result.text ?? "";

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned) as AiAnalysis;
  } catch (err) {
    logger.error("[ai] Gemini error:", err);
    return null;
  }
}

/** Analyzes an assignment and persists the result onto its row. */
export async function analyzeAndSaveAssignment(assignmentId: string) {
  const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
  const analysis = await analyzeAssignment(assignment.title, assignment.description, assignment.dueAt);
  if (!analysis) return null;

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      aiEstimatedMinutes: analysis.estimatedMinutes,
      aiDifficulty: analysis.difficulty,
      aiStudyPlan: analysis.studyPlan,
    },
  });

  return analysis;
}
