import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/frontend/utils/supabase/server'
import { createAdminClient } from '@/frontend/utils/supabase/admin'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId' },
                { status: 400 }
            )
        }

        // Get the current user's session
        const supabase = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !currentUser) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if current user is a master admin
        const { data: masterAdminData } = await supabase
            .from('users')
            .select('is_master_admin')
            .eq('id', currentUser.id)
            .single()

        if (!masterAdminData?.is_master_admin) {
            return NextResponse.json(
                { error: 'Forbidden. Only Master Admins can delete users.' },
                { status: 403 }
            )
        }

        // Proceed to delete
        const adminClient = createAdminClient()

        // delete from auth.users (this cascades to public.users if references are set up, usually)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

        if (deleteError) {
            return NextResponse.json(
                { error: deleteError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' })

    } catch (error: any) {
        console.error('Delete user API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
