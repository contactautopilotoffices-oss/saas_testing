# Task: Fix Ticket Deletion Permissions

- [ ] Planning
    - [x] Analyze codebase and identify permission gap
    - [x] Create implementation plan
- [x] Execution
    - [x] Modify `app/api/tickets/[id]/route.ts` to include Master Admin check
    - [x] Make role checks case-insensitive
- [x] Verification
    - [x] Verify fix with Master Admin check logic
    - [x] Create walkthrough
