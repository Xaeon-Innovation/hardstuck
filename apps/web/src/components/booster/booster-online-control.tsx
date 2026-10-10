"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  isBoosterAlertMuted,
  isBrowserNotifyEnabled,
  playBoosterOfferChime,
  setBoosterAlertMuted,
  setBrowserNotifyEnabled,
  unlockBoosterAlertAudio,
} from "@/lib/booster-alert-sound";

type Props = {
  compact?: boolean;
  onChange?: (online: boolean) => void;
};

function AlertControls({ compact }: { compact?: boolean }) {
  const [muted, setMuted] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    setMuted(isBoosterAlertMuted());
    setNotifyOn(isBrowserNotifyEnabled());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifyPerm(Notification.permission);
    } else {
      setNotifyPerm("unsupported");
    }
  }, []);

  function toggleMute() {
    unlockBoosterAlertAudio();
    const next = !muted;
    setBoosterAlertMuted(next);
    setMuted(next);
  }

  function testSound() {
    unlockBoosterAlertAudio();
    playBoosterOfferChime();
  }

  async function enableBrowserNotify() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    unlockBoosterAlertAudio();
    const perm =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    setNotifyPerm(perm);
    if (perm === "granted") {
      setBrowserNotifyEnabled(true);
      setNotifyOn(true);
    }
  }

  function toggleNotify() {
    if (!notifyOn && notifyPerm !== "granted") {
      void enableBrowserNotify();
      return;
    }
    const next = !notifyOn;
    setBrowserNotifyEnabled(next);
    setNotifyOn(next);
  }

  const btn =
    "border border-hs-line px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-hs-mute transition-colors hover:border-hs-signal/50 hover:text-hs-chalk disabled:opacity-40";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? "justify-end" : ""}`}
    >
      <button type="button" className={btn} onClick={toggleMute}>
        Sound {muted ? "off" : "on"}
      </button>
      <button type="button" className={btn} onClick={testSound} disabled={muted}>
        Test sound
      </button>
      {notifyPerm !== "unsupported" ? (
        <button type="button" className={btn} onClick={toggleNotify}>
          Desktop {notifyOn && notifyPerm === "granted" ? "on" : "off"}
        </button>
      ) : null}
    </div>
  );
}

export function BoosterOnlineControl({ compact, onChange }: Props) {
  const [queueOnline, setQueueOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    fetch("/api/booster/dashboard")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && typeof data.queueOnline === "boolean") {
          setQueueOnline(data.queueOnline);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setOnline(online: boolean) {
    if (queueOnline === online) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/booster/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setQueueOnline", online }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      setQueueOnline(online);
      onChange?.(online);
    });
  }

  const online = queueOnline ?? true;
  const loading = queueOnline === null;

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex overflow-hidden border border-hs-line">
          <button
            type="button"
            disabled={pending || loading}
            onClick={() => setOnline(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
              online
                ? "bg-hs-ok/25 text-hs-ok"
                : "bg-transparent text-hs-mute hover:text-hs-chalk"
            }`}
            aria-pressed={online}
          >
            <span
              className={`h-2 w-2 rounded-full ${online ? "bg-hs-ok shadow-[0_0_8px_rgba(61,154,106,0.9)]" : "bg-hs-line"}`}
              aria-hidden
            />
            Online
          </button>
          <button
            type="button"
            disabled={pending || loading}
            onClick={() => setOnline(false)}
            className={`flex items-center gap-1.5 border-l border-hs-line px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
              !online
                ? "bg-hs-danger/25 text-hs-danger"
                : "bg-transparent text-hs-mute hover:text-hs-chalk"
            }`}
            aria-pressed={!online}
          >
            <span
              className={`h-2 w-2 rounded-full ${!online ? "bg-hs-danger shadow-[0_0_8px_rgba(214,69,69,0.85)]" : "bg-hs-line"}`}
              aria-hidden
            />
            Offline
          </button>
        </div>
        <AlertControls compact />
        {error ? (
          <span className="max-w-[14rem] text-right text-[10px] text-hs-danger">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`hs-panel w-full border-2 p-4 transition-colors ${
        online
          ? "border-hs-ok/55 bg-hs-ok/[0.07]"
          : "border-hs-danger/55 bg-hs-danger/[0.07]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
              online
                ? "border-hs-ok bg-hs-ok/15"
                : "border-hs-danger bg-hs-danger/15"
            }`}
            aria-hidden
          >
            <span
              className={`h-4 w-4 rounded-full ${
                online
                  ? "hs-live-dot bg-hs-ok"
                  : "bg-hs-danger shadow-[0_0_12px_rgba(214,69,69,0.9)]"
              }`}
            />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-hs-mute">
              Your status
            </div>
            <div
              className={`font-display text-xl uppercase ${
                online ? "text-hs-ok" : "text-hs-danger"
              }`}
            >
              {loading ? "…" : online ? "Online" : "Offline"}
            </div>
            <p className="mt-0.5 text-xs text-hs-mute">
              {online
                ? "You receive new pool offers for your games."
                : "You are hidden — no new offers until you go online."}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || loading || online}
            onClick={() => setOnline(true)}
            className={`min-w-[5.5rem] border px-4 py-2.5 text-xs uppercase tracking-widest transition-all ${
              online
                ? "border-hs-ok bg-hs-ok text-hs-ink"
                : "border-hs-ok/40 text-hs-ok hover:bg-hs-ok/15"
            }`}
          >
            Online
          </button>
          <button
            type="button"
            disabled={pending || loading || !online}
            onClick={() => setOnline(false)}
            className={`min-w-[5.5rem] border px-4 py-2.5 text-xs uppercase tracking-widest transition-all ${
              !online
                ? "border-hs-danger bg-hs-danger text-hs-chalk"
                : "border-hs-danger/40 text-hs-danger hover:bg-hs-danger/15"
            }`}
          >
            Offline
          </button>
        </div>
      </div>
      <div className="mt-4 border-t border-hs-line/60 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-hs-mute">
          Offer alerts
        </div>
        <AlertControls />
      </div>
      {error ? <p className="mt-3 text-sm text-hs-danger">{error}</p> : null}
    </div>
  );
}
