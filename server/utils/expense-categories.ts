// Default expense categories (Roadmap Phase 10), seeded lazily on first use.

const DEFAULTS: { nameDe: string, nameEn: string, sortOrder: number }[] = [
  { nameDe: 'Miete', nameEn: 'Rent', sortOrder: 0 },
  { nameDe: 'Gehälter', nameEn: 'Salaries', sortOrder: 1 },
  { nameDe: 'Material', nameEn: 'Supplies', sortOrder: 2 },
  { nameDe: 'Strom & Wasser', nameEn: 'Utilities', sortOrder: 3 },
  { nameDe: 'Marketing', nameEn: 'Marketing', sortOrder: 4 },
  { nameDe: 'Ausstattung', nameEn: 'Equipment', sortOrder: 5 },
  { nameDe: 'Steuern & Gebühren', nameEn: 'Taxes & fees', sortOrder: 6 },
  { nameDe: 'Sonstiges', nameEn: 'Other', sortOrder: 7 },
]

/** Ensure default categories exist (idempotent, runs when empty). */
export async function ensureDefaultCategories(): Promise<void> {
  const count = await prisma.expenseCategory.count()
  if (count > 0) return
  await prisma.expenseCategory.createMany({ data: DEFAULTS })
}
