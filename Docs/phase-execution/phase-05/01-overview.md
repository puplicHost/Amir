# Phase 05: Services

## Phase Identity
- **Phase number:** 05
- **Phase name:** Services
- **Source phase document:** `phase-05-services.md`
- **Dependencies:** Phase 01, Phase 02
- **Position in overall project:** 5th phase. Introduces the dynamic form building logic for B2B/engineering services.

## Objective
Build a dynamic services system where Admins configure services and their custom forms, customers submit requests with file attachments, and admins track these requests.

## Scope
- Admin Service CRUD + Dynamic Form Builder
- Admin Service Requests management
- Public `/services` dynamic rendering
- File upload handling for service requests
- Database seeding for the 7 core services

## Explicitly Out of Scope
- Email notifications.
- Payment integration for services (services are quote/request-based).

## Requirements
- **Confirmed:** Form builder must support text, textarea, phone, select, and file inputs.
- **Confirmed:** Seed all 7 specific services as described in the planning notes.
- **Confirmed:** Multi-file upload supported, max 5MB, PDF/Images only.
- **Confirmed:** Dashboard "New Service Requests" counter.

## User Impact
Admins can dynamically alter service forms without developer help. Customers can request complex engineering services and attach documentation.

## Architecture Impact
Introduces dynamic form rendering in Vue. Expands file storage for customer-uploaded request attachments.

## Dependencies
- **Previous phases required:** Phase 02
- **Future phases depending on this phase:** Phase 06 (Homepage services section)
- **Data dependencies:** The 7 services must be seeded exactly as specified.

## Risks
- Complex dynamic form state management.
- Security risks with public file uploads (malware, large files).

## Human Decisions
- TBD: Confirm exact select options if any are ambiguous in the seed list.

## Acceptance Criteria
- All 7 services seeded with correct form fields
- `/services` page renders services in order
- Each service shows its dynamic form
- Required fields validated before submission
- Phone field validates Egyptian format
- File upload accepts images + PDF, rejects other types
- File upload enforces 5MB limit
- Submitted request stored with all values and file attachments
- Admin sees request in Service Requests table
- Admin can view all field values and download attached files
- Admin updates status → history recorded
- Dashboard "New Service Requests" counter is accurate
- Deactivated service disappears from public page
- Service with existing requests cannot be deleted

## Definition of Done
Phase completes when all 7 services are seeded, the public dynamic forms successfully collect data and files, and the admin can effectively process these requests.