"use client";

import { FormEvent, useState, useTransition } from "react";
import { OutletImportForm } from "@/components/outlet-import-form";

function formatLocalDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function SupervisorTools() {
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [range, setRange] = useState({
    startDate: formatLocalDate(new Date()),
    endDate: formatLocalDate(new Date()),
  });
  const [isPending, startTransition] = useTransition();

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerateMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/tasks/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(range),
          });

          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
            created?: number;
            skippedDuplicates?: number;
          };

          if (!response.ok) {
            setGenerateMessage(payload.message ?? "Task generation failed.");
            return;
          }

          setGenerateMessage(
            `Created ${payload.created ?? 0} tasks, skipped ${payload.skippedDuplicates ?? 0} duplicates.`,
          );
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
        <form className="mt-5 space-y-4" onSubmit={handleGenerate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Start Date</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                type="date"
                value={range.startDate}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>End Date</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                type="date"
                value={range.endDate}
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
