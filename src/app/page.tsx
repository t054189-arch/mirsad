import { checkSupabase } from "@/lib/supabase/health";

// The status below is a live check, so render it per request rather than at
// build time.
export const dynamic = "force-dynamic";

const statusStyles = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  unconfigured: "bg-amber-500",
} as const;

export default async function Home() {
  const health = await checkSupabase();

  const message = {
    ok: "متصل بمشروع Supabase",
    error: "تعذّر الاتصال بمشروع Supabase",
    unconfigured: "لم تُضبط متغيرات البيئة بعد",
  }[health.status];

  const detail =
    health.status === "ok"
      ? health.projectRef
      : health.status === "error"
        ? health.message
        : "انسخ .env.example إلى .env.local";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="w-full max-w-xl space-y-10 py-24">
        <header className="space-y-3">
          <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-zinc-50">
            مرصاد
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            مشروع الفريق — Next.js على Vercel، وقاعدة بيانات على Supabase.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[health.status]}`}
              aria-hidden
            />
            <p className="font-medium text-black dark:text-zinc-50">{message}</p>
          </div>
          <p className="mt-2 font-mono text-sm text-zinc-500 dark:text-zinc-500">
            {detail}
          </p>
        </section>

        <section className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <h2 className="font-medium text-black dark:text-zinc-50">
            من أين تبدأ
          </h2>
          <ul className="space-y-2">
            <li>
              عدّل هذه الصفحة في{" "}
              <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
                src/app/page.tsx
              </code>
            </li>
            <li>
              عملاء Supabase جاهزون في{" "}
              <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
                src/lib/supabase/
              </code>
            </li>
            <li>
              تحديث الجلسة يجري في{" "}
              <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
                src/proxy.ts
              </code>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
