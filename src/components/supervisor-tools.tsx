"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { OutletImportForm } from "@/components/outlet-import-form";

function formatLocalDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function SupervisorTools() {
  const router = useRouter();
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [range, setRange] = useState({
    from: formatLocalDate(new Date()),
    to: formatLocalDate(new Date()),
  });
  const [isPending, startTransition] = useTransition();

  function runGenerate(nextRange: { from: string; to: string }) {
    setGenerateMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/tasks/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(nextRange),
          });

          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
            created?: number;
            skipped?: number;
          };

          if (!response.ok) {
            setGenerateMessage(payload.message ?? "Task generation failed.");
            return;
          }

          setGenerateMessage(
            `Created ${payload.created ?? 0} tasks, skipped ${payload.skipped ?? 0}.`,
          );
          router.refresh();
        } catch (generateError) {
          setGenerateMessage(
            generateError instanceof Error
              ? generateError.message
              : "Task generation failed.",
          );
        }
      })();
    });
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runGenerate(range);
  }

  function handleGenerateToday() {
    const today = formatLocalDate(new Date());
    const todayRange = {
      from: today,
      to: today,
    };

    setRange(todayRange);
    runGenerate(todayRange);
  }

  return (
    <>
      <OutletImportForm endpoint="/api/admin/import-outlets" />

      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Task Generator
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Generate task date range
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Gunakan tombol cepat untuk generate task hari ini, atau pilih rentang tanggal kalau mau
          generate beberapa hari sekaligus.
        </p>
        <div className="mt-4">
          <button
            className="w-full rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={handleGenerateToday}
            type="button"
          >
            {isPending ? "Working..." : "Generate Hari Ini"}
          </button>
        </div>
        <form className="mt-5 space-y-4" onSubmit={handleGenerate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Start Date</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
                type="date"
                value={range.from}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>End Date</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
                type="date"
                value={range.to}
              />
            </label>
          </div>
          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Working..." : "Generate Tasks"}
          </button>
        </form>
        {generateMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {generateMessage}
          </p>
        ) : null}
      </section>
    </>
  );
}
