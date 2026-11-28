import type { TimeBankConfig } from "../types/timeBank";

export const DEFAULT_CONFIG: TimeBankConfig = {
  focusMinutes: 30,
  shortBreakMinutes: 15,
  longBreakMinutes: 30,
  sessionsPerSet: 5,
  strictHold: false,
};