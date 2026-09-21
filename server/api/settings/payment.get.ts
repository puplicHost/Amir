export default defineEventHandler(async () => {
  const settings = await prisma.siteSettings.findFirst()
  return {
    methods: {
      cod: settings?.paymentCodEnabled ?? true,
      online: settings?.paymentOnlineEnabled ?? false,
    },
  }
})
