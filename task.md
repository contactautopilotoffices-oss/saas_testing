# Utilities Logging & Analytics v2 — Implementation Tasks

## Phase 1: Database Schema ✅
- [x] Create `meter_multipliers` table with time-versioning
- [x] Create `grid_tariffs` table with time-versioning
- [x] Create `dg_tariffs` table with time-versioning (references `generators` table)
- [x] Modify `electricity_readings` to add multiplier/tariff/cost columns
- [x] Modify `diesel_readings` to add tariff/cost columns
- [x] Create overlap prevention triggers
- [x] Create RLS policies for all new tables
- [x] Create helper functions (get_active_multiplier, get_active_grid_tariff, get_active_dg_tariff)
- [ ] Run migration on Supabase (User action required)

## Phase 2: Backend APIs ✅
- [x] Create `app/api/properties/[propertyId]/meter-multipliers/route.ts`
  - [x] GET: List multipliers for meter, get active for date
  - [x] POST: Create new multiplier version (auto-closes previous)
- [x] Create `app/api/properties/[propertyId]/grid-tariffs/route.ts`
  - [x] GET: List tariffs, get active for date
  - [x] POST: Create new tariff version
- [x] Create `app/api/properties/[propertyId]/dg-tariffs/route.ts`
  - [x] GET: List tariffs for generator
  - [x] POST: Create new tariff version
- [x] Modify `electricity-readings/route.ts` for cost computation
  - [x] Auto-fetch multiplier if not provided
  - [x] Auto-fetch tariff for date
  - [x] Compute final_units = raw_units × multiplier
  - [x] Compute computed_cost = final_units × tariff
- [x] Modify `diesel-readings/route.ts` for cost computation
  - [x] Auto-fetch DG tariff for date
  - [x] Compute computed_cost = litres × tariff
- [x] Create `app/api/properties/[propertyId]/utilities-analytics/route.ts`
  - [x] Combined + electricity + diesel views
  - [x] Today / Last 30 Days periods
  - [x] Summary, trends, breakdown aggregation

## Phase 3: Frontend Components ✅
- [x] Modify `ElectricityLoggerCard.tsx`
  - [x] Remove peak load input
  - [x] Add multiplier dropdown (explicit selection)
  - [x] Add computed cost display (read-only)
  - [x] Cost shown before units
  - [x] Add card flip for multiplier editing
- [x] Multiplier editor integrated in card (back face)
- [x] Modify `DieselLoggerCard.tsx` for cost display
  - [x] Cost shown before units
  - [x] Display active tariff rate
- [x] Create `UtilitiesSummaryTile.tsx` (unified)
  - [x] Grid + DG cost breakdown
  - [x] Today / 30-day toggle
  - [x] Percentage breakdown bar
- [x] Create `UnifiedAnalyticsDashboard.tsx`
  - [x] Summary tile (hero)
  - [x] Time toggle (Today / Last 30 Days)
  - [x] Scope toggle (Combined / Meter-wise)
  - [x] Trends graph with toggle
  - [x] Export functionality
- [x] Update `ElectricityStaffDashboard.tsx`
  - [x] Fetch multipliers and tariffs
  - [x] Pass to logger cards
  - [x] Show cost in footer (before units)
- [x] Create utilities analytics page route

## Phase 4: Design System ✅
- [x] Add global CSS tokens for energy utilities
  - [x] Grid Power (Amber) palette: --energy-grid-*
  - [x] DG Power (Emerald) palette: --energy-dg-*
  - [x] Combined utilities tokens
  - [x] Chart color tokens
  - [x] Dark mode variants
  - [x] Utility classes (.energy-grid-card, .energy-dg-card, etc.)

---

## API Endpoints Created

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/properties/[id]/meter-multipliers` | GET, POST | Manage meter CT/PT multipliers |
| `/api/properties/[id]/grid-tariffs` | GET, POST | Manage electricity tariff rates |
| `/api/properties/[id]/dg-tariffs` | GET, POST | Manage diesel generator tariffs |
| `/api/properties/[id]/electricity-readings` | GET, POST | Submit readings with cost computation |
| `/api/properties/[id]/diesel-readings` | GET, POST | Submit readings with cost computation |
| `/api/properties/[id]/utilities-analytics` | GET | Aggregated analytics data |

## Frontend Components Created

| Component | Path | Description |
|-----------|------|-------------|
| `ElectricityLoggerCard` | `/frontend/components/electricity/` | Meter logger with multiplier selection & cost |
| `DieselLoggerCard` | `/frontend/components/diesel/` | Generator logger with cost display |
| `UtilitiesSummaryTile` | `/frontend/components/utilities/` | Combined grid+DG summary hero |
| `UnifiedAnalyticsDashboard` | `/frontend/components/utilities/` | Full analytics dashboard |

## Page Routes Created

| Route | Path |
|-------|------|
| Utilities Analytics | `/[orgId]/properties/[propertyId]/utilities/analytics` |
---

## Phase 5: MST Integration
- [x] Add Electricity Logger to `MstDashboard.tsx`
- [x] Update RLS policies in `electricity_logger.sql` to include `mst` role
- [x] Verify MST access and save functionality
