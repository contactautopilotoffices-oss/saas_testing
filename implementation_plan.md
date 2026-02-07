# PRD v2.1 Logger & Analytics Update

This plan outlines the changes required to update the "Electricity Logger", "Electricity Analytics", "Diesel Logger", and "Diesel Analytics" modules to v2.1, simplifying the logger experience and separating it from analytics.

## Proposed Changes

### 1. Electricity Logger Card
**File:** `frontend/components/electricity/ElectricityLoggerCard.tsx`

- **Front of Card:**
    -   [MODIFY] Remove Cost, Units, and Multiplier display.
    -   [MODIFY] Show only Opening (readonly) and Closing (input) readings.
    -   [MODIFY] Ensure "Save Entry" button is visible or check parent handling (based on current code, `onReadingChange` handles update, parent handles save). *Note: The PRD requests a "Save Entry" on the card. The current implementation relies on parent submission. I will verify if I should add a local save button or if the "Save Entry" refers to the main action.*
    -   [MODIFY] Add "Meter Factor (Multiplier)" label to trigger flip (or a settings icon).
    -   [MODIFY] Implement "No Data" state for empty values (show "—").

- **Back of Card (Flip):**
    -   [MODIFY] Show only:
        -   Multiplier Input (one field).
        -   Effective From Date.
        -   Reason (Optional).
        -   Save Button.
        -   Remove: CT/PT Primary/Secondary inputs, calculated preview.

### 2. Electricity Analytics Dashboard
**File:** `frontend/components/electricity/ElectricityAnalyticsDashboard.tsx`

- **Layout Structure:**
    -   [MODIFY] Implement 3-Tile Layout:
        -   **Tile 1 (Cost):** Main metric. Toggle: [Today | This Month] (Default: This Month).
        -   **Tile 2 (Units):** Secondary metric. Toggle: [Today | This Month].
        -   **Tile 3 (Averages):** Daily Average Cost + Units.
    -   [MODIFY] Add "Meter Scope" Toggle (Top Right): [Combined | Meter-wise].
        -   If Meter-wise is selected, show a dropdown to select a specific meter.
    -   [MODIFY] Update Trends Graph:
        -   Single graph component.
        -   Toggle: [Cost (₹) | Units (kVAh)].
        -   Update Y-axis based on selection.
    -   [MODIFY] Zero State Handling:
        -   Replace "0" values with "—".
        -   Show "No data logged for selected period" placeholder for empty graphs.

### 3. Diesel Logger Card
**File:** `frontend/components/diesel/DieselLoggerCard.tsx`

- **Front of Card:**
    -   [MODIFY] Remove Cost, Run Time, Consumption display.
    -   [MODIFY] Show only Opening (readonly) and Closing/Added inputs.
    -   [MODIFY] Simplify layout to match Electricity Logger simplicity.

### 4. Diesel Analytics Dashboard
**File:** `frontend/components/diesel/DieselAnalyticsDashboard.tsx`

- **Layout Structure:**
    -   [MODIFY] Replicate the 3-Tile Layout from Electricity Analytics.
    -   [MODIFY] Implement [Combined | Meter-wise] (Generator-wise) toggle.
    -   [MODIFY] Update Trends Graph to support Cost/Litres toggle.

## Verification Plan

### Automated Tests
-   None requested. Visual verification is key.

### Manual Verification
-   **Logger:**
    -   Verify that Electricity Logger Front shows only readings.
    -   Verify that Electricity Logger Flip works and shows simplified multiplier fields.
    -   Verify that Diesel Logger shows only readings/hours.
-   **Analytics:**
    -   Verify the 3-tile layout appears correct.
    -   Test the [Today | This Month] toggles on tiles.
    -   Test the [Combined | Meter-wise] toggle and ensure data filters correctly.
    -   Test the Trend Graph toggle (Cost vs Units).
    -   Verify zero states show "—" or appropriate message.
