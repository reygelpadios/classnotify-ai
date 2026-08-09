import { google, classroom_v1 } from "googleapis";
import { clientWithAccessToken } from "./googleAuth.service";

function classroomClient(accessToken: string): classroom_v1.Classroom {
  return google.classroom({ version: "v1", auth: clientWithAccessToken(accessToken) });
}

export async function listActiveCourses(accessToken: string): Promise<classroom_v1.Schema$Course[]> {
  const classroom = classroomClient(accessToken);
  const courses: classroom_v1.Schema$Course[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await classroom.courses.list({
      courseStates: ["ACTIVE"],
      studentId: "me",
      pageToken,
    });
    courses.push(...(data.courses ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return courses;
}

export async function listCourseWork(
  accessToken: string,
  courseId: string
): Promise<classroom_v1.Schema$CourseWork[]> {
  const classroom = classroomClient(accessToken);
  const items: classroom_v1.Schema$CourseWork[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await classroom.courses.courseWork.list({
      courseId,
      pageToken,
      courseWorkStates: ["PUBLISHED"],
    });
    items.push(...(data.courseWork ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}

export async function listAnnouncements(
  accessToken: string,
  courseId: string
): Promise<classroom_v1.Schema$Announcement[]> {
  const classroom = classroomClient(accessToken);
  const items: classroom_v1.Schema$Announcement[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await classroom.courses.announcements.list({
      courseId,
      pageToken,
      announcementStates: ["PUBLISHED"],
    });
    items.push(...(data.announcements ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}

/**
 * Fetches this student's own submission for a piece of courseWork.
 * `userId: "me"` scopes the list to the authenticated student.
 */
export async function getMySubmission(
  accessToken: string,
  courseId: string,
  courseWorkId: string
): Promise<classroom_v1.Schema$StudentSubmission | undefined> {
  const classroom = classroomClient(accessToken);
  const { data } = await classroom.courses.courseWork.studentSubmissions.list({
    courseId,
    courseWorkId,
    userId: "me",
  });
  return data.studentSubmissions?.[0];
}

/** Builds the classroom.google.com deep link for a piece of courseWork. */
export function courseWorkLink(courseId: string, courseWorkId: string): string {
  return `https://classroom.google.com/c/${courseId}/a/${courseWorkId}/details`;
}

/** Converts Classroom's split date/time object into a JS Date, or null. */
export function toDueDate(
  dueDate?: classroom_v1.Schema$Date | null,
  dueTime?: classroom_v1.Schema$TimeOfDay | null
): Date | null {
  if (!dueDate?.year || !dueDate.month || !dueDate.day) return null;
  return new Date(
    Date.UTC(
      dueDate.year,
      dueDate.month - 1,
      dueDate.day,
      dueTime?.hours ?? 23,
      dueTime?.minutes ?? 59
    )
  );
}
