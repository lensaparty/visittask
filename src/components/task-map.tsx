"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type Position = {
  latitude: number;
  longitude: number;
};

function ViewController({
  outlet,
  userPosition,
}: {
  outlet: Position;
  userPosition: Position | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (userPosition) {
      map.fitBounds(
        [
          [outlet.latitude, outlet.longitude],
          [userPosition.latitude, userPosition.longitude],
        ],
        {
          padding: [48, 48],
        },
      );
      return;
    }

    map.setView([outlet.latitude, outlet.longitude], 16);
  }, [map, outlet.latitude, outlet.longitude, userPosition]);

  return null;
}

export function TaskMap({
  outletLatitude,
  outletLongitude,
  outletName,
  onUserPositionChange,
}: {
  outletLatitude: number;
  outletLongitude: number;
  outletName: string;
  onUserPositionChange?: ((position: Position | null) => void) | undefined;
}) {
  const hasGeolocation =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const [userPosition, setUserPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasGeolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserPosition(nextPosition);
        onUserPositionChange?.(nextPosition);
      },
      (watchError) => {
        setError(watchError.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      onUserPositionChange?.(null);
    };
  }, [hasGeolocation, onUserPositionChange]);

  const displayError = error ?? (!hasGeolocation ? "Geolocation is not supported by this browser." : null);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer
          center={[outletLatitude, outletLongitude]}
          className="h-[420px] w-full"
          zoom={16}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ViewController
            outlet={{
              latitude: outletLatitude,
              longitude: outletLongitude,
            }}
            userPosition={userPosition}
          />
          <CircleMarker
            center={[outletLatitude, outletLongitude]}
            pathOptions={{ color: "#0f766e", fillColor: "#14b8a6" }}
            radius={12}
          >
            <Popup>{outletName}</Popup>
          </CircleMarker>
          {userPosition ? (
            <>
              <CircleMarker
                center={[userPosition.latitude, userPosition.longitude]}
                pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa" }}
                radius={10}
              >
                <Popup>Your current position</Popup>
              </CircleMarker>
              <Polyline
                pathOptions={{ color: "#2563eb", dashArray: "8 8" }}
                positions={[
                  [outletLatitude, outletLongitude],
                  [userPosition.latitude, userPosition.longitude],
                ]}
              />
            </>
          ) : null}
        </MapContainer>
      </div>
      {displayError ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {displayError}
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          Outlet marker is green. Your current device position is blue.
        </p>
      )}
    </div>
  );
}
