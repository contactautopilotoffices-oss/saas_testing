# Implementation Plan - Mobile Responsive Diesel Logger

The user wants the Diesel Logger module to look perfect on mobile view, without affecting other modules. The issues visible are button overflow in the header and potentially tight spacing.

## Proposed Changes

### [Diesel Dashboard]
#### [MODIFY] [DieselStaffDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/frontend/components/diesel/DieselStaffDashboard.tsx)

- Update the header area:
    - Change `flex-row` to wrap on mobile.
    - Make buttons `w-full sm:w-auto` to span width on mobile for easier tapping.
    - Reduce title size on mobile if needed.
- Update the footer area:
    - Add padding or ensure `z-index` is high enough to not be overlapped by fixed elements (the 'N' button).
    - Ensure "Back to Analytics" button is clearly visible.

### [Diesel Logger Card]
#### [MODIFY] [DieselLoggerCard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/frontend/components/diesel/DieselLoggerCard.tsx)

- Reduce padding on `motion.div` card:
    - Change `p-8` to `p-5 sm:p-8` for header and body.
- Update layout for inputs:
    - Change `space-y-6` to `space-y-4` on mobile.
    - Stack "Closing Level" and "Added Today" inputs on very small screens if necessary (`flex-col sm:flex-row`).

## Verification Plan

### Manual Verification
- Verify the layout on mobile view by resizing the window or using dev tools.
- Check that buttons are stacked or wrapped correctly.
- Check that inputs are not squashed.
