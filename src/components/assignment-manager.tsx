"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { AssignmentPreviewMap } from "@/components/assignment-preview-map";

type AssignableUser = {
  id: string;
  name: string;
  email: string;
};

type OutletView = {
  id: string;
  storeCode: string;
  name: string;
  address: string;
  subdistrict: string | null;
  regency: string | null;
  district: string | null;
  territory: string | null;
  territoryGroup: string | null;
  supervisorName: string | null;
  supervisorPhone: string | null;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  size: string | null;
  latitude: number;
  longitude: number;
};

type AssignmentView = {
  id: string;
  kodeToko: string;
  namaToko: string;
  alamat: string;
  kecamatan: string | null;
  kabupaten: string | null;
  district: string | null;
  territory: string | null;
  territoryGroup: string | null;
  supervisorName: string | null;
  noTelpSpv: string | null;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  ukuran: string | null;
  lat: number;
  lon: number;
  active: boolean;
};

type BulkAssignmentResult = {
  user: AssignableUser;
  requestedCount: number;
  assignedCount: number;
  activatedCount: number;
  deactivatedCount: number;
  missingOutletCodes: string[];
  message?: string;
};

type AssignmentListResponse = {
  assignments: AssignmentView[];
  message?: string;
};

type AssignmentDeleteResult = {
  deletedCount: number;
  message?: string;
};

