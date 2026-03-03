"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { FieldRouteMap } from "@/components/field-route-map";
import { haversineDistanceMeters } from "@/lib/geo";

type RouteAssignment = {
  id: string;
  kodeToko: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lon: number;
  territory: string | null;
  territoryGroup: string | null;
  supervisorName: string | null;
  noTelpSpv: string | null;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  ukuran: string | null;
  jumlahSunscreen: number | null;
};

type UserPosition = {
  lat: number;
  lon: number;
};

type AssetSummaryRow = {
  typeOutlet: string;
  visualPposm: string;
  brand: string;
  ukuran: string;
  outletCount: number;
  totalSunscreen: number;
};

type GroupSizeSummaryRow = {
  group: string;
  sizes: Record<string, number>;
  total: number;
};

type BrandSummaryRow = {
  brand: string;
  outletCount: number;
  totalSunscreen: number;
};

function normalizeRouteMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("only secure origins are allowed")) {
    return "GPS belum aktif karena halaman harus dibuka lewat HTTPS atau localhost. Selama GPS belum terbaca, aplikasi memakai urutan default dari supervisor.";
  }

  if (normalizedMessage.includes("user denied geolocation")) {
    return "Izin lokasi ditolak. Aktifkan permission lokasi browser agar rute bisa menyesuaikan outlet terdekat dari posisi kamu.";
  }

  return message;
}

