# Functional use cases — proposed scope

The course assignment provides a project brief, not all residence policies. These workflows are proposed implementation choices, subject to consultation and formal baseline approval. Do not present them as lecturer-confirmed business rules.

| ID | Actor | Use case | Main path | Important exception / acceptance |
|---|---|---|---|---|
| UC-01 | Student | Register and sign in | Register, then sign in | Duplicate email and invalid credentials rejected; sessions stored server-side |
| UC-02 | Student | Apply for accommodation | Select preferred room and add note | One active application; preference is not a reservation |
| UC-03 | Student | Withdraw application | Open Accommodation, withdraw pending request | Only owner may withdraw; approved records are retained |
| UC-04 | Staff | Review application and allocate | Review pending, choose available room, approve | Concurrent approvals cannot exceed room capacity |
| UC-05 | Staff | Reject application | Give a reason, reject pending application | Nonempty reason required; decision is visible to student |
| UC-06 | Staff | Manage room inventory | Add room, edit building/floor/capacity/status | Cannot deactivate occupied room or shrink below occupancy |
| UC-07 | Staff | Check out student | Select assigned student, confirm check-out | Bed is freed and history retained |
| UC-08 | Student | Request support | Choose category/priority, add issue and description | Student can view only own tickets |
| UC-09 | Staff | Resolve support request | Open ticket, set owner/priority/status, add resolution | Resolution note mandatory for resolved status |
| UC-10 | Both | Discuss a service request | Open ticket and exchange replies | Other students cannot view or reply |
| UC-11 | Student | View notifications | See decisions/replies, mark as read | Notifications scoped to recipient |
| UC-12 | Both | Manage account | Change name or password | Existing sessions on other devices revoked after password update |
| UC-13 | Staff | Inspect operations history | Activity screen and check-out history | Log provides recent operational evidence, not proof of staff effort |
| UC-14 | Staff | Find and export records | Search/sort/filter/page through tables; export filtered CSV | CSV spreadsheet-formula injection mitigation; all pages of the active filter included |
| UC-15 | Student | Request room transfer | Choose another available room and enter a reason | Only allocated students; own room is not a valid destination; one pending change |
| UC-16 | Staff | Review room transfer | Inspect request, approve/decline, record note | Approval atomically reserves destination and releases old bed; fails if full |
| UC-17 | Student | Request move-out | Submit reason, view status, optionally cancel pending | Cannot request without allocation; pending request may be cancelled |
| UC-18 | Staff | Approve move-out | Approve resident checkout and preserve history | Assignment closes and bed is released; approved application is closed |
| UC-19 | Staff | Manage announcement | Publish/edit/pin/archive a residence notice | Body/expiry validated; building audience scoped to actual resident allocation |
| UC-20 | Student | Read residence notices | Browse general and allocated-building announcements | Cannot read archived, expired, or another building’s notices |
| UC-21 | Staff | Inspect room roster | Open room residents and student profile | Staff-only API; student cannot enumerate residents |
| UC-22 | Staff | View operational reports | Inspect capacity distribution, requests by type/status | Real counts from current data; no invented trend or response-time statistics |
| UC-23 | Both | Search and navigate | Ctrl+K search pages and permitted records; mobile drawer | Results are drawn only from role-authorized data |

## Out of scope until client confirms requirements

Payments, gender-based room allocation, student identity verification, academic enrollment synchronization, email/SMS delivery, roommate selection, bed-level assignment, multi-institution tenancy, and file uploads. Do not build policy logic from assumptions.

## Suggested acceptance walk-through

1. A student registers, sees free rooms and submits an application with a preference.
2. A staff member reviews the request and assigns an available room. Occupancy increases; student sees assigned room and notification.
3. A second student cannot be assigned to the full room; staff chooses another room or declines with a reason.
4. First student submits a maintenance request. Staff assigns the case, replies, and resolves it with a note; student can read the conversation and status.
5. An allocated student requests a room transfer. Staff reviews and approves, verifying old room availability increases and target availability decreases without ever overbooking.
6. Staff publishes a building-only notice and confirms that only residents of that building can read it. Archive the notice and verify it disappears from the student portal.
7. The resident requests a move-out; staff approval releases the bed and writes checkout history.
8. Student access to another student's service request must fail with 404. Student access to staff-only endpoints must fail with 403.

## Assignment evidence disclaimer

The activity log records application operations, not the planned-vs-actual effort required for CO3011. Maintain actual weekly project logs, client interaction notes, estimated effort, issue register, resource-constrained baseline and traceability matrix separately. Never fabricate client approvals or effort records.
