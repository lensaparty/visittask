"use client";

import { useRouter } from "next/navigation";
import {
  MutableRefObject,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

type PingPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

function stopBrowserTracking(
  watchIdRef: MutableRefObject<number | null>,
  intervalRef: MutableRefObject<number | null>,
) {
  if (watchIdRef.current != null) {
    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }

  if (intervalRef.current != null) {
    window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
}

function getCurrentPosition(): Promise<PingPayload> {
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
          accuracy: position.coords.accuracy,
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

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

export function DutyToggle({
  initialActiveSessionId,
}: {
  initialActiveSessionId: string | null;
}) {
  const router = useRouter();
  const hasGeolocation =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const [activeSessionId, setActiveSessionId] = useState(initialActiveSessionId);
  const [latestPosition, setLatestPosition] = useState<PingPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const sendPing = useEffectEvent(async () => {
    if (!activeSessionId || !latestPosition) {
      return;
    }

    try {
      await postJson("/api/tracking/ping", latestPosition);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tracking ping failed.");
    }
  });

  useEffect(() => {
    if (!activeSessionId) {
      stopBrowserTracking(watchIdRef, intervalRef);
      return;
    }

    if (!hasGeolocation) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLatestPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        setMessage(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 20000,
      },
    );

    intervalRef.current = window.setInterval(() => {
      void sendPing();
    }, 45000);

    return () => {
      stopBrowserTracking(watchIdRef, intervalRef);
    };
  }, [activeSessionId, hasGeolocation]);

  function handleStart() {
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const position = await getCurrentPosition();
          setLatestPosition(position);

          const payload = await postJson<{ sessionId: string }>("/api/tracking/duty/start", position);
          setActiveSessionId(payload.sessionId);
          await postJson("/api/tracking/ping", position);
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Unable to start duty.",
          );
        }
      })();
    });
  }

  function handleStop() {
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const position = await getCurrentPosition().catch(() => null);
          await postJson("/api/tracking/duty/stop", position ?? {});
          setActiveSessionId(null);
          setLatestPosition(null);
          stopBrowserTracking(watchIdRef, intervalRef);
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Unable to stop duty.");
        }
      })();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
          activeSessionId
            ? "bg-rose-600 hover:bg-rose-500"
            : "bg-cyan-600 hover:bg-cyan-500"
        } disabled:cursor-not-allowed disabled:opacity-70`}
        disabled={isPending}
        onClick={activeSessionId ? handleStop : handleStart}
        type="button"
      >
        {isPending
          ? activeSessionId
            ? "Stopping..."
            : "Starting..."
          : activeSessionId
            ? "Stop Duty"
            : "Start Duty"}
      </button>
      <p className="text-xs font-medium text-slate-500">
        {activeSessionId ? "Duty is ON. Pings sent every 45s." : "Duty is OFF."}
      </p>
      {message || !hasGeolocation ? (
        <p className="text-xs text-rose-600">
          {message ?? "Geolocation is not supported by this browser."}
        </p>
      ) : null}
    </div>
  );
}
