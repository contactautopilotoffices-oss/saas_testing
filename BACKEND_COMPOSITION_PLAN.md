# Backend Composition Layer - Architecture & Implementation

## Overview
We have introduced a **Backend Composition Layer** using Supabase Edge Functions to optimize the Initial Dashboard Load. This moves the orchestration of multiple API calls from the client (Browser) to the server side (Edge), reducing network overhead and improving perceived performance.

## Architecture: Modular Monolith Preserved

The architecture cleanly separates **Composition** from **Domain Logic**:

1.  **Domain Layer (Existing Next.js APIs)**
    *   Independent endpoints: `tickets-summary`, `diesel-summary`, `vms-summary`, `vendor-summary`.
    *   Each handles its own DB queries, business logic, and RLS.
    *   *These remain untouched.*

2.  **Composition Layer (New Supabase Edge Function)**
    *   Endpoint: `get-dashboard-summary`
    *   Role: **Aggregator / API Gateway**.
    *   Logic: Receives one request, calls the 4 Domain APIs in parallel (server-to-server), and returns one combined JSON response.

**Diagram:**
```mermaid
graph TD
    Client[Client / Browser] -->|1. Request| Edge[Supabase Edge Function\n(get-dashboard-summary)]
    Edge -->|2. Parallel Fetch| API1[Next.js API: Tickets]
    Edge -->|2. Parallel Fetch| API2[Next.js API: Diesel]
    Edge -->|2. Parallel Fetch| API3[Next.js API: VMS]
    Edge -->|2. Parallel Fetch| API4[Next.js API: Vendors]
    API1 --> DB[(Postgres DB)]
    API2 --> DB
    API3 --> DB
    API4 --> DB
    Edge -->|3. Aggregated JSON| Client
```

---

## Implementation Details

### Edge Function
**Location:** `supabase/functions/get-dashboard-summary/index.ts`

**Key Features:**
*   **Parallel Execution:** Uses `Promise.all` to fetch data concurrently.
*   **Security:** Passes the user's `Authorization` header (JWT) to internal APIs, ensuring RLS and permissions are strictly enforced by the existing path.
*   **Error Handling:** Handles partial failures (e.g., if Diesel API fails, Tickets still return) gracefully.

### Environment Setup
To make this work, the Edge Function needs to know where your Next.js app is running.
1.  Set `NEXT_PUBLIC_APP_URL` in your Supabase secrets:
    ```bash
    supabase secrets set NEXT_PUBLIC_APP_URL=https://your-production-url.com
    ```
2.  For local dev, usually `http://localhost:3000` is used, but Edge Functions running in Docker might need `http://host.docker.internal:3000` or a tunnel URL (ngrok).

---

## Frontend Integration (Example)

Replace the multiple `useEffect` fetches in `OrgAdminDashboard.tsx` with this single call:

```typescript
// hooks/useDashboardSummary.ts

import { createClient } from '@/utils/supabase/client';

export const fetchDashboardSummary = async (orgId: string, period = 'month') => {
  const supabase = createClient();
  
  // Invoke the Edge Function
  const { data, error } = await supabase.functions.invoke('get-dashboard-summary', {
    body: { 
      orgId, 
      period 
    }
  });

  if (error) throw error;
  return data;
};
```

**Usage in Component:**

```typescript
const [summary, setSummary] = useState(null);

useEffect(() => {
  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchDashboardSummary(orgId);
      
      setTicketSummary(data.tickets);
      setDieselSummary(data.diesel);
      setVmsSummary(data.vms);
      setVendorSummary(data.vendors);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (orgId) loadData();
}, [orgId]);
```

## Performance Benefits

1.  **Reduced Network Round Trips:** 4 HTTP requests -> 1 HTTP request.
2.  **Lower Latency:** Server-to-Server communication (Edge -> Vercel) is typically faster and more stable than Client-to-Server (User's Mobile/WiFi -> Vercel).
3.  **Connection Reuse:** The browser opens fewer TCP connections.
4.  **Simplified Client State:** Logic for handling 4 disparate loading states can be unified.

## Next Steps

1.  **Deploy Edge Function:**
    ```bash
    supabase functions deploy get-dashboard-summary
    ```
2.  **Set Secrets:** Configure the `NEXT_PUBLIC_APP_URL`.
3.  **Update Frontend:** Refactor `OrgAdminDashboard.tsx` and `PropertyAdminDashboard.tsx` to use the new invoker.
