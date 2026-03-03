"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type PreviewOutlet = {
  kodeToko: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lon: number;
};

function PreviewMapBounds({
  outlets,
}: {
  outlets: PreviewOutlet[];
}) {
  const map = useMap();

  useEffect(() => {
    if (outlets.length === 0) {
      return;
    }

    if (outlets.length === 1) {
      map.setView([outlets[0].lat, outlets[0].lon], 15);
      return;
    }

    map.fitBounds(
      outlets.map((outlet) => [outlet.lat, outlet.lon] as [number, number]),
      {
        padding: [32, 32],
      },
    );
  }, [map, outlets]);

  return null;
}

export function AssignmentPreviewMap({
  outlets,
  emptyText = "Belum ada outlet aktif di draft untuk dipreview di peta.",
  helperText = "Marker hijau menunjukkan outlet yang aktif di draft assignment user terpilih.",
}: {
  outlets: PreviewOutlet[];
  emptyText?: string;
  helperText?: string;
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
          <PreviewMapBounds outlets={outlets} />
          {outlets.map((outlet) => (
            <CircleMarker
              center={[outlet.lat, outlet.lon]}
              key={outlet.kodeToko}
              pathOptions={{ color: "#0f766e", fillColor: "#14b8a6" }}
              radius={8}
            >
              <Popup>
                <strong>{outlet.namaToko}</strong>
                <br />
                {outlet.kodeToko}
                <br />
                {outlet.alamat}
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
