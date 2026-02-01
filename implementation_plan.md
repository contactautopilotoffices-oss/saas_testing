# Implementation Plan - Super Admin Request Board Enhancements

The objective is to implement the "Admin SPOC Dashboard" layout in the Super Admin (Master Admin) "Requests" tab, while adjusting the column proportions to favor the ticket board over the "Coming Soon" map view.

## User Review Required

> [!IMPORTANT]
> This change replaces the standard `TicketsView` (list view) in the Super Admin dashboard with the more advanced `AdminSPOCDashboard` (command center layout) as per the provided screenshot.

## Proposed Changes

### [Tickets Component]

#### [MODIFY] [AdminSPOCDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/frontend/components/tickets/AdminSPOCDashboard.tsx)
- **Make `organizationId` optional**: Update the prop interface to allow Master Admins to view all requests without a specific organization filter.
- **Update Fetch Logic**: Ensure the API calls handle the absence of `propertyId` and `organizationId` correctly.
- **Adjust Grid Layout**: 
    - Increase `Live Ticket Board` from `lg:col-span-3` to `lg:col-span-6`.
    - Decrease `Resolver Load Map` (Coming Soon) from `lg:col-span-5` to `lg:col-span-2`.
    - Maintain `Right Panel` (Waitlist/Assignment) at `lg:col-span-4`.
    - *Note: This achieves the "increase size and reduce" request.*

### [Dashboard Component]

#### [MODIFY] [MasterAdminDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_testing/frontend/components/dashboard/MasterAdminDashboard.tsx)
- **Import `AdminSPOCDashboard`**.
- **Replace `TicketsView`**: Update the `activeTab === 'tickets'` section to render `AdminSPOCDashboard`.
- **Pass Props**: Provide current user metadata to the dashboard.

## Verification Plan

### Automated Tests
- N/A (UI Changes)

### Manual Verification
1. Navigate to Super Admin Dashboard.
2. Click on the "Support Tickets" tab.
3. Verify the "Request Board" layout appears as in the screenshot.
4. Confirm "Live Ticket Board" is significantly wider than the "Coming Soon" section.
5. Verify that data (tickets, waitlist) loads correctly for the Master Admin view.
