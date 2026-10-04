import type { Clip } from "./components/ClipScene";

// Cue times are seconds in the source recording (capture/capture.mjs). `rate` speeds up slow parts.
export const CLIPS: Clip[] = [
  {
    id: "store", src: "a_store", from: 0, to: 13, rate: 1.0, device: "phone", step: 0, role: "Store manager", title: "Shanika orders for Monday.",
    cues: [
      { at: 0.5, text: "One sign-in page. The account decides which screens open." },
      { at: 5.5, text: "Her usual lines are already filled in." },
      { at: 9.0, text: "One tap. Ruwan has the order. Chilled and dry become two orders." },
    ],
  },
  {
    id: "plan", src: "b_disp", from: 4.5, to: 24.0, rate: 1.1, device: "desktop", step: 1, role: "Dispatcher", title: "Ruwan builds the plan.",
    cues: [
      { at: 5.5, text: "The queue shows what each order needs: chilled, van only, skipped last run." },
      { at: 10.0, text: "Items inside every order are one click away." },
      { at: 13.0, text: "One click builds the plan. Every order gets a vehicle and a trip, or a reason." },
      { at: 20.5, text: "Releasing sends load lists to the dock and runs to drivers." },
    ],
  },
  {
    id: "load", src: "c_load1", from: 6.0, to: 20.0, rate: 1.0, device: "phone", step: 2, role: "Loader", title: "Kamal loads the truck.",
    cues: [
      { at: 8.5, text: "The last stop goes in first, so the driver unloads in order." },
      { at: 10.5, text: "Short on a line? Flag it with the count found and a reason." },
      { at: 14.5, text: "Ruwan and the store are told before the truck leaves." },
    ],
  },
  {
    id: "decide", src: "d_flag", from: 5.5, to: 14.3, rate: 1.0, device: "desktop", step: 2, role: "Dispatcher", title: "The dispatcher decides.",
    cues: [
      { at: 6.5, text: "The Live board raises it as: needs your decision." },
      { at: 9.5, text: "Top up from another vehicle, or send as is. The system proposes, Ruwan decides." },
    ],
  },
  {
    id: "release", src: "e_release", from: 6.0, to: 17.8, rate: 1.0, device: "phone", step: 2, role: "Loader", title: "Release has rules.",
    cues: [
      { at: 8.5, text: "Every line must be loaded or flagged first." },
      { at: 11.0, text: "Reefer at 5 °C or colder, chilled and ambient apart, doors sealed." },
      { at: 14.5, text: "Released. Nuwan is told on his phone." },
    ],
  },
  {
    id: "drive", src: "f_driver", from: 0, to: 49.8, rate: 1.55, device: "phone", step: 3, role: "Driver", title: "Nuwan delivers, even with no signal.",
    cues: [
      { at: 1.0, text: "Sign in once online, then choose a 4-digit PIN. It stays on the phone." },
      { at: 10.5, text: "Run saved for offline use. Load released, reefer temperature and seal on screen." },
      { at: 20.5, text: "Signal lost (simulated). The app keeps working." },
      { at: 26.0, text: "Arrive, deliver, record a partial count and a signature." },
      { at: 35.0, text: "Saved on the phone and marked Not sent, with the time he made it." },
      { at: 41.0, text: "Signal returns. The outbox drains by itself." },
    ],
  },
  {
    id: "receipt", src: "g_store", from: 5.5, to: 15.7, rate: 1.0, device: "phone", step: 4, role: "Store manager", title: "The store confirms what arrived.",
    cues: [
      { at: 6.5, text: "Track shows the driver's proof and the loader's flag." },
      { at: 11.5, text: "Shanika counts one more crate than the driver recorded." },
      { at: 13.0, text: "She confirms her own count." },
    ],
  },
  {
    id: "resolve", src: "h_resolve", from: 5.5, to: 14.2, rate: 1.0, device: "desktop", step: 4, role: "Dispatcher", title: "Two counts, nothing overwritten.",
    cues: [
      { at: 6.5, text: "Both counts are kept side by side: the driver's and the store's." },
      { at: 10.5, text: "The dispatcher settles it. The driver can accept or dispute too." },
    ],
  },
  {
    id: "demand", src: "i_demand", from: 5.5, to: 13.8, rate: 1.0, device: "desktop", step: -1, role: "Dispatcher", title: "Demand outlook.",
    cues: [
      { at: 6.0, text: "Two weeks of chilled demand against reefer capacity before Avurudu." },
      { at: 9.5, text: "Days at risk, each with a suggested action." },
    ],
  },
  {
    id: "lang", src: "j_lang", from: 1, to: 20.2, rate: 1.5, device: "phone", step: -1, role: "Every role", title: "English, Sinhala, Tamil. Daylight and Dark.",
    cues: [
      { at: 2.0, text: "Language is a real choice in all four roles, not a mock-up." },
      { at: 14.0, text: "Two design systems, following the style guide." },
    ],
  },
];
