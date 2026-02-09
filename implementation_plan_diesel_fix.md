# Diesel 500 Error Fix Plan

Investigate and fix the `500 Internal Server Error` on the `/api/properties/[propertyId]/diesel-readings` endpoint (Error: "JSON object requested, multiple (or no) rows returned").

## Proposed Changes

### Frontend Improvements
- **[MODIFY] [DieselStaffDashboard.tsx](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/frontend/components/diesel/DieselStaffDashboard.tsx)**
  - Fix the typo in the DG tariffs API call: change `generator_id` to `generatorId` to match the backend expectations.
  - Added better error checking for empty or failed data fetches to prevent UI inconsistencies.

### API Improvements
- **[MODIFY] [diesel-readings/route.ts](file:///c:/Users/harsh/OneDrive/Desktop/autopilot/saas_one/app/api/properties/%5BpropertyId%5D/diesel-readings/route.ts)**
  - Change `.single()` to `.maybeSingle()` in the `POST` handler to be more resilient.
  - Add explicit error logging for the `GET` handler to capture the exact database error if it persists.
  - Simplify the `GET` join query to avoid potential PostgREST ambiguity with aliases.

## Verification Plan
- Monitor the network tab in the browser for `/api/properties/[propertyId]/diesel-readings` requests.
- Verify that the dashboard loads without the 500 status error.
- Test saving a new reading to ensure the `POST` handler works as expected.
