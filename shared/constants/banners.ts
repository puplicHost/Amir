// Homepage banner placements + link targets — single source of truth.
// Placements mirror the real section anchors in app/pages/index.vue
// (each value maps to an <AppHomeBanners placement="..."> slot there).
// Both the admin banner form and the homepage consume this file so the
// dropdowns can never go stale.

export const BANNER_PLACEMENTS = [
  { value: 'below_hero', labelEn: 'Below Hero', labelDe: 'Unter dem Hero-Bereich' },
  { value: 'below_services', labelEn: 'Below Services', labelDe: 'Unter den Leistungen' },
  { value: 'below_categories', labelEn: 'Below Featured Categories', labelDe: 'Unter den Kategorien' },
  { value: 'above_footer', labelEn: 'Above Footer', labelDe: 'Über dem Footer' },
] as const

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]['value']

export const BANNER_WIDTHS = [50, 60, 75, 100] as const

// Static public routes a banner button may target. Dynamic entries
// (categories, services) are appended live in the admin form from API data.
export const BANNER_STATIC_LINKS = [
  { type: 'page', value: '/', labelEn: 'Homepage', labelDe: 'Startseite' },
  { type: 'page', value: '/products', labelEn: 'All Products', labelDe: 'Alle Produkte' },
  { type: 'page', value: '/services', labelEn: 'Services', labelDe: 'Leistungen' },
  { type: 'page', value: '/contact', labelEn: 'Contact', labelDe: 'Kontakt' },
] as const
