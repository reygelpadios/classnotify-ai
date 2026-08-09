import { Assignment, COMPLETED_STATES } from "@/lib/types";

function dueBadge(assignment: Assignment): { label: string; className: string } {
  if (COMPLETED_STATES.includes(assignment.submissionState)) {
    return { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
  }
  if (!assignment.dueAt) {
    return { label: "No due date", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" };
  }
  const due = new Date(assignment.dueAt);
  if (due.getTime() < Date.now()) {
    return { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  }
  return { label: due.toLocaleDateString(), className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
}

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const badge = dueBadge(assignment);

  return (
    <a
      href={assignment.classroomLink}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{assignment.title}</p>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{assignment.course.name}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
    </a>
  );
}
