import type {
  CapBankResult,
  ExitBreakResult,
  TimeBankConfig,
  WithdrawBankResult,
} from '../types/timeBank';

/**
 * Pure bank-cap math: adds `addedSeconds` into `currentBankSeconds`,
 * clamps at `maxBankSeconds`, and reports how many seconds actually fit.
 */
export function capBankSeconds(
  currentBankSeconds: number,
  addedSeconds: number,
  maxBankSeconds: number,
): CapBankResult {
  const safeAdded = Math.max(0, addedSeconds);
  const nextBankSeconds = Math.min(
    maxBankSeconds,
    currentBankSeconds + safeAdded,
  );
  const actualAddedSeconds = Math.max(0, nextBankSeconds - currentBankSeconds);

  return {
    nextBankSeconds,
    actualAddedSeconds,
  };
}

/**
 * Post-focus session progression:
 * 1. Non-final sessions (1 .. sessionsPerSet - 1): hold if the bank is full
 *    (`nextBankSeconds >= maxBankSeconds`); advance even if 1s below capacity.
 * 2. Final session (`sessionsPerSet`):
 *    - Opt-in (`holdFinalSessionUntilFullLongBreak: true`): hold if `actualAddedSeconds < longBreakSeconds`.
 *    - Opt-out (`holdFinalSessionUntilFullLongBreak: false`): hold if `actualAddedSeconds <= shortBreakSeconds`.
 */
export function getNextSessionNumber(
  currentSessionNumber: number,
  actualAddedSeconds: number,
  nextBankSeconds: number,
  config: TimeBankConfig,
): number {
  const maxBankSeconds = config.longBreakMinutes * 60;
  const longBreakSeconds = config.longBreakMinutes * 60;
  const shortBreakSeconds = config.shortBreakMinutes * 60;

  const isFinalSession = currentSessionNumber === config.sessionsPerSet;

  if (!isFinalSession) {
    const isBankFull = nextBankSeconds >= maxBankSeconds;
    return isBankFull ? currentSessionNumber : currentSessionNumber + 1;
  }

  const shouldHoldFinalSession = config.holdFinalSessionUntilFullLongBreak
    ? actualAddedSeconds < longBreakSeconds
    : actualAddedSeconds <= shortBreakSeconds;

  return shouldHoldFinalSession ? config.sessionsPerSet : 1;
}

/**
 * Mid-focus bank withdrawal: moves stored bank seconds into the active break timer,
 * saves remaining focus seconds to resume later, and locks bank access until the
 * current focus block completes. Returns `null` if locked or bank is empty.
 */
export function withdrawBankForBreak(
  currentBankSeconds: number,
  remainingFocusSeconds: number,
  canUseBank: boolean,
): WithdrawBankResult | null {
  if (!canUseBank || currentBankSeconds <= 0) {
    return null;
  }

  return {
    breakSeconds: currentBankSeconds,
    nextBankSeconds: 0,
    savedFocusSeconds: remainingFocusSeconds,
    nextCanUseBank: false,
  };
}

/**
 * Early break exit: banks any unused break seconds via `capBankSeconds`
 * without changing `sessionNumber`, then either restores `savedFocusSeconds`
 * (mid-focus bank break) or starts a fresh focus block (direct post-focus break).
 */
export function exitBreakEarly(
  currentBankSeconds: number,
  remainingBreakSeconds: number,
  savedFocusSeconds: number | null,
  config: TimeBankConfig,
): ExitBreakResult {
  const maxBankSeconds = config.longBreakMinutes * 60;
  const { nextBankSeconds, actualAddedSeconds } = capBankSeconds(
    currentBankSeconds,
    remainingBreakSeconds,
    maxBankSeconds,
  );

  const isResumedFocus = savedFocusSeconds !== null;
  const nextFocusSeconds = isResumedFocus
    ? savedFocusSeconds
    : config.focusMinutes * 60;

  return {
    nextBankSeconds,
    actualAddedSeconds,
    nextFocusSeconds,
    nextSavedFocusSeconds: null,
    isResumedFocus,
  };
}