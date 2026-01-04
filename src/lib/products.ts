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

export function calculateReminderDate(expiryDate: string): string {
  const expiry = new Date(expiryDate)
  const today = new Date()
  
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Default: 90 days before expiry
  let reminderDate = new Date(expiry)
  reminderDate.setDate(reminderDate.getDate() - 90)
  
  // If expiry < 90 days away, remind 7 days before
  if (daysUntilExpiry < 90) {
    reminderDate = new Date(expiry)
    reminderDate.setDate(reminderDate.getDate() - 7)
  }
  
  // If reminder already passed, set to today
  if (reminderDate < today) {
    return today.toISOString().split('T')[0]
  }
  
  return reminderDate.toISOString().split('T')[0]
}

export function getProductStatus(expiryDate: string): string {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring_soon'
  return 'safe'
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('expiry_date', { ascending: true })
  
  if (error) throw error
  return data as Product[]
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
  
  const reminderDate = calculateReminderDate(product.expiry_date)
  const status = getProductStatus(product.expiry_date)
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...product,
      reminder_date: reminderDate,
      status,
      added_by: user.id,
    })
    .select()
    .single()
  
  if (error) throw error
  return data as Product
}