"use client";

import { FormEvent, useState, useTransition } from "react";

type OutletImportError = {
  rowNumber: number;
  message: string;
};

type OutletImportResponse = {
  inserted: number;
  updated: number;
  errors: OutletImportError[];
  message?: string;
};

type OutletResetResponse = {
  deletedOutlets: number;
  clearedAssignments: number;
  clearedTasks: number;
  previousOutlets: number;
  message?: string;
};

export function OutletImportForm({
  endpoint = "/api/admin/import-outlets",
  title = "Outlet Import",
  description = "Upload the latest outlet workbook (.xlsx).",
  buttonLabel = "Import Outlets",
  allowReset = false,
}: {
  endpoint?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  allowReset?: boolean;
}) {
  const [result, setResult] = useState<OutletImportResponse | null>(null);
  const [resetResult, setResetResult] = useState<OutletResetResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setResetResult(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });

          const payload = (await response.json().catch(() => ({}))) as OutletImportResponse;

          if (!response.ok) {
            setErrorMessage(payload.message ?? "Import failed.");
            return;
          }

          setResult({
            inserted: payload.inserted ?? 0,
            updated: payload.updated ?? 0,
            errors: payload.errors ?? [],
          });
          event.currentTarget.reset();
        } catch (submitError) {
          setErrorMessage(
            submitError instanceof Error
              ? submitError.message
              : "Import failed.",
          );
        }
      })();
    });
  }

  function handleReset() {
    setResult(null);
    setResetResult(null);
    setErrorMessage(null);

    if (
      !window.confirm(
        "Reset outlet database? Semua outlet, assignment outlet, dan task terkait outlet akan dihapus. User tetap aman.",
      )
    ) {
      return;
    }

    startResetTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/outlets/reset", {
            method: "POST",
          });
          const payload = (await response.json().catch(() => ({}))) as OutletResetResponse;

          if (!response.ok) {
            setErrorMessage(payload.message ?? "Reset failed.");
            return;
          }

          setResetResult({
            deletedOutlets: payload.deletedOutlets ?? 0,
            clearedAssignments: payload.clearedAssignments ?? 0,
            clearedTasks: payload.clearedTasks ?? 0,
            previousOutlets: payload.previousOutlets ?? 0,
          });
        } catch (resetError) {
          setErrorMessage(
            resetError instanceof Error ? resetError.message : "Reset failed.",
          );
        }
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
        {title}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">
        Upload Excel source
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <input
          accept=".xlsx"
          className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cyan-700"
          name="file"
          required
          type="file"
        />
        <button
          className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending || isResetPending}
          type="submit"
        >
          {isPending ? "Importing..." : buttonLabel}
        </button>
        {allowReset ? (
          <button
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending || isResetPending}
            onClick={handleReset}
            type="button"
          >
            {isResetPending ? "Resetting..." : "Reset Outlet Database"}
          </button>
        ) : null}
      </form>

      {errorMessage ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-4 rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
          <p>
            Inserted {result.inserted}, updated {result.updated}, errors{" "}
            {result.errors.length}.
          </p>
          {result.errors.length > 0 ? (
            <div className="space-y-2">
              {result.errors.map((error) => (
                <p
                  className="rounded-xl bg-white px-3 py-2 text-slate-600"
                  key={`${error.rowNumber}-${error.message}`}
                >
                  Row {error.rowNumber}: {error.message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {resetResult ? (
        <div className="mt-4 space-y-2 rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p>
            Outlet database di-reset. Deleted {resetResult.deletedOutlets} outlet.
          </p>
          <p>
            Cleared assignments {resetResult.clearedAssignments}, cleared tasks {resetResult.clearedTasks}.
          </p>
        </div>
      ) : null}
    </section>
  );
}
