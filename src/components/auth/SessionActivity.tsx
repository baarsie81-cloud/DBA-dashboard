"use client";

import { useEffect, useRef, useState } from "react";

const RENEW_INTERVAL_MS = 30_000;
const WARNING_MS = 5 * 60_000;

export function SessionActivity({ initialExpiresAt }: { initialExpiresAt: number }) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const continueSession = useRef<() => void>(() => {});

  useEffect(() => {
    let expiresAt = initialExpiresAt;
    let lastAttemptAt = 0;
    let inFlight = false;
    let disposed = false;

    const leave = () => {
      if (!disposed) window.location.replace("/login");
    };

    async function requestSession(renew: boolean) {
      if (inFlight || disposed) return;
      inFlight = true;
      lastAttemptAt = Date.now();
      try {
        const response = await fetch("/api/session", {
          method: renew ? "POST" : "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 401) {
          leave();
          return;
        }
        if (!response.ok) return;
        const data: { expiresAt?: unknown } = await response.json();
        if (typeof data.expiresAt === "number" && Number.isFinite(data.expiresAt)) {
          expiresAt = data.expiresAt;
          if (!disposed) setMinutesLeft(null);
        }
      } catch {
        // A temporary network failure must not erase unsaved work. The server
        // still rejects expired sessions; retry on the next actual interaction.
      } finally {
        inFlight = false;
      }
    }

    function onActivity(event: Event) {
      // Do not count programmatically generated events or background work.
      if (!event.isTrusted || document.visibilityState !== "visible") return;
      if (Date.now() - lastAttemptAt < RENEW_INTERVAL_MS) return;
      if (Date.now() >= expiresAt) {
        // A different tab may have renewed the shared cookie. Never renew an
        // already expired session based on a browser timestamp alone.
        void requestSession(false);
      } else {
        void requestSession(true);
      }
    }

    function checkExpiry() {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        if (Date.now() - lastAttemptAt >= RENEW_INTERVAL_MS) {
          void requestSession(false);
        }
      } else {
        setMinutesLeft(remaining <= WARNING_MS ? Math.ceil(remaining / 60_000) : null);
      }
    }

    continueSession.current = () => void requestSession(true);

    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true, capture: true });
    }
    window.addEventListener("focus", onActivity);
    document.addEventListener("visibilitychange", checkExpiry);
    const timer = window.setInterval(checkExpiry, 15_000);
    checkExpiry();

    return () => {
      disposed = true;
      continueSession.current = () => {};
      window.clearInterval(timer);
      for (const event of events) {
        window.removeEventListener(event, onActivity, true);
      }
      window.removeEventListener("focus", onActivity);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [initialExpiresAt]);

  if (minutesLeft === null) return null;

  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-dba-border bg-dba-surface p-4 text-sm text-dba-charcoal shadow-lg">
      Je sessie verloopt over {minutesLeft} {minutesLeft === 1 ? "minuut" : "minuten"} zonder activiteit.
      Sla je werk op of klik op de knop om ingelogd te blijven.
      <button
        type="button"
        className="mt-2 block rounded bg-dba-dark-green px-3 py-2 text-white"
        onClick={() => continueSession.current()}
      >
        Ingelogd blijven
      </button>
    </div>
  );
}
