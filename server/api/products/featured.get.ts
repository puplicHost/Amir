// Featured products for the homepage.
// Returns active products flagged in Admin → Products, ordered by createdAt desc.
export default defineEventHandler(async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true, featuredOnHomepage: true },
    orderBy: [{ createdAt: 'desc' }],
    take: 6,
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      price: true,
      images: { where: { isCover: true }, take: 1, select: { path: true } },
    },
  })

  return {
    products: products.map(p => ({
      ...p,
      coverImage: p.images[0]?.path || null,
      images: undefined,
    })),
  }
})
