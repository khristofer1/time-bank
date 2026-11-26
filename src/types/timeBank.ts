export interface TimeBankConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsPerSet: number;
  holdFinalSessionUntilFullLongBreak: boolean;
}

export type TimerMode = 'focus' | 'break';

export interface CapBankResult {
  nextBankSeconds: number;
  actualAddedSeconds: number;
}

export interface WithdrawBankResult {
  breakSeconds: number;
  nextBankSeconds: number;
  savedFocusSeconds: number;
  nextCanUseBank: boolean;
}

export interface ExitBreakResult extends CapBankResult {
  nextFocusSeconds: number;
  nextSavedFocusSeconds: null;
  isResumedFocus: boolean;
}

export interface TimeBankState {
  config: TimeBankConfig;
  mode: TimerMode;
  sessionNumber: number;
  remainingSeconds: number;
  isRunning: boolean;
  bankSeconds: number;
  savedFocusSeconds: number | null;
  canUseBank: boolean;
}

export type TimeBankAction =
  | { type: 'WITHDRAW_BANK_MID_FOCUS' }
  | { type: 'EXIT_BREAK_EARLY' };