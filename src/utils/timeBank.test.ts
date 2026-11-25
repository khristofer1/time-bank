import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type TimeBankState } from '../types/timeBank';
import {
  capBankSeconds,
  getNextSessionNumber,
  withdrawBankForBreak,
  exitBreakEarly,
} from './bankMath';
import {
  createInitialTimeBankState,
  timeBankReducer,
} from '../state/timeBankReducer';

describe('capBankSeconds', () => {
  it('adds full seconds when below maxBankSeconds', () => {
    expect(capBankSeconds(10 * 60, 15 * 60, 30 * 60)).toEqual({
      nextBankSeconds: 25 * 60,
      actualAddedSeconds: 15 * 60,
    });
  });

  it('clamps at maxBankSeconds and reports only the added portion', () => {
    expect(capBankSeconds(27 * 60, 30 * 60, 30 * 60)).toEqual({
      nextBankSeconds: 30 * 60,
      actualAddedSeconds: 3 * 60,
    });
  });
});

describe('getNextSessionNumber', () => {
  it('advances normally on non-final sessions (1 -> 2, 4 -> 5)', () => {
    expect(getNextSessionNumber(1, 15 * 60, DEFAULT_CONFIG)).toBe(2);
    expect(getNextSessionNumber(4, 15 * 60, DEFAULT_CONFIG)).toBe(5);
  });

  it('holds at session 5 when actualAddedSeconds <= shortBreakMinutes (e.g., 3m or 15m)', () => {
    expect(getNextSessionNumber(5, 3 * 60, DEFAULT_CONFIG)).toBe(5);
    expect(getNextSessionNumber(5, 15 * 60, DEFAULT_CONFIG)).toBe(5);
  });

  it('resets session 5 -> 1 when actualAddedSeconds > shortBreakMinutes (e.g., 20m)', () => {
    expect(getNextSessionNumber(5, 20 * 60, DEFAULT_CONFIG)).toBe(1);
  });
});

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
    expect(
      timeBankReducer(lockedState, { type: 'WITHDRAW_BANK_MID_FOCUS' }),
    ).toBe(lockedState);

    const breakState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'break',
      remainingSeconds: 10 * 60,
      bankSeconds: 10 * 60,
      canUseBank: true,
    };
    expect(
      timeBankReducer(breakState, { type: 'WITHDRAW_BANK_MID_FOCUS' }),
    ).toBe(breakState);
  });

  it('returns unused break time to bank and restores paused savedFocusSeconds on EXIT_BREAK_EARLY', () => {
    const midBreakState: TimeBankState = {
      ...createInitialTimeBankState(),
      mode: 'break',
      remainingSeconds: 10 * 60, // 5m spent out of 15m
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
      canUseBank: false, // Still locked until the remaining 20m focus finishes
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
      sessionNumber: 2, // Unchanged on early exit
      remainingSeconds: 30 * 60,
      isRunning: false,
      bankSeconds: 30 * 60, // Capped at 30m (+5m)
      savedFocusSeconds: null,
    });
  });
});

describe('standalone helper guards', () => {
  it('returns null from withdrawBankForBreak when bank is empty', () => {
    expect(withdrawBankForBreak(0, 20 * 60, true)).toBeNull();
  });

  it('reports isResumedFocus accurately in exitBreakEarly', () => {
    expect(exitBreakEarly(0, 5 * 60, 12 * 60, DEFAULT_CONFIG).isResumedFocus).toBe(true);
    expect(exitBreakEarly(0, 5 * 60, null, DEFAULT_CONFIG).isResumedFocus).toBe(false);
  });
});