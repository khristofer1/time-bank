import { DEFAULT_CONFIG } from '../types/timeBank';
import {
  withdrawBankForBreak,
  exitBreakEarly,
} from '../utils/bankMath';
import type {
  TimeBankAction,
  TimeBankConfig,
  TimeBankState,
} from '../types/timeBank';

export function createInitialTimeBankState(
  config: TimeBankConfig = DEFAULT_CONFIG,
): TimeBankState {
  return {
    config,
    mode: 'focus',
    sessionNumber: 1,
    remainingSeconds: config.focusMinutes * 60,
    isRunning: false,
    bankSeconds: 0,
    savedFocusSeconds: null,
    canUseBank: true,
  };
}

export function timeBankReducer(
  state: TimeBankState,
  action: TimeBankAction,
): TimeBankState {
  switch (action.type) {
    case 'WITHDRAW_BANK_MID_FOCUS': {
      if (state.mode !== 'focus') {
        return state;
      }

      const withdrawal = withdrawBankForBreak(
        state.bankSeconds,
        state.remainingSeconds,
        state.canUseBank,
      );

      if (!withdrawal) {
        return state;
      }

      return {
        ...state,
        mode: 'break',
        remainingSeconds: withdrawal.breakSeconds,
        isRunning: true,
        bankSeconds: withdrawal.nextBankSeconds,
        savedFocusSeconds: withdrawal.savedFocusSeconds,
        canUseBank: withdrawal.nextCanUseBank,
      };
    }

    case 'EXIT_BREAK_EARLY': {
      if (state.mode !== 'break') {
        return state;
      }

      const exitResult = exitBreakEarly(
        state.bankSeconds,
        state.remainingSeconds,
        state.savedFocusSeconds,
        state.config,
      );

      return {
        ...state,
        mode: 'focus',
        remainingSeconds: exitResult.nextFocusSeconds,
        isRunning: false,
        bankSeconds: exitResult.nextBankSeconds,
        savedFocusSeconds: exitResult.nextSavedFocusSeconds,
      };
    }

    default: {
      const _exhaustiveCheck: never = action;
      return _exhaustiveCheck;
    }
  }
}