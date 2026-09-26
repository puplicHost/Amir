// Homepage banner placements + link targets — single source of truth.
// Placements mirror the real section anchors in app/pages/index.vue
// (each value maps to an <AppHomeBanners placement="..."> slot there).
// Both the admin banner form and the homepage consume this file so the
// dropdowns can never go stale.

export const BANNER_PLACEMENTS = [
  { value: 'below_hero', labelEn: 'Below Hero', labelAr: 'أسفل الواجهة الرئيسية' },
  { value: 'below_services', labelEn: 'Below Services', labelAr: 'أسفل الخدمات' },
  { value: 'below_categories', labelEn: 'Below Featured Categories', labelAr: 'أسفل الفئات المميزة' },
  { value: 'above_footer', labelEn: 'Above Footer', labelAr: 'أعلى الفوتر' },
] as const

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]['value']

export const BANNER_WIDTHS = [50, 60, 75, 100] as const

// Static public routes a banner button may target. Dynamic entries
// (categories, services) are appended live in the admin form from API data.
export const BANNER_STATIC_LINKS = [
  { type: 'page', value: '/', labelEn: 'Homepage', labelAr: 'الصفحة الرئيسية' },
  { type: 'page', value: '/products', labelEn: 'All Products', labelAr: 'كل المنتجات' },
  { type: 'page', value: '/services', labelEn: 'Services', labelAr: 'الخدمات' },
  { type: 'page', value: '/contact', labelEn: 'Contact', labelAr: 'تواصل معنا' },
  { type: 'page', value: '/quote', labelEn: 'Price Quotation', labelAr: 'طلب عرض سعر' },
] as const
