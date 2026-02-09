import { supabaseAdmin } from '@/backend/lib/supabase/admin';
import { firebaseAdmin } from '@/backend/lib/firebase';

export interface NotificationPayload {
    userId: string;
    ticketId: string;
    propertyId: string;
    organizationId?: string;
    type: string;
    title: string;
    message: string;
    deepLink: string;
}

export class NotificationService {
    /**
     * Triggered after a ticket is created.
     * Recipients: MST, PROPERTY_ADMIN, SECURITY, STAFF, ORG_SUPER_ADMIN (filtered by property)
     */
    static async afterTicketCreated(ticketId: string) {
        console.log('>>>>>>>>>> [NOTIFICATION TEST] afterTicketCreated entered for:', ticketId);
        try {
            const { data: ticket, error: ticketError } = await supabaseAdmin
                .from('tickets')
                .select('*, properties(name), users!raised_by(full_name)')
                .eq('id', ticketId)
                .single();

            if (ticketError || !ticket) {
                console.error('[NotificationService] Error fetching ticket for creation event:', ticketError);
                return;
            }

            console.log('>>>>>>>>>> [NOTIFICATION TEST] Ticket Creator (raised_by):', ticket.raised_by);

            // Resolve recipients based on PRD Rule 8
            const { data: recipients, error: recError } = await supabaseAdmin.rpc('get_ticket_created_recipients', {
                p_property_id: ticket.property_id,
                p_organization_id: ticket.organization_id,
                p_creator_id: ticket.raised_by
            });

            if (recError) {
                // Fallback to manual query if RPC doesn't exist yet
                console.warn('[NotificationService] RPC get_ticket_created_recipients not found, falling back to query');
                console.log(`[NotificationService] DEBUG: Searching for members in Property: ${ticket.property_id}`);

                // Debug: Check if ANY membership exists for this property
                const { count } = await supabaseAdmin
                    .from('property_memberships')
                    .select('*', { count: 'exact', head: true })
                    .eq('property_id', ticket.property_id);
                console.log(`[NotificationService] DEBUG: Total members in this property: ${count}`);

                const { data: members } = await supabaseAdmin
                    .from('property_memberships')
                    .select('user_id, role') // Select role to see what we found
                    .eq('property_id', ticket.property_id)
                    .in('role', ['MST', 'PROPERTY_ADMIN', 'SECURITY', 'STAFF', 'mst', 'property_admin', 'security', 'staff']); // Case insensitive check

                // Recipient list for fallback
                const fallbackRecipientIds = new Set<string>();

                // USER REFINEMENT: Do NOT send TICKET_CREATED to creator
                // if (ticket.raised_by) fallbackRecipientIds.add(ticket.raised_by);

                if (!members || members.length === 0) {
                    console.log('>>>>>>>>>> [NOTIFICATION TEST] 0 members found with filter. Fetching ALL for fallback...');
                    try {
                        const { data: allMembers, error: allMemError } = await supabaseAdmin
                            .from('property_memberships')
                            .select('user_id, role')
                            .eq('property_id', ticket.property_id);

                        if (!allMemError && allMembers) {
                            const validRoles = ['MST', 'PROPERTY_ADMIN', 'SECURITY', 'STAFF'];
                            const manualMatches = allMembers.filter(m =>
                                validRoles.includes(m.role?.toUpperCase())
                            );
                            manualMatches.forEach(m => {
                                // Exclude creator from staff notifications
                                if (m.user_id !== ticket.raised_by) {
                                    fallbackRecipientIds.add(m.user_id);
                                }
                            });
                        }
                    } catch (err) {
                        console.error('>>>>>>>>>> [NOTIFICATION TEST] Crash in fallback block:', err);
                    }
                } else {
                    members.forEach(m => {
                        const mid = String(m.user_id);
                        const cid = String(ticket.raised_by);
                        if (mid !== cid) {
                            fallbackRecipientIds.add(mid);
                        } else {
                            console.log(`>>>>>>>>>> [NOTIFICATION TEST] Fallback: Excluding creator ${mid}`);
                        }
                    });
                }

                console.log(`>>>>>>>>>> [NOTIFICATION TEST] Creation fallback: notifying ${fallbackRecipientIds.size} staff members (Creator excluded)`);
                for (const userId of fallbackRecipientIds) {
                    await this.send({
                        userId,
                        ticketId: ticket.id,
                        propertyId: ticket.property_id,
                        organizationId: ticket.organization_id,
                        type: 'TICKET_CREATED',
                        title: 'New Ticket Created',
                        message: `A new ticket "${ticket.title}" has been raised by ${ticket.users?.full_name || 'a user'}.`,
                        deepLink: `/tickets/${ticket.id}?via=notification`
                    });
                }

                // Also send to ORG_SUPER_ADMIN (if not the creator)
                const { data: orgAdmins } = await supabaseAdmin
                    .from('organization_memberships')
                    .select('user_id')
                    .eq('organization_id', ticket.organization_id)
                    .eq('role', 'ORG_SUPER_ADMIN');

                if (orgAdmins) {
                    console.log(`>>>>>>>>>> [NOTIFICATION TEST] Found ${orgAdmins.length} Org Admins. Filtering out creator.`);
                    for (const oa of orgAdmins) {
                        const oaid = String(oa.user_id);
                        const cid = String(ticket.raised_by);
                        if (oaid !== cid) {
                            await this.send({
                                userId: oaid,
                                ticketId: ticket.id,
                                propertyId: ticket.property_id,
                                organizationId: ticket.organization_id,
                                type: 'TICKET_CREATED',
                                title: 'New Ticket Created',
                                message: `A new ticket "${ticket.title}" has been raised.`,
                                deepLink: `/tickets/${ticket.id}?via=notification`
                            });
                        } else {
                            console.log(`>>>>>>>>>> [NOTIFICATION TEST] Org Admin ${oaid} is creator, skipping.`);
                        }
                    }
                }
            } else {
                console.log('>>>>>>>>>> [NOTIFICATION TEST] RPC found recipients:', recipients?.length || 0);
                // Exclude creator from RPC results
                const finalRecipients = new Set<string>();
                const creatorId = ticket.raised_by;

                recipients.forEach((r: any) => {
                    const rid = String(r.user_id);
                    const creatorIdStr = String(creatorId);
                    const matches = rid === creatorIdStr;

                    console.log(`>>>>>>>>>> [NOTIFICATION TEST] Comparing: ${rid} === ${creatorIdStr} -> ${matches}`);

                    if (rid && !matches) {
                        finalRecipients.add(rid);
                    } else {
                        console.log(`>>>>>>>>>> [NOTIFICATION TEST] Strictly excluding creator from RPC list: ${rid}`);
                    }
                });

                console.log(`>>>>>>>>>> [NOTIFICATION TEST] Notifying ${finalRecipients.size} staff members via RPC (Creator excluded)`);
                for (const userId of finalRecipients) {
                    await this.send({
                        userId,
                        ticketId: ticket.id,
                        propertyId: ticket.property_id,
                        organizationId: ticket.organization_id,
                        type: 'TICKET_CREATED',
                        title: 'New Ticket Created',
                        message: `A new ticket "${ticket.title}" has been raised at ${ticket.properties?.name}.`,
                        deepLink: `/tickets/${ticket.id}?via=notification`
                    });
                }
            }
        } catch (error) {
            console.error('[NotificationService] afterTicketCreated error:', error);
        }
    }

