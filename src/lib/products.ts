import { supabase } from './supabase'

export type Product = {
  id: string
  name: string
  photo_url: string | null
  expiry_date: string
  reminder_date: string
  quantity: number
  category: string | null
  status: string
  added_by: string
  created_at: string
}

export function getProductStatus(expiryDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 90) return 'expiring_soon'
  return 'safe'
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('expiry_date', { ascending: true })
  
  if (error) throw error
  
  return (data || []) as Product[]
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
  
  if (error) throw error
}

export async function addProduct(product: {
  name: string
  expiry_date: string
  photo_url?: string | null
  quantity?: number
  category?: string | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // Simple reminder logic: 7 days before
  const expiry = new Date(product.expiry_date)
  const reminderDate = new Date(expiry)
  reminderDate.setDate(reminderDate.getDate() - 7)
  
  const status = getProductStatus(product.expiry_date)
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...product,
      reminder_date: reminderDate.toISOString().split('T')[0],
      status,
      added_by: user.id,
    })
    .select()
    .single()
  
  if (error) throw error
  
  return data as Product
}