"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Coordinates = {
  latitude: number;
  longitude: number;
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
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
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
    distanceMeters?: number;
  };

  if (!response.ok) {
    throw new Error(
      payload.distanceMeters
        ? `${payload.message ?? "Action failed."} (${payload.distanceMeters} m away)`
        : (payload.message ?? "Action failed."),
    );
  }
}

export function TaskActions({
  taskId,
  canCheckIn,
  canCheckOut,
}: {
  taskId: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(path: "check-in" | "check-out") {
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const coordinates = await getCurrentCoordinates();
          await postWithCoordinates(`/api/tasks/${taskId}/${path}`, coordinates);
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Unable to complete action.",
          );
        }
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
        Task Actions
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <button
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canCheckIn || isPending}
          onClick={() => runAction("check-in")}
          type="button"
        >
          {isPending && canCheckIn ? "Checking in..." : "Check In"}
        </button>
        <button
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canCheckOut || isPending}
          onClick={() => runAction("check-out")}
          type="button"
        >
          {isPending && canCheckOut ? "Checking out..." : "Check Out"}
        </button>
      </div>
      {message ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
