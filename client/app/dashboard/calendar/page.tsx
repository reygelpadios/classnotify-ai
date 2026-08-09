"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Assignment } from "@/lib/types";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    apiFetch<{ assignments: Assignment[] }>("/assignments").then((d) => setAssignments(d.assignments));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (!a.dueAt) continue;
      const key = new Date(a.dueAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [assignments]);

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstWeekday = cursor.getDay();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          ← Prev
        </button>
        <h2 className="font-medium">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
          const dayAssignments = byDay.get(date.toDateString()) ?? [];
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={day}
              className={`min-h-[80px] rounded-lg border p-1.5 text-xs ${
                isToday
                  ? "border-gray-900 dark:border-gray-100"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <p className="mb-1 font-medium text-gray-500 dark:text-gray-400">{day}</p>
              <div className="flex flex-col gap-0.5">
                {dayAssignments.slice(0, 3).map((a) => (
                  <a
                    key={a.id}
                    href={a.classroomLink}
                    target="_blank"
                    rel="noreferrer"
                    title={a.title}
                    className="truncate rounded bg-blue-100 px-1 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  >
                    {a.title}
                  </a>
                ))}
                {dayAssignments.length > 3 && (
                  <span className="text-gray-400">+{dayAssignments.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
