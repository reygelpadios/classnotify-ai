"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Assignment, Course, Stats } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { CourseCard } from "@/components/CourseCard";

type StatusFilter = "all" | "pending" | "missing" | "completed" | "overdue";

interface CourseStats {
  pending: number;
  missing: number;
  completed: number;
  nextDueDate?: string | null;
}

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function loadAssignments() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());

    const data = await apiFetch<{ assignments: Assignment[] }>(`/assignments?${params.toString()}`);
    setAssignments(data.assignments);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadAssignments(),
      apiFetch<{ courses: Course[] }>("/courses").then((d) => setCourses(d.courses)),
      apiFetch<Stats>("/stats").then(setStats),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await apiFetch("/sync/now", { method: "POST" });
      await Promise.all([loadAssignments(), apiFetch<Stats>("/stats").then(setStats)]);
    } finally {
      setSyncing(false);
    }
  }

  const courseStatsMap = useMemo(() => {
    const map = new Map<string, CourseStats>();

    for (const course of courses) {
      map.set(course.id, { pending: 0, missing: 0, completed: 0, nextDueDate: null });
    }

    for (const assignment of assignments) {
      const courseStats = map.get(assignment.course.id);
      if (!courseStats) continue;

      if (assignment.submissionState === "TURNED_IN" || assignment.submissionState === "RETURNED") {
        courseStats.completed++;
      } else if (assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now()) {
        courseStats.missing++;
      } else {
        courseStats.pending++;
      }

      if (assignment.dueAt && (!courseStats.nextDueDate || new Date(assignment.dueAt) < new Date(courseStats.nextDueDate))) {
        courseStats.nextDueDate = assignment.dueAt;
      }
    }

    return map;
  }, [assignments, courses]);

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "missing", label: "Missing" },
    { key: "completed", label: "Completed" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Courses" value={stats?.totalCourses ?? 0} />
        <StatCard label="Pending" value={stats?.upcoming ?? 0} tone="warning" />
        <StatCard label="Missing" value={stats?.overdue ?? 0} tone="warning" />
        <StatCard label="Completed" value={stats?.completed ?? 0} tone="success" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                status === tab.key
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-900 sm:w-48"
          />

          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400 dark:border-gray-800">
          No courses found. Please sync your Classroom data first.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              stats={courseStatsMap.get(course.id) || { pending: 0, missing: 0, completed: 0 }}
              nextDueDate={courseStatsMap.get(course.id)?.nextDueDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
