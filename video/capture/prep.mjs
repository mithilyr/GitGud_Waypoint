import { prep } from "./api.mjs";
await prep(process.argv[2] || "loaded"); console.log("prepped", process.argv[2]);
