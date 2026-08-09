import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { logger } from "@utils/logger";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY!,
});

interface ChatRequest {
  message: string;
  courseIds: string[] | "all";
}

interface ClassroomContext {
  assignments: {
    title: string;
    course: string;
    dueAt: string | null;
    submissionState: string;
    description?: string;
  }[];
  announcements: {
    course: string;
    text: string;
    createdAt: string;
  }[];
  courses: {
    id: string;
    name: string;
  }[];
}

/**
 * Fetch the user's Classroom data.
 */
async function getClassroomContext(
  userId: string,
  courseIds: string[] | "all"
): Promise<ClassroomContext> {
  const coursesQuery =
    courseIds === "all"
      ? { where: { userId } }
      : { where: { userId, courseId: { in: courseIds } } };

  const enrollments = await prisma.courseEnrollment.findMany({
    ...coursesQuery,
    include: {
      course: true,
    },
  });

  const selectedCourseIds = enrollments.map((e) => e.courseId);

  const [assignments, announcements, courses] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        userId,
        courseId: {
          in: selectedCourseIds,
        },
      },
      include: {
        course: true,
      },
    }),

    prisma.announcement.findMany({
      where: {
        courseId: {
          in: selectedCourseIds,
        },
      },
      include: {
        course: true,
      },
    }),

    prisma.course.findMany({
      where: {
        id: {
          in: selectedCourseIds,
        },
      },
    }),
  ]);

  return {
    assignments: assignments.map((a) => ({
      title: a.title,
      course: a.course.name,
      dueAt: a.dueAt ? a.dueAt.toISOString() : null,
      submissionState: a.submissionState,
      description: a.description ?? undefined,
    })),

    announcements: announcements.map((a) => ({
      course: a.course.name,
      text: a.text,
      createdAt: a.creationTime.toISOString(),
    })),

    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
    })),
  };
}

/**
 * Creates the prompt for Gemini using the user's Classroom data.
 */
function buildPrompt(
  context: ClassroomContext,
  question: string
): string {
  return `
You are ClassNotify AI.

You help students answer questions about their Google Classroom.

Use ONLY the classroom data below.

If the answer cannot be found, politely say that it isn't available.

Never invent assignments, deadlines, or announcements.

==========================
COURSES
==========================

${context.courses.map((c) => `• ${c.name}`).join("\n")}

==========================
ASSIGNMENTS
==========================

${
  context.assignments.length
    ? context.assignments
        .map(
          (a) => `
Title: ${a.title}
Course: ${a.course}
Due: ${a.dueAt ? new Date(a.dueAt).toLocaleString() : "No due date"}
Status: ${a.submissionState}
Description: ${a.description ?? "None"}
`
        )
        .join("\n")
    : "No assignments found."
}

==========================
ANNOUNCEMENTS
==========================

${
  context.announcements.length
    ? context.announcements
        .map(
          (a) => `
Course: ${a.course}
Announcement: ${a.text}
Posted: ${new Date(a.createdAt).toLocaleString()}
`
        )
        .join("\n")
    : "No announcements found."
}

==========================
STUDENT QUESTION
==========================

${question}

Answer naturally.

When listing assignments:
• Include course
• Include due date
• Mention submission status

Be concise and helpful.
`;
}

export async function chatWithClassroom(
  userId: string,
  request: ChatRequest
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    return "Gemini API is not configured.";
  }

  const context = await getClassroomContext(
    userId,
    request.courseIds
  );

  if (context.courses.length === 0) {
    return "No courses found. Please sync your Google Classroom first.";
  }

  const prompt = buildPrompt(
    context,
    request.message
  );

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return (
      response.text ??
      "I couldn't generate a response."
    );
  } catch (error: any) {
  console.error("===== GEMINI ERROR =====");
  console.error("Message:", error?.message);
  console.error("Status:", error?.status);
  console.error("Full error:", error);
  console.error("========================");

  logger.error(
    `[ai-chat] Gemini API error: ${error?.message ?? "Unknown error"}`
  );

  return `Gemini error: ${error?.message ?? "Unknown error"}`;
}
}