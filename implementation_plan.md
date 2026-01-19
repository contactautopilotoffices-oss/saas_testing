# Grant Super Admin access to bulk import snags

The objective is to allow Organization Super Admins to perform bulk imports of snags (tickets) for any property within their organization. Currently, RLS policies for the `tickets` table are too restrictive and only allow users who are direct members of a property to create tickets there.

## Proposed Changes

### Database Migrations

#### [NEW] [fix_super_admin_snag_access.sql](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/migrations/fix_super_admin_snag_access.sql)

This migration expands the `tickets` table's RLS policies to include Org Super Admins. It also ensures the `snag_imports` table allows these roles if they weren't already covered correctly.

### Dashboard Enhancements

#### [MODIFY] [OrgAdminDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/components/dashboard/OrgAdminDashboard.tsx)

Already contains the "Bulk Snags" button, but I will double-check the logic to ensure it's fully functional for the Super Admin role.

## Verification Plan

### Manual Verification
1. Log in as an Org Super Admin.
2. Navigate to the "Core Operations" or "Quick Actions" in the sidebar.
3. Select a specific property from the property selector.
4. Click on the "Snags" (Bulk Snags) button.
5. Upload a CSV file and confirm the import.
6. Verify that the tickets are created and correctly assigned.
