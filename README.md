## Time Bank — Complete Design Specification

### 1. Core Concept & Default Configuration

* **Purpose:** A Pomodoro timer paired with a capped **Time Bank** that lets the user store earned or unused break time and spend it later—including mid-focus—without losing focus progress.
* **Default Durations & Set Structure:**
* **Focus block:** 30 minutes
* **Short break:** 15 minutes
* **Long break:** 30 minutes
* **Sessions per set:** 5 sessions
* **Maximum bank capacity:** Equal to the configured long break duration (default: 30 minutes / 1,800 seconds).
* **Strict final-session hold toggle:** Boolean user setting (default: opted out).


* **Initial State:**
* Starts in **Focus mode** on **Session 1** with the full focus duration loaded, timer **paused**, **0 seconds** in the bank, **no saved focus remainder**, and **bank withdrawals unlocked**.



---

### 2. Focus Completion & Break Rewards

* **Base Reward by Session:**
* Completing a non-final focus session (**Sessions 1 through 4**) earns a **short break** (15 minutes).
* Completing the final focus session (**Session 5**) earns a **long break** (30 minutes).


* **Unlocking Bank Access:**
* Completing a focus block always **unlocks** mid-focus bank withdrawal eligibility for the upcoming focus block.

* **Locking Bank Access:**
* Exiting break session, either automatically or manually (cf. Rule number 5), will lock mid-focus bank withdrawal eligibility.


* **Using vs. Storing the Reward:**
* Upon completing a focus session, the user can either start the earned break immediately or deposit the earned break duration into the Time Bank.
* Deposits are **clamped at maximum bank capacity**—any seconds beyond the cap are discarded/overflowed, and only the space actually available in the bank counts as **actual added seconds**.



---

### 3. Session Progression & Holding Rules

Session advancement for the final session is evaluated as follows:

* **Final-Session Hold (Session 5) — Two User-Configurable Modes:**
* **Opt-In Mode ("Save the high reward for later"):**
* Session 5 **remains held at Session 5** whenever the **actual added seconds** deposited into the bank are **strictly less than the full long break duration** (for example, if the bank was already partially or completely full).
* Even while held at Session 5, the user still receives the normal **short break** reward—holding only prevents the session counter from resetting back to Session 1.
* Session 5 resets to **Session 1** only when the **full long break duration** fits and is added into the bank.


* **Opt-Out Mode (Default):**
* Session 5 **remains held at Session 5** if the **actual added seconds** are **less than or equal to the short break duration** (e.g., 15 minutes or less).
* Session 5 resets to **Session 1** as soon as the **actual added seconds** exceed the short break duration (e.g., 15 minutes + 1 second or more).





---

### 4. Mid-Focus Bank Withdrawal

* **Eligibility Guards:**
* Allowed **only** while in **Focus mode**, when the bank holds **more than 0 seconds**, and when **bank access is currently unlocked**. Otherwise, the action is ignored.


* **Behavior When Triggered:**
* Transfers the **entire** Time Bank balance into the active break timer and sets the bank balance to **0**.
* Saves the remaining focus duration so the interrupted focus block can be resumed later.
* **Locks** further bank withdrawals until the current focus block is eventually completed (preventing repeated withdraw/exit cycles within the same focus session).
* Does **not** alter the current session number.



---

### 5. Exiting a Break Early

* **Banking Unused Time:**
* Ending any break early deposits all remaining unused break seconds back into the Time Bank, clamped at **maximum bank capacity**.
* Exiting a break early **never** changes the current session number.


* **Next Timer State (Two Cases):**
* **If resuming an interrupted focus session (mid-focus bank break):** Restores the exact saved remaining focus duration, clears the saved focus remainder, sets the timer to **paused**, and keeps bank withdrawals **locked** until that focus block finishes.
* **If exiting a standard post-focus break (no saved focus remainder):** Resets the timer to a fresh full focus duration, sets the timer to **paused**, and leaves bank unlock status as-is.



---

### 6. Architecture

* **Tech Stack & Structure:** React, TypeScript (`strict: true`, `verbatimModuleSyntax: true`), Vite, Vitest, and Tailwind CSS.