function parseOutletCodes(value: string) {
  const uniqueCodes = new Set<string>();

  for (const line of value.split("\n")) {
    const code = line.trim();

    if (code) {
      uniqueCodes.add(code);
    }
  }

  return [...uniqueCodes];
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function toRoundedCoordinate(value: number) {
  return Number(formatCoordinate(value));
}

function escapeCsvField(value: string | number | null | undefined) {
  const normalizedValue = value == null ? "" : String(value);
  const escapedValue = normalizedValue.replace(/"/g, "\"\"");

  return `"${escapedValue}"`;
}

function buildOutletSearchText(outlet: OutletView) {
  return [
    outlet.storeCode,
    outlet.name,
    outlet.address,
    outlet.subdistrict ?? "",
    outlet.regency ?? "",
    outlet.district ?? "",
    outlet.territory ?? "",
    outlet.territoryGroup ?? "",
    outlet.supervisorName ?? "",
    outlet.supervisorPhone ?? "",
    outlet.typeOutlet ?? "",
    outlet.visualPposm ?? "",
    outlet.brand ?? "",
    outlet.size ?? "",
    formatCoordinate(outlet.latitude),
    formatCoordinate(outlet.longitude),
  ]
    .join(" ")
    .toLowerCase();
}

function OutletDetailCard({
  actionLabel,
  actionVariant,
  onAction,
  outlet,
}: {
  actionLabel?: string;
  actionVariant?: "add" | "remove" | "restore";
  onAction?: () => void;
  outlet: {
    kodeToko: string;
    namaToko: string;
    alamat: string;
    kecamatan: string | null;
    kabupaten: string | null;
    district: string | null;
    territory: string | null;
    territoryGroup: string | null;
    supervisorName: string | null;
    noTelpSpv: string | null;
    typeOutlet: string | null;
    visualPposm: string | null;
    brand: string | null;
    ukuran: string | null;
    lat: number;
    lon: number;
  };
}) {
  const actionClassName =
    actionVariant === "remove"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
      : actionVariant === "restore"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
      : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-900/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            {outlet.kodeToko}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {outlet.namaToko}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{outlet.alamat}</p>
        </div>
        {onAction && actionLabel ? (
          <button
            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${actionClassName}`}
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Area
          </p>
          <p className="mt-1 text-slate-700">
            {outlet.kecamatan ?? "-"} / {outlet.kabupaten ?? "-"}
          </p>
          <p className="mt-1 text-slate-600">Distrik: {outlet.district ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Territory
          </p>
          <p className="mt-1 text-slate-700">{outlet.territory ?? "-"}</p>
          <p className="mt-1 text-slate-600">Group: {outlet.territoryGroup ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Supervisor
          </p>
          <p className="mt-1 text-slate-700">{outlet.supervisorName ?? "-"}</p>
          <p className="mt-1 text-slate-600">Telp: {outlet.noTelpSpv ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Outlet Detail
          </p>
          <p className="mt-1 text-slate-700">Type: {outlet.typeOutlet ?? "-"}</p>
          <p className="mt-1 text-slate-600">
            Visual: {outlet.visualPposm ?? "-"} • {outlet.brand ?? "-"} • {outlet.ukuran ?? "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900 px-3 py-3 text-sm text-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          Koordinat
        </p>
        <p className="mt-1">
          {formatCoordinate(outlet.lat)}, {formatCoordinate(outlet.lon)}
        </p>
        <p className="mt-1 text-xs text-slate-300">
          Urutan alamat dan koordinat ini memudahkan plotting rute dan sinkron ke peta field force.
        </p>
      </div>
    </article>
  );
}

export function AssignmentManager({
  outlets,
  users,
}: {
  outlets: OutletView[];
  users: AssignableUser[];
}) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [textareaValue, setTextareaValue] = useState("");
  const [removedQuery, setRemovedQuery] = useState("");
  const [removedCodes, setRemovedCodes] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [submitResult, setSubmitResult] = useState<BulkAssignmentResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [showInactiveHistory, setShowInactiveHistory] = useState(false);

  const selectedUser = users.find((candidate) => candidate.id === selectedUserId) ?? null;
  const selectedCodes = parseOutletCodes(textareaValue);
  const selectedCodeSet = new Set(selectedCodes);
  const removedCodeSet = new Set(removedCodes);
  const outletByCode = new Map(outlets.map((outlet) => [outlet.storeCode, outlet]));

  const selectedOutlets = selectedCodes
    .map((code) => outletByCode.get(code))
    .filter((outlet): outlet is OutletView => Boolean(outlet));
  const activeAssignments = assignments.filter((assignment) => assignment.active);
  const removedOutlets = removedCodes
    .map((code) => outletByCode.get(code))
    .filter((outlet): outlet is OutletView => Boolean(outlet));
  const normalizedRemovedQuery = removedQuery.trim().toLowerCase();
  const visibleRemovedCodes = normalizedRemovedQuery
    ? removedCodes.filter((code) => {
        const outlet = outletByCode.get(code);

        if (!outlet) {
          return code.toLowerCase().includes(normalizedRemovedQuery);
        }

        return buildOutletSearchText(outlet).includes(normalizedRemovedQuery);
      })
    : removedCodes;
  const visibleAssignments = showInactiveHistory ? assignments : activeAssignments;
  const inactiveAssignments = assignments.filter((assignment) => !assignment.active);
  const pendingRemovalCount = assignments.filter(
    (assignment) => assignment.active && removedCodeSet.has(assignment.kodeToko),
  ).length;
  const pendingReactivationCount = assignments.filter(
    (assignment) => !assignment.active && selectedCodeSet.has(assignment.kodeToko),
  ).length;
  const draftActiveCount = selectedCodes.length;

  function getDraftStateLabel(assignment: AssignmentView) {
    if (assignment.active) {
      return selectedCodeSet.has(assignment.kodeToko) ? "STAGED_ACTIVE" : "PENDING_REMOVAL";
    }

    return selectedCodeSet.has(assignment.kodeToko)
      ? "PENDING_REACTIVATION"
      : "INACTIVE_HISTORY";
  }

  function hydrateDraftFromAssignments(nextAssignments: AssignmentView[]) {
    const activeCodes = nextAssignments
      .filter((assignment) => assignment.active)
      .map((assignment) => assignment.kodeToko);

    setTextareaValue(activeCodes.join("\n"));
    setRemovedCodes([]);
    setRemovedQuery("");
  }

  async function loadAssignmentsForUser(userId: string, hydrateDraft = false) {
    setLoadError(null);

    try {
      const response = await fetch(
        `/api/admin/assignments?userId=${encodeURIComponent(userId)}`,
      );
      const payload = (await response.json().catch(() => ({}))) as AssignmentListResponse;

      if (!response.ok) {
        setAssignments([]);
        setLoadError(payload.message ?? "Unable to load assignments.");
        return;
      }

      const nextAssignments = payload.assignments ?? [];
      setAssignments(nextAssignments);

      if (hydrateDraft) {
        hydrateDraftFromAssignments(nextAssignments);
      }
    } catch (error) {
      setAssignments([]);
      setLoadError(error instanceof Error ? error.message : "Unable to load assignments.");
    }
  }

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/assignments?userId=${encodeURIComponent(selectedUserId)}`,
        );
        const payload = (await response.json().catch(() => ({}))) as AssignmentListResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setAssignments([]);
          setLoadError(payload.message ?? "Unable to load assignments.");
          return;
        }

        const nextAssignments = payload.assignments ?? [];
        setLoadError(null);
        setAssignments(nextAssignments);
        hydrateDraftFromAssignments(nextAssignments);
      } catch (error) {
        if (!cancelled) {
          setAssignments([]);
          setLoadError(error instanceof Error ? error.message : "Unable to load assignments.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  function handleAddOutlet(code: string) {
    if (selectedCodeSet.has(code)) {
      return;
    }

    const nextCodes = [...selectedCodes, code];
    setTextareaValue(nextCodes.join("\n"));
    setRemovedCodes((currentCodes) =>
      currentCodes.filter((removedCode) => removedCode !== code),
    );
    setSubmitResult(null);
    setSubmitError(null);
  }

  function handleRemoveOutlet(code: string) {
    const nextCodes = selectedCodes.filter((selectedCode) => selectedCode !== code);
    setTextareaValue(nextCodes.join("\n"));
    setRemovedCodes((currentCodes) =>
      currentCodes.includes(code) ? currentCodes : [code, ...currentCodes],
    );
    setSubmitResult(null);
    setSubmitError(null);
  }

  function handleRestoreOutlet(code: string) {
    handleAddOutlet(code);
  }

  function handleRemoveAll() {
    if (selectedCodes.length === 0) {
      return;
    }

    setRemovedCodes((currentCodes) => {
      const nextRemoved = [...currentCodes];

      for (const code of [...selectedCodes].reverse()) {
        if (!nextRemoved.includes(code)) {
          nextRemoved.unshift(code);
        }
      }

      return nextRemoved;
    });
    setTextareaValue("");
    setSubmitResult(null);
    setSubmitError(null);
  }

  function handleRestoreAll() {
    if (removedCodes.length === 0) {
      return;
    }

    const mergedCodes = [...selectedCodes];

    for (const code of removedCodes) {
      if (!mergedCodes.includes(code)) {
        mergedCodes.push(code);
      }
    }

    setTextareaValue(mergedCodes.join("\n"));
    setRemovedCodes([]);
    setRemovedQuery("");
    setSubmitResult(null);
    setSubmitError(null);
  }

  function handleDeleteInactive(assignmentId?: string) {
    if (!selectedUser) {
      setLoadError("Pilih user field force dulu.");
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        try {
          setLoadError(null);

          const query = new URLSearchParams({
            userId: selectedUser.id,
          });

          if (assignmentId) {
            query.set("assignmentId", assignmentId);
          } else {
            query.set("inactiveOnly", "true");
          }

          const response = await fetch(`/api/admin/assignments?${query.toString()}`, {
            method: "DELETE",
          });
          const payload = (await response.json().catch(() => ({}))) as AssignmentDeleteResult;

          if (!response.ok) {
            setLoadError(payload.message ?? "Unable to delete inactive assignments.");
            return;
          }

          await loadAssignmentsForUser(selectedUser.id);
        } catch (error) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to delete inactive assignments.",
          );
        }
      })();
    });
  }

  function handleExportAssignments() {
    if (!selectedUser || assignments.length === 0) {
      return;
    }

    const headers = [
      "Field Force",
      "Email",
      "Assignment Status",
      "Draft State",
      "Kode Toko",
      "Nama Toko",
      "Alamat",
      "Kecamatan",
      "Kabupaten",
      "Distrik",
      "Territory",
      "Group Territory",
      "Supervisor",
      "No Telp SPV",
      "Type Outlet",
      "Visual PPOSM",
      "Brand",
      "Ukuran",
      "Latitude",
      "Longitude",
    ];

    const rows = assignments.map((assignment) =>
      [
        selectedUser.name,
        selectedUser.email,
        assignment.active ? "ACTIVE" : "INACTIVE",
        getDraftStateLabel(assignment),
        assignment.kodeToko,
        assignment.namaToko,
        assignment.alamat,
        assignment.kecamatan,
        assignment.kabupaten,
        assignment.district,
        assignment.territory,
        assignment.territoryGroup,
        assignment.supervisorName,
        assignment.noTelpSpv,
        assignment.typeOutlet,
        assignment.visualPposm,
        assignment.brand,
        assignment.ukuran,
        formatCoordinate(assignment.lat),
        formatCoordinate(assignment.lon),
      ]
        .map((value) => escapeCsvField(value))
        .join(","),
    );

    const csvContent = [headers.map((header) => escapeCsvField(header)).join(","), ...rows].join(
      "\n",
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = selectedUser.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    link.href = objectUrl;
    link.download = `assignments-${safeName || "field-force"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }

  async function handleExportWorkbook() {
    if (!selectedUser || assignments.length === 0) {
      return;
    }

    const { utils, writeFile } = await import("xlsx");
    const rows = assignments.map((assignment) => ({
      "Field Force": selectedUser.name,
      Email: selectedUser.email,
      "Assignment Status": assignment.active ? "ACTIVE" : "INACTIVE",
      "Draft State": getDraftStateLabel(assignment),
      "Kode Toko": assignment.kodeToko,
      "Nama Toko": assignment.namaToko,
      Alamat: assignment.alamat,
      Kecamatan: assignment.kecamatan ?? "",
      Kabupaten: assignment.kabupaten ?? "",
      Distrik: assignment.district ?? "",
      Territory: assignment.territory ?? "",
      "Group Territory": assignment.territoryGroup ?? "",
      Supervisor: assignment.supervisorName ?? "",
      "No Telp SPV": assignment.noTelpSpv ?? "",
      "Type Outlet": assignment.typeOutlet ?? "",
      "Visual PPOSM": assignment.visualPposm ?? "",
      Brand: assignment.brand ?? "",
      Ukuran: assignment.ukuran ?? "",
      Latitude: toRoundedCoordinate(assignment.lat),
      Longitude: toRoundedCoordinate(assignment.lon),
    }));
    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    const safeName = selectedUser.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    utils.book_append_sheet(workbook, worksheet, "Assignments");
    writeFile(workbook, `assignments-${safeName || "field-force"}.xlsx`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitResult(null);
    setSubmitError(null);

    if (!selectedUser) {
      setSubmitError("Pilih user field force dulu.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/assignments/bulk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userEmail: selectedUser.email,
              outletCodes: selectedCodes,
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as BulkAssignmentResult;

          if (!response.ok) {
            setSubmitError(payload.message ?? "Unable to save assignments.");
            return;
          }

          setSubmitResult(payload);
          await loadAssignmentsForUser(selectedUser.id, true);
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : "Unable to save assignments.");
        }
      })();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Bulk Assignment
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Susun assignment per field force
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pilih user, telusuri outlet berdasarkan alamat, lalu tambahkan kode toko ke daftar assign.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>User Field Force</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setAssignments([]);
                  setLoadError(null);
                  setTextareaValue("");
                  setRemovedCodes([]);
                  setRemovedQuery("");
                  setShowInactiveHistory(false);
                  setSubmitResult(null);
                }}
                value={selectedUserId}
              >
                {users.length === 0 ? (
                  <option value="">Belum ada user field force</option>
                ) : null}
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  User Aktif
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {selectedUser?.name ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Kode Dipilih
                </p>
                <p className="mt-1 font-medium text-slate-900">{selectedCodes.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Master Outlet
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {outlets.length}
                </p>
              </div>
            </div>

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Kode Toko Terpilih</span>
              <textarea
                className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const nextSelectedSet = new Set(parseOutletCodes(nextValue));
                  const newlyRemovedCodes = selectedCodes.filter(
                    (code) => !nextSelectedSet.has(code),
                  );

                  setTextareaValue(nextValue);
                  setRemovedCodes((currentCodes) => {
                    const nextRemoved = currentCodes.filter(
                      (code) => !nextSelectedSet.has(code),
                    );

                    for (const code of newlyRemovedCodes) {
                      if (!nextRemoved.includes(code)) {
                        nextRemoved.unshift(code);
                      }
                    }

                    return nextRemoved;
                  });
                }}
                placeholder={"TOKO-001\nTOKO-002\nTOKO-003"}
                value={textareaValue}
              />
              <span className="block text-xs font-normal leading-5 text-slate-500">
                Gunakan menu Master Outlet untuk meninjau data outlet, lalu paste kode toko di sini
                untuk disimpan ke assignment user terpilih.
              </span>
            </label>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-4 text-sm text-cyan-900">
              <p className="font-semibold">Katalog master outlet dipisah ke menu sendiri.</p>
              <p className="mt-1 leading-6 text-cyan-800">
                Buka halaman Master Outlet untuk lihat semua data outlet, pakai filter lokasi dan
                group, lalu copy kode toko yang dibutuhkan ke daftar assignment ini.
              </p>
              <Link
                className="mt-3 inline-flex rounded-2xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300"
                href="/admin/outlets"
              >
                Buka Master Outlet
              </Link>
            </div>

            <button
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPending || users.length === 0}
              type="submit"
            >
              {isPending ? "Saving..." : "Save Assignments"}
            </button>
          </form>

          {submitError ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </p>
          ) : null}

          {submitResult ? (
            <div className="mt-4 space-y-3 rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
              <p>
                Draft untuk {submitResult.user.name} sudah disimpan. Aktif: {submitResult.assignedCount} outlet.
              </p>
              <p className="text-slate-600">
                Activated: {submitResult.activatedCount} • Deactivated: {submitResult.deactivatedCount}
              </p>
              {submitResult.missingOutletCodes.length > 0 ? (
                <p className="text-slate-600">
                  Missing codes: {submitResult.missingOutletCodes.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Selected Queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Kode siap di-assign
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">{selectedOutlets.length} outlet terdeteksi</p>
              <button
                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={selectedCodes.length === 0}
                onClick={handleRemoveAll}
                type="button"
              >
                Remove All
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {selectedCodes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Belum ada kode toko dipilih.
              </p>
            ) : (
              selectedCodes.map((code) => {
                const outlet = outletByCode.get(code);

                if (!outlet) {
                  return (
                    <div
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700"
                      key={code}
                    >
                      {code} tidak ditemukan di master outlet. Kode ini tetap akan dikirim saat submit.
                    </div>
                  );
                }

                return (
                  <OutletDetailCard
                    actionLabel="Remove"
                    actionVariant="remove"
                    key={outlet.storeCode}
                    onAction={() => handleRemoveOutlet(outlet.storeCode)}
                    outlet={{
                      kodeToko: outlet.storeCode,
                      namaToko: outlet.name,
                      alamat: outlet.address,
                      kecamatan: outlet.subdistrict,
                      kabupaten: outlet.regency,
                      district: outlet.district,
                      territory: outlet.territory,
                      territoryGroup: outlet.territoryGroup,
                      supervisorName: outlet.supervisorName,
                      noTelpSpv: outlet.supervisorPhone,
                      typeOutlet: outlet.typeOutlet,
                      visualPposm: outlet.visualPposm,
                      brand: outlet.brand,
                      ukuran: outlet.size,
                      lat: outlet.latitude,
                      lon: outlet.longitude,
                    }}
                  />
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Removed Queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Pilihan yang dihapus
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">{removedOutlets.length} outlet siap di-restore</p>
              <button
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={removedCodes.length === 0}
                onClick={handleRestoreAll}
                type="button"
              >
                Restore All
              </button>
            </div>
          </div>

          <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Removed</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => setRemovedQuery(event.target.value)}
              placeholder="Cari outlet yang di-remove"
              value={removedQuery}
            />
          </label>

          <div className="mt-5 space-y-4">
            {removedCodes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Belum ada outlet yang di-remove.
              </p>
            ) : visibleRemovedCodes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Tidak ada outlet removed yang cocok dengan filter.
              </p>
            ) : (
              visibleRemovedCodes.map((code) => {
                const outlet = outletByCode.get(code);

                if (!outlet) {
                  return (
                    <div
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
                      key={code}
                    >
                      {code} sudah dihapus dari pilihan dan tidak ditemukan di master outlet.
                    </div>
                  );
                }

                return (
                  <OutletDetailCard
                    actionLabel="Restore"
                    actionVariant="restore"
                    key={outlet.storeCode}
                    onAction={() => handleRestoreOutlet(outlet.storeCode)}
                    outlet={{
                      kodeToko: outlet.storeCode,
                      namaToko: outlet.name,
                      alamat: outlet.address,
                      kecamatan: outlet.subdistrict,
                      kabupaten: outlet.regency,
                      district: outlet.district,
                      territory: outlet.territory,
                      territoryGroup: outlet.territoryGroup,
                      supervisorName: outlet.supervisorName,
                      noTelpSpv: outlet.supervisorPhone,
                      typeOutlet: outlet.typeOutlet,
                      visualPposm: outlet.visualPposm,
                      brand: outlet.brand,
                      ukuran: outlet.size,
                      lat: outlet.latitude,
                      lon: outlet.longitude,
                    }}
                  />
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Current Assignments
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">
              Outlet aktif untuk user terpilih
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={assignments.length === 0}
                onClick={() => {
                  void handleExportWorkbook();
                }}
                type="button"
              >
                Export XLSX
              </button>
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={assignments.length === 0}
                onClick={handleExportAssignments}
                type="button"
              >
                Export CSV
              </button>
              <button
                className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                  showInactiveHistory
                    ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300"
                }`}
                onClick={() => setShowInactiveHistory(false)}
                type="button"
              >
                Active Only
              </button>
              <button
                className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                  showInactiveHistory
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                onClick={() => setShowInactiveHistory(true)}
                type="button"
              >
                Show Inactive History
              </button>
              <button
                className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeletePending || assignments.every((assignment) => assignment.active)}
                onClick={() => handleDeleteInactive()}
                type="button"
              >
                {isDeletePending ? "Deleting..." : "Delete All Inactive"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Gunakan tombol di bawah untuk batalkan outlet aktif atau restore lagi sebelum menekan save.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active
              </p>
              <p className="mt-1 font-semibold text-slate-900">{activeAssignments.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Inactive
              </p>
              <p className="mt-1 font-semibold text-slate-900">{inactiveAssignments.length}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">
                Pending Remove
              </p>
              <p className="mt-1 font-semibold text-rose-800">{pendingRemovalCount}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">
                Pending Restore
              </p>
              <p className="mt-1 font-semibold text-emerald-800">{pendingReactivationCount}</p>
            </div>
            <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-500">
                Draft Active
              </p>
              <p className="mt-1 font-semibold text-cyan-800">{draftActiveCount}</p>
            </div>
          </div>

          <div className="mt-5">
            <AssignmentPreviewMap
              outlets={selectedOutlets.map((outlet) => ({
                kodeToko: outlet.storeCode,
                namaToko: outlet.name,
                alamat: outlet.address,
                lat: outlet.latitude,
                lon: outlet.longitude,
              }))}
            />
          </div>

          {loadError ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </p>
          ) : null}

          <div className="mt-5 space-y-4">
            {visibleAssignments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                {showInactiveHistory
                  ? "Belum ada assignment untuk user ini."
                  : "Tidak ada assignment aktif untuk user ini."}
              </p>
            ) : (
              visibleAssignments.map((assignment) => (
                <div key={assignment.id}>
                  <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span>
                      {assignment.active
                        ? selectedCodeSet.has(assignment.kodeToko)
                          ? "Staged Active"
                          : removedCodeSet.has(assignment.kodeToko)
                            ? "Pending Removal"
                            : "Active"
                        : selectedCodeSet.has(assignment.kodeToko)
                          ? "Pending Reactivation"
                          : "Inactive History"}
                    </span>
                    <span>
                      {formatCoordinate(assignment.lat)}, {formatCoordinate(assignment.lon)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <OutletDetailCard
                      actionLabel={
                        assignment.active
                          ? selectedCodeSet.has(assignment.kodeToko)
                            ? "Batalkan"
                            : "Restore"
                          : selectedCodeSet.has(assignment.kodeToko)
                            ? "Batalkan"
                            : "Restore"
                      }
                      actionVariant={
                        selectedCodeSet.has(assignment.kodeToko) ? "remove" : "restore"
                      }
                      onAction={() => {
                        if (selectedCodeSet.has(assignment.kodeToko)) {
                          handleRemoveOutlet(assignment.kodeToko);
                          return;
                        }

                        handleRestoreOutlet(assignment.kodeToko);
                      }}
                      outlet={assignment}
                    />
                    {!assignment.active ? (
                      <div className="flex justify-end">
                        <button
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isDeletePending}
                          onClick={() => handleDeleteInactive(assignment.id)}
                          type="button"
                        >
                          {isDeletePending ? "Deleting..." : "Delete Permanently"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
