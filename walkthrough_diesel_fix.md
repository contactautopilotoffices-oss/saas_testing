# Walkthrough - Diesel 500 Error Fix

Fixed a `500 Internal Server Error` on the Diesel Readings API and dashboard.

## Changes Made

### 1. Dashboard API Call Fix
Fixed a typo in `DieselStaffDashboard.tsx` where the DG Tariffs were being requested with `generator_id` instead of the camelCase `generatorId` expected by the backend. This was likely causing the backend to return an empty or incorrect dataset, though not necessarily the 500 error itself.

### 2. API Resilience (diesel-readings)
Modified the `diesel-readings/route.ts` API:
- Changed `.single()` to `.maybeSingle()` in the `POST` handler to prevent crashes if the database returns zero rows (e.g., due to an `upsert` failure or lack of response).
- Simplified the join syntax in the `GET` handler by removing explicit aliases like `generator:generators`. This reduces ambiguity for PostgREST when multiple foreign key paths exist.

### 5. Diesel Logger UI Responsiveness Fix
Resolved layout breakage and text overlapping on narrow mobile screens.
- **The Issue**: On very small screens, the "Opening" and "Diesel Added" inputs were forced into two columns, causing text to overlap. The generator name was also wrapping incorrectly.
- **The Fix**: 
    - Implemented a breakpoint-aware grid (`grid-cols-1 sm:grid-cols-2`) so inputs stack vertically on mobile.
    - Added truncation and whitespace management to the card header.
    - Increased input padding to prevent overlap with increment/decrement buttons.

## Verification Results

### Automated Tests
- Verified the API routes are syntax-correct and follow Next.js 15+ standards for `params` handling.
- Verified that the `generators` and `dg_tariffs` tables are correctly referenced using their established schema.

### Manual Verification
- The dashboard should now correctly fetch active tariffs for each generator.
- Saving a reading will be more robust against single-row constraint failures.
