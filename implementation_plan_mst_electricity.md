# Implementation Plan: Expand Electricity Logger to MST

Give option electricity logger option to mst also, so they can add meter readings also.

## User Review Required
> [!IMPORTANT]
> This change will give MST users access to the Electricity Logger, including the ability to enter and save meter readings.

## Proposed Changes

### [Component Name] Dashboard
#### [MODIFY] [MstDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/frontend/components/dashboard/MstDashboard.tsx)
- Add `Zap` icon from `lucide-react`.
- Import `ElectricityStaffDashboard`.
- Add `'electricity'` to `Tab` type and sidebar navigation.
- Add rendering logic for `activeTab === 'electricity'`.

### Database Schema
#### [MODIFY] [electricity_logger.sql](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/backend/db/migrations/electricity_logger.sql)
- Update RLS policies for `electricity_readings` to allow `mst` role to `UPDATE` readings.

## Verification Plan
### Automated Tests
- None.

### Manual Verification
1. Log in as a user with the `mst` role.
2. Verify that the "Electricity Logger" option appears in the sidebar.
3. Navigate to the Electricity Logger.
4. Attempt to save a reading and verify it works (testing the `upsert` logic).
