# Planning Notes
## Amir

---

## Project Summary

**Client:** Amir
**Tagline:** Do It Right, Do It Smart
**Type:** Bilingual (AR/EN) B2C + B2B e-commerce and engineering services platform
**Stack:** Nuxt 3 / Nitro / Prisma / PostgreSQL / shadcn-vue / Tailwind / Docker
**Design Tool:** Google Stitch (must be completed before Phase 3 frontend implementation)

---

## What Was Analyzed

1. `agent.md` — Coding Agent Operating System (behavior rules for the AI dev agent)
2. `for-Claude.md` — Planning Agent Operating System (this planning run follows it)
3. `agent.md` (Master Project Brief) — Complete feature and tech requirements
4. `COLOR_PALETTE_AND_FONT.pdf` — Brand colors (#285E8E, #2B71AE, #F5CC07) + Font: Archive
5. `mango_electroincs_.docx` — Client's original service and product notes (Arabic)
6. `Mango_Electronics_Expanded_Business_Services_RTL__2_.docx` — Expanded service descriptions with exact form fields per service

---

## Phase Summary

| Phase | Name | Deliverable |
|-------|------|-------------|
| 1 | Foundation | Nuxt + Nitro + DB + i18n + Design Tokens + Docker |
| 2 | Auth & Admin Shell | Schema, auth, permissions, admin layout, user management |
| 3 | Products & Categories | Full product/category CRUD + public catalog + landing pages |
| 4 | Cart, Checkout & Orders | Shopping flow, order placement, admin order management |
| 5 | Services | 7 dynamic services with form builder + public forms + admin request management |
| 6 | Public Pages & Settings | Complete homepage, contact, footer, navbar, admin settings |

Total: **6 phases** (within the 10-phase maximum)

---

## Confirmed Requirements

From brief + client materials:

- Bilingual AR/EN, RTL/LTR
- Light/Dark mode
- No customer account required (guest checkout)
- Cash on Delivery as initial payment method; architecture supports online payment
- 7 engineering services with specific form fields per service (documented in Phase 5)
- Product categories with cover image/video, homepage featuring
- Multi-step product add form with image upload + compression
- Product deletion must clean up server-stored images
- Product landing page for sharing (`/p/[slug]`)
- Admin permission system (per-section granular, not just admin/non-admin)
- Dynamic service form builder (no code change needed per new service)
- SEO + GEO content fields on products and site settings
- Payment credentials stored encrypted
- Docker deployment

---

## Open Questions (TBD)

These do not block planning but should be confirmed before or during relevant phases:

1. **Stock management:** Does Amir need stock quantity tracking per product? (Phase 3 assumption: no stock tracking in V1 — all products assumed available)

2. **Product landing page for inactive products:** Do inactive products return 404 on `/p/[slug]`? Assumed: YES.

3. **Homepage banner:** Is there one banner or multiple rotating banners? Assumed: one configurable banner.

4. **Social media links:** Which specific social platforms does the client use? (Facebook, Instagram confirmed; TikTok, YouTube TBD)

5. **Google Maps:** Does the Contact page need an embedded map? Assumed: optional, based on settings configuration.

6. **Online payment gateway:** Which gateway is planned for future integration? (Fawry, Paymob, PayTabs — Egyptian market common options). Not needed for implementation but good to know for future phase.

7. **Notification system:** Should admin receive email/WhatsApp notification on new order or service request? Assumed: OUT OF SCOPE for V1. Admin monitors dashboard.

8. **Product reviews/ratings:** Not in brief. Assumed: NOT included in V1.

9. **Discount codes / promotions:** Not in brief. Assumed: NOT included in V1.

10. **Multi-image on category card:** Can categories have multiple images (carousel)? Assumed: single cover image + optional video URL.

---

## Assumptions Made

All assumptions are labeled here for easy review:

- A1: No stock quantity tracking in V1
- A2: Guest checkout only (no customer accounts)
- A3: COD as sole initial payment method; online payment wired architecturally but not integrated
- A4: Inactive products return 404 on public pages
- A5: Single SiteSettings singleton row (upsert pattern)
- A6: File uploads stored on server filesystem (not cloud storage like S3) — can be migrated later
- A7: No email notifications in V1
- A8: No product reviews or ratings
- A9: No discount/coupon system
- A10: Logo URL served from same Nitro server via static file route
- A11: Google Maps embed is optional — configured via Settings, shown only if URL provided
- A12: Egyptian Pound (EGP) as currency, displayed as text "EGP" or "ج.م"

---

## Design System Source

Brand palette extracted from `COLOR_PALETTE_AND_FONT.pdf`:
- Primary Dark: `#285E8E`
- Primary: `#2B71AE`
- Accent/Yellow: `#F5CC07`
- Font: **Archive** (headings), **Inter** (body EN), **Cairo** (body AR)

---

## Important Notes for Stitch Design Phase

Before Phase 3 frontend implementation begins, Stitch designs must cover:

1. Homepage (all sections)
2. Products page + filters
3. Category page with hero
4. Product Landing Page
5. Cart page
6. Checkout page
7. Services page with dynamic form
8. Contact page
9. Admin: Dashboard, Products table, Add Product (multi-step), Categories, Orders, Service Requests, Settings
10. AR / RTL versions of all public pages
11. Dark mode versions

The Coding Agent must NOT invent frontend design when Stitch references exist.

---

## Security Considerations Identified

- Admin passwords: bcrypt
- Sessions: HTTP-only cookie, server-side session store
- Payment credentials: AES-256-GCM encryption
- File uploads: type + size validation on server (not just client)
- Admin API endpoints: all require valid session + permission check
- Public order API: server-side price re-validation (prevent price tampering)
- No sensitive data returned in API responses (credentials, password hashes)

---

## Storage Architecture

```
/storage/
├── products/
│   └── [productId]/
│       └── image-files
├── service-requests/
│   └── [requestId]/
│       └── uploaded-files
└── settings/
    ├── logo.[ext]
    ├── favicon.[ext]
    └── hero.[ext]
```

All storage is outside the Nuxt `.output` / `public` directory. Served via Nitro streaming endpoints.
