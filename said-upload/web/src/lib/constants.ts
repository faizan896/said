export const MAX_STATEMENT_LENGTH = 280; // must match Said.sol MAX_STATEMENT_LENGTH
export const MAX_PROOF_LENGTH = 512; // must match Said.sol MAX_PROOF_LENGTH

export const CATEGORIES = [
  { value: "BUILD", label: "Build" },
  { value: "LIFE", label: "Life" },
  { value: "FITNESS", label: "Fitness" },
  { value: "MONEY", label: "Money" },
  { value: "LEARNING", label: "Learning" },
  { value: "OTHER", label: "Other" },
] as const;

export const DEADLINE_PRESETS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "eoy", label: "end of year" },
  { value: "custom", label: "custom date" },
] as const;

export function resolvePresetDeadline(preset: string, now = new Date()): Date | null {
  const d = new Date(now);
  switch (preset) {
    case "7d":
      d.setDate(d.getDate() + 7);
      return d;
    case "30d":
      d.setDate(d.getDate() + 30);
      return d;
    case "3m":
      d.setMonth(d.getMonth() + 3);
      return d;
    case "eoy":
      return new Date(now.getFullYear(), 11, 31, 23, 59, 0);
    default:
      return null;
  }
}
