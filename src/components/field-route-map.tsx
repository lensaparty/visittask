"use client";

import dynamic from "next/dynamic";

type RouteStop = {
  order: number;
  kodeToko: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lon: number;
};

const FieldRouteMapInner = dynamic(
  () =>
    import("./field-route-map-inner").then((module) => module.FieldRouteMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="flex h-80 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
          Loading route map...
        </div>
        <p className="text-sm text-slate-500">
          Peta route sedang disiapkan.
        </p>
      </div>
    ),
  },
);

export function FieldRouteMap({
  stops,
}: {
  stops: RouteStop[];
}) {
  if (stops.length === 0) {
    return null;
  }

  return <FieldRouteMapInner stops={stops} />;
}
