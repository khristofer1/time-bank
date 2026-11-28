import { describe, expect, it } from "vitest";
import type { TimeBankState } from "../types/timeBank";
import {
  createInitialTimeBankState,
  timeBankReducer,
} from "./timeBankReducer";
import { DEFAULT_CONFIG } from "../config/timeBankConfig";

describe('WITHDRAW_BANK_MID_FOCUS', () => {
  it('withdraws bank mid-focus, saves remaining focus, and locks bank access', () => {
    const state: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'focus',
      remainingSeconds: 20 * 60,
      isRunning: true,
      bankSeconds: 15 * 60,
      canUseBank: true,
    };

    const next = timeBankReducer(state, { type: 'WITHDRAW_BANK_MID_FOCUS' });

    expect(next).toEqual({
      ...state,
      mode: 'break',
      remainingSeconds: 15 * 60,
      isRunning: true,
      bankSeconds: 0,
      savedFocusSeconds: 20 * 60,
      canUseBank: false,
    });
  });

  it('ignores WITHDRAW_BANK_MID_FOCUS when locked (canUseBank: false) or not in focus mode', () => {
    const lockedState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'focus',
      remainingSeconds: 20 * 60,
      bankSeconds: 10 * 60,
      canUseBank: false,
    };
    expect(timeBankReducer(lockedState, { type: 'WITHDRAW_BANK_MID_FOCUS' })).toBe(lockedState);

    const breakState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'break',
      remainingSeconds: 10 * 60,
      bankSeconds: 10 * 60,
      canUseBank: true,
    };
    expect(timeBankReducer(breakState, { type: 'WITHDRAW_BANK_MID_FOCUS' })).toBe(breakState);
  });
});

describe('EXIT_BREAK_EARLY', () => {
  it('returns unused break time to bank and restores savedFocusSeconds on EXIT_BREAK_EARLY', () => {
    const midBreakState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'break',
      remainingSeconds: 10 * 60,
      isRunning: true,
      bankSeconds: 0,
      savedFocusSeconds: 20 * 60,
      canUseBank: false,
    };

    const next = timeBankReducer(midBreakState, { type: 'EXIT_BREAK_EARLY' });

    expect(next).toEqual({
      ...midBreakState,
      mode: 'focus',
      remainingSeconds: 20 * 60,
      isRunning: true,
      bankSeconds: 10 * 60,
      savedFocusSeconds: null,
      canUseBank: false,
    });
  });

  it('banks leftover direct break time (capped at longBreakMinutes) and resets to full focus duration when savedFocusSeconds is null', () => {
    let directBreakState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'break',
      sessionNumber: 2,
      remainingSeconds: 10 * 60,
      isRunning: true,
      /**
       * This is to create a condition when the bankSeconds contains time duration at the full capacity minus
       * 5 minutes, while trying to store a time duration of more than 5 minutes, in this case 10 minutes.
       * Fresh states use default configuration in the first place, so using it in this case should work.
       */
      bankSeconds: (DEFAULT_CONFIG.longBreakMinutes - 5) * 60,
      savedFocusSeconds: null,
      canUseBank: false,
    };

    const next = timeBankReducer(directBreakState, { type: 'EXIT_BREAK_EARLY' });

    expect(next).toEqual({
      ...directBreakState,
      mode: 'focus',
      sessionNumber: 3,
      remainingSeconds: directBreakState.config.focusMinutes * 60,
      isRunning: true,
      bankSeconds: directBreakState.config.longBreakMinutes * 60,
      savedFocusSeconds: null,
    });
  });
})