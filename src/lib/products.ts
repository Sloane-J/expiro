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
  try {
    // Check if user is actually logged in
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      console.warn("Fetch blocked: No authenticated session found.")
      throw new Error('JWT_EXPIRED: Please log in to view products')
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('expiry_date', { ascending: true })
    
    if (error) {
      console.error("Supabase Database Error:", error.message)
      throw error
    }

    return (data || []) as Product[]
  } catch (err: any) {
    // Catch the "Failed to fetch" network error specifically
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Network Error: Check your internet or Supabase project status.')
    }
    throw err
  }
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
  
  if (error) {
    if (error.message.includes('JWT')) {
      throw new Error('JWT_EXPIRED: Session expired.')
    }
    throw error
  }
}

export async function addProduct(product: {
  name: string
  expiry_date: string
  photo_url?: string | null
  quantity?: number
  category?: string | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('JWT_EXPIRED: Not authenticated')
  
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
  
  if (error) {
    if (error.message.includes('JWT')) {
      throw new Error('JWT_EXPIRED: Session expired.')
    }
    throw error
  }
  return data as Product
}