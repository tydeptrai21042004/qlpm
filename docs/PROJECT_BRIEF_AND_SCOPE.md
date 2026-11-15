# Project context and proposed implementation scope

## Source brief

A university needs a unified system for student dormitory registration, room allocation, residence/student information and handling support requests during a student's stay. Existing processes use multiple tools, making tracking and coordination difficult.

## Proposed scope

The software allows students to register accounts, submit a housing application with an optional preference, track review/assignment, view live room availability and submit service issues. Staff can maintain room inventory, review applications, assign rooms without overbooking, check students out, triage requests and communicate within a service ticket. The software also contains in-app notifications and recent operational history.

## Proposed user groups

- **Student:** can update their own profile and read/modify only their eligible data.
- **Residence staff:** reviews applications, allocates rooms, processes requests, maintains inventory and reviews logs.
- **Sponsor/client:** must confirm real policy questions, acceptance criteria and team priorities.

## Important unresolved questions for client consultation

1. Who is eligible to register? Is school SSO or student-ID verification required?
2. Is room preference permitted? Are assignment constraints based on gender, building, year or special needs?
3. Does a room contain individually tracked beds? Should students choose a bed or only a room?
4. When may a request be cancelled, reopened or escalated? What counts as an urgent maintenance issue?
5. Who can approve an application, and who can approve a check-out?
6. Are payments, deposits, penalties, receipts, academic records or notifications to external systems required?
7. What student information may legally be stored, and what are retention and access policies?
8. What are the measurable success criteria for this small project and the minimum demonstration scope?

These questions need documented **real answers**. Do not fabricate a Client Interaction Log or assume agreement.

## Deliberate exclusions

No payment integration, file upload, email/SMS, SSO, campus system integration, automated eligibility checks, roommate selection or bed-level reservation. Those require client confirmation and additional time/security work.

## Technology and delivery assumptions

One Express 5 application and vanilla frontend on Vercel, Neon PostgreSQL for persistence, small test/demo dataset and separated staff/student roles. Automatic database initialization provides a simple course deployment; production database lifecycle management is a deferred improvement.
