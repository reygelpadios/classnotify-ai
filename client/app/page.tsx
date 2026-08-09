export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">ClassNotify AI</h1>
      <p className="text-gray-500 dark:text-gray-400">
        Never miss a Google Classroom assignment again — automatic sync and smart
        Telegram reminders that adapt as your deadlines get closer.
      </p>
      <a
        href="/login"
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Get started
      </a>
    </main>
  );
}
