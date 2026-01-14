# Diesel Analytics Theme Update

Result: Successfully updated the Diesel Analytics dashboards and components to use the application's Primary/Secondary theme.

## Components Updated
- `DieselAnalyticsDashboard.tsx`: Removed hardcoded Amber theme, applied Primary Blue theme for charts, metrics, and loading states.
- `DieselStaffDashboard.tsx`: Updated navigation, buttons, and loading spinners to match the new theme.
- `LiquidDieselGauge.tsx`: Refactored color logic to use Primary palette instead of generic Gold/Amber.
- `DieselLoggerCard.tsx`: Updated input fields, status indicators, and alerts to use Primary/Slate colors.
- `GeneratorConfigModal.tsx`: Updated modal styling to match system theme (Primary/Slate).
- `OrgAdminDashboard.tsx`: Updated dashboard widgets and `DieselSphere` visualization to align with the new theme colors.
- `PropertyAdminDashboard.tsx`: Updated the "Diesel Analytics" tab button to match other navigation items.

## Verification
- **Visual Consistency**: Verified that all updated components now use `bg-primary`, `text-primary`, and their variations (`slate`, `rose` for alerts) instead of `amber-500` etc.
- **Dark Mode**: Ensured that dark mode variations work correctly using the `isDark` logic or Tailwind dark mode classes where applicable.
- **Functional Integrity**: Color changes were strictly cosmetic and did not alter the underlying logic of data fetching or calculation.

This completes the Diesel Theme Update task.
