const MUTE_KEY = "hs_booster_offer_mute";
const NOTIFY_KEY = "hs_booster_browser_notify";

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Resume AudioContext after a user gesture so later offer chimes can play. */
export function unlockBoosterAlertAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      unlocked = true;
    });
  } else {
    unlocked = true;
  }
}

export function isBoosterAlertMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setBoosterAlertMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export function isBrowserNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NOTIFY_KEY) === "1";
}

export function setBrowserNotifyEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFY_KEY, enabled ? "1" : "0");
}

/** Short two-tone chime via Web Audio (no asset file). */
export function playBoosterOfferChime() {
  if (typeof window === "undefined") return;
  if (isBoosterAlertMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const start = () => {
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(880, now);
    o1.connect(gain);
    o1.start(now);
    o1.stop(now + 0.28);

    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(1174.66, now + 0.14);
    o2.connect(gain);
    o2.start(now + 0.14);
    o2.stop(now + 0.55);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      unlocked = true;
      start();
    });
    return;
  }
  unlocked = true;
  start();
}

export function notifyBoosterOfferBrowser(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!isBrowserNotifyEnabled()) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    new Notification(title, {
      body,
      tag: "hs-booster-offer",
      silent: false,
    });
  } catch {
    /* ignore */
  }
}

export function hasUnlockedBoosterAlertAudio() {
  return unlocked;
}
