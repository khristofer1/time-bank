import { describe, expect, it } from "vitest";
import type { TimeBankState } from "../types/timeBank";
import {
  createInitialTimeBankState,
  timeBankReducer,
} from "./timeBankReducer";

describe('timeBankReducer: WITHDRAW_BANK_MID_FOCUS & EXIT_BREAK_EARLY', () => {
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

  it('returns unused break time to bank and restores paused savedFocusSeconds on EXIT_BREAK_EARLY', () => {
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
      isRunning: false,
      bankSeconds: 10 * 60,
      savedFocusSeconds: null,
      canUseBank: false,
    });
  });

  it('banks leftover direct break time (capped at 30m) and resets to full focus duration when savedFocusSeconds is null', () => {
    const directBreakState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'break',
      sessionNumber: 2,
      remainingSeconds: 10 * 60,
      isRunning: true,
      bankSeconds: 25 * 60,
      savedFocusSeconds: null,
      canUseBank: true,
    };

    const next = timeBankReducer(directBreakState, { type: 'EXIT_BREAK_EARLY' });

    expect(next).toEqual({
      ...directBreakState,
      mode: 'focus',
      sessionNumber: 2,
      remainingSeconds: 30 * 60,
      isRunning: false,
      bankSeconds: 30 * 60,
      savedFocusSeconds: null,
    });
  });
});