    /**
     * Triggered after a ticket is assigned.
     * Recipients: Assigned MST
     */
    static async afterTicketAssigned(ticketId: string, isAutoAssigned: boolean = false) {
        console.log('>>>>>>>>>> [NOTIFICATION TEST] afterTicketAssigned entered for:', ticketId, 'isAutoAssigned:', isAutoAssigned);
        try {
            const { data: ticket, error: ticketError } = await supabaseAdmin
                .from('tickets')
                .select('*, properties(name)')
                .eq('id', ticketId)
                .single();

            if (ticketError || !ticket || !ticket.assigned_to) {
                console.error('[NotificationService] Ticket not found or not assigned:', ticketError);
                return;
            }

            console.log('>>>>>>>>>> [NOTIFICATION TEST] Assignee ID:', ticket.assigned_to, 'Raised By:', ticket.raised_by);

            if (String(ticket.assigned_to) === String(ticket.raised_by)) {
                console.log('>>>>>>>>>> [NOTIFICATION TEST] Skipping assignment notification for creator.');
                return;
            }

            const title = isAutoAssigned ? 'New Ticket Created & Assigned' : 'Ticket Assigned to You';
            const message = isAutoAssigned
                ? `A new ticket "${ticket.title}" has been created and assigned to you.`
                : `Ticket "${ticket.title}" has been reassigned to you.`;

            console.log('>>>>>>>>>> [NOTIFICATION TEST] Notifying Assignee...');
            await this.send({
                userId: ticket.assigned_to,
                ticketId: ticket.id,
                propertyId: ticket.property_id,
                organizationId: ticket.organization_id,
                type: 'TICKET_ASSIGNED',
                title: title,
                message: message,
                deepLink: `/tickets/${ticket.id}?via=notification`
            });
            console.log('>>>>>>>>>> [NOTIFICATION TEST] afterTicketAssigned finished.');
        } catch (error) {
            console.error('[NotificationService] afterTicketAssigned error:', error);
        }
    }

