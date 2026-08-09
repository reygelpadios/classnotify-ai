export interface Course {
  id: string;
  name: string;
  section?: string | null;
  courseLink?: string | null;
}

export type SubmissionState = "NEW" | "CREATED" | "TURNED_IN" | "RETURNED" | "RECLAIMED_BY_STUDENT";

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  dueAt: string | null;
  classroomLink: string;
  submissionState: SubmissionState;
  course: Course;
}

export interface Stats {
  completed: number;
  upcoming: number;
  overdue: number;
  totalCourses: number;
}

export interface Settings {
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  weeklySummaryEnabled: boolean;
  weeklySummaryDay: number;
  smartRemindersEnabled: boolean;
  announcementsEnabled: boolean;
}

export interface StudyPlanItem {
  day: string;
  task: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  timezone: string;
}

export const COMPLETED_STATES: SubmissionState[] = ["TURNED_IN", "RETURNED"];
