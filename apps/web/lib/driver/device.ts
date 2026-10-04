import type { User } from "@/lib/auth";
import { kvSet } from "./idb";

/**
 * Hands a driver's sign-in to the phone's offline store. The single sign-in page calls this when the account is a
 * driver's, so /driver finds a profile with no PIN yet and opens the "choose a PIN" step instead of asking again.
 */
export async function seedDriverDevice(token: string, user: User) {
  await kvSet("token", token);
  await kvSet("profile", { user, pin: null });
}