    /**
     * Triggered after a ticket is completed.
     * Recipients: TENANT, PROPERTY_ADMIN, ORG_SUPER_ADMIN, Creator
     */
    static async afterTicketCompleted(ticketId: string) {
        console.log('>>>>>>>>>> [NOTIFICATION TEST] afterTicketCompleted entered for:', ticketId);
        try {
            const { data: ticket, error: ticketError } = await supabaseAdmin
                .from('tickets')
                .select('id, title, property_id, organization_id, raised_by, status')
                .eq('id', ticketId)
                .single();

            if (ticketError || !ticket) {
                console.error('[NotificationService] afterTicketCompleted: Ticket not found or error:', ticketError);
                return;
            }

            console.log('>>>>>>>>>> [NOTIFICATION TEST] Ticket Detail for Completion:', {
                id: ticket.id,
                raised_by: ticket.raised_by
            });

            const recipientIds = new Set<string>();
            const creatorId = ticket.raised_by;

            if (creatorId) {
                recipientIds.add(creatorId);
                console.log('>>>>>>>>>> [NOTIFICATION TEST] Adding creator ONLY to completion notification:', creatorId);
            } else {
                console.log('>>>>>>>>>> [NOTIFICATION TEST] WARNING: Ticket has NO raised_by creator field. No completion notification will be sent.');
            }

            console.log('>>>>>>>>>> [NOTIFICATION TEST] Recipients for completion:', Array.from(recipientIds));

            for (const userId of recipientIds) {
                await this.send({
                    userId,
                    ticketId: ticket.id,
                    propertyId: ticket.property_id,
                    organizationId: ticket.organization_id,
                    type: 'TICKET_COMPLETED',
                    title: 'Ticket Completed',
                    message: `Ticket "${ticket.title}" has been marked as completed.`,
                    deepLink: `/tickets/${ticket.id}?via=notification`
                });
            }
        } catch (error) {
            console.error('>>>>>>>>>> [NOTIFICATION TEST] afterTicketCompleted CRASH:', error);
        }
    }

    private static async resolveAndSend({ ticket, type, title, message, recipientsQuery }: any) {
        const { data: members } = await recipientsQuery;
        if (members) {
            console.log(`[NotificationService] Sending '${type}' to ${members.length} members`);
            for (const member of members) {
                await this.send({
                    userId: member.user_id,
                    ticketId: ticket.id,
                    propertyId: ticket.property_id,
                    organizationId: ticket.organization_id,
                    type,
                    title,
                    message,
                    deepLink: `/tickets/${ticket.id}?via=notification`
                });
            }
        }
    }

    private static async sendToOrgAdmins(ticket: any, type: string, title: string, message: string) {
        const { data: orgAdmins } = await supabaseAdmin
            .from('organization_memberships')
            .select('user_id')
            .eq('organization_id', ticket.organization_id)
            .eq('role', 'ORG_SUPER_ADMIN');

        if (orgAdmins) {
            console.log(`[NotificationService] Sending '${type}' to ${orgAdmins.length} Org Admins`);
            for (const oa of orgAdmins) {
                await this.send({
                    userId: oa.user_id,
                    ticketId: ticket.id,
                    propertyId: ticket.property_id,
                    organizationId: ticket.organization_id,
                    type,
                    title,
                    message,
                    deepLink: `/tickets/${ticket.id}?via=notification`
                });
            }
        }
    }

