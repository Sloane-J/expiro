import 'https://deno.land/x/dotenv/load.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Load backend env variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Validate env variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  throw new Error('Missing required environment variables')
}

// Initialize Supabase client (backend, bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async () => {
  try {
    // Today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    console.log('Debug info:', {
      today,
      timezone: Deno.env.get('TZ'),
      timestamp: new Date().toISOString()
    })

    // Fetch products with reminder_date = today
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('reminder_date', today)

    if (productsError) throw productsError

    console.log('Products found:', products?.length || 0)
    console.log('Product reminder dates:', products?.map(p => p.reminder_date))

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send today' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get unique user IDs
    const userIds = [...new Set(products.map(p => p.added_by).filter(Boolean))]

    console.log('User IDs to fetch:', userIds)

    // Fetch user emails from auth.users (not user_profiles)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.log('Error fetching auth users:', authError)
    }

    // Filter to only users we need
    const relevantUsers = authUsers?.users.filter(u => userIds.includes(u.id)) || []

    // Fetch names from user_profiles
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, name')
      .in('id', userIds)

    const profileMap = new Map(userProfiles?.map(u => [u.id, u.name]) || [])

    // Create user map with email from auth and name from profiles
    const userMap = new Map(
      relevantUsers.map(u => [
        u.id,
        { email: u.email, name: profileMap.get(u.id) || 'User' }
      ])
    )

    console.log('Auth users found:', relevantUsers.length)
    console.log('User map:', Array.from(userMap.entries()))

    // Send emails for each product
    const emailPromises = products.map(async (product) => {
      const user = userMap.get(product.added_by)
      console.log('Product:', product.name, 'User:', user, 'Added by:', product.added_by)

      if (!user?.email) {
        console.log('Skipping - no email for user')
        return null // skip if no email
      }

      const emailHtml = `
        <h2>Product Expiry Reminder</h2>
        <p><strong>${product.name}</strong> is expiring soon!</p>
        <p>Expiry Date: ${product.expiry_date}</p>
        ${product.category ? `<p>Category: ${product.category}</p>` : ''}
        ${product.quantity > 1 ? `<p>Quantity: ${product.quantity}</p>` : ''}
        <p>Please take action: discount, promote, or remove this product.</p>
      `

      console.log('Sending email to:', user.email)

      // Send email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Expiro <onboarding@resend.dev>',
          to: user.email,
          subject: `⚠️ ${product.name} expiring soon`,
          html: emailHtml,
        }),
      })

      const emailResult = await emailResponse.json()
      console.log('Email result:', emailResult)

      // Log notification
      await supabase.from('notifications').insert({
        product_id: product.id,
        type: 'email',
        status: emailResponse.ok ? 'sent' : 'failed',
        error_message: emailResponse.ok ? null : JSON.stringify(emailResult),
      })

      return emailResult
    })

    const results = (await Promise.all(emailPromises)).filter(Boolean)

    return new Response(
      JSON.stringify({
        message: `Sent ${results.length} reminder emails`,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.log('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
