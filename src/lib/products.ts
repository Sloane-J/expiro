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

// ===== Helper: Calculate Days Until Expiry (DRY) =====
function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
}

// ===== Calculate Reminder Date =====
export function calculateReminderDate(expiryDate: string): string {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate)
  const expiry = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Already expired or expires within 90 days → remind TODAY
  if (daysUntilExpiry <= 90) {
    return today.toISOString().split('T')[0]
  }
  
  // Expires in 90+ days → remind 90 days before expiry
  const reminderDate = new Date(expiry)
  reminderDate.setDate(reminderDate.getDate() - 90)
  return reminderDate.toISOString().split('T')[0]
}

// ===== Get Product Status =====
export function getProductStatus(expiryDate: string): string {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate)
  
  if (daysUntilExpiry < 0) return 'expired'        // Past expiry - remove from shelf
  if (daysUntilExpiry <= 90) return 'expiring_soon' // 0-90 days - discount/promote/plan
  return 'safe'                                     // 90+ days - no action needed
}

// ===== Get All Products =====
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

// ===== Check for Duplicate Product =====
async function checkDuplicateProduct(
  name: string, 
  expiryDate: string, 
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('name', name.trim())
    .eq('expiry_date', expiryDate)
    .eq('added_by', userId)
    .maybeSingle()
  
  if (error) throw error
  return !!data // true if duplicate found
}

// ===== Add Product =====
export async function addProduct(product: {
  name: string
  expiry_date: string
  photo_url?: string | null
  quantity?: number
  category?: string | null
}) {
  // === VALIDATION ===
  
  // 1. Name validation
  if (!product.name || !product.name.trim()) {
    throw new Error('Product name is required')
  }
  
  // 2. Date validation
  const expiryDate = new Date(product.expiry_date)
  if (isNaN(expiryDate.getTime())) {
    throw new Error('Invalid expiry date')
  }
  
  // 3. Check if already expired (allow but warn)
  const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date)
  let warningMessage: string | null = null
  
  if (daysUntilExpiry < 0) {
    warningMessage = `⚠️ Warning: This product already expired ${Math.abs(daysUntilExpiry)} day(s) ago. An immediate alert will be sent.`
  }
  
  // 4. Warn if expiry is very far in future (possible typo)
  // if (daysUntilExpiry > 730) { // 2 years
  //   warningMessage = `⚠️ Warning: Product expires more than 2 years from now. Please verify the expiry date.`
  // }
  
  // 5. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  // 6. Check for duplicate product
  const isDuplicate = await checkDuplicateProduct(
    product.name, 
    product.expiry_date, 
    user.id
  )
  
  if (isDuplicate) {
    throw new Error(
      `Duplicate product: "${product.name}" expiring on ${product.expiry_date} already exists. ` +
      `Please update the quantity instead of adding a new entry.`
    )
  }
  
  // === CALCULATE REMINDER & STATUS ===
  const reminderDate = calculateReminderDate(product.expiry_date)
  const status = getProductStatus(product.expiry_date)
  
  // === INSERT PRODUCT ===
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name.trim(),
      expiry_date: product.expiry_date,
      photo_url: product.photo_url || null,
      quantity: product.quantity || 1,
      category: product.category?.trim() || null,
      reminder_date: reminderDate,
      status,
      added_by: user.id,
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Return product with optional warning
  return {
    product: data as Product,
    warning: warningMessage
  }
}