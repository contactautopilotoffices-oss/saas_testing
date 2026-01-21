# Implementation Plan - Populate Vendor Dashboard Data from DB

The goal is to ensure all data points in the Vendor Dashboard are correctly populated from the database, specifically focusing on revenue and commission metrics, and providing more detailed vendor profile information.

## Proposed Changes

### [Component Name] components/dashboard/FoodVendorDashboard.tsx

#### [MODIFY] [FoodVendorDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/components/dashboard/FoodVendorDashboard.tsx)

- Update `VendorProfile` interface to include `owner_name`.
- Enhance `initializeDashboard` to:
    - Fetch `owner_name` from the `vendors` table.
    - If no `currentCycle` is found with `status: 'in_progress'`, calculate `total_revenue` and `commission_due` by summing entries from `vendor_daily_revenue` for the current month.
    - Improve cycle day calculation to handle missing cycle data gracefully.
- Update the **Profile** tab to:
    - Use `vendor.owner_name` for the "Vendor Name" field.
    - Add a "Store ID" or other relevant DB field if available.
- Ensure the **Portal** tab cards use the calculated/fetched values correctly.

## Verification Plan

### Manual Verification
- Log in as a vendor.
- Verify that "Revenue so far" and "Commission Accrued" reflect the data in the `vendor_daily_revenue` table.
- Verify that the "Profile" tab shows the correct "Vendor Name" from the `vendors` table.
- Test that the dashboard still functions correctly when no revenue entries or commission cycles exist (shows 0).
