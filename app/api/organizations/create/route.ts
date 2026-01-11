import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

interface CreateOrgRequest {
    name: string
    code: string
    available_modules?: string[]
}

/**
 * POST /api/organizations/create
 * 
 * Create a new organization. Only master admins can create organizations.
 * 
 * This will:
 * 1. Validate the caller is a master admin
 * 2. Create the organization with a deletion secret
 * 3. Auto-assign the creator as org_super_admin in organization_memberships
 */
export async function POST(request: NextRequest) {
    try {
        const body: CreateOrgRequest = await request.json()
        const { name, code, available_modules = ['ticketing', 'viewer', 'analytics'] } = body

        // Validation
        if (!name || !code) {
            return NextResponse.json(
                { error: 'Missing required fields: name, code' },
                { status: 400 }
            )
        }

        // Sanitize code
        const sanitizedCode = code.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

        if (sanitizedCode.length < 3) {
            return NextResponse.json(
                { error: 'Code must be at least 3 characters long' },
                { status: 400 }
            )
        }

        // Get the current user's session to verify permissions
        const supabase = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in.' },
                { status: 401 }
            )
        }

        // Check if current user is master admin
        // Option 1: Check by email (hardcoded master admins)
        const masterAdminEmails = ['ranganathanlohitaksha@gmail.com']
        const isMasterByEmail = masterAdminEmails.includes(currentUser.email || '')

        // Option 2: Check by role in organization_memberships
        const { data: membership } = await supabase
            .from('organization_memberships')
            .select('role')
            .eq('user_id', currentUser.id)
            .eq('role', 'master_admin')
            .limit(1)
            .single()

        const isMasterAdmin = isMasterByEmail || !!membership

        if (!isMasterAdmin) {
            return NextResponse.json(
                { error: 'Forbidden. Only master admins can create organizations.' },
                { status: 403 }
            )
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient()

        // Generate deletion secret
        const deletionSecret = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

        // Check if code already exists
        const { data: existing } = await adminClient
            .from('organizations')
            .select('id')
            .eq('code', sanitizedCode)
            .single()

        if (existing) {
            return NextResponse.json(
                { error: `Organization with code "${sanitizedCode}" already exists` },
                { status: 409 }
            )
        }

        // Create the organization
        const { data: newOrg, error: createError } = await adminClient
            .from('organizations')
            .insert({
                name,
                code: sanitizedCode,
                deletion_secret: deletionSecret,
                available_modules,
            })
            .select()
            .single()

        if (createError) {
            console.error('Organization creation error:', createError)
            return NextResponse.json(
                { error: createError.message },
                { status: 500 }
            )
        }

        // Auto-assign creator as org_super_admin in organization_memberships
        const { error: memberError } = await adminClient
            .from('organization_memberships')
            .insert({
                organization_id: newOrg.id,
                user_id: currentUser.id,
                role: 'org_super_admin',
            })

        if (memberError) {
            console.error('Failed to add creator as admin:', memberError)
            // Non-fatal - organization was created
        }

        return NextResponse.json({
            success: true,
            message: `Organization "${name}" created successfully`,
            organization: {
                id: newOrg.id,
                name: newOrg.name,
                code: newOrg.code,
            },
            deletion_secret: deletionSecret, // Return once for user to save
        })

    } catch (error) {
        console.error('Create organization API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
