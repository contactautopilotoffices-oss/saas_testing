# Implementation Plan - Optimize Camera Initialization

Enable automatic camera start when the `CameraCaptureModal` is opened, provided the user has already granted camera permissions. This improves the UX by removing the redundant "Initialize Camera" step while maintaining hardware stability.

## Proposed Changes

### [Shared Components]

#### [MODIFY] [CameraCaptureModal.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/frontend/components/shared/CameraCaptureModal.tsx)

- Add `isStarting` state to track the initialization phase.
- Update `useEffect` that handles `isOpen` to:
    - Automatically check camera permission using `navigator.permissions.query`.
    - If permission is already `granted`, call `startCamera()` after a short delay (300ms) to allow the modal animation to settle.
- Update `startCamera()` to manage the `isStarting` state.
- Update the UI to show a "Launching Camera..." loading state instead of the "Initialize Camera" button when `isStarting` is true.
- Ensure the cleanup logic correctly resets all states when the modal closes.

## Verification Plan

### Automated Tests
- N/A (Camera hardware access is typically tested manually).

### Manual Verification
- Open a ticket detail page.
- Grant camera permission if not already granted.
- Close the camera modal.
- Re-open the camera modal: The camera should now start automatically without clicking "Initialize Camera".
- Reset permissions in the browser: The "Initialize Camera" button should reappear as the manual fallback.