    /**
     * Core send logic: DB insert + Push dispatch
     */
    static async send(payload: NotificationPayload) {
        try {
            console.log('>>>>>>>>>> [NOTIFICATION TEST] send() Payload:', JSON.stringify(payload));

            // 1. Insert into notifications table
            const { data: notification, error: notifError } = await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: payload.userId,
                    ticket_id: payload.ticketId,
                    property_id: payload.propertyId,
                    organization_id: payload.organizationId,
                    notification_type: payload.type,
                    title: payload.title,
                    message: payload.message,
                    deep_link: payload.deepLink,
                    is_read: false
                })
                .select()
                .maybeSingle();

            if (notifError) {
                console.error('>>>>>>>>>> [NOTIFICATION TEST] DB INSERT ERROR:', JSON.stringify(notifError));
                return;
            }

            if (!notification) {
                console.error('>>>>>>>>>> [NOTIFICATION TEST] DB INSERT FAILED: No record returned.');
                return;
            }
            console.log('>>>>>>>>>> [NOTIFICATION TEST] DB Insert Success. Notification ID:', notification.id);

            // 2. Fetch push tokens for user
            const { data: tokens } = await supabaseAdmin
                .from('push_tokens')
                .select('token')
                .eq('user_id', payload.userId)
                .eq('is_active', true);

            console.log('[NotificationService] Found active tokens:', tokens?.length || 0);

            if (tokens && tokens.length > 0) {
                for (const { token } of tokens) {
                    await this.dispatchPushNotification(token, notification);
                }
            } else {
                console.log('[NotificationService] No active tokens for user, skipping push.');
            }
        } catch (error) {
            console.error('[NotificationService] Global send error:', error);
        }
    }

    /**
     * Dispatch to FCM
     */
    private static async dispatchPushNotification(token: string, notification: any) {
        // Log delivery attempt
        const { data: delivery } = await supabaseAdmin
            .from('notification_delivery')
            .insert({
                notification_id: notification.id,
                push_token: token,
                delivery_status: 'PENDING'
            })
            .select()
            .single();

        try {
            console.log('[FCM] Dispatching to token:', token.substring(0, 10) + '...');
            // Integrate with FCM Admin SDK
            await firebaseAdmin.messaging().send({
                token: token,
                notification: {
                    title: `Autopilot FMS | ${notification.title}`,
                    body: notification.message,
                },
                data: {
                    deep_link: String(notification.deep_link || ''),
                    notification_id: String(notification.id || '')
                },
                android: {
                    priority: 'high',
                    notification: {
                        icon: 'stock_ticker_update',
                        color: '#2563eb',
                        sound: 'default'
                    }
                },
                webpush: {
                    headers: {
                        Urgency: 'high'
                    },
                    notification: {
                        title: `Autopilot FMS | ${notification.title}`,
                        body: notification.message,
                        icon: '/autopilot-logo.png',
                        badge: '/autopilot-logo.png',
                        requireInteraction: true,
                        actions: [
                            {
                                action: 'view',
                                title: 'View Request'
                            }
                        ]
                    }
                }
            });

            console.log(`[FCM] Sent push successfully to ${token.substring(0, 10)}...`);

            // Mark as delivered
            if (delivery) {
                await supabaseAdmin
                    .from('notification_delivery')
                    .update({
                        delivery_status: 'DELIVERED',
                        delivered_at: new Date().toISOString()
                    })
                    .eq('id', delivery.id);
            }
        } catch (error: any) {
            console.error('[FCM] Push dispatch failed:', error);

            // Handle stale/invalid tokens
            const isStale =
                error?.code === 'messaging/registration-token-not-registered' ||
                error?.message?.includes('NotRegistered') ||
                error?.message?.includes('Requested entity was not found');

            if (isStale) {
                console.log('[FCM] Token is no longer valid. Deactivating:', token.substring(0, 10) + '...');
                await supabaseAdmin
                    .from('push_tokens')
                    .update({ is_active: false })
                    .eq('token', token);
            }

            if (delivery) {
                await supabaseAdmin
                    .from('notification_delivery')
                    .update({ delivery_status: 'FAILED' })
                    .eq('id', delivery.id);
            }
        }
    }
}
