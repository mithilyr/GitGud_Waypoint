import type { MetadataRoute } from "next";

// Installable PWA: the driver adds it to the home screen and it opens straight into the run.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Waypoint Driver",
    short_name: "Waypoint",
    description: "Follow the run, record each stop with proof, and sync when signal returns.",
    start_url: "/driver",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
