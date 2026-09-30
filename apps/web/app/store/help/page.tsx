"use client";

import Link from "next/link";
import { Button, Card, Eyebrow, Headline } from "@/components/ui";
import { useTheme } from "@/lib/hooks";

const HELP = [
  ["Missed the 4 PM cutoff?", "Orders after 4 PM go on the next run. Dispatch shows the new date before you confirm."],
  ["Something arrived short or damaged", "Open the delivery on Track and tap Report an issue. Add a photo if you can."],
  ["Order deferred", "Dispatch tells you why and when it moves to. Deferred outlets are served first next run."],
];

export default function HelpPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="rise">
      <Eyebrow>Help</Eyebrow>
      <Headline className="mt-1">Help</Headline>
      <div className="mt-4 space-y-2">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4">
            <div className="font-semibold">{q}</div>
            <p className="mt-1 text-[14px] text-muted">{a}</p>
          </Card>
        ))}
      </div>
      <Link href="/store/contact" className="mt-4 block">
        <Button size="lg" block>Contact dispatch</Button>
      </Link>
      <Card className="mt-6 flex items-center justify-between p-4">
        <div>
          <div className="font-semibold">Dark mode</div>
          <div className="text-[13px] text-muted">Daylight or Dark</div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "On" : "Off"}</Button>
      </Card>
    </div>
  );
}
