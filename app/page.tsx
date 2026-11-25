import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '../lib/auth'
import StorefrontClient from '../components/StorefrontClient'

export const instant = false

const prisma = new PrismaClient()

export default async function HomePage() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'desc' },
  })

  const currentUser = await getCurrentUser()

  const rawCartItems = currentUser
    ? await prisma.cartItem.findMany({
        where: { userId: currentUser.id },
        include: { product: true },
        orderBy: { id: 'asc' },
      })
    : []

  const initialCart = rawCartItems.map((item) => ({
    productId: item.product.id,
    name: item.product.name,
    price: item.product.price,
    color: item.product.color,
    size: item.product.size,
    imageUrl: item.product.imageUrl,
    quantity: item.quantity,
    maxStock: item.product.stock,
  }))

  return (
    <StorefrontClient
      products={products}
      user={currentUser}
      initialCart={initialCart}
    />
  )
}