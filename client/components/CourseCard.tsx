import Link from "next/link";
import { Course } from "@/lib/types";

interface CourseCardProps {
  course: Course;
  stats: {
    pending: number;
    missing: number;
    completed: number;
  };
  nextDueDate?: string | null;
}

const courseColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-red-500 to-red-600",
];

// Simple hash function to consistently pick a color per course
function getCourseColor(courseId: string): string {
  const hash = courseId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return courseColors[hash % courseColors.length];
}

export function CourseCard({ course, stats, nextDueDate }: CourseCardProps) {
  const gradient = getCourseColor(course.id);
  const courseName = course.name.split(" - ")[0]; // Extract code like "ITP 223"
  const courseTitle = course.name.split(" - ")[1] || course.name; // Extract title

  return (
    <Link href={`/dashboard/course/${course.id}`} className="block h-full">
      <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${gradient} h-24 sm:h-32`} />

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 sm:p-6">
          {/* Course info */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{courseName}</h3>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{courseTitle}</h2>
          </div>

          {/* Stats grid */}
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-orange-500">{stats.pending}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{stats.missing}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Missing</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-500">{stats.completed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>

          {/* Spacer pushes Next Due + View link to the bottom, keeping all cards aligned */}
          <div className="flex-1" />

          {/* Next due date — always reserve this row's height, even when there's no date */}
          <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Next Due</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {nextDueDate
                ? new Date(nextDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : "—"}
            </p>
          </div>

          {/* View link */}
          <div className="mt-3 flex items-center text-sm font-medium text-blue-500 group-hover:text-blue-600">
            View Assignments →
          </div>
        </div>
      </div>
    </Link>
  );
}