"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CircleMarker,
  Marker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { divIcon } from "leaflet";

type RouteStop = {
  order: number;
  kodeToko: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lon: number;
};

type UserPosition = {
  lat: number;
  lon: number;
};

function normalizeMapMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("only secure origins are allowed")) {
    return "GPS map diblokir karena halaman dibuka lewat HTTP pada IP lokal. Gunakan HTTPS agar posisi device bisa terbaca.";
  }

  if (normalizedMessage.includes("user denied geolocation")) {
    return "Izin lokasi ditolak. Aktifkan permission lokasi browser untuk melihat posisi di peta.";
  }

  return message;
}

function RouteMapBounds({
  stops,
  userPosition,
}: {
  stops: RouteStop[];
  userPosition: UserPosition | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...stops.map((stop) => [stop.lat, stop.lon] as [number, number]),
      ...(userPosition ? [[userPosition.lat, userPosition.lon] as [number, number]] : []),
    ];

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    map.fitBounds(points, {
      padding: [36, 36],
    });
  }, [map, stops, userPosition]);

  return null;
}

export function FieldRouteMapInner({
  stops,
}: {
  stops: RouteStop[];
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
        setMessage(normalizeMapMessage(error.message));
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

  const routeLine = [
    ...(userPosition ? [[userPosition.lat, userPosition.lon] as [number, number]] : []),
    ...stops.map((stop) => [stop.lat, stop.lon] as [number, number]),
  ];
  const numberedIcons = new Map(
    stops.map((stop) => [
      stop.kodeToko,
      divIcon({
        className: "field-route-marker",
        html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#0f766e;color:#ffffff;font-size:12px;font-weight:700;border:2px solid #ccfbf1;">${stop.order}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    ]),
  );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer center={[stops[0].lat, stops[0].lon]} className="h-80 w-full" zoom={14}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RouteMapBounds stops={stops} userPosition={userPosition} />

          {routeLine.length > 1 ? (
            <Polyline pathOptions={{ color: "#0891b2", weight: 4 }} positions={routeLine} />
          ) : null}

          {userPosition ? (
            <CircleMarker
              center={[userPosition.lat, userPosition.lon]}
              pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa" }}
              radius={10}
            >
              <Popup>Your current position</Popup>
            </CircleMarker>
          ) : null}

          {stops.map((stop) => (
            <Marker
              icon={numberedIcons.get(stop.kodeToko)}
              key={stop.kodeToko}
              position={[stop.lat, stop.lon]}
            >
              <Popup>
                <strong>
                  {stop.order}. {stop.namaToko}
                </strong>
                <br />
                {stop.kodeToko}
                <br />
                {stop.alamat}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {message ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{message}</p>
      ) : !isSecureOrigin ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Peta route tetap tampil, tapi posisi device tidak bisa dibaca karena halaman belum HTTPS.
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          Garis biru mengikuti urutan route. Posisi device ikut tampil saat GPS diizinkan browser.
        </p>
      )}
    </div>
  );
}
