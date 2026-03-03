"use client";

import { useMemo, useState } from "react";
import { AssignmentPreviewMap } from "@/components/assignment-preview-map";
import { haversineDistanceMeters } from "@/lib/geo";

type TsukOutletView = {
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
  latitude: number;
  longitude: number;
};

type ClusteredOutlet = TsukOutletView & {
  order: number;
  distanceFromOfficeM: number | null;
  usedAddressFallback: boolean;
};

type ClusterGroup = {
  id: string;
  label: string;
  color: string;
  outlets: ClusteredOutlet[];
  fallbackCount: number;
};

const CLUSTER_SIZE = 35;
const CLUSTER_COLORS = [
  "bg-teal-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
];

function parseCoordinateInput(value: string) {
  const parsed = Number(value.trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function hasUsableCoordinates(outlet: TsukOutletView) {
  if (!Number.isFinite(outlet.latitude) || !Number.isFinite(outlet.longitude)) {
    return false;
  }

  if (outlet.latitude === 0 && outlet.longitude === 0) {
    return false;
  }

  if (outlet.latitude < -90 || outlet.latitude > 90) {
    return false;
  }

  if (outlet.longitude < -180 || outlet.longitude > 180) {
    return false;
  }

  return true;
}

function defaultOutletSort(left: TsukOutletView, right: TsukOutletView) {
  const leftKey = [
    left.territory ?? "",
    left.regency ?? "",
    left.subdistrict ?? "",
    left.district ?? "",
    left.address,
    left.storeCode,
  ].join("|");
  const rightKey = [
    right.territory ?? "",
    right.regency ?? "",
    right.subdistrict ?? "",
    right.district ?? "",
    right.address,
    right.storeCode,
  ].join("|");

  return leftKey.localeCompare(rightKey);
}

function computeCentroid(outlets: TsukOutletView[]) {
  const validOutlets = outlets.filter(hasUsableCoordinates);

  if (validOutlets.length === 0) {
    return null;
  }

  const latitude =
    validOutlets.reduce((total, outlet) => total + outlet.latitude, 0) / validOutlets.length;
  const longitude =
    validOutlets.reduce((total, outlet) => total + outlet.longitude, 0) / validOutlets.length;

  return {
    lat: latitude,
    lon: longitude,
  };
}

function addressMatchScore(clusterOutlets: TsukOutletView[], outlet: TsukOutletView) {
  let bestScore = -1;

  for (const clusterOutlet of clusterOutlets) {
    let score = 0;

    if ((clusterOutlet.regency ?? "") === (outlet.regency ?? "")) {
      score += 4;
    }
    if ((clusterOutlet.subdistrict ?? "") === (outlet.subdistrict ?? "")) {
      score += 3;
    }
    if ((clusterOutlet.district ?? "") === (outlet.district ?? "")) {
      score += 2;
    }
    if ((clusterOutlet.territory ?? "") === (outlet.territory ?? "")) {
      score += 1;
    }
    if ((clusterOutlet.territoryGroup ?? "") === (outlet.territoryGroup ?? "")) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function buildTsukClusters(
  outlets: TsukOutletView[],
  officePosition: { lat: number; lon: number } | null,
) {
  const validOutlets = outlets.filter(hasUsableCoordinates);
  const fallbackOutlets = outlets.filter((outlet) => !hasUsableCoordinates(outlet));
  const remaining = [...validOutlets].sort(defaultOutletSort);
  const rawClusters: Array<{ base: TsukOutletView[]; fallback: TsukOutletView[] }> = [];

  while (remaining.length > 0) {
    let seedIndex = 0;

    if (officePosition) {
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < remaining.length; index += 1) {
        const outlet = remaining[index];
        const distance = haversineDistanceMeters(
          officePosition.lat,
          officePosition.lon,
          outlet.latitude,
          outlet.longitude,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          seedIndex = index;
        }
      }
    }

    const clusterBase: TsukOutletView[] = [remaining.splice(seedIndex, 1)[0]];

    while (clusterBase.length < CLUSTER_SIZE && remaining.length > 0) {
      const centroid = computeCentroid(clusterBase);

      if (!centroid) {
        clusterBase.push(remaining.shift() as TsukOutletView);
        continue;
      }

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < remaining.length; index += 1) {
        const outlet = remaining[index];
        const distance = haversineDistanceMeters(
          centroid.lat,
          centroid.lon,
          outlet.latitude,
          outlet.longitude,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }

      clusterBase.push(remaining.splice(nearestIndex, 1)[0]);
    }

    rawClusters.push({
      base: clusterBase,
      fallback: [],
    });
  }

  for (const outlet of fallbackOutlets) {
    const candidateIndexes = rawClusters
      .map((cluster, index) => ({ cluster, index }))
      .filter(({ cluster }) => cluster.base.length + cluster.fallback.length < CLUSTER_SIZE);

    if (candidateIndexes.length === 0) {
      rawClusters.push({
        base: [],
        fallback: [outlet],
      });
      continue;
    }

    candidateIndexes.sort((left, right) => {
      const leftScore = addressMatchScore([...left.cluster.base, ...left.cluster.fallback], outlet);
      const rightScore = addressMatchScore([...right.cluster.base, ...right.cluster.fallback], outlet);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      const leftSize = left.cluster.base.length + left.cluster.fallback.length;
      const rightSize = right.cluster.base.length + right.cluster.fallback.length;

      return leftSize - rightSize;
    });

    rawClusters[candidateIndexes[0].index].fallback.push(outlet);
  }

  return rawClusters.map((cluster, clusterIndex) => {
    const sortableBase = officePosition
      ? [...cluster.base].sort((left, right) => {
          const leftDistance = haversineDistanceMeters(
            officePosition.lat,
            officePosition.lon,
            left.latitude,
            left.longitude,
          );
          const rightDistance = haversineDistanceMeters(
            officePosition.lat,
            officePosition.lon,
            right.latitude,
            right.longitude,
          );

          return leftDistance - rightDistance;
        })
      : [...cluster.base].sort(defaultOutletSort);
    const fallbackSorted = [...cluster.fallback].sort(defaultOutletSort);
    const orderedOutlets = [...sortableBase, ...fallbackSorted].map((outlet, outletIndex) => ({
      ...outlet,
      order: outletIndex + 1,
      distanceFromOfficeM:
        officePosition && hasUsableCoordinates(outlet)
          ? haversineDistanceMeters(
              officePosition.lat,
              officePosition.lon,
              outlet.latitude,
              outlet.longitude,
            )
          : null,
      usedAddressFallback: !hasUsableCoordinates(outlet),
    }));

    return {
      id: `cluster-${clusterIndex + 1}`,
      label: `Grup ${clusterIndex + 1}`,
      color: CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length],
      outlets: orderedOutlets,
      fallbackCount: orderedOutlets.filter((outlet) => outlet.usedAddressFallback).length,
    };
  });
}

export function TsukClusterManager({
  outlets,
}: {
  outlets: TsukOutletView[];
}) {
  const [query, setQuery] = useState("");
  const [regencyFilter, setRegencyFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [officeLatInput, setOfficeLatInput] = useState("");
  const [officeLonInput, setOfficeLonInput] = useState("");
  const [selectedClusterIndex, setSelectedClusterIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();

  const regencyOptions = [
    ...new Set(outlets.map((outlet) => outlet.regency ?? "").filter((value) => value.length > 0)),
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
    ...new Set(outlets.map((outlet) => outlet.territory ?? "").filter((value) => value.length > 0)),
  ].sort((left, right) => left.localeCompare(right));
  const groupOptions = [
    ...new Set(
      outlets.map((outlet) => outlet.territoryGroup ?? "").filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const filteredOutlets = useMemo(
    () =>
      outlets.filter((outlet) => {
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
        if (!normalizedQuery) {
          return true;
        }

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
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [groupFilter, normalizedQuery, outlets, regencyFilter, subdistrictFilter, territoryFilter],
  );

  const officePosition = useMemo(() => {
    const latitude = parseCoordinateInput(officeLatInput);
    const longitude = parseCoordinateInput(officeLonInput);

    if (latitude == null || longitude == null) {
      return null;
    }

    return {
      lat: latitude,
      lon: longitude,
    };
  }, [officeLatInput, officeLonInput]);

  const clusters = useMemo<ClusterGroup[]>(
    () => buildTsukClusters(filteredOutlets, officePosition),
    [filteredOutlets, officePosition],
  );
  const safeSelectedClusterIndex =
    clusters.length === 0 ? 0 : Math.min(selectedClusterIndex, clusters.length - 1);
  const selectedCluster = clusters[safeSelectedClusterIndex] ?? null;
  const totalFallbackCount = clusters.reduce((total, cluster) => total + cluster.fallbackCount, 0);

  const selectedClusterPreview = selectedCluster
    ? selectedCluster.outlets.filter(hasUsableCoordinates).map((outlet) => ({
        kodeToko: outlet.storeCode,
        namaToko: outlet.name,
        alamat: outlet.address,
        lat: outlet.latitude,
        lon: outlet.longitude,
        group: selectedCluster.label,
        order: outlet.order,
        distanceFromOfficeM: outlet.distanceFromOfficeM,
      }))
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
              TSUK Grouping
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Cluster outlet saling berdekatan
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Maksimal {CLUSTER_SIZE} outlet per grup.
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Menu ini memisahkan outlet menjadi grup TSUK berdasarkan kedekatan koordinat. Kalau
          koordinat tidak usable, outlet tetap dimasukkan ke grup terdekat dengan fallback alamat
          dan wilayah.
        </p>

        <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
          <span>Cari TSUK / Outlet</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari TSUK, kode toko, nama toko, alamat, kabupaten"
            value={query}
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Kabupaten</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => setRegencyFilter(event.target.value)}
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
              onChange={(event) => setSubdistrictFilter(event.target.value)}
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
              onChange={(event) => setTerritoryFilter(event.target.value)}
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
              onChange={(event) => setGroupFilter(event.target.value)}
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
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Titik Kantor Lat</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => setOfficeLatInput(event.target.value)}
              placeholder="-6.800000"
              value={officeLatInput}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Titik Kantor Lon</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => setOfficeLonInput(event.target.value)}
              placeholder="107.100000"
              value={officeLonInput}
            />
          </label>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total Outlet
            </p>
            <p className="mt-1 font-medium text-slate-900">{filteredOutlets.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Fallback Alamat
            </p>
            <p className="mt-1 font-medium text-slate-900">{totalFallbackCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Grup TSUK
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Hasil cluster otomatis
                </h3>
              </div>
              <p className="text-sm text-slate-500">{clusters.length} grup terbentuk</p>
            </div>

            {clusters.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Belum ada outlet yang cocok untuk di-cluster.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {clusters.map((cluster, index) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      index === safeSelectedClusterIndex
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
                    }`}
                    key={cluster.id}
                    onClick={() => setSelectedClusterIndex(index)}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${cluster.color}`} />
                      <div>
                        <p className="text-sm font-semibold">{cluster.label}</p>
                        <p className={`text-xs ${index === safeSelectedClusterIndex ? "text-slate-300" : "text-slate-500"}`}>
                          {cluster.outlets.length} outlet
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${index === safeSelectedClusterIndex ? "text-cyan-300" : "text-slate-500"}`}>
                      fallback {cluster.fallbackCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Peta TSUK
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedCluster?.label ?? "Pilih grup dulu"}
                </h3>
              </div>
              {selectedCluster ? (
                <p className="text-sm text-slate-500">{selectedCluster.outlets.length} marker</p>
              ) : null}
            </div>

            <div className="mt-4">
              <AssignmentPreviewMap
                emptyText="Pilih grup TSUK untuk melihat peta cluster."
                helperText={
                  officePosition
                    ? "Nomor marker diurutkan dari titik kantor ke outlet terdekat sampai terjauh. Outlets fallback alamat tetap ikut grup."
                    : "Isi titik kantor kalau mau mengurutkan dari kantor ke outlet terjauh."
                }
                officePosition={officePosition}
                outlets={selectedClusterPreview}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Detail Grup
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  Anggota cluster terpilih
                </h3>
              </div>
              {selectedCluster ? (
                <p className="text-sm text-slate-500">{selectedCluster.fallbackCount} fallback alamat</p>
              ) : null}
            </div>

            {!selectedCluster ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                Pilih grup di panel kiri untuk melihat anggota TSUK.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedCluster.outlets.map((outlet) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-900/5"
                    key={outlet.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                          Stop {outlet.order}
                        </p>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          {outlet.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {outlet.storeCode} • {outlet.territory ?? "-"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{outlet.address}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {outlet.usedAddressFallback ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                            Fallback Alamat
                          </span>
                        ) : null}
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white ${selectedCluster.color}`}>
                          {selectedCluster.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Area
                        </p>
                        <p className="mt-1 text-slate-900">
                          {outlet.subdistrict ?? "-"} / {outlet.regency ?? "-"}
                        </p>
                        <p className="mt-1">Distrik: {outlet.district ?? "-"}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Supervisor
                        </p>
                        <p className="mt-1 text-slate-900">{outlet.supervisorName ?? "-"}</p>
                        <p className="mt-1">Telp: {outlet.supervisorPhone ?? "-"}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                      {outlet.distanceFromOfficeM != null
                        ? `${Math.round(outlet.distanceFromOfficeM)} m dari kantor`
                        : "Urutan fallback alamat / wilayah"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
