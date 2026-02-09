# Implementation Plan: Persist Check-In Status across Refreshes

The user reported that refreshing the MST dashboard resets the check-in status to "check out" (Off Duty). This is likely caused by:
1.  Initial state defaulting to `false`.
2.  Initial fetch call happening before the user session is fully restored on the client, leading to a failed fetch or an incorrect `false` return.
3.  Lack of persistence (caching) for this specific state.

## Proposed Changes

### [Component Name] Dashboards
#### [MODIFY] [MstDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/frontend/components/dashboard/MstDashboard.tsx)
-   Refactor `isCheckedIn` initialization to check `localStorage` as a fallback.
-   Update `fetchShiftStatus` to:
    -   Requirement: Abort if `user?.id` is missing.
    -   Store result in `localStorage` upon successful fetch.
-   Update `handleShiftToggle` to update `localStorage` immediately.
-   Update `useEffect` to ensure `fetchShiftStatus` is only called when `user` is ready.

#### [MODIFY] [StaffDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/frontend/components/dashboard/StaffDashboard.tsx)
-   Apply identical changes as `MstDashboard.tsx` for consistency.

## Verification Plan
### Manual Verification
1.  Log in as MST.
2.  Click "Start Shift" (On Duty).
3.  Refresh the page.
4.  Verify that it remains "On Duty" (no flicker or reset to Off Duty).
5.  Click "End Shift" (Off Duty).
6.  Refresh the page.
7.  Verify it remains "Off Duty".
