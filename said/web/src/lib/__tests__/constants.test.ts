import { describe, expect, it } from "vitest";
import { resolvePresetDeadline } from "../constants";

const NOW = new Date("2026-08-17T12:00:00.000Z");

describe("resolvePresetDeadline", () => {
  it("resolves 7d to 7 days from now", () => {
    const result = resolvePresetDeadline("7d", NOW)!;
    expect(result.toISOString().slice(0, 10)).toBe("2026-08-24");
  });

  it("resolves 30d to 30 days from now", () => {
    const result = resolvePresetDeadline("30d", NOW)!;
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-16");
  });

  it("resolves 3m to 3 months from now", () => {
    const result = resolvePresetDeadline("3m", NOW)!;
    expect(result.toISOString().slice(0, 10)).toBe("2026-11-17");
  });

  it("resolves eoy to December 31 of the current year", () => {
    const result = resolvePresetDeadline("eoy", NOW)!;
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });

  it("returns null for custom (handled separately by the composer)", () => {
    expect(resolvePresetDeadline("custom", NOW)).toBeNull();
  });
});
