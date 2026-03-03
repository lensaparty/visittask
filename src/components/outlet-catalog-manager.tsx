"use client";

import { ScheduleDay } from "@prisma/client";
import { useDeferredValue, useEffect, useState, useTransition } from "react";

type CatalogAssignableUser = {
  id: string;
  name: string;
  email: string;
};

type AssignmentSummary = {
  kodeToko: string;
  active: boolean;
};

type AssignmentListResponse = {
  assignments?: AssignmentSummary[];
  message?: string;
};

type BulkAssignmentResult = {
  assignedCount: number;
  activatedCount: number;
  deactivatedCount: number;
  missingOutletCodes: string[];
  message?: string;
};

type OutletCatalogView = {
  id: string;
  storeCode: string;
  name: string;
  address: string;
  subdistrict: string | null;
  regency: string | null;
  district: string | null;
  territory: string | null;
  territoryGroup: string | null;
  oddScheduleDay: ScheduleDay | null;
  evenScheduleDay: ScheduleDay | null;
  supervisorName: string | null;
  supervisorPhone: string | null;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  size: string | null;
  latitude: number;
  longitude: number;
};

const CATALOG_PAGE_SIZE = 12;
const SCHEDULE_DAY_ORDER: Record<ScheduleDay, number> = {
  [ScheduleDay.SENIN]: 1,
  [ScheduleDay.SELASA]: 2,
  [ScheduleDay.RABU]: 3,
  [ScheduleDay.KAMIS]: 4,
  [ScheduleDay.JUMAT]: 5,
  [ScheduleDay.SABTU]: 6,
  [ScheduleDay.MINGGU]: 7,
};
const SCHEDULE_DAY_LABELS: Record<ScheduleDay, string> = {
  [ScheduleDay.SENIN]: "Senin",
  [ScheduleDay.SELASA]: "Selasa",
  [ScheduleDay.RABU]: "Rabu",
  [ScheduleDay.KAMIS]: "Kamis",
  [ScheduleDay.JUMAT]: "Jumat",
  [ScheduleDay.SABTU]: "Sabtu",
  [ScheduleDay.MINGGU]: "Minggu",
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function formatScheduleDay(day: ScheduleDay | null) {
  return day ? SCHEDULE_DAY_LABELS[day] : "-";
}

function formatLocalDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function buildOutletSearchText(outlet: OutletCatalogView) {
  return [
    outlet.storeCode,
    outlet.name,
    outlet.address,
    outlet.subdistrict ?? "",
    outlet.regency ?? "",
    outlet.district ?? "",
    outlet.territory ?? "",
    outlet.territoryGroup ?? "",
    formatScheduleDay(outlet.oddScheduleDay),
    formatScheduleDay(outlet.evenScheduleDay),
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

function compareBySchedule(left: OutletCatalogView, right: OutletCatalogView) {
  const leftOddOrder = left.oddScheduleDay ? SCHEDULE_DAY_ORDER[left.oddScheduleDay] : 99;
  const leftEvenOrder = left.evenScheduleDay ? SCHEDULE_DAY_ORDER[left.evenScheduleDay] : 99;
  const rightOddOrder = right.oddScheduleDay ? SCHEDULE_DAY_ORDER[right.oddScheduleDay] : 99;
  const rightEvenOrder = right.evenScheduleDay ? SCHEDULE_DAY_ORDER[right.evenScheduleDay] : 99;
  const leftEarliest = Math.min(leftOddOrder, leftEvenOrder);
  const rightEarliest = Math.min(rightOddOrder, rightEvenOrder);

  const leftKey = [
    String(leftEarliest === 99 ? 99 : leftEarliest).padStart(2, "0"),
    String(leftOddOrder).padStart(2, "0"),
    String(leftEvenOrder).padStart(2, "0"),
    left.regency ?? "",
    left.subdistrict ?? "",
    left.address,
    left.storeCode,
  ].join("|");
  const rightKey = [
    String(rightEarliest === 99 ? 99 : rightEarliest).padStart(2, "0"),
    String(rightOddOrder).padStart(2, "0"),
    String(rightEvenOrder).padStart(2, "0"),
    right.regency ?? "",
    right.subdistrict ?? "",
    right.address,
    right.storeCode,
  ].join("|");

  return leftKey.localeCompare(rightKey);
}

function OutletCatalogCard({
  actionDisabled,
  actionLabel,
  actionVariant,
  onAction,
  outlet,
}: {
  actionDisabled?: boolean;
  actionLabel?: string;
  actionVariant?: "add" | "remove" | "restore";
  onAction?: () => void;
  outlet: OutletCatalogView;
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
            {outlet.storeCode}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{outlet.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{outlet.address}</p>
        </div>
        {onAction && actionLabel ? (
          <button
            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${actionClassName}`}
            disabled={actionDisabled}
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
            {outlet.subdistrict ?? "-"} / {outlet.regency ?? "-"}
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
            Jadwal
          </p>
          <p className="mt-1 text-slate-700">
            Ganjil: {formatScheduleDay(outlet.oddScheduleDay)}
          </p>
          <p className="mt-1 text-slate-600">
            Genap: {formatScheduleDay(outlet.evenScheduleDay)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Supervisor
          </p>
          <p className="mt-1 text-slate-700">{outlet.supervisorName ?? "-"}</p>
          <p className="mt-1 text-slate-600">Telp: {outlet.supervisorPhone ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Outlet Detail
          </p>
          <p className="mt-1 text-slate-700">Type: {outlet.typeOutlet ?? "-"}</p>
          <p className="mt-1 text-slate-600">
            Visual: {outlet.visualPposm ?? "-"} • {outlet.brand ?? "-"} • {outlet.size ?? "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900 px-3 py-3 text-sm text-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          Koordinat
        </p>
        <p className="mt-1">
          {formatCoordinate(outlet.latitude)}, {formatCoordinate(outlet.longitude)}
        </p>
      </div>
    </article>
  );
}

export function OutletCatalogManager({
  outlets,
  users,
}: {
  outlets: OutletCatalogView[];
  users: CatalogAssignableUser[];
}) {
  const [query, setQuery] = useState("");
  const [regencyFilter, setRegencyFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleDay | "">("");
  const [sortBy, setSortBy] = useState<"day" | "address" | "code" | "territory" | "group">("day");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [savedAssignedCodes, setSavedAssignedCodes] = useState<string[]>([]);
  const [draftAssignedCodes, setDraftAssignedCodes] = useState<string[]>([]);
  const [showDraftedOutlets, setShowDraftedOutlets] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssignPending, startAssignTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const savedAssignedCodeSet = new Set(savedAssignedCodes);
  const draftAssignedCodeSet = new Set(draftAssignedCodes);
  const pendingAddCount = draftAssignedCodes.filter((code) => !savedAssignedCodeSet.has(code)).length;
  const pendingRemoveCount = savedAssignedCodes.filter((code) => !draftAssignedCodeSet.has(code)).length;

  const regencyOptions = [
    ...new Set(
      outlets
        .map((outlet) => outlet.regency ?? "")
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const subdistrictOptions = [
    ...new Set(
      outlets
        .filter((outlet) => !regencyFilter || (outlet.regency ?? "") === regencyFilter)
        .map((outlet) => outlet.subdistrict ?? "")
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const territoryOptions = [
    ...new Set(
      outlets
        .map((outlet) => outlet.territory ?? "")
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const groupOptions = [
    ...new Set(
      outlets
        .map((outlet) => outlet.territoryGroup ?? "")
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const filteredOutlets = outlets.filter((outlet) => {
    if (regencyFilter && (outlet.regency ?? "") !== regencyFilter) {
      return false;
    }

    if (subdistrictFilter && (outlet.subdistrict ?? "") !== subdistrictFilter) {
      return false;
    }

    if (territoryFilter && (outlet.territory ?? "") !== territoryFilter) {
      return false;
    }

    if (groupFilter && (outlet.territoryGroup ?? "") !== groupFilter) {
      return false;
    }

    if (
      scheduleFilter &&
      outlet.oddScheduleDay !== scheduleFilter &&
      outlet.evenScheduleDay !== scheduleFilter
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return buildOutletSearchText(outlet).includes(normalizedQuery);
  });

  const sortedOutlets =
    sortBy === "day"
      ? [...filteredOutlets].sort(compareBySchedule)
      : sortBy === "code"
      ? [...filteredOutlets].sort((left, right) => left.storeCode.localeCompare(right.storeCode))
      : sortBy === "territory"
        ? [...filteredOutlets].sort((left, right) => {
            const leftKey = [
              left.territory ?? "",
              left.regency ?? "",
              left.subdistrict ?? "",
              left.address,
              left.storeCode,
            ].join("|");
            const rightKey = [
              right.territory ?? "",
              right.regency ?? "",
              right.subdistrict ?? "",
              right.address,
              right.storeCode,
            ].join("|");

            return leftKey.localeCompare(rightKey);
          })
        : sortBy === "group"
          ? [...filteredOutlets].sort((left, right) => {
              const leftKey = [
                left.territoryGroup ?? "",
                left.regency ?? "",
                left.subdistrict ?? "",
                left.address,
                left.storeCode,
              ].join("|");
              const rightKey = [
                right.territoryGroup ?? "",
                right.regency ?? "",
                right.subdistrict ?? "",
                right.address,
                right.storeCode,
              ].join("|");

              return leftKey.localeCompare(rightKey);
            })
          : filteredOutlets;

  const availableOutlets = sortedOutlets.filter(
    (outlet) => !draftAssignedCodeSet.has(outlet.storeCode),
  );
  const catalogOutlets = showDraftedOutlets ? sortedOutlets : availableOutlets;
  const totalCatalogPages = Math.max(1, Math.ceil(catalogOutlets.length / CATALOG_PAGE_SIZE));
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const visibleOutlets = catalogOutlets.slice(
    (safeCatalogPage - 1) * CATALOG_PAGE_SIZE,
    safeCatalogPage * CATALOG_PAGE_SIZE,
  );
  const pageNumbers = Array.from(
    new Set([
      1,
      Math.max(1, safeCatalogPage - 2),
      Math.max(1, safeCatalogPage - 1),
      safeCatalogPage,
      Math.min(totalCatalogPages, safeCatalogPage + 1),
      Math.min(totalCatalogPages, safeCatalogPage + 2),
      totalCatalogPages,
    ]),
  ).sort((left, right) => left - right);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setLoadError(null);

        const response = await fetch(
          `/api/admin/assignments?userId=${encodeURIComponent(selectedUserId)}`,
        );
        const payload = (await response.json().catch(() => ({}))) as AssignmentListResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setSavedAssignedCodes([]);
          setDraftAssignedCodes([]);
          setLoadError(payload.message ?? "Unable to load assignments.");
          return;
        }

        const nextActiveCodes = (payload.assignments ?? [])
          .filter((assignment) => assignment.active)
          .map((assignment) => assignment.kodeToko);

        setSavedAssignedCodes(nextActiveCodes);
        setDraftAssignedCodes(nextActiveCodes);
        setCatalogPage(1);
      } catch (error) {
        if (!cancelled) {
          setSavedAssignedCodes([]);
          setDraftAssignedCodes([]);
          setCatalogPage(1);
          setLoadError(error instanceof Error ? error.message : "Unable to load assignments.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  function handleStageOutlet(storeCode: string) {
    if (draftAssignedCodeSet.has(storeCode)) {
      return;
    }

    setDraftAssignedCodes((currentCodes) => [...currentCodes, storeCode]);
    setCatalogPage(1);
    setAssignError(null);
    setAssignFeedback(null);
  }

  function handleUnstageOutlet(storeCode: string) {
    setDraftAssignedCodes((currentCodes) =>
      currentCodes.filter((code) => code !== storeCode),
    );
    setCatalogPage(1);
    setAssignError(null);
    setAssignFeedback(null);
  }

  function handleRestoreOutlet(storeCode: string) {
    handleStageOutlet(storeCode);
  }

  function handleStageAllFiltered() {
    const mergedCodes = [...draftAssignedCodes];

    for (const outlet of sortedOutlets) {
      if (!mergedCodes.includes(outlet.storeCode)) {
        mergedCodes.push(outlet.storeCode);
      }
    }

    setDraftAssignedCodes(mergedCodes);
    setCatalogPage(1);
    setAssignError(null);
    setAssignFeedback(null);
  }

  function handleUnstageAllFiltered() {
    if (sortedOutlets.length === 0) {
      return;
    }

    const filteredCodeSet = new Set(sortedOutlets.map((outlet) => outlet.storeCode));

    setDraftAssignedCodes((currentCodes) =>
      currentCodes.filter((code) => !filteredCodeSet.has(code)),
    );
    setCatalogPage(1);
    setAssignError(null);
    setAssignFeedback(null);
  }

  function submitAssignments(nextCodes: string[]) {
    if (!selectedUser) {
      setAssignError("Pilih field force dulu sebelum add outlet.");
      return;
    }

    startAssignTransition(() => {
      void (async () => {
        try {
          setAssignError(null);
          setAssignFeedback(null);

          const response = await fetch("/api/admin/assignments/bulk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userEmail: selectedUser.email,
              outletCodes: nextCodes,
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as BulkAssignmentResult;

          if (!response.ok) {
            setAssignError(payload.message ?? "Unable to save assignments.");
            return;
          }

          const today = formatLocalDate(new Date());
          let nextFeedback =
            `Assignment ${selectedUser.name} diperbarui. Aktif ${payload.assignedCount} outlet.`;

          try {
            const generateResponse = await fetch("/api/tasks/generate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: today,
                to: today,
              }),
            });
            const generatePayload = (await generateResponse.json().catch(() => ({}))) as {
              message?: string;
              created?: number;
              skipped?: number;
            };

            if (!generateResponse.ok) {
              nextFeedback = `Assignment ${selectedUser.name} disimpan, tapi generate hari ini gagal: ${
                generatePayload.message ?? "unknown error"
              }`;
            } else {
              nextFeedback = `Assignment ${selectedUser.name} disimpan. Generate hari ini: created ${
                generatePayload.created ?? 0
              }, skipped ${generatePayload.skipped ?? 0}.`;
            }
          } catch (generateError) {
            nextFeedback = `Assignment ${selectedUser.name} disimpan, tapi generate hari ini gagal: ${
              generateError instanceof Error ? generateError.message : "unknown error"
            }`;
          }

          setSavedAssignedCodes(nextCodes);
          setDraftAssignedCodes(nextCodes);
          setAssignFeedback(nextFeedback);
        } catch (error) {
          setAssignError(error instanceof Error ? error.message : "Unable to save assignments.");
        }
      })();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Master Outlet
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Katalog outlet terpisah dari assignment
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            {normalizedQuery
              ? `Hasil pencarian "${deferredQuery.trim()}"`
              : "Urutan default: hari jadwal, lalu kabupaten, kecamatan, dan alamat"}
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Semua outlet hasil import tampil di sini agar lebih lega dibaca. Gunakan filter lokasi,
          territory, dan group untuk menentukan outlet mana yang ingin kamu stage dulu sebelum
          disimpan ke assignment field force terpilih.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Field Force Tujuan</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                setSavedAssignedCodes([]);
                setDraftAssignedCodes([]);
                setCatalogPage(1);
                setLoadError(null);
                setAssignError(null);
                setAssignFeedback(null);
              }}
              value={selectedUserId}
            >
              {users.length > 0 ? (
                <option value="">Pilih field force dulu</option>
              ) : null}
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

          <button
            className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            disabled={isAssignPending || !selectedUser || sortedOutlets.length === 0}
            onClick={handleStageAllFiltered}
            type="button"
          >
            Stage All Filtered
          </button>
          <button
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            disabled={isAssignPending || !selectedUser || sortedOutlets.length === 0}
            onClick={handleUnstageAllFiltered}
            type="button"
          >
            Remove All Filtered
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Field Force Aktif
            </p>
            <p className="mt-1 font-medium text-slate-900">{selectedUser?.name ?? "-"}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Assignment Tersimpan
            </p>
            <p className="mt-1 font-medium text-slate-900">{savedAssignedCodes.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Draft Assignment
            </p>
            <p className="mt-1 font-medium text-slate-900">{draftAssignedCodes.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Hasil Filter
            </p>
            <p className="mt-1 font-medium text-slate-900">{sortedOutlets.length}</p>
            <p className="mt-1 text-xs text-slate-500">{availableOutlets.length} siap dipilih</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">
              Pending Add
            </p>
            <p className="mt-1 font-medium text-emerald-800">{pendingAddCount}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">
              Pending Remove
            </p>
            <p className="mt-1 font-medium text-rose-800">{pendingRemoveCount}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isAssignPending ||
              !selectedUser ||
              (pendingAddCount === 0 && pendingRemoveCount === 0)
            }
            onClick={() => submitAssignments(draftAssignedCodes)}
            type="button"
          >
            {isAssignPending ? "Saving..." : "Save Assignment"}
          </button>
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isAssignPending ||
              !selectedUser ||
              (pendingAddCount === 0 && pendingRemoveCount === 0)
            }
            onClick={() => {
              setDraftAssignedCodes(savedAssignedCodes);
              setAssignError(null);
              setAssignFeedback(null);
            }}
            type="button"
          >
            Reset Draft
          </button>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        ) : null}

        {assignError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {assignError}
          </p>
        ) : null}

        {assignFeedback ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {assignFeedback}
          </p>
        ) : null}

        <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
          <span>Cari Outlet</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            onChange={(event) => {
              setQuery(event.target.value);
              setCatalogPage(1);
            }}
            placeholder="Cari kode toko, nama, alamat, kecamatan, group, supervisor, koordinat"
            value={query}
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Kabupaten</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setRegencyFilter(event.target.value);
                setSubdistrictFilter("");
                setCatalogPage(1);
              }}
              value={regencyFilter}
            >
              <option value="">Semua Kabupaten</option>
              {regencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Kecamatan</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setSubdistrictFilter(event.target.value);
                setCatalogPage(1);
              }}
              value={subdistrictFilter}
            >
              <option value="">Semua Kecamatan</option>
              {subdistrictOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Territory</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setTerritoryFilter(event.target.value);
                setCatalogPage(1);
              }}
              value={territoryFilter}
            >
              <option value="">Semua Territory</option>
              {territoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Group</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setGroupFilter(event.target.value);
                setCatalogPage(1);
              }}
              value={groupFilter}
            >
              <option value="">Semua Group</option>
              {groupOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Hari Jadwal</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setScheduleFilter((event.target.value as ScheduleDay | "") ?? "");
                setCatalogPage(1);
              }}
              value={scheduleFilter}
            >
              <option value="">Semua Hari</option>
              {Object.entries(SCHEDULE_DAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Urutkan</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setSortBy(event.target.value as "day" | "address" | "code" | "territory" | "group");
                setCatalogPage(1);
              }}
              value={sortBy}
            >
              <option value="day">Hari Jadwal</option>
              <option value="address">Alamat</option>
              <option value="code">Kode Toko</option>
              <option value="territory">Territory</option>
              <option value="group">Group</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <p>
            Pilihan outlet tersedia:{" "}
            <span className="font-semibold text-slate-900">{catalogOutlets.length}</span> outlet
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={`rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                showDraftedOutlets
                  ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => {
                setShowDraftedOutlets((currentValue) => !currentValue);
                setCatalogPage(1);
              }}
              type="button"
            >
              {showDraftedOutlets ? "Sembunyikan Yang Di-Add" : "Tampilkan Yang Di-Add"}
            </button>
            <p className="text-xs text-slate-500">
              {!selectedUser
                ? "Pilih field force dulu supaya tombol action aktif."
                : showDraftedOutlets
                  ? "Daftar sekarang menampilkan outlet draft dan yang belum dipilih."
                  : "Outlet yang sudah di-add disembunyikan dari daftar pilihan."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Draft Codes
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Kode outlet yang sedang di-stage
            </h3>
          </div>
          <p className="text-sm text-slate-500">{draftAssignedCodes.length} kode di draft saat ini</p>
        </div>

        {draftAssignedCodes.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
            Belum ada outlet di draft. Klik Add atau Stage All Filtered untuk mulai menyusun assignment.
          </p>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {draftAssignedCodes.map((code) => {
                const isPendingAdd = !savedAssignedCodeSet.has(code);

                return (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] transition ${
                      isPendingAdd
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    key={code}
                    onClick={() => handleUnstageOutlet(code)}
                    type="button"
                  >
                    {code}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Klik chip kode untuk remove dari draft. Chip hijau berarti outlet baru ditambahkan dan belum disimpan.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        {visibleOutlets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
            Tidak ada outlet yang cocok dengan pencarian atau filter.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleOutlets.map((outlet) => {
              const isInSavedAssignment = savedAssignedCodeSet.has(outlet.storeCode);
              const isInDraftAssignment = draftAssignedCodeSet.has(outlet.storeCode);
              const actionLabel = isInDraftAssignment
                ? "Remove"
                : isInSavedAssignment
                  ? "Restore"
                  : "Add";
              const actionVariant = isInDraftAssignment
                ? "remove"
                : isInSavedAssignment
                  ? "restore"
                  : "add";

              return (
                <OutletCatalogCard
                  actionDisabled={isAssignPending || !selectedUser}
                  actionLabel={actionLabel}
                  actionVariant={actionVariant}
                  key={outlet.id}
                  onAction={() => {
                    if (isInDraftAssignment) {
                      handleUnstageOutlet(outlet.storeCode);
                      return;
                    }

                    if (isInSavedAssignment) {
                      handleRestoreOutlet(outlet.storeCode);
                      return;
                    }

                    handleStageOutlet(outlet.storeCode);
                  }}
                  outlet={outlet}
                />
              );
            })}
          </div>
        )}

        {catalogOutlets.length > CATALOG_PAGE_SIZE ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Halaman {safeCatalogPage} dari {totalCatalogPages}. Menampilkan {visibleOutlets.length} outlet di halaman ini.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={safeCatalogPage === 1}
                onClick={() => setCatalogPage((currentPage) => Math.max(1, currentPage - 1))}
                type="button"
              >
                Prev
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    pageNumber === safeCatalogPage
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  key={pageNumber}
                  onClick={() => setCatalogPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
              <button
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={safeCatalogPage === totalCatalogPages}
                onClick={() =>
                  setCatalogPage((currentPage) => Math.min(totalCatalogPages, currentPage + 1))
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
