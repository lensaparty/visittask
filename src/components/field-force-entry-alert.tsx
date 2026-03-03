"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "field-force-entry-alert-dismissed";

export function FieldForceEntryAlert() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasDismissed = window.sessionStorage.getItem(STORAGE_KEY) === "1";

    if (!hasDismissed) {
      const frameId = window.requestAnimationFrame(() => {
        setIsOpen(true);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, []);

  function handleClose() {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <section className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4 sm:top-6">
      <div className="pointer-events-auto w-full max-w-3xl rounded-3xl border border-amber-200 bg-amber-50/95 px-5 py-4 text-slate-700 shadow-2xl shadow-amber-900/10 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Peringatan Duty
            </p>
            <h2 className="mt-2 text-base font-semibold text-slate-900 sm:text-lg">
              Start Duty dipakai hanya saat perlu tracking
            </h2>
            <div className="mt-2 space-y-2 text-sm leading-6">
              <p>
                Start Duty menyalakan GPS dan mengirim lokasi berkala, jadi baterai bisa lebih cepat
                berkurang.
              </p>
              <p>
                Nyalakan saat perjalanan atau kunjungan aktif saja, lalu matikan setelah selesai.
                Task tetap diselesaikan dengan Check In lalu Check Out.
              </p>
            </div>
          </div>
          <button
            className="inline-flex shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={handleClose}
            type="button"
          >
            Mengerti
          </button>
        </div>
      </div>
    </section>
  );
}
