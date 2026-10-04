import { describe, expect, it } from "vitest";
import { initial, kg, m3 } from "./format";

describe("format helpers", () => {
  it("rounds weights to whole kilograms", () => {
    expect(kg(1234.6)).toBe("1,235 kg");
  });

  it("shows volumes to one decimal place", () => {
    expect(m3(19.44)).toBe("19.4 m³");
  });

  it("takes the first letter of a name in capitals", () => {
    expect(initial("  kamal jayasuriya ")).toBe("K");
  });
});
