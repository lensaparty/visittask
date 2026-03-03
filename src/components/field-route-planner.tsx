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
};

type UserPosition = {
  lat: number;
  lon: number;
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

export function FieldRoutePlanner({
  assignments,
}: {
  assignments: RouteAssignment[];
}) {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  const plannedRoute = useMemo(
    () => buildNearestRoute(assignments, userPosition),
    [assignments, userPosition],
  );

  const routeStops = plannedRoute.map((assignment) => ({
    order: assignment.order,
    kodeToko: assignment.kodeToko,
    namaToko: assignment.namaToko,
    alamat: assignment.alamat,
    lat: assignment.lat,
    lon: assignment.lon,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        {userPosition ? (
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

      <FieldRouteMap
        externalMessage={message}
        stops={routeStops}
        trackDevice={false}
        userPosition={userPosition}
      />

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
                  <p className="mt-1 text-slate-600">
                    {assignment.visualPposm ?? "-"} • {assignment.brand ?? "-"} •{" "}
                    {assignment.ukuran ?? "-"}
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
