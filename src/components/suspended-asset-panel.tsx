"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type SuspendedAssetAssignment = {
  id: string;
  suspendedAt: string;
  fieldForceName: string;
  fieldForceEmail: string;
  outletName: string;
  outletCode: string;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  ukuran: string | null;
  jumlahSunscreen: number | null;
};

type ReactivateResponse = {
  message?: string;
  reactivatedCount?: number;
};

function formatSuspendedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SuspendedAssetPanel({
  assignments,
}: {
  assignments: SuspendedAssetAssignment[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);
  const [visualFilter, setVisualFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [, startTransition] = useTransition();
  const hasAssignments = assignments.length > 0;
  const visualOptions = useMemo(
    () =>
      [...new Set(assignments.map((assignment) => assignment.visualPposm?.trim() || "-"))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [assignments],
  );
  const brandOptions = useMemo(
    () =>
      [...new Set(assignments.map((assignment) => assignment.brand?.trim() || "-"))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [assignments],
  );
  const sizeOptions = useMemo(
    () =>
      [...new Set(assignments.map((assignment) => assignment.ukuran?.trim() || "-"))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [assignments],
  );
  const filteredAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          (!visualFilter || (assignment.visualPposm?.trim() || "-") === visualFilter) &&
          (!brandFilter || (assignment.brand?.trim() || "-") === brandFilter) &&
          (!sizeFilter || (assignment.ukuran?.trim() || "-") === sizeFilter),
      ),
    [assignments, brandFilter, sizeFilter, visualFilter],
  );
  const visibleAssignments = useMemo(
    () => filteredAssignments.slice(0, 12),
    [filteredAssignments],
  );
  const summary = useMemo(
    () => ({
      totalSunscreen: filteredAssignments.reduce(
        (total, assignment) => total + (assignment.jumlahSunscreen ?? 0),
        0,
      ),
      totalOutlets: filteredAssignments.length,
    }),
    [filteredAssignments],
  );

  async function handleExportWorkbook() {
    if (!hasAssignments || filteredAssignments.length === 0) {
      return;
    }

    const { utils, writeFile } = await import("xlsx");
    const rows = filteredAssignments.map((assignment) => ({
      "Tanggal Tangguh": formatSuspendedAt(assignment.suspendedAt),
      "Field Force": assignment.fieldForceName,
      Email: assignment.fieldForceEmail,
      "Kode Toko": assignment.outletCode,
      "Nama Toko": assignment.outletName,
      "Type Outlet": assignment.typeOutlet ?? "",
      "Visual PPOSM": assignment.visualPposm ?? "",
      Brand: assignment.brand ?? "",
      Ukuran: assignment.ukuran ?? "",
      "Jumlah Sunscreen": assignment.jumlahSunscreen ?? 0,
    }));
    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();

    utils.book_append_sheet(workbook, worksheet, "Tangguhan Asset");
    writeFile(workbook, "tangguhan-asset.xlsx");
  }

  function handleReactivate(assignmentIds: string[]) {
    setFeedback(null);
    setError(null);

    if (assignmentIds.length === 0) {
      setError("Tidak ada data tangguhan yang cocok untuk diaktifkan.");
      return;
    }

    setPendingAssignmentId(
      assignmentIds.length === 1 ? assignmentIds[0] : "__bulk__",
    );

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/assignments/reactivate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...(assignmentIds.length === 1
                ? { assignmentId: assignmentIds[0] }
                : { assignmentIds }),
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as ReactivateResponse;

          if (!response.ok) {
            setError(payload.message ?? "Unable to reactivate assignment.");
            return;
          }

          setFeedback(payload.message ?? "Assignment reactivated.");
          router.refresh();
        } catch (reactivateError) {
          setError(
            reactivateError instanceof Error
              ? reactivateError.message
              : "Unable to reactivate assignment.",
          );
        } finally {
          setPendingAssignmentId(null);
        }
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Tangguhan Asset
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Outlet yang di-unassign dari field force
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Supervisor bisa aktifkan lagi langsung dari sini saat asset sudah siap.
          </p>
        </div>
        <button
          className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hasAssignments || filteredAssignments.length === 0}
          onClick={handleExportWorkbook}
          type="button"
        >
          Export Excel
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Total Tangguhan
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.totalOutlets}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
            Total Sunscreen
          </p>
          <p className="mt-1 text-lg font-semibold text-amber-900">
            {summary.totalSunscreen}
          </p>
        </div>
      </div>

      {hasAssignments ? (
        <div className="mb-5 rounded-2xl bg-slate-100 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Visual PPOSM</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) => setVisualFilter(event.target.value)}
                value={visualFilter}
              >
                <option value="">Semua Visual</option>
                {visualOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Brand</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) => setBrandFilter(event.target.value)}
                value={brandFilter}
              >
                <option value="">Semua Brand</option>
                {brandOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Ukuran</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) => setSizeFilter(event.target.value)}
                value={sizeFilter}
              >
                <option value="">Semua Ukuran</option>
                {sizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Hasil filter:{" "}
              <span className="font-semibold text-slate-900">{filteredAssignments.length}</span>{" "}
              data tangguhan dari {assignments.length}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                onClick={() => {
                  setVisualFilter("");
                  setBrandFilter("");
                  setSizeFilter("");
                  setFeedback(null);
                  setError(null);
                }}
                type="button"
              >
                Reset Filter
              </button>
              <button
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pendingAssignmentId !== null || filteredAssignments.length === 0}
                onClick={() => handleReactivate(filteredAssignments.map((assignment) => assignment.id))}
                type="button"
              >
                {pendingAssignmentId === "__bulk__" ? "Mengaktifkan..." : "Aktifkan Semua"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {feedback ? (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </p>
      ) : null}

      <div className="space-y-4">
        {!hasAssignments ? (
          <p className="text-sm text-slate-500">Belum ada data tangguhan asset.</p>
        ) : (
          visibleAssignments.map((assignment) => (
            <div className="rounded-2xl border border-slate-200 px-4 py-4" key={assignment.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{assignment.outletName}</p>
                  <p className="text-sm text-slate-600">
                    {assignment.outletCode} • {assignment.fieldForceName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.typeOutlet ?? "-"} • {assignment.visualPposm ?? "-"} •{" "}
                    {assignment.brand ?? "-"} • {assignment.ukuran ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Jumlah Sunscreen: {assignment.jumlahSunscreen ?? 0}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    Ditangguhkan {formatSuspendedAt(assignment.suspendedAt)}
                  </p>
                </div>
                <button
                  className="inline-flex rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={pendingAssignmentId !== null}
                  onClick={() => handleReactivate([assignment.id])}
                  type="button"
                >
                  {pendingAssignmentId === assignment.id ? "Mengaktifkan..." : "Aktifkan Lagi"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredAssignments.length > visibleAssignments.length ? (
        <p className="mt-4 text-sm text-slate-500">
          Menampilkan {visibleAssignments.length} dari {filteredAssignments.length} data tangguhan
          hasil filter. Export Excel mengikuti filter yang sedang aktif.
        </p>
      ) : null}
    </section>
  );
}
