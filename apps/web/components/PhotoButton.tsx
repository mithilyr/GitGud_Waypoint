"use client";

import { useRef, useState } from "react";
import { shrinkPhoto } from "@/lib/photo";
import { Icon } from "./ui";

/** "+ Add photo (optional)": opens the camera on a phone, a file picker elsewhere. */
export function PhotoButton({ value, onChange, label = "Add photo (optional)" }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            onChange(await shrinkPhoto(f));
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {value ? (
        <div className="flex items-center gap-3">
          {/* Data URL captured on this device, so next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Attached" className="h-16 w-16 rounded-[8px] border border-line object-cover" />
          <button type="button" onClick={() => onChange(null)} className="text-[13px] font-semibold text-muted underline">
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex h-11 items-center gap-2 rounded-[8px] border border-dashed border-faint px-3 text-[14px] font-semibold text-muted"
        >
          <Icon.Camera /> {busy ? "Preparing…" : label}
        </button>
      )}
    </div>
  );
}
