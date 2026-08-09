interface AssignmentLike {
  title: string;
  courseName: string;
  dueAt: Date | null;
  classroomLink: string;
}

export function reminderMessage(a: {
  title: string;
  courseName: string;
  dueAt: Date;
  classroomLink: string;
  now?: Date;
}): string {
  const now = a.now ?? new Date();
  const msRemaining = a.dueAt.getTime() - now.getTime();
  const overdue = msRemaining < 0;
  const absMins = Math.round(Math.abs(msRemaining) / 60000);

  let timeLabel: string;
  if (absMins < 60) {
    timeLabel = `${absMins} min`;
  } else if (absMins < 24 * 60) {
    timeLabel = `${Math.round(absMins / 60)} hr`;
  } else {
    timeLabel = `${Math.round(absMins / (60 * 24))} day(s)`;
  }

  const headline = overdue ? `⏰ *Overdue* — ${timeLabel} past due` : `⏳ *Reminder* — ${timeLabel} left`;

  return [
    headline,
    "",
    `📝 ${a.title}`,
    `📚 ${a.courseName}`,
    `📅 Due: ${a.dueAt.toLocaleString()}`,
    "",
    `Open: ${a.classroomLink}`,
  ].join("\n");
}

export function newAssignmentMessage(a: AssignmentLike): string {
  const due = a.dueAt ? a.dueAt.toLocaleString() : "No due date";
  return [
    "🔔 *New Assignment*",
    "",
    `📚 Course: ${a.courseName}`,
    `📝 Title: ${a.title}`,
    `📅 Due: ${due}`,
    "",
    "Good luck!",
    `Open: ${a.classroomLink}`,
  ].join("\n");
}

export function submittedMessage(a: { title: string; courseName: string }): string {
  return [
    "✅ *Assignment Submitted*",
    "",
    a.title,
    "",
    `Course: ${a.courseName}`,
    "",
    "Congratulations! Future reminders have been cancelled.",
  ].join("\n");
}

export function updatedMessage(a: { title: string; oldDue: string; newDue: string }): string {
  return [
    "✏️ *Assignment Updated*",
    "",
    `The deadline for *${a.title}* has changed.`,
    "",
    `Old Due Date: ${a.oldDue}`,
    `New Due Date: ${a.newDue}`,
    "",
    "Reminder schedule has been updated.",
  ].join("\n");
}

export function dailySummaryMessage(
  items: { title: string; dueLabel: string }[]
): string {
  const lines = items.map((i) => `• ${i.title}\n  ${i.dueLabel}`);
  return ["🌅 *Good Morning*", "", "Today's Assignments", "", ...lines, "", "Have a productive day!"].join("\n");
}

export interface AssignmentButton {
  text: string;
  callbackData?: string;
  url?: string;
}

/** Standard button row attached to assignment notifications: View / Open / Remind Later / Mark Done. */
export function assignmentButtons(assignmentId: string, classroomLink: string): AssignmentButton[][] {
  return [
    [
      { text: "View Assignment", callbackData: `view:${assignmentId}` },
      { text: "Open Classroom", url: classroomLink },
    ],
    [
      { text: "Remind Later", callbackData: `snooze:${assignmentId}` },
      { text: "Mark Done", callbackData: `done:${assignmentId}` },
    ],
  ];
}

export function weeklySummaryMessage(stats: {
  completed: number;
  remaining: number;
  overdue: number;
}): string {
  return [
    "📊 *Weekly Summary*",
    "",
    "Assignments",
    "",
    `Completed: ${stats.completed}`,
    `Remaining: ${stats.remaining}`,
    `Overdue: ${stats.overdue}`,
    "",
    "Keep it up!",
  ].join("\n");
}
