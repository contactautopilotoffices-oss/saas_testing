# Implementation Plan - Make Photo Hover Mobile Responsive

The user wants the "Before" and "After" photo hover controls (View Full, Change Photo) to be visible on mobile view without hovering. currently, they are hidden (`opacity-0`) and only shown on hover (`group-hover:opacity-100`).

## Proposed Changes

### [Ticket Detail Page]
#### [MODIFY] [page.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/app/tickets/[ticketId]/page.tsx)

- Update the opacity classes for the photo overlay to be visible by default on mobile screens (below `lg` breakpoint).
- Change `opacity-0 group-hover:opacity-100` to `opacity-100 lg:opacity-0 lg:group-hover:opacity-100`.
- Apply this change to both "Before" and "After" photo sections.

## Verification Plan

### Manual Verification
- Verify the code changes to ensure the correct class names are applied.
- The user can verify by checking the UI on mobile or resizing the window to mobile width.
