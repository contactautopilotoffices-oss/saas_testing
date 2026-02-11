# Task: Fix Notification Redirect

## Objective
Ensure that clicking a notification correctly redirects the user to the specific request details page instead of the dashboard.

## Checklist
- [/] Research and Planning
    - [x] Investigate `NotificationSystem.tsx` click handler
    - [x] Verify `NotificationService.ts` deep link generation
    - [x] Analyze `TicketDetailPage` (`app/tickets/[ticketId]/page.tsx`) initialization logic
    - [x] Check `firebase-messaging-sw.js` click handler
    - [x] Identify root cause: `login/page.tsx` and `api/auth/callback/route.ts` ignore redirect parameters
- [x] Implementation (Notification Logic Update)
    - [x] Modify `NotificationService.ts`:
        - [x] Add `getRelevantRecipients` helper
        - [x] Update `afterTicketCreated` logic
        - [x] Add `afterTicketWaitlisted` method
        - [x] Update `afterTicketAssigned` logic
        - [x] Update `afterTicketCompleted` logic
    - [x] Update API routes to trigger waitlist notifications:
        - [x] `app/api/tickets/[id]/route.ts`
        - [x] `app/api/tickets/update-status/route.ts`
        - [x] `app/api/tickets/reassign/route.ts`
- [ ] Verification
    - [ ] Test Ticket Created notification
    - [ ] Test Ticket Waitlisted notification
    - [ ] Test Ticket Assigned/Reassigned notifications (Assignee vs others)
    - [ ] Test Ticket Completed notification (Admin only)