function buildNearestRoute(
  assignments: RouteAssignment[],
  userPosition: UserPosition | null,
) {
  if (!userPosition || assignments.length <= 1) {
    return assignments.map((assignment, index) => ({
      ...assignment,
      order: index + 1,
      distanceFromUserM: userPosition
        ? haversineDistanceMeters(
            userPosition.lat,
            userPosition.lon,
            assignment.lat,
            assignment.lon,
          )
        : null,
    }));
  }

  const remaining = [...assignments];
  const ordered: Array<RouteAssignment & { order: number; distanceFromUserM: number | null }> = [];
  let cursor = userPosition;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const distance = haversineDistanceMeters(
        cursor.lat,
        cursor.lon,
        candidate.lat,
        candidate.lon,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextStop] = remaining.splice(nearestIndex, 1);

    ordered.push({
      ...nextStop,
      order: ordered.length + 1,
      distanceFromUserM: haversineDistanceMeters(
        userPosition.lat,
        userPosition.lon,
        nextStop.lat,
        nextStop.lon,
      ),
    });

    cursor = {
      lat: nextStop.lat,
      lon: nextStop.lon,
    };
  }

  return ordered;
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function FieldRoutePlanner({
  assignments,
}: {
  assignments: RouteAssignment[];
}) {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hiddenBrands, setHiddenBrands] = useState<string[]>([]);
  const hasGeolocation = useSyncExternalStore(
    () => () => {},
    () => "geolocation" in navigator,
    () => false,
  );
  const isSecureOrigin = useSyncExternalStore(
    () => () => {},
    () => window.isSecureContext,
    () => false,
  );

  useEffect(() => {
    if (!hasGeolocation || !isSecureOrigin) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setMessage(null);
      },
      (error) => {
        setMessage(normalizeRouteMessage(error.message));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [hasGeolocation, isSecureOrigin]);

  const brandSummaryRows = useMemo<BrandSummaryRow[]>(() => {
    const grouped = new Map<string, BrandSummaryRow>();

    for (const assignment of assignments) {
      const brand = normalizeLabel(assignment.brand, "(blank)");
      const current = grouped.get(brand) ?? {
        brand,
        outletCount: 0,
        totalSunscreen: 0,
      };

      current.outletCount += 1;
      current.totalSunscreen += assignment.jumlahSunscreen ?? 0;
      grouped.set(brand, current);
    }

    return [...grouped.values()].sort((left, right) => left.brand.localeCompare(right.brand));
  }, [assignments]);
  const visibleAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => !hiddenBrands.includes(normalizeLabel(assignment.brand, "(blank)")),
      ),
    [assignments, hiddenBrands],
  );
  const plannedRoute = useMemo(
    () => buildNearestRoute(visibleAssignments, userPosition),
    [userPosition, visibleAssignments],
  );
  const assetSummaryRows = useMemo<AssetSummaryRow[]>(() => {
    const grouped = new Map<string, AssetSummaryRow>();

    for (const assignment of plannedRoute) {
      const typeOutlet = normalizeLabel(assignment.typeOutlet, "-");
      const visualPposm = normalizeLabel(assignment.visualPposm, "-");
      const brand = normalizeLabel(assignment.brand, "-");
      const ukuran = normalizeLabel(assignment.ukuran, "-");
      const key = [typeOutlet, visualPposm, brand, ukuran].join("|");
      const current = grouped.get(key) ?? {
        typeOutlet,
        visualPposm,
        brand,
        ukuran,
        outletCount: 0,
        totalSunscreen: 0,
      };

      current.outletCount += 1;
      current.totalSunscreen += assignment.jumlahSunscreen ?? 0;
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((left, right) =>
      [left.typeOutlet, left.visualPposm, left.brand, left.ukuran].join("|").localeCompare(
        [right.typeOutlet, right.visualPposm, right.brand, right.ukuran].join("|"),
      ),
    );
  }, [plannedRoute]);
  const ukuranColumns = useMemo(
    () =>
      [
        ...new Set(plannedRoute.map((assignment) => normalizeLabel(assignment.ukuran, "-"))),
      ].sort((left, right) => left.localeCompare(right)),
    [plannedRoute],
  );
  const groupSizeSummary = useMemo<GroupSizeSummaryRow[]>(() => {
    const grouped = new Map<string, GroupSizeSummaryRow>();

    for (const assignment of plannedRoute) {
      const group = normalizeLabel(assignment.territoryGroup, "(blank)");
      const ukuran = normalizeLabel(assignment.ukuran, "-");
      const current = grouped.get(group) ?? {
        group,
        sizes: {},
        total: 0,
      };
      const sunscreen = assignment.jumlahSunscreen ?? 0;

      current.sizes[ukuran] = (current.sizes[ukuran] ?? 0) + sunscreen;
      current.total += sunscreen;
      grouped.set(group, current);
    }

    return [...grouped.values()].sort((left, right) => left.group.localeCompare(right.group));
  }, [plannedRoute]);
  const grandTotalSunscreen = useMemo(
    () => plannedRoute.reduce((total, assignment) => total + (assignment.jumlahSunscreen ?? 0), 0),
    [plannedRoute],
  );

  const routeStops = plannedRoute.map((assignment) => ({
    order: assignment.order,
    kodeToko: assignment.kodeToko,
    namaToko: assignment.namaToko,
    alamat: assignment.alamat,
    lat: assignment.lat,
    lon: assignment.lon,
  }));
  const firstStop = plannedRoute[0] ?? null;
  const hasUserPosition = userPosition != null;

  function toggleBrandVisibility(brand: string) {
    setHiddenBrands((current) =>
      current.includes(brand)
        ? current.filter((currentBrand) => currentBrand !== brand)
        : [...current, brand],
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        {hasUserPosition ? (
          <p>
            GPS aktif. Urutan rute sekarang otomatis dimulai dari outlet terdekat ke posisi kamu.
          </p>
        ) : (
          <p>
            GPS belum terbaca. Aplikasi masih memakai urutan default dari supervisor sampai posisi
            device aktif.
          </p>
        )}
      </div>

      {firstStop ? (
        <div className="rounded-3xl border border-cyan-100 bg-cyan-50 px-4 py-4 shadow-sm shadow-cyan-900/5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Start Route
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Mulai dari outlet terdekat: {firstStop.namaToko}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {hasUserPosition
                  ? "Urutan sudah disusun dari lokasi kamu saat ini."
                  : "Saat GPS belum aktif, tombol ini memakai urutan default dari supervisor."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
                href={`https://www.google.com/maps/dir/?api=1&destination=${firstStop.lat},${firstStop.lon}`}
                rel="noreferrer"
                target="_blank"
              >
                Mulai dari outlet terdekat
              </a>
              <a
                className="inline-flex rounded-2xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300"
                href={`https://waze.com/ul?ll=${firstStop.lat},${firstStop.lon}&navigate=yes`}
                rel="noreferrer"
                target="_blank"
              >
                Waze
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <FieldRouteMap
        externalMessage={message}
        stops={routeStops}
        trackDevice={false}
        userPosition={userPosition}
      />

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Asset Summary
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Ringkasan asset yang harus dibawa
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Rekap ini mengikuti outlet yang sudah di-assign, jadi field force bisa menyiapkan
            asset pemasangan sebelum mulai rute.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total Outlet
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{plannedRoute.length}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">
              Total Sunscreen
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-900">{grandTotalSunscreen}</p>
          </div>
          <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-500">
              Kombinasi Asset
            </p>
            <p className="mt-1 text-lg font-semibold text-cyan-900">{assetSummaryRows.length}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Filter Brand
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Hide brand yang asset-nya sedang habis. Route dan daftar outlet di halaman ini
                akan ikut hilang sementara, lalu bisa di-unhide kapan saja.
              </p>
            </div>
            <button
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={hiddenBrands.length === 0}
              onClick={() => setHiddenBrands([])}
              type="button"
            >
              Unhide Semua Brand
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {brandSummaryRows.map((row) => {
              const isHidden = hiddenBrands.includes(row.brand);

              return (
                <button
                  className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    isHidden
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
                  }`}
                  key={row.brand}
                  onClick={() => toggleBrandVisibility(row.brand)}
                  type="button"
                >
                  <span className="block font-semibold">{row.brand}</span>
                  <span className="mt-1 block text-xs">
                    {row.outletCount} outlet • {row.totalSunscreen} sunscreen •{" "}
                    {isHidden ? "Hidden" : "Active"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {hiddenBrands.length > 0 ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Brand yang sedang di-hide: {hiddenBrands.join(", ")}. Ini hanya mengubah tampilan route
            di halaman ini, tidak mengubah assignment supervisor.
          </p>
        ) : null}

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Detail Kebutuhan per Type / Visual / Brand / Ukuran
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Type Outlet</th>
                    <th className="px-4 py-3 font-semibold">Visual PPOSM</th>
                    <th className="px-4 py-3 font-semibold">Brand</th>
                    <th className="px-4 py-3 font-semibold">Ukuran</th>
                    <th className="px-4 py-3 font-semibold">Jumlah Outlet</th>
                    <th className="px-4 py-3 font-semibold">Jumlah Sunscreen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {assetSummaryRows.map((row) => (
                    <tr key={[row.typeOutlet, row.visualPposm, row.brand, row.ukuran].join("|")}>
                      <td className="px-4 py-3">{row.typeOutlet}</td>
                      <td className="px-4 py-3">{row.visualPposm}</td>
                      <td className="px-4 py-3">{row.brand}</td>
                      <td className="px-4 py-3">{row.ukuran}</td>
                      <td className="px-4 py-3 font-semibold">{row.outletCount}</td>
                      <td className="px-4 py-3 font-semibold text-cyan-700">
                        {row.totalSunscreen}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Rekap Group x Ukuran
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Group</th>
                    {ukuranColumns.map((ukuran) => (
                      <th className="px-4 py-3 font-semibold" key={ukuran}>
                        {ukuran}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {groupSizeSummary.map((row) => (
                    <tr key={row.group}>
                      <td className="px-4 py-3 font-semibold">{row.group}</td>
                      {ukuranColumns.map((ukuran) => (
                        <td className="px-4 py-3" key={`${row.group}-${ukuran}`}>
                          {row.sizes[ukuran] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 font-semibold text-cyan-700">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 text-slate-700">
                  <tr>
                    <td className="px-4 py-3 font-semibold">Grand Total</td>
                    {ukuranColumns.map((ukuran) => (
                      <td className="px-4 py-3 font-semibold" key={`grand-${ukuran}`}>
                        {groupSizeSummary.reduce(
                          (total, row) => total + (row.sizes[ukuran] ?? 0),
                          0,
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold text-cyan-700">
                      {grandTotalSunscreen}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Route Detail
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Outlet information
          </h2>
        </div>

        <div className="space-y-4">
          {plannedRoute.map((assignment) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-900/5"
              key={assignment.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                    Stop {assignment.order}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {assignment.namaToko}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {assignment.kodeToko} • {assignment.alamat}
                  </p>
                  {assignment.distanceFromUserM != null ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                      {Math.round(assignment.distanceFromUserM)} m dari posisi kamu
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="inline-flex rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${assignment.lat},${assignment.lon}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Buka Navigasi
                  </a>
                  <a
                    className="inline-flex rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    href={`https://waze.com/ul?ll=${assignment.lat},${assignment.lon}&navigate=yes`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Waze
                  </a>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Store
                  </p>
                  <p className="mt-1 text-slate-700">{assignment.kodeToko}</p>
                  <p className="mt-1 text-slate-600">
                    {assignment.territory ?? "-"} • {assignment.territoryGroup ?? "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Supervisor
                  </p>
                  <p className="mt-1 text-slate-700">
                    {assignment.supervisorName ?? "-"}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Telp: {assignment.noTelpSpv ?? "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Outlet Detail
                  </p>
                  <p className="mt-1 text-slate-700">
                    Type: {assignment.typeOutlet ?? "-"}
                  </p>
                  <p className="mt-1 text-slate-600">Brand: {assignment.brand ?? "-"}</p>
                  <p className="mt-1 text-slate-600">
                    {assignment.visualPposm ?? "-"} • {assignment.ukuran ?? "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Kebutuhan Visit
                  </p>
                  <p className="mt-1 text-slate-700">
                    Jumlah Sunscreen: {assignment.jumlahSunscreen ?? 0}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Cek pemasangan sesuai visual PPOSM, brand, dan ukuran outlet.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Route Mode
                  </p>
                  <p className="mt-1 text-slate-700">
                    {userPosition ? "Nearest outlet from your GPS" : "Default supervisor order"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
