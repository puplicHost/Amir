# Implementation Plan: Phase 05 - Services

## Architecture
- **Modules:** Dynamic Form Builder (Admin), Form Renderer (Public), Request Handler (API).
- **Responsibilities:** Abstract form structures into DB rows, render them safely, accept multi-part submissions.
- **Data flow:** Admin Config -> DB -> Public Render -> Submission -> File/DB Storage -> Admin Review.

## Frontend
- **Components:**
  - `ServiceForm.vue`: The dynamic renderer based on JSON/array config.
  - `ServiceFieldInput.vue`: Handles specific input types.
- **Pages:**
  - `/services`: Lists all services and renders `ServiceForm`.
  - `/admin/services` (Tabs: Services, Form Builder, Requests).
- **Form Builder UX:** Drag-and-drop ordering for fields.

## Google Stitch / Design System
- Service cards and dynamic forms must align with Stitch UI guidelines. Ensure file upload inputs look clean and indicate progress/success.

## Backend
- **APIs:**
  - Admin: Config CRUD, Field CRUD, Field Reorder, Request status updates.
  - Public: Submit request (`multipart/form-data`).
- **File Handling:**
  - Store request files in `/storage/service-requests/[id]/`.
  - Validate mime types (image/*, application/pdf).
- **Dashboard API:** Wire up the "New Service Requests" counter.

## Database
- Models: `Service`, `ServiceFormField`, `ServiceRequest`, `ServiceRequestValue`, `ServiceRequestAttachment`.
- **Seeding:** Write a robust seed script mapping the 7 services and their exact fields.

## Security
- Public file uploads are high risk. Strictly validate mime types and file extensions on the server.
- Limit payload sizes (5MB per file, reasonable overall limit).

## Skills
```text
Skill: security-best-practices
Purpose: Mitigate risks of public file uploads.
Used for: Service request submission API.
Phase tasks: File type and size validation.

Skill: frontend-design
Purpose: Implement an intuitive dynamic form builder.
Used for: Admin form builder.
Phase tasks: Vue component creation.
```

## Implementation Order
1. Write the DB seed script for the 7 services.
2. Implement Backend Config APIs (Service + Fields).
3. Implement Admin Config UI (List + Form Builder).
4. Implement Public GET API for services.
5. Build Public `ServiceForm.vue` renderer and `/services` page.
6. Implement Backend Submission API (File upload + DB storage).
7. Implement Admin Requests UI (List + Detail + File downloading).
8. Update Admin Dashboard stats.

## Verification
- Basic Verification:
  - Submit a complex form with a PDF and an image.
  - Attempt to upload an `.exe` file (must fail).
  - Admin changes status of the request.
  - Delete a field in the form builder, verify public form updates.