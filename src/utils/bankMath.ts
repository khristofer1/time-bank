import type {
  CapBankResult,
  TimeBankConfig,
  WithdrawBankResult,
  ExitBreakResult,
} from "../types/timeBank";

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
 * Post-focus session progression: advances 1 -> 2 -> ... -> sessionsPerSet -> 1,
 * EXCEPT on the final session when the banked reward is <= shortBreakMinutes,
 * where `sessionNumber` stays held at `sessionsPerSet`.
 */
export function getNextSessionNumber(
  currentSessionNumber: number,
  actualAddedSeconds: number,
  config: TimeBankConfig,
): number {
  const shortBreakSeconds = config.shortBreakMinutes * 60;
  const standardNextSession =
    currentSessionNumber >= config.sessionsPerSet ? 1 : currentSessionNumber + 1;

  const isFinalSession = currentSessionNumber === config.sessionsPerSet;
  const isRewardCappedToShortBreak = actualAddedSeconds <= shortBreakSeconds;

  return isFinalSession && isRewardCappedToShortBreak
    ? config.sessionsPerSet
    : standardNextSession;
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