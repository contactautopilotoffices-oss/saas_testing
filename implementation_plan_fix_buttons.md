# Implementation Plan - Fix Header Button Fitting and Footer Overlap

The user wants the buttons in the "Diesel Logger" section (header) to fit properly and resize with the screen. 
The screenshot shows "Reference Config" overflowing. Also, the footer "Back to Analytics" button is overlapped by a floating button ('N').

## Proposed Changes

### [Diesel Dashboard]
#### [MODIFY] [DieselStaffDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/frontend/components/diesel/DieselStaffDashboard.tsx)

- Update Header Buttons:
    - Use `grid-cols-3` layout for mobile (xs) instead of flex if needed to force equal width, but flex is generally better for wrapping.
    - Remove `whitespace-nowrap` to allow text wrapping.
    - Reduce horizontal padding `px-4` -> `px-2` on very small screens.
    - Change text size `text-xs` -> `text-[10px]` on very small screens if needed.
    - Add `min-h-[44px]` to ensure touch target and consistent height if wrapped.
    - Center text alignment.

- Update Footer:
    - Add `pl-14` or `pl-16` to the footer content container on mobile to prevent overlap with the floating 'N' button (usually bottom-left).
    - Ensure it is only applied on mobile where the FAB is most prominent/intrusive.

## Verification Plan

### Manual Verification
- Resize the window to mobile width (~375px or less).
- Check that "Reference Config" text wraps or fits within the button.
- Check that the footer "Back to Analytics" button is shifted right, clear of any floating element on the left.
