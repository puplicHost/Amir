# Mango Electronics — Master Implementation Plan

## 1. Executive Summary

**Project:** Mango Electronics (Bilingual AR/EN B2C + B2B E-commerce & Engineering Services Platform)
**Tagline:** Do It Right, Do It Smart
**Stack:** Nuxt 3, Nitro, Prisma, PostgreSQL, shadcn-vue, Tailwind CSS, Docker.
**Design Source of Truth:** Google Stitch (must be completed and provided before Phase 3 frontend implementation).

This document serves as the implementation-ready master plan for the Coding Agent, reconciling all requirements, user journeys, sitemaps, and phase specifications.

## 2. Reconciled Decisions & Assumptions

To ensure seamless implementation by the Coding Agent, the following decisions are locked in:

*   **Design & UI (Google Stitch):** The Coding Agent will NOT invent visual designs. The Google Stitch output is the absolute source of truth for the frontend UI. Phase 3-6 frontend work is blocked until Stitch designs are approved and provided.
*   **Database Schema:** Phase 2 will implement the *complete* database schema (Users, Sessions, Products, Categories, Orders, Services, SiteSettings, etc.). Phases 3-6 will utilize this schema without introducing new models unless explicitly required.
*   **Authentication & Users:** The platform features **Guest Checkout only**. There are no customer accounts. User management and authentication are strictly for the Admin Panel.
*   **Payments:** Cash on Delivery (COD) is the default and only active payment method for V1. The database architecture will support future online payment gateways (storing encrypted credentials), but actual integration is OUT OF SCOPE.
*   **Storage Architecture:** File uploads (product images, service PDFs) will be stored in a local `/storage` directory (outside the Nuxt `public` directory) and served via authenticated/static Nitro streaming endpoints.
*   **Localization (i18n):** The system is fully bilingual (Arabic/English) supporting RTL/LTR. Database content uses explicit dual columns (e.g., `nameAr`, `nameEn`).

## 3. Implementation Roadmap (6 Phases)

The project is strictly divided into 6 self-contained phases. The Coding Agent must complete one phase fully, verify it, and await human approval before proceeding to the next.

### Phase 1: Foundation
*   **Scope:** Initialize Nuxt 3, Nitro, Prisma, and PostgreSQL via Docker. Setup i18n (AR/EN), Tailwind, and shadcn-vue. Establish design tokens (Brand Colors: `#285E8E`, `#2B71AE`, `#F5CC07`).
*   **Required Skills:** `postgres`, `prisma-database-setup`, `ui-styling`
*   **Completion Criteria:** Docker environment runs successfully, Nuxt renders a bilingual "Hello World" page with Tailwind configured, Prisma connects to PostgreSQL.

### Phase 2: Auth & Admin Shell
*   **Scope:** Define the full Prisma schema. Implement Admin authentication (bcrypt, HTTP-only cookie sessions) and granular RBAC permissions. Build the Admin Panel shell (layout, sidebar). Implement Admin user management CRUD.
*   **Required Skills:** `auth-implementation-patterns`, `prisma-client-api`, `api-security-review`, `ui-ux-pro-max`
*   **Completion Criteria:** Full schema mapped. Admins can log in, view the dashboard shell, and manage other admin users based on permissions.

### Phase 3: Products & Categories
*   **Scope:** Build Admin CRUD for Categories and Products (including multi-step forms and image uploads to local `/storage`). Build public catalog (`/products`), category pages, and product landing pages (`/p/[slug]`).
*   **Required Skills:** `frontend-design` (following Stitch), `codebase-design`
*   **Completion Criteria:** Admin can fully manage products/categories. Public users can view the catalog, filter, and view SSR-rendered product landing pages. Image uploads process properly.

### Phase 4: Cart, Checkout & Orders
*   **Scope:** Implement Pinia-based client-side Cart (persisted to localStorage). Build guest checkout flow (collecting customer info and COD payment). Implement Order placement APIs and Admin order management.
*   **Required Skills:** `security-best-practices` (price validation), `api-security-review`
*   **Completion Criteria:** User can add items to cart, checkout as guest, and place an order. Admin can view the order, update its status, and see revenue stats on the dashboard. Server validates prices.

### Phase 5: Services
*   **Scope:** Implement dynamic form builder for 7 specific engineering services. Build public `/services` page dynamically rendering forms. Implement request submission (including file uploads) and Admin request tracking.
*   **Required Skills:** `frontend-design` (following Stitch), `security-best-practices` (file upload security).
*   **Completion Criteria:** All 7 services are seeded. Public users can submit complex service requests (with files). Admins can track and update the status of these requests.

### Phase 6: Public Pages & Settings
*   **Scope:** Build the final Homepage (with real data: featured categories, services, dynamic banners). Build the Contact page, global Navbar, Footer, and Error pages. Implement Admin Settings (General, Contact, SEO/GEO, Store Config).
*   **Required Skills:** `frontend-design` (following Stitch), `ui-ux-pro-max`, `copywriting` (if needed for fallback).
*   **Completion Criteria:** Public site is fully functional, styled according to Stitch, and populated with dynamic settings. SEO metadata and JSON-LD are implemented.

## 4. Testing & Verification Requirements
*   **Basic Verification:** Must be run by the Coding Agent at the end of every task/phase (unit tests, component rendering, API response validation, Lint/Typecheck).
*   **Heavy Testing:** (Playwright E2E, full user journey tests) will **only** be executed if explicitly requested and approved by the human after a phase is completed.

## 5. Blocking Decisions for Human Approval
*See conversational output for the list of items requiring immediate human input.*