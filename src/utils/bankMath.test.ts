import { describe, expect, it } from 'vitest';
import type { TimeBankConfig } from '../types/timeBank';
import { DEFAULT_CONFIG } from '../config/timeBankConfig';
import {
  capBankSeconds,
  getNextSessionNumber,
  withdrawBankForBreak,
  exitBreakEarly,
} from './bankMath';

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
  const optOutConfig: TimeBankConfig = {
    ...DEFAULT_CONFIG,
    holdFinalSessionUntilFullLongBreak: false,
  };

  const optInConfig: TimeBankConfig = {
    ...DEFAULT_CONFIG,
    holdFinalSessionUntilFullLongBreak: true,
  };

  it('advances non-final sessions', () => {
    expect(
      getNextSessionNumber(1, 0, optOutConfig),
    ).toBe(2);
    expect(
      getNextSessionNumber(4, 15 * 60, optInConfig),
    ).toBe(5);
  });

  it('opt-out: holds session 5 when actualAddedSeconds <= shortBreakMinutes (<= 15m)', () => {
    expect(getNextSessionNumber(5, 3 * 60, optOutConfig)).toBe(5);
    expect(getNextSessionNumber(5, 15 * 60, optOutConfig)).toBe(5);
  });

  it('opt-out: resets session 5 -> 1 when actualAddedSeconds > shortBreakMinutes (e.g., 20m)', () => {
    expect(getNextSessionNumber(5, 20 * 60, optOutConfig)).toBe(1);
  });

  it('opt-in: holds session 5 whenever actualAddedSeconds < longBreakMinutes (< 30m)', () => {
    expect(getNextSessionNumber(5, 20 * 60, optInConfig)).toBe(5);
    expect(getNextSessionNumber(5, 30 * 60 - 1, optInConfig)).toBe(
      5,
    );
    expect(getNextSessionNumber(5, 0, optInConfig)).toBe(5);
  });

  it('opt-in: resets session 5 -> 1 when actualAddedSeconds === longBreakMinutes (full 30m)', () => {
    expect(getNextSessionNumber(5, 30 * 60, optInConfig)).toBe(1);
  });
});

describe('standalone helper guards', () => {
  it('returns null from withdrawBankForBreak when bank is empty', () => {
    expect(withdrawBankForBreak(0, 20 * 60, true)).toBeNull();
  });

  it('reports isResumedFocus accurately in exitBreakEarly', () => {
    expect(
      exitBreakEarly(0, 5 * 60, 12 * 60, DEFAULT_CONFIG).isResumedFocus,
    ).toBe(true);
    expect(exitBreakEarly(0, 5 * 60, null, DEFAULT_CONFIG).isResumedFocus).toBe(
      false,
    );
  });
});