"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: Settings; timezone: string }>("/settings").then((d) => {
      setSettings(d.settings);
      setTimezone(d.timezone);
    });
    apiFetch<{ linked: boolean; username: string | null }>("/telegram/status").then((d) => {
      setTelegramLinked(d.linked);
      setTelegramUsername(d.username);
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch("/settings", { method: "PUT", body: JSON.stringify({ ...settings, timezone }) });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    try {
      const data = await apiFetch<{ code: string }>("/telegram/link-code", { method: "POST" });
      setLinkCode(data.code);
    } finally {
      setGeneratingCode(false);
    }
  }

  async function handleUnlink() {
    await apiFetch("/telegram/unlink", { method: "POST" });
    setTelegramLinked(false);
    setTelegramUsername(null);
  }

  if (!settings) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="mb-2 font-medium">Telegram</h2>
        {telegramLinked ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Linked{telegramUsername ? ` as @${telegramUsername}` : ""} ✅
            </p>
            <button
              onClick={handleUnlink}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
            >
              Unlink
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Not linked yet. Generate a code, then send <code>/register &lt;code&gt;</code> to the bot on Telegram.
            </p>
            {linkCode ? (
              <p className="rounded-lg bg-gray-100 px-3 py-2 font-mono text-lg tracking-widest dark:bg-gray-800">
                {linkCode}
              </p>
            ) : null}
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="w-fit rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
            >
              {generatingCode ? "Generating…" : linkCode ? "Generate new code" : "Generate code"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="mb-3 font-medium">Notifications</h2>
        <div className="flex flex-col gap-3">
          <ToggleRow
            label="Smart reminders"
            checked={settings.smartRemindersEnabled}
            onChange={(v) => setSettings({ ...settings, smartRemindersEnabled: v })}
          />
          <ToggleRow
            label="Announcements"
            checked={settings.announcementsEnabled}
            onChange={(v) => setSettings({ ...settings, announcementsEnabled: v })}
          />
          <ToggleRow
            label="Daily summary"
            checked={settings.dailySummaryEnabled}
            onChange={(v) => setSettings({ ...settings, dailySummaryEnabled: v })}
          />
          {settings.dailySummaryEnabled && (
            <label className="flex items-center justify-between pl-4 text-sm text-gray-500 dark:text-gray-400">
              Time
              <input
                type="time"
                value={settings.dailySummaryTime}
                onChange={(e) => setSettings({ ...settings, dailySummaryTime: e.target.value })}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-gray-800 dark:bg-gray-900"
              />
            </label>
          )}
          <ToggleRow
            label="Weekly summary (Sunday)"
            checked={settings.weeklySummaryEnabled}
            onChange={(v) => setSettings({ ...settings, weeklySummaryEnabled: v })}
          />

          <label className="flex items-center justify-between text-sm">
            Timezone
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. America/New_York"
              className="w-48 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-800 dark:bg-gray-900"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
