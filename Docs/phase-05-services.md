# Phase 5 — Services

## 1. Overview

Build the dynamic services system: Admin configures services and their forms, customers submit requests via the public site, and admins manage requests in the Admin Panel. No developer code changes are needed to add a new service or modify a form.

## 2. Objective

All 7 Mango Electronics services are configurable from the Admin Panel with their exact form fields. The public `/services` page renders each service with its dynamic form. Submitted requests appear in the Admin Panel and can be tracked through a status lifecycle.

## 3. Scope

**Services to seed:**
1. Machinery Repair & Maintenance (فحص وإصلاح وصيانة المعدات)
2. IoT Systems Design & Installation (تركيب وتصميم أنظمة التحكم الذكية)
3. PLC Systems (تركيب وإنشاء وصيانة أنظمة PLC)
4. Fire Alarm & Fire Systems (تصميم وتركيب أنظمة الحريق والإنذار)
5. Pneumatic Systems (تصميم وتركيب وصيانة الأنظمة الهوائية)
6. Product Search Service (خدمة البحث وتوفير منتج خاص)
7. Bulk Supply for Companies (خدمة التوريدات العامة للشركات)

**Admin:**
- Service CRUD + form builder
- Service requests table
- Request detail view + status management

**Public:**
- `/services` page with all active services and dynamic forms
- `/services/success` confirmation page

**Out of scope:** File attachment storage for service requests is included. Email notifications are out of scope for this phase.

## 4. Required Frontend Work

### Admin Pages

**`/admin/services`** (tabbed view)

*Tab 1: Services*
- Table: Name (AR + EN), Active, Form Fields Count, Actions
- Actions: Edit Service, Configure Form, Activate/Deactivate, Delete (only if no requests)
- "Add Service" button → inline modal or page

*Service Create/Edit Form (modal or `/admin/services/[id]/edit`)*
- Name (AR) — required
- Name (EN) — required
- Description (AR) — textarea
- Description (EN) — textarea
- Icon/Image — optional upload
- Sort Order — number (controls display order on public page)
- Active — toggle

*Tab 2: Form Builder (`/admin/services/[id]/form`)*
- Current field list (reorderable via drag)
- Each field shows: Label (EN), Field Type, Required
- "Add Field" button → field config panel:
  - Label (AR) — required
  - Label (EN) — required
  - Field Type: `text` | `textarea` | `phone` | `select` | `file`
  - Required — toggle
  - Options (only if type=`select`) — add/remove option values (AR + EN each)
- Save field, reorder fields

*Tab 3: Service Requests*
- Table: Request #, Service Name, Customer Name, Customer Phone, Date Submitted, Status
- Filter: Service, Status, Date range
- Search: by customer name or phone
- Pagination
- Click row → Request Detail

**`/admin/services/requests/[id]`**
- Service name header
- All form field values displayed (label + submitted value)
- Attached files: clickable links to download/view
- Status: current status badge + update control
- Status options: `New` → `In Review` → `Done` | `Closed`
- Status history timeline

### Public Pages

**`/services`**
- Page intro: brief heading and description
- One section per active service (ordered by `sortOrder`):
  - Service name (current locale)
  - Service description (current locale)
  - Service icon/image (if configured)
  - Dynamic form (rendered from form field config)
- Anchor links in a quick-nav at top (so customer can jump to specific service)

**Dynamic Form Renderer (`ServiceForm.vue`)**
- Reads `formFields` array from API
- Renders appropriate input for each field type:
  - `text` → `<input type="text">`
  - `textarea` → `<textarea>`
  - `phone` → `<input type="tel">` with Egyptian phone validation
  - `select` → `<select>` with options (labels in current locale)
  - `file` → styled file input; accept: images + PDF; max 5MB
- All required fields validated before submit
- Multi-file upload for `file` type fields
- Submit → `POST /api/services/[serviceId]/requests`
- On success → redirect to `/services/success`

**`/services/success`**
- "Request Received" confirmation
- "Our team will contact you shortly"
- "Back to Home" and "View Services" links

### Components
- `ServiceForm.vue` — dynamic form renderer
- `ServiceSection.vue` — one service card + form section
- `ServiceFieldInput.vue` — renders single field by type

## 5. Required Backend / Nitro Work

