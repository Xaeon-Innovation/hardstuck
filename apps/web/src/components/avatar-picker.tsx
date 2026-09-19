"use client";

import { useMemo, useState, useTransition } from "react";
import { AVATAR_OPTIONS, type AvatarGame } from "@/lib/avatars";
import { authClient } from "@/lib/auth-client";

export function AvatarPicker({
  currentSrc,
  onPicked,
}: {
  currentSrc?: string | null;
  onPicked?: (src: string) => void;
}) {
  const [game, setGame] = useState<AvatarGame | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(currentSrc ?? null);

  const options = useMemo(() => {
    if (game === "all") return AVATAR_OPTIONS;
    return AVATAR_OPTIONS.filter((a) => a.game === game);
  }, [game]);

  function pick(src: string) {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: src }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Could not update avatar",
        );
        return;
      }
      setSelected(src);
      await authClient.getSession();
      onPicked?.(src);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider">
        {(
          [
            ["all", "All"],
            ["lol", "League"],
            ["valorant", "Valorant"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGame(key)}
            className={`border px-3 py-1.5 ${
              game === key
                ? "border-hs-signal text-hs-signal"
                : "border-hs-line text-hs-mute hover:text-hs-chalk"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {options.map((opt) => {
          const active = selected === opt.src;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              title={opt.name}
              onClick={() => pick(opt.src)}
              className={`group flex flex-col items-center gap-1 rounded-sm border p-1.5 transition ${
                active
                  ? "border-hs-signal bg-hs-signal/10"
                  : "border-hs-line hover:border-hs-signal/50"
              } disabled:opacity-50`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opt.src}
                alt={opt.name}
                className="h-12 w-12 rounded-full object-cover"
              />
              <span className="max-w-full truncate text-[10px] text-hs-mute group-hover:text-hs-chalk">
                {opt.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
