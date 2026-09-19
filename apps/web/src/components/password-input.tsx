"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/icons";

type Props = {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
};

export function PasswordInput({
  name = "password",
  placeholder = "Password",
  required,
  minLength,
  className = "border border-hs-line bg-hs-panel px-3 py-2 pr-10 text-hs-chalk",
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={name === "password" ? "current-password" : undefined}
        className={`w-full ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-hs-mute hover:text-hs-signal"
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? (
          <IconEyeOff className="h-4 w-4" />
        ) : (
          <IconEye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
