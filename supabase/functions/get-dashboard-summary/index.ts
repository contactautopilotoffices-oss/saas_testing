
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { orgId, propertyId, period = 'month' } = await req.json()
        const authHeader = req.headers.get('Authorization')

        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        if (!orgId) {
            throw new Error('Missing orgId parameter')
        }

        // Determine the base URL for internal API calls
        // In production, this should be the deployed Next.js URL
        // e.g., https://my-app.vercel.app
        const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'

        console.log(`Fetching dashboard summary for Org: ${orgId}, Period: ${period}`)

        const fetchOptions = {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        }

        // Parallelize the fetch calls to existing Next.js API routes
        // This preserves domain boundaries while reducing client-side RTT
        const endpoints = [
            `${APP_URL}/api/organizations/${orgId}/tickets-summary?period=${period}`,
            `${APP_URL}/api/organizations/${orgId}/diesel-summary?period=${period}`,
            `${APP_URL}/api/organizations/${orgId}/vms-summary?period=today`, // VMS typically focuses on daily active
            `${APP_URL}/api/organizations/${orgId}/vendor-summary?period=${period}`
        ]

        const responses = await Promise.all(
            endpoints.map(url => fetch(url, fetchOptions))
        )

        // Parse responses safely
        const [tickets, diesel, vms, vendors] = await Promise.all(
            responses.map(async (res, index) => {
                if (!res.ok) {
                    console.error(`API Call Failed [${endpoints[index]}]: ${res.status} ${res.statusText}`)
                    return null // Graceful partial failure
                }
                return await res.json()
            })
        )

        // Aggregate into a single response object
        const aggregatedData = {
            tickets: tickets || { error: "Failed to fetch ticket data" },
            diesel: diesel || { error: "Failed to fetch diesel data" },
            vms: vms || { error: "Failed to fetch VMS data" },
            vendors: vendors || { error: "Failed to fetch vendor data" },
            meta: {
                orgId,
                timestamp: new Date().toISOString(),
                source: "backend-composition-layer"
            }
        }

        return new Response(
            JSON.stringify(aggregatedData),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
