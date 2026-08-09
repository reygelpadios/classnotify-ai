"use client";

export function ThemeInit() {
  return (
    <script
      // Runs before React hydrates so there's no flash of the wrong theme.
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const saved = window.localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (saved === 'dark' || (!saved && prefersDark)) {
              document.documentElement.classList.add('dark');
            }
          } catch (e) {}
        `,
      }}
    />
  );
}
