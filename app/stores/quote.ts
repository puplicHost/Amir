export interface QuoteItem {
  productId: string
  slug: string
  nameAr: string
  nameEn: string
  price: number
  coverImage: string | null
  quantity: number
}

export const useQuoteStore = defineStore('quote', {
  state: () => ({
    items: [] as QuoteItem[],
  }),
  getters: {
    itemCount: state => state.items.length,
    totalQuantity: state => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: state => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    selectedIds: state => new Set(state.items.map(i => i.productId)),
  },
  actions: {
    isSelected(productId: string): boolean {
      return this.items.some(i => i.productId === productId)
    },
    toggleItem(product: Omit<QuoteItem, 'quantity'>) {
      const idx = this.items.findIndex(i => i.productId === product.productId)
      if (idx >= 0) {
        this.items.splice(idx, 1)
      }
      else {
        this.items.push({ ...product, quantity: 1 })
      }
    },
    addItem(product: Omit<QuoteItem, 'quantity'> & { quantity?: number }) {
      const existing = this.items.find(i => i.productId === product.productId)
      if (existing) {
        existing.quantity += product.quantity || 1
      }
      else {
        this.items.push({ ...product, quantity: product.quantity || 1 })
      }
    },
    removeItem(productId: string) {
      this.items = this.items.filter(i => i.productId !== productId)
    },
    updateQuantity(productId: string, quantity: number) {
      const existing = this.items.find(i => i.productId === productId)
      if (existing) {
        if (quantity <= 0) this.removeItem(productId)
        else existing.quantity = quantity
      }
    },
    clearQuote() {
      this.items = []
    },
  },
  persist: true,
})