### Public Service APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/services` | GET | List active services with form fields | None |
| `POST /api/services/[serviceId]/requests` | POST | Submit a service request | None |

### Admin Service APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/admin/services` | GET | List all services | `services.view` |
| `POST /api/admin/services` | POST | Create service | `services.config` |
| `PUT /api/admin/services/[id]` | PUT | Update service | `services.config` |
| `DELETE /api/admin/services/[id]` | DELETE | Delete service (no requests) | `services.config` |
| `GET /api/admin/services/[id]/form` | GET | Get form fields | `services.config` |
| `POST /api/admin/services/[id]/form/fields` | POST | Add field | `services.config` |
| `PUT /api/admin/services/[id]/form/fields/[fieldId]` | PUT | Update field | `services.config` |
| `DELETE /api/admin/services/[id]/form/fields/[fieldId]` | DELETE | Remove field | `services.config` |
| `PUT /api/admin/services/[id]/form/order` | PUT | Reorder fields | `services.config` |

### Admin Request APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/admin/services/requests` | GET | List all requests with filters | `services.view` |
| `GET /api/admin/services/requests/[id]` | GET | Request detail | `services.view` |
| `PUT /api/admin/services/requests/[id]/status` | PUT | Update request status | `services.manage` |
| `GET /api/admin/services/requests/[id]/attachments/[fileId]` | GET | Download/stream attachment file | `services.view` |

### Service Request Submission Logic
1. Validate `serviceId` exists and is active
2. Load service form fields
3. Validate required fields are present in submission
4. Validate phone fields (Egyptian format)
5. Store `ServiceRequest` + `ServiceRequestValue` entries
6. Handle file uploads: save to `/storage/service-requests/[requestId]/`
7. Store `ServiceRequestAttachment` entries
8. Return `{ requestId, message: '...' }`

### Dashboard Update
- Add "Unread Service Requests" counter (status=New) to Dashboard stat cards

## 6. Required Database Work

All models defined in Phase 2. No new models.

Seed the 7 services with their form fields based on client-provided documentation:

**Service 1 — Machinery Repair & Maintenance**
Fields:
- Customer Name (text, required)
- Phone (phone, required)
- Governorate (select, required) — 27 Egyptian governorates
- Machine/Equipment Name (text, required)
- Fault Description (textarea, optional)
- Available Date for Inspection (text, optional)
- Maintenance Reports / Fault Codes (file, optional)
- Machine Photos (file, optional)

**Service 2 — IoT Systems**
Fields:
- Customer Name (text, required)
- Phone (phone, required)
- Governorate (select, required)
- Project Type (select, required): Greenhouse | Poultry Farm | Animal Farm | Agricultural Land | Smart Home | Remote Monitoring | Graduation Project | Specialized Project
- Project Name (text, optional — shown when "Graduation/Specialized" selected — **note: this conditional field may be implemented as a text field with label explaining when to fill it, avoiding complex conditional logic in V1**)
- Required Functions / System Description (textarea, optional)
- Location & Area / Number of Sensors (text, optional)
- Site Photos or Drawings (file, optional)

**Service 3 — PLC Systems**
Fields:
- Customer Name (text, required)
- Phone (phone, required)
- Governorate (select, required)
- Machine / Line Name or PLC Design Description (text, optional)
- Fault or Modification Description (textarea, optional)
- PLC / HMI / Inverter Type (text, optional)
- Control Panel Photos / Connection Diagrams (file, optional)
- Available Programs or Drawings (file, optional)

**Service 4 — Fire Alarm & Fire Systems**
Fields:
- Customer Name (text, required)
- Phone (phone, required)
- Governorate / Project Location (select+text, required)
- Company / Facility Name (text, optional)
- Project Type: (select) residential | commercial | industrial | warehouse | other
- Space Area and Number of Floors (text, optional)
- Required Service: (select) Design | Supply | Installation | Maintenance | Testing
- Site Plans or Photos (file, optional)

**Service 5 — Pneumatic Systems**
Fields:
- Customer Name (text, required)
- Phone (phone, required)
- Governorate / Project Location (select, required)
- Machine / Equipment / Line Name (text, optional)
- Service Type: (select) Design | Installation | Maintenance | Repair | Development | PLC Integration
- Problem Description or Requirements (textarea, optional)
- Machine / Circuit / Component Photos (file, optional)
- Drawings or Datasheets (file, optional)
- Preferred Date for Inspection (text, optional)

