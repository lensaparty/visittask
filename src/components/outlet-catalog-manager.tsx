"use client";

import { useDeferredValue, useState } from "react";

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
  supervisorName: string | null;
  supervisorPhone: string | null;
  typeOutlet: string | null;
  visualPposm: string | null;
  brand: string | null;
  size: string | null;
  latitude: number;
  longitude: number;
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
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

function OutletCatalogCard({
  outlet,
}: {
  outlet: OutletCatalogView;
}) {
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
}: {
  outlets: OutletCatalogView[];
}) {
  const [query, setQuery] = useState("");
  const [regencyFilter, setRegencyFilter] = useState("");
  const [subdistrictFilter, setSubdistrictFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [sortBy, setSortBy] = useState<"address" | "code" | "territory" | "group">("address");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

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

    if (!normalizedQuery) {
      return true;
    }

    return buildOutletSearchText(outlet).includes(normalizedQuery);
  });

  const sortedOutlets =
    sortBy === "code"
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

  const visibleOutlets = normalizedQuery ? sortedOutlets.slice(0, 120) : sortedOutlets.slice(0, 60);

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
              : "Urutan default: kabupaten, kecamatan, alamat, lalu koordinat"}
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Semua outlet hasil import tampil di sini agar lebih lega dibaca. Gunakan filter lokasi,
          territory, dan group untuk menentukan outlet mana yang ingin kamu copy ke menu assignment.
        </p>

        <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
          <span>Cari Outlet</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kode toko, nama, alamat, kecamatan, group, supervisor, koordinat"
            value={query}
          />
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Filter Kabupaten</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setRegencyFilter(event.target.value);
                setSubdistrictFilter("");
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

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Urutkan</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                setSortBy(event.target.value as "address" | "code" | "territory" | "group")
              }
              value={sortBy}
            >
              <option value="address">Alamat</option>
              <option value="code">Kode Toko</option>
              <option value="territory">Territory</option>
              <option value="group">Group</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <p>
            Master outlet tersedia:{" "}
            <span className="font-semibold text-slate-900">{sortedOutlets.length}</span> outlet
          </p>
          <p className="text-xs text-slate-500">
            Buka menu Assign setelah menentukan kode toko yang mau dipakai.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
        {visibleOutlets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
            Tidak ada outlet yang cocok dengan pencarian atau filter.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleOutlets.map((outlet) => (
              <OutletCatalogCard key={outlet.id} outlet={outlet} />
            ))}
          </div>
        )}

        {sortedOutlets.length > visibleOutlets.length ? (
          <p className="mt-4 text-sm text-slate-500">
            Menampilkan {visibleOutlets.length} outlet pertama. Persempit filter untuk melihat
            hasil lain.
          </p>
        ) : null}
      </section>
    </div>
  );
}
