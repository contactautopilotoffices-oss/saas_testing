import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';

/**
 * DELETE /api/meeting-room-bookings/[id]
 * Delete a booking (Admin/Technical Staff only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: bookingId } = await params;
        const supabase = await createClient();
        const adminSupabase = createAdminClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch booking to get property_id
        const { data: booking, error: bookingError } = await adminSupabase
            .from('meeting_room_bookings')
            .select('property_id, user_id')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const isOwner = booking.user_id === user.id;

        // 2. Permission Check: Master Admin
        const { data: userProfile } = await adminSupabase
            .from('users')
            .select('is_master_admin')
            .eq('id', user.id)
            .maybeSingle();

        if (userProfile?.is_master_admin) {
            // Master Admin can delete anything
        } else if (isOwner) {
            // User can delete their own booking
        } else {
            // 3. Check Property Permissions
            const { data: membership } = await adminSupabase
                .from('property_memberships')
                .select('role')
                .eq('user_id', user.id)
                .eq('property_id', booking.property_id)
                .eq('is_active', true)
                .maybeSingle();

            if (!membership) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const role = membership.role.toLowerCase();

            if (role === 'property_admin') {
                // Property Admin can delete
            } else if (role === 'staff' || role === 'mst') {
                // Check for technical skill
                const { data: skill } = await adminSupabase
                    .from('mst_skills')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('skill_code', 'technical')
                    .maybeSingle();

                if (!skill) {
                    return NextResponse.json({ error: 'Only technical staff can delete bookings' }, { status: 403 });
                }
            } else {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // 4. Cleanup associated notifications manually to avoid FK constraint issues
        const { data: notifIds } = await adminSupabase
            .from('notifications')
            .select('id')
            .eq('booking_id', bookingId);

        if (notifIds && notifIds.length > 0) {
            const ids = notifIds.map(n => n.id);
            // Delete delivery records first
            await adminSupabase
                .from('notification_delivery')
                .delete()
                .in('notification_id', ids);

            // Delete notifications
            await adminSupabase
                .from('notifications')
                .delete()
                .eq('booking_id', bookingId);
        }

        // 5. Fetch booking details for logging before deletion
        const { data: bookingDetail } = await adminSupabase
            .from('meeting_room_bookings')
            .select('*, meeting_room:meeting_rooms(name), tenant:users!user_id(full_name)')
            .eq('id', bookingId)
            .single();

        // 6. Perform deletion of the booking
        const { error: deleteError } = await adminSupabase
            .from('meeting_room_bookings')
            .delete()
            .eq('id', bookingId);

        if (deleteError) {
            console.error('Booking deletion error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
        }

        // 7. Log admin action (non-blocking)
        try {
            // Fetch organization_id from properties (required NOT NULL column)
            const { data: prop } = await adminSupabase
                .from('properties')
                .select('organization_id')
                .eq('id', booking.property_id)
                .single();

            await adminSupabase.from('property_activities').insert({
                organization_id: prop?.organization_id,
                property_id: booking.property_id,
                created_by: user.id,
                type: 'booking_deleted',
                status: 'completed',
            });
        } catch (err) {
            console.error('Activity log insertion failed:', err);
        }

        return NextResponse.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Booking DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