**Service 6 — Product Search Service**
Fields:
- Customer Name (text, required)
- Phone (phone, required)
- Governorate (select, required)
- Product Name or Model Number (text, optional)
- Product Photo or Specification (file, optional)

**Service 7 — Bulk Supply for Companies**
Fields:
- Company Name (text, required)
- Contact Person Name (text, required)
- Phone (phone, required)
- Delivery Location (text, required)
- Required Date (text, optional)
- Supply Type: (select) One-time | Recurring
- Products List (file, optional — Excel or PDF)
- Product Details / Notes (textarea, optional)

## 7. API Requirements

Documented in Section 5.

**POST /api/services/[serviceId]/requests** — `multipart/form-data`:
- Form field values as named fields matching `fieldId`
- File uploads as file inputs

**GET /api/services** response per service:
```json
{
  "id": "...",
  "nameAr": "...",
  "nameEn": "...",
  "descriptionAr": "...",
  "descriptionEn": "...",
  "iconPath": "...",
  "sortOrder": 1,
  "formFields": [
    {
      "id": "...",
      "labelAr": "...",
      "labelEn": "...",
      "fieldType": "text|textarea|phone|select|file",
      "isRequired": true,
      "sortOrder": 1,
      "options": null | [{ "valueAr": "...", "valueEn": "..." }]
    }
  ]
}
```

## 8. UI Requirements

- Services page: each service is a visually separated section with anchor ID
- Quick-nav at top: links with service names that smooth-scroll
- Dynamic form: fields render in `sortOrder` order
- Required fields: asterisk marker on label
- File upload: accept `image/*,.pdf`, max 5MB per file, show filename after selection
- Service success page: simple, reassuring, no distractions
- Admin form builder: drag-to-reorder fields with handle icon

## 9. Business Rules

1. A service can only be deleted if it has no submitted requests
2. Deactivating a service hides it from public `/services` page but preserves existing requests
3. File attachments for service requests stored at `/storage/service-requests/[requestId]/`
4. File size limit: 5MB per file, client and server validated
5. Accepted file types: images (jpg, png, webp) and PDF only
6. Phone validation: Egyptian mobile format
7. New service requests arrive with status `New` — increments the admin dashboard counter
8. Request status lifecycle: `New → In Review → Done | Closed`
9. "Governorate" field in service forms reuses the same Egyptian governorates constant from Phase 4

## 10. Implementation Guidelines

### Dynamic Form Rendering
`ServiceForm.vue` receives `formFields: FormField[]` and renders the correct input component per `fieldType`. This is a straightforward v-for loop with a component switch.

### File Upload on Service Forms
Use `FormData` for the submission request. Nitro handles `multipart/form-data` via `readMultipartFormData(event)`.

### Seed Script
The 7 services and their fields should be in a dedicated seed function `seedServices()` called from `prisma/seed.ts`. Each field's `sortOrder` matches the order listed above.

### Admin Dashboard Counter
Add `GET /api/admin/dashboard/stats` (or update existing) to return:
```json
{
  "totalOrders": 0,
  "pendingOrders": 0,
  "newServiceRequests": 0,
  "totalProducts": 0
}
```

## 11. Required Skills

- `frontend-design` — services page layout, dynamic form UX
- `security-best-practices` — file upload validation (type, size)

## 12. Testing Requirements

### Basic Verification
- Seed script populates 7 services with correct fields
- `/services` page renders all active services
- Dynamic form renders correct field types for each service
- Required field validation fires on empty submission
- File upload accepts allowed types, rejects others
- Service request submitted → appears in Admin Panel with status "New"
- Admin can view all submitted values including file links
- Admin updates request status → status history updated
- Dashboard counter shows correct "New Service Requests" count
- Deactivating a service hides it from public page

### Heavy Testing
*Requires Human Approval before running.*

## 13. Acceptance Criteria

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

## 14. Phase Completion Criteria

- Implementation complete
- Seed complete (7 services + form fields)
- Basic verification complete
- No known blocking errors
- Acceptance criteria satisfied
- Heavy testing pending human approval
