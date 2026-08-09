export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Sign in to ClassNotify AI</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Connect your Google account to sync Classroom assignments and get Telegram reminders.
      </p>
      <a
        href="/api/auth/google"
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
      >
        Sign in with Google
      </a>
    </main>
  );
}
