"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Eyebrow, Headline } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/hooks";

const HELP = [
  ["A count does not match", "Flag the shortfall or damage before you release. Ruwan and the store are told at once."],
  ["Plan changed mid-load", "Tap Show updated list. Lines that moved are marked, and the old list is locked."],
  ["Doors will not seal, or reefer is warm", "Do not release. Flag it with a photo and Ruwan will reassign the vehicle."],
];

export default function HelpPage() {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();
  return (
    <div className="rise mx-auto max-w-[620px]">
      <Eyebrow>Help</Eyebrow>
      <Headline className="mt-1 !text-[28px]">Help</Headline>
      <div className="mt-4 space-y-2">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4">
            <div className="font-semibold">{q}</div>
            <p className="mt-1 text-[14px] text-muted">{a}</p>
          </Card>
        ))}
      </div>
      <Eyebrow className="mt-8">Settings</Eyebrow>
      <Card className="mt-2 divide-y divide-line">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-semibold">Dark mode</div>
            <div className="text-[13px] text-muted">Easier on the eyes at the dock</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "On" : "Off"}
          </Button>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-semibold">Sign out when idle</div>
            <div className="text-[13px] text-muted">After 5 minutes without a touch</div>
          </div>
          <span className="font-data text-muted">5 min</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-semibold">{user?.name}</div>
            <div className="text-[13px] text-muted">The app records who loaded and who released each vehicle.</div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              logout();
              router.replace("/loader");
            }}
          >
            Switch person
          </Button>
        </div>
      </Card>
    </div>
  );
}
