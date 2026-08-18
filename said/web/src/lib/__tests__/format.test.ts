import { describe, expect, it } from "vitest";
import {
  shortenAddress,
  displayName,
  daysLeftLabel,
  keptTimingLabel,
  isValidUrl,
  shortTxHash,
} from "../format";

describe("shortenAddress", () => {
  it("shortens a full address to 0x1234…abcd form", () => {
    expect(shortenAddress("0x1111111111111111111111111111111111faaa")).toBe("0x1111…faaa");
  });

  it("returns empty string for empty input", () => {
    expect(shortenAddress("")).toBe("");
  });
});

describe("displayName", () => {
  it("prefers a username over the address", () => {
    expect(displayName("0xabc0000000000000000000000000000000000f", "faizan")).toBe("faizan");
  });

  it("falls back to a shortened address with no username", () => {
    expect(displayName("0xabc0000000000000000000000000000000000f", null)).toBe(
      shortenAddress("0xabc0000000000000000000000000000000000f")
    );
  });
});

describe("daysLeftLabel", () => {
  it("says 'due today' when the deadline is later today", () => {
    const inHours = new Date(Date.now() + 3 * 60 * 60 * 1000);
    expect(daysLeftLabel(inHours)).toBe("due today");
  });

  it("says '1 day left' for tomorrow", () => {
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(daysLeftLabel(tomorrow)).toBe("1 day left");
  });

  it("says 'past due' for a deadline already gone", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(daysLeftLabel(yesterday)).toBe("past due");
  });

  it("pluralizes multi-day windows", () => {
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60_000);
    expect(daysLeftLabel(inTenDays)).toBe("10 days left");
  });
});

describe("keptTimingLabel", () => {
  it("says kept on the last day when completed the same day as the deadline", () => {
    const deadline = new Date("2026-08-20T23:00:00.000Z");
    const completedAt = new Date("2026-08-20T10:00:00.000Z");
    expect(keptTimingLabel(deadline, completedAt)).toBe("kept on the last day");
  });

  it("says kept N days early when completed well before the deadline", () => {
    const deadline = new Date("2026-08-31T00:00:00.000Z");
    const completedAt = new Date("2026-08-12T00:00:00.000Z");
    expect(keptTimingLabel(deadline, completedAt)).toBe("kept 19 days early");
  });

  it("says kept 1 day early for a one-day margin", () => {
    const deadline = new Date("2026-08-21T00:00:00.000Z");
    const completedAt = new Date("2026-08-20T00:00:00.000Z");
    expect(keptTimingLabel(deadline, completedAt)).toBe("kept 1 day early");
  });
});

describe("isValidUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com/path?x=1")).toBe(true);
  });

  it("rejects malformed or non-http(s) values", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("ftp://example.com/file")).toBe(false);
  });
});

describe("shortTxHash", () => {
  it("shortens a 32-byte tx hash", () => {
    const hash = `0x${"a".repeat(64)}`;
    expect(shortTxHash(hash)).toBe("0xaaaaaa…aaaaaa");
  });
});
