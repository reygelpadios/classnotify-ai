interface StatCardProps {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-gray-900 dark:text-gray-100",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

export function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <div className="flex h-full min-h-[96px] flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}