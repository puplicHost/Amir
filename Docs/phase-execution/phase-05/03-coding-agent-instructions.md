# Coding Agent Instructions: Phase 05 - Services

## Phase Command
Implement Phase 05 — Services.

## Objective
Build a dynamic form engine for services, allowing admins to configure fields and users to submit requests with file attachments.

## Allowed Scope
- Admin Service config and Form Builder.
- Public dynamic form rendering.
- File upload handling for customer submissions.
- Admin Service Request management.
- Database seeding of the 7 specified services.

## Forbidden Scope
- Do not build payment integrations into services.
- Do not build email notifications.

## Required Skills
- `security-best-practices`
- `frontend-design`

## Frontend Tasks
- Build Admin Form Builder (drag-and-drop fields).
- Build `ServiceForm.vue` to dynamically render `text`, `textarea`, `phone`, `select`, and `file` inputs.
- Build public `/services` and `/services/success`.
- Build Admin Request List and Detail views.

## Backend Tasks
- Build Config CRUD APIs.
- Build Submission API supporting `multipart/form-data`.
- Build file download/stream API for admins to view attachments.

## Database Tasks
- Seed the 7 services exactly as described in `phase-05-services.md` section 6.
- Ensure correct relational insertion of `ServiceRequest`, `ServiceRequestValue`, and `ServiceRequestAttachment`.

## API Tasks
- Enforce file constraints (5MB, images/pdf only).
- Protect admin endpoints with `services.config`, `services.view`, `services.manage`.

## Security Tasks
- Strictly validate uploaded files on the server before saving to disk.

## UI/UX Tasks
- Ensure dynamic forms handle validation gracefully.

## Business Rules
- Deactivating a service hides it, but preserves requests.
- Cannot delete a service if it has requests.
- Phone fields must validate Egyptian format.

## Validation
- Ensure all required fields marked in the dynamic config are present in the payload.

## Error Handling
- Return clear validation errors if a required field is missing.

## Verification
- Submit form with valid and invalid files.
- Reorder fields in Admin and check public rendering.

## Acceptance Criteria
- [ ] All 7 services seeded with correct form fields
- [ ] `/services` page renders services in order
- [ ] Each service shows its dynamic form
- [ ] Required fields validated before submission
- [ ] Phone field validates Egyptian format
- [ ] File upload accepts images + PDF, rejects other types
- [ ] File upload enforces 5MB limit
- [ ] Submitted request stored with all values and file attachments
- [ ] Admin sees request in Service Requests table
- [ ] Admin can view all field values and download attached files
- [ ] Admin updates status → history recorded
- [ ] Dashboard "New Service Requests" counter is accurate
- [ ] Deactivated service disappears from public page
- [ ] Service with existing requests cannot be deleted

## Completion Criteria
Stop when all Acceptance Criteria are met and the dynamic service flow works seamlessly.

## Human Approval Points
- None required.

## Do Not
- Do not skip server-side file validation.
- Do not hardcode the 7 service forms in Vue; they must be rendered dynamically from the database.