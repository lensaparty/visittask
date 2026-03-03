"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

type PreviewOutlet = {
  kodeToko: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lon: number;
  group?: string | null;
  order?: number;
  distanceFromOfficeM?: number | null;
};

function PreviewMapBounds({
  outlets,
  officePosition,
}: {
  outlets: PreviewOutlet[];
  officePosition?: { lat: number; lon: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...outlets.map((outlet) => [outlet.lat, outlet.lon] as [number, number]),
      ...(officePosition ? [[officePosition.lat, officePosition.lon] as [number, number]] : []),
    ];

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    map.fitBounds(points, {
      padding: [32, 32],
    });
  }, [map, officePosition, outlets]);

  return null;
}

function colorForGroup(group: string | null | undefined) {
  const palette = [
    { stroke: "#0f766e", fill: "#14b8a6" },
    { stroke: "#1d4ed8", fill: "#60a5fa" },
    { stroke: "#7c3aed", fill: "#a78bfa" },
    { stroke: "#be123c", fill: "#fb7185" },
    { stroke: "#b45309", fill: "#f59e0b" },
    { stroke: "#166534", fill: "#4ade80" },
  ];

  if (!group) {
    return palette[0];
  }

  let hash = 0;

  for (const character of group) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return palette[hash % palette.length];
}

export function AssignmentPreviewMap({
  outlets,
  emptyText = "Belum ada outlet aktif di draft untuk dipreview di peta.",
  helperText = "Marker hijau menunjukkan outlet yang aktif di draft assignment user terpilih.",
  officePosition = null,
}: {
  outlets: PreviewOutlet[];
  emptyText?: string;
  helperText?: string;
  officePosition?: { lat: number; lon: number } | null;
}) {
  if (outlets.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer
          center={[outlets[0].lat, outlets[0].lon]}
          className="h-72 w-full"
          zoom={13}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PreviewMapBounds officePosition={officePosition} outlets={outlets} />
          {officePosition ? (
            <CircleMarker
              center={[officePosition.lat, officePosition.lon]}
              pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa" }}
              radius={10}
            >
              <Popup>
                <strong>Titik Kantor</strong>
                <br />
                {officePosition.lat.toFixed(6)}, {officePosition.lon.toFixed(6)}
              </Popup>
            </CircleMarker>
          ) : null}
          {officePosition && outlets.length > 0 ? (
            <Polyline
              pathOptions={{ color: "#94a3b8", dashArray: "6 6", weight: 3 }}
              positions={[
                [officePosition.lat, officePosition.lon],
                ...outlets.map((outlet) => [outlet.lat, outlet.lon] as [number, number]),
              ]}
            />
          ) : null}
          {outlets.map((outlet) => (
            <CircleMarker
              center={[outlet.lat, outlet.lon]}
              key={outlet.kodeToko}
              pathOptions={{
                color: colorForGroup(outlet.group).stroke,
                fillColor: colorForGroup(outlet.group).fill,
              }}
              radius={10}
            >
              {outlet.order ? (
                <Tooltip className="!border-0 !bg-transparent !shadow-none" direction="center" opacity={1} permanent>
                  <span className="text-[11px] font-bold text-white">{outlet.order}</span>
                </Tooltip>
              ) : null}
              <Popup>
                <strong>{outlet.namaToko}</strong>
                <br />
                {outlet.kodeToko}
                <br />
                {outlet.alamat}
                <br />
                Group: {outlet.group ?? "-"}
                {outlet.distanceFromOfficeM != null ? (
                  <>
                    <br />
                    {Math.round(outlet.distanceFromOfficeM)} m dari kantor
                  </>
                ) : null}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="text-sm text-slate-500">
        {helperText}
      </p>
    </div>
  );
}
