export interface CartItem {
  productId: string
  slug: string
  nameAr: string
  nameEn: string
  price: number
  coverImage: string | null
  quantity: number
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
  }),
  getters: {
    itemCount: state => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: state => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  },
  actions: {
    addItem(product: Omit<CartItem, 'quantity'> & { quantity?: number }) {
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
    clearCart() {
      this.items = []
    },
  },
  persist: true,
})
