import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/frontend/utils/supabase/server'
import { createAdminClient } from '@/frontend/utils/supabase/admin'

interface CreateUserRequest {
    email: string
    password?: string
    full_name: string
    organization_id: string
    role?: string // matches app_role enum: 'master_admin' | 'org_super_admin' | 'property_admin' | 'staff' | 'tenant'
    username?: string
    create_master_admin?: boolean
    property_id?: string
    specialization?: string
}

/**
 * POST /api/users/create
 * 
 * Directly create a user account and add them to an organization.
 * Use this for admin-initiated user creation (no email verification required).
 * 
 * Required: Caller must be an admin/owner of the organization.
 */
export async function POST(request: NextRequest) {
    try {
        const body: CreateUserRequest = await request.json()
        const {
            email,
            password,
            full_name,
            organization_id,
            role = 'staff', // Default to a valid enum value if not provided
            username
        } = body

        // Validation: email and full_name are always required.
        // organization_id is required UNLESS we are creating a master admin.
        const createMasterAdmin = body.create_master_admin === true;

        if (!email || !full_name || (!organization_id && !createMasterAdmin)) {
            return NextResponse.json(
                { error: 'Missing required fields: email, full_name, and organization_id (unless creating master admin)' },
                { status: 400 }
            )
        }

        if (!email.includes('@')) {
            return NextResponse.json(
                { error: 'Invalid email format' },
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

        // Check if current user is a master admin
        const { data: masterAdminData } = await supabase
            .from('users')
            .select('is_master_admin')
            .eq('id', currentUser.id)
            .single()

        const isCurrentMasterAdmin = !!masterAdminData?.is_master_admin

        // Permission Check
        if (createMasterAdmin) {
            if (!isCurrentMasterAdmin) {
                return NextResponse.json(
                    { error: 'Forbidden. Only Master Admins can create other Master Admins.' },
                    { status: 403 }
                )
            }
        } else {
            // If not creating master admin, check if org admin (or master admin)
            if (!isCurrentMasterAdmin) {
                // 1. Check Org Admin roles
                const { data: orgMembership } = await supabase
                    .from('organization_memberships')
                    .select('role')
                    .eq('organization_id', organization_id)
                    .eq('user_id', currentUser.id)
                    .maybeSingle();

                const isOrgAdmin = orgMembership && ['org_super_admin', 'admin', 'owner'].includes(orgMembership.role);

                // 2. Check Property Admin role (if property_id is provided)
                let isPropertyAdmin = false;
                const { property_id } = body;
                if (property_id) {
                    const { data: propMembership } = await supabase
                        .from('property_memberships')
                        .select('role')
                        .eq('property_id', property_id)
                        .eq('user_id', currentUser.id)
                        .maybeSingle();

                    isPropertyAdmin = !!(propMembership && propMembership.role === 'property_admin');
                }

                if (!isOrgAdmin && !isPropertyAdmin) {
                    return NextResponse.json(
                        { error: 'Forbidden. You must be an organization admin, property admin, or master admin to create users.' },
                        { status: 403 }
                    )
                }
            }
        }

        // Use admin client for user creation (bypasses RLS)
        const adminClient = createAdminClient()

        // Generate a secure temporary password if not provided
        const userPassword = password || generateTempPassword()

        // Create the auth user
        const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: userPassword,
            email_confirm: true, // Auto-confirm email for admin-created users
            user_metadata: {
                full_name,
                username: username || email.split('@')[0],
                created_by: currentUser.id,
                organization_id: organization_id || null,
            }
        })

        if (createError) {
            console.error('User creation error:', createError)

            // Handle duplicate user
            if (createError.message.includes('already registered')) {
                return NextResponse.json(
                    { error: 'A user with this email already exists' },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { error: createError.message },
                { status: 500 }
            )
        }

        if (!userData.user) {
            return NextResponse.json(
                { error: 'User creation failed - no user returned' },
                { status: 500 }
            )
        }

        // If creating a master admin, update the user record
        if (createMasterAdmin) {
            const { error: updateError } = await adminClient
                .from('users')
                .update({ is_master_admin: true })
                .eq('id', userData.user.id)

            if (updateError) {
                console.error('Failed to set master admin flag:', updateError)
                // Just log it, user is created but not master admin yet. Manual fix might be needed.
            }
        }

        const { property_id } = body

        // The database trigger will auto-create user_profiles
        // Now create organization membership IF an organization_id was provided
        if (organization_id) {
            const { error: memberError } = await adminClient
                .from('organization_memberships')
                .insert({
                    organization_id,
                    user_id: userData.user.id,
                    role,
                })

            if (memberError) {
                console.error('Membership creation error:', memberError)
            }
        }

        // Create property membership IF a property_id was provided
        if (property_id) {
            const { error: propMemberError } = await adminClient
                .from('property_memberships')
                .insert({
                    property_id,
                    user_id: userData.user.id,
                    role: role === 'org_super_admin' ? 'property_admin' : role, // Map safely
                    is_active: true
                })

            if (propMemberError) {
                console.error('Property membership creation error:', propMemberError)
            }
        }

        // Assign Specialization/Skill if provided (for Staff/MST)
        const { specialization } = body;
        if ((role === 'staff' || role === 'mst') && specialization) {
            const { error: skillError } = await adminClient
                .from('mst_skills')
                .insert({
                    user_id: userData.user.id,
                    skill_code: specialization
                });

            if (skillError) {
                console.error('Skill assignment error:', skillError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `User ${email} created successfully. ${!password ? 'A password reset email should be sent to the user.' : ''}`,
            user: {
                id: userData.user.id,
                email: userData.user.email,
                full_name,
                role: createMasterAdmin ? 'master_admin' : role,
            },
            // Security: Never return passwords in API responses
            // If no password was provided, user should reset via email
            requiresPasswordReset: !password,
        })
    } catch (error) {
        console.error('Create user API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * Generate a secure temporary password
 */
function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}
