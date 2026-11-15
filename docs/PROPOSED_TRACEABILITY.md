# Proposed traceability matrix

These IDs, plans and acceptance expectations are **proposals**, not client-approved requirements or fabricated execution evidence. Confirm priorities and scope through real consultation before publishing Project Baseline V1.0.

| Objective | Requirement and product | Activity | Owner (placeholder) | Main risk | Verification | Checkpoint |
|---|---|---|---|---|---|---|
| O1: Make accommodation registration trackable | RQ01 / P01 Application module | A01 Build application workflow | Backend + Frontend | RK01 Duplicate request | T03–T06 | CP01 Registration acceptance |
| O2: Allocate beds without exceeding capacity | RQ02 / P02 Room/Allocation module | A02 Implement atomic allocation | Backend | RK02 Overbooking | T07–T11 | CP02 Capacity acceptance |
| O3: Handle residence support inquiries | RQ03 / P03 Request tracking | A03 Implement tickets and discussion | Backend + Frontend | RK03 Lost reply / state | T12–T16 | CP03 Request workflow review |
| O4: Protect student account data | RQ04 / P04 Authentication | A04 Implement RBAC and session controls | Backend | RK04 Unauthorized access | T01–T02, T16, T18, T21 | CP04 Security review |
| O5: Provide student status visibility | RQ05 / P05 Notification module | A05 Implement in-app notifications | Backend + Frontend | RK05 Missed alerts | T17 | CP05 Notification verification |
| O6: Support basic operational review | RQ06 / P06 Management views | A06 Add activity and export views | Frontend + Backend | RK06 Missing history | T19–T20, T33 | CP06 Demo handover |
| O7: Handle housing changes without manual edits | RQ07 / P07 Housing change module | A07 Implement resident request, staff decision and atomic movement | Backend + Frontend | RK07 Capacity inconsistency after transfer | T23–T28, T36 | CP07 Transfer/checkout acceptance |
| O8: Communicate building-specific residence updates | RQ08 / P08 Announcement module | A08 Implement publishing and audience checks | Backend + Frontend | RK08 Wrong-audience disclosure | T29–T31, T36 | CP08 Notice access verification |
| O9: Improve staff control and usability | RQ09 / P09 Resident roster and reporting UI | A09 Build roster, reports, search, pagination, mobile navigation | Frontend | RK09 Inconsistent data or unusable mobile layout | T32–T35 | CP09 Usability review |

Acceptance measures should be agreed with the client, such as no overbooking in the tested concurrent allocation scenario, correct owner access, and complete agreed demonstration workflows.

The application's audit events are not project time sheets. The CO3011 assignment separately requires realistic effort estimates, actual resource/schedule tracking, documented change response, quality evidence and preservation of baseline V1.0.
