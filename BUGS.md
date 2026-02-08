# LCARS Temporal Monitor — Bug Tracker

## Open Bugs

### BUG-001: CSS Overflow — Middle Color Bars
- **Status:** OPEN
- **Severity:** Visual only, no functional impact
- **Description:** Top peach bar (#FFCC99 / var(--lcars-peach)) and bottom gold bar (#FFCC66 / var(--lcars-gold)) bleed beyond the LCARS frame on both sides
- **What was tried:** overflow-hidden, text-ellipsis, min-w constraints — none fully fixed it
- **Likely root cause:** The flex-1 middle sections expand beyond the sidebar boundaries. Need to constrain max-width relative to parent minus sidebar widths
- **Files:** app/page.js lines containing lcars-peach (top bar) and lcars-gold (bottom bar)

### BUG-002: Mute Button Doesn't Mute
- **Status:** OPEN  
- **Severity:** Functional bug
- **Description:** Clicking the Sound/Muted toggle button in left sidebar changes the button text/color but sounds still play
- **What was tried:** Added soundEnabledRef (useRef) to sync with state — didn't fully resolve
- **Root cause:** Timer callback and/or playSound function still reads stale state instead of the ref
- **Files:** app/page.js — playSound function, soundEnabledRef, setSoundEnabled

### BUG-003: Reset Button Behavior During Break
- **Status:** OPEN
- **Severity:** UX/Usability issue
- **Description:** When user is in a break cycle and clicks Reset, it resets to focus mode instead of resetting the current break. This is counter-intuitive UX.
- **Expected behavior:** Reset should reset the current cycle type (break → break reset, focus → focus reset)
- **Current behavior:** Reset always goes to focus mode regardless of current cycle
- **Files:** app/page.js — handleReset function (line ~200)

## Fixed Bugs
(none yet)