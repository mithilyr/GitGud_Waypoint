"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { LoadPanel } from "@/components/loader/LoadPanel";

export default function LoadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[520px]">
      <LoadPanel tripId={Number(tripId)} onReleased={() => router.push("/loader/departures")} />
    </div>
  );
}
