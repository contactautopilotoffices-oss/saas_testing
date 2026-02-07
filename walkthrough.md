# Walkthrough: Meter Deletion & Reading History

## Task: Add Deletion & History Features
User requested:
1.  **Deletion**: Ability to delete meters from the card.
2.  **History**: View history of readings page.
3.  **Database Sync**: Fix "deleted_at does not exist" error.

### Changes Made

#### 1. Database Update (`add_deleted_at.sql`)
- Created a SQL script to add the `deleted_at` column to `electricity_meters`.
- **Action Required**: Run this SQL in your Supabase SQL Editor.

#### 2. `ElectricityLoggerCard.tsx`
- **UI**: Added a "Delete Meter" button on the back (flip side) of the card.
- **Logic**: Calls the `onDelete` prop when confirmed.

#### 3. `ElectricityStaffDashboard.tsx`
- **Data Fetching**: 
  - Updated to use direct `supabase` queries instead of generic APIs for robust `property_id` filtering.
  - Implemented logic to fetch `deleted_at IS NULL` meters.
- **Delete Logic**: 
  - `handleDeleteMeter` now performs a **soft delete** by setting `deleted_at` to the current timestamp.
  - This preserves historical data while hiding the meter from the active view.

#### 4. `ElectricityReadingHistory.tsx`
- **Refactor**: Updated to fetch meters first, then readings, ensuring data is correctly linked to the property.

### Verification
- **Delete**: Flip a card -> Click Delete -> Meter disappears (after SQL is run).
- **History**: Click "View History" -> See table of past readings.
