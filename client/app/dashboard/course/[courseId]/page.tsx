"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Assignment, Course } from "@/lib/types";
import { AssignmentCard } from "@/components/AssignmentCard";

const COMPLETED_STATES = ["TURNED_IN", "RETURNED"];

export default function CoursePage() {
  const router = useRouter();
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;

    apiFetch<{ assignments: Assignment[] }>(`/assignments?courseId=${courseId}`)
      .then((d) => {
        setAssignments(d.assignments);
        if (d.assignments.length > 0) {
          setCourse(d.assignments[0].course);
        }
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  const grouped = useMemo(() => {
    const pending: Assignment[] = [];
    const submitted: Assignment[] = [];
    const completed: Assignment[] = [];

    for (const a of assignments) {
      if (COMPLETED_STATES.includes(a.submissionState)) {
        completed.push(a);
      } else if (a.submissionState === "TURNED_IN") {
        submitted.push(a);
      } else {
        pending.push(a);
      }
    }

    return { pending, submitted, completed };
  }, [assignments]);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (!course) {
    return (
      <div className="text-center">
        <p className="text-gray-400">Course not found</p>
        <button
          onClick={() => router.back()}
          className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="mb-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{course.name}</h1>
      </div>

      {/* Pending */}
      {grouped.pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-orange-600 dark:text-orange-400">Pending ({grouped.pending.length})</h2>
          <div className="flex flex-col gap-2">
            {grouped.pending.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {/* Submitted */}
      {grouped.submitted.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-blue-600 dark:text-blue-400">Submitted ({grouped.submitted.length})</h2>
          <div className="flex flex-col gap-2">
            {grouped.submitted.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {grouped.completed.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-emerald-600 dark:text-emerald-400">Completed ({grouped.completed.length})</h2>
          <div className="flex flex-col gap-2">
            {grouped.completed.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {assignments.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400 dark:border-gray-800">
          No assignments for this course yet.
        </p>
      )}
    </div>
  );
}
