import { describe, expect, it } from "vitest";
import { checkPin, makePinRecord } from "./pin";

describe("driver PIN", () => {
  it("unlocks with the PIN the driver chose", async () => {
    const rec = await makePinRecord("1234");
    expect(await checkPin("1234", rec)).toBe(true);
  });

  it("refuses any other PIN", async () => {
    const rec = await makePinRecord("1234");
    expect(await checkPin("4321", rec)).toBe(false);
    expect(await checkPin("", rec)).toBe(false);
  });

  it("stores a salted hash, never the PIN itself", async () => {
    const rec = await makePinRecord("1234");
    expect(rec.hash).not.toContain("1234");
    const again = await makePinRecord("1234");
    expect(again.salt).not.toBe(rec.salt);
    expect(again.hash).not.toBe(rec.hash);
  });
});
