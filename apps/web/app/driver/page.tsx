"use client";

import { useEffect } from "react";
import DriverApp from "@/components/driver/DriverApp";

export default function DriverPage() {
  // The service worker lets the app shell open with no signal after the first visit.
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return <DriverApp />;
}
