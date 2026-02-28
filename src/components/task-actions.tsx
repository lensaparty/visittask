"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { haversineDistanceMeters } from "@/lib/geo";
import { CanonicalTaskStatus } from "@/lib/task-status";

type Coordinates = {
  lat: number;
  lon: number;
};

function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => reject(new Error(error.message)),
      {
        enableHighAccuracy: true,
        timeout: 15000,
      },
    );
  });
}

async function postWithCoordinates(url: string, coordinates: Coordinates) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(coordinates),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    distanceM?: number;
  };

  return {
    ok: response.ok,
    message: payload.message ?? null,
    distanceM: payload.distanceM ?? null,
  };
}

export function TaskActions({
  taskId,
  status,
  outletLatitude,
  outletLongitude,
  initialVisit,
}: {
  taskId: string;
  status: CanonicalTaskStatus;
  outletLatitude: number;
  outletLongitude: number;
  initialVisit: {
    checkInTime: string | Date | null;
    checkOutTime: string | Date | null;
    checkInDistanceM: number | null;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(
    initialVisit.checkInDistanceM,
  );
  const [isPending, startTransition] = useTransition();

  const canCheckIn = status === "PENDING";
  const canCheckOut = status === "IN_PROGRESS";

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        setCurrentPosition(nextPosition);
        setDistanceM(
          haversineDistanceMeters(
            nextPosition.lat,
            nextPosition.lon,
            outletLatitude,
            outletLongitude,
          ),
        );
      },
      () => {
        // Keep the last known distance if the browser cannot refresh it.
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
  }, [outletLatitude, outletLongitude]);

  function runAction(path: "checkin" | "checkout") {
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const coordinates = currentPosition ?? (await getCurrentCoordinates());
          setCurrentPosition(coordinates);
          setDistanceM(
            haversineDistanceMeters(
              coordinates.lat,
              coordinates.lon,
              outletLatitude,
              outletLongitude,
            ),
          );

          const result = await postWithCoordinates(
            `/api/tasks/${taskId}/${path}`,
            coordinates,
          );

          if (!result.ok) {
            setMessage({
              tone: "error",
              text: result.distanceM
                ? `${result.message ?? "Action failed."} Current distance: ${result.distanceM} m.`
                : (result.message ?? "Action failed."),
            });
            return;
          }

          setMessage({
            tone: "success",
            text:
              path === "checkin"
                ? `Checked in successfully at ${result.distanceM ?? 0} m.`
                : `Checked out successfully at ${result.distanceM ?? 0} m.`,
          });
          router.refresh();
        } catch (error) {
          setMessage({
            tone: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to complete action.",
          });
        }
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
        Task Actions
      </p>
      <p className="mt-3 text-sm text-slate-600">
        {distanceM == null ? "Waiting for location..." : `${Math.round(distanceM)} m from outlet`}
      </p>
      <p className="text-xs text-slate-500">
        Check-in and check-out are only allowed within 100 meters.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <button
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canCheckIn || isPending}
          onClick={() => runAction("checkin")}
          type="button"
        >
          {isPending && canCheckIn ? "Checking in..." : "Check In"}
        </button>
        <button
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canCheckOut || isPending}
          onClick={() => runAction("checkout")}
          type="button"
        >
          {isPending && canCheckOut ? "Checking out..." : "Check Out"}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            message.tone === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
