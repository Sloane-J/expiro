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

// Constants
const BATCH_SIZE = 30
const RATE_LIMIT = 95
const BATCH_DELAY_MS = 3600000

serve(async () => {
  console.log("🚀 Cron run started")
    console.log("RESEND_API_KEY present?", !!RESEND_API_KEY)
    console.log("SUPABASE_URL present?", !!SUPABASE_URL)
    console.log("SUPABASE_SERVICE_ROLE_KEY present?", !!SUPABASE_SERVICE_ROLE_KEY)

  
  try {
    console.log('🚀 Starting daily reminder check...')

    // ===== STEP 1: Rate Limit Check =====
    const today = new Date().toISOString().split('T')[0]

    const { count: emailsSentToday, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'email')
      .eq('status', 'sent')
      .gte('sent_at', `${today}T00:00:00`)

    if (countError) throw countError

    console.log(`📊 Emails sent today: ${emailsSentToday || 0}/${RATE_LIMIT}`)

    if ((emailsSentToday || 0) >= RATE_LIMIT) {
      console.log('⚠️ Daily email limit reached')
      return new Response(
        JSON.stringify({
          error: 'Daily email limit reached',
          sent_today: emailsSentToday,
          limit: RATE_LIMIT
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ===== STEP 2: Fetch Products Expiring Today =====
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, expiry_date, category, quantity, status, photo_url')
      .eq('reminder_date', today)
      .order('expiry_date', { ascending: true })

    if (productsError) throw productsError

    console.log(`📦 Products expiring today: ${products?.length || 0}`)

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send today' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ===== STEP 3: Get All Users =====
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError

    // Fetch user profiles with names
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, name')

    // Create a map for quick lookup
    const profileMap = new Map(userProfiles?.map(p => [p.id, p.name]) || [])

    const allUsers = authData.users.filter(u => u.email).map(u => ({
      ...u,
      displayName: profileMap.get(u.id) || 'there'
    }))
    console.log(`👥 Active users: ${allUsers.length}`)

    if (allUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ===== STEP 4: Batch Products (30 per email) =====
    const batches: any[][] = []
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE))
    }

    console.log(`📨 Email batches: ${batches.length} (max ${BATCH_SIZE} products each)`)

    // ===== STEP 5: Send Emails in Batches =====
    const results = []

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const isFirstBatch = batchIndex === 0

      if (!isFirstBatch) {
        console.log(`⏳ Waiting 1 hour before sending batch ${batchIndex + 1}...`)
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }

      console.log(`📧 Sending batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`)

      for (const user of allUsers) {
        try {
          console.log(`📧 Attempting to send to: ${user.email}`)
          console.log(`📧 User ID: ${user.id}`)

          const emailHtml = generateEmailHtml(
            batch,
            batchIndex + 1,
            batches.length,
            products.length,
            user.displayName
          )

          const subject = batches.length > 1
            ? `⚠️ Expiry Alert (Part ${batchIndex + 1}/${batches.length}): ${batch.length} products`
            : `⚠️ ${batch.length} product${batch.length > 1 ? 's' : ''} expiring soon`

          console.log(`📧 Subject: ${subject}`)
          console.log(`📧 Resend API Key exists: ${!!RESEND_API_KEY}`)
          console.log(`📧 Resend API Key length: ${RESEND_API_KEY?.length || 0}`)

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Expiro <onboarding@resend.dev>',
              to: user.email,
              subject,
              html: emailHtml,
            }),
          })

          const emailResult = await emailResponse.json()

          console.log(`📧 Response status: ${emailResponse.status}`)
          console.log(`📧 Response body:`, JSON.stringify(emailResult, null, 2))

          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'email',
            status: emailResponse.ok ? 'sent' : 'failed',
            products_count: batch.length,
            error_message: emailResponse.ok ? null : JSON.stringify(emailResult),
          })

          if (emailResponse.ok) {
            console.log(`✅ Email sent to ${user.email} (${batch.length} products)`)
            results.push({ user: user.email, products: batch.length, batch: batchIndex + 1 })
          } else {
            console.log(`❌ Failed to send to ${user.email}:`, emailResult)
          }

        } catch (error) {
          console.log(`❌ Error sending to ${user.email}:`, error)

          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'email',
            status: 'failed',
            products_count: batch.length,
            error_message: error.message,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${results.length} reminder emails across ${batches.length} batch(es)`,
        batches: batches.length,
        total_products: products.length,
        total_users: allUsers.length,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// ===== Helper: Generate Email HTML =====
function generateEmailHtml(
  products: any[],
  batchNum: number,
  totalBatches: number,
  totalProducts: number,
  name: string
): string {
  // Group products by status
  const expired = products.filter(p => p.status === 'expired')
  const urgent = products.filter(p => p.status === 'urgent')
  const expiringSoon = products.filter(p => p.status === 'expiring_soon')

  // Batch info banner
  const batchInfo = totalBatches > 1 ? `
    <tr>
      <td style="padding:20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#E3F2FD;border-left:4px solid #2196F3;padding:15px;border-radius:8px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:600;color:#1565C0;">
                📬 Part ${batchNum} of ${totalBatches}
              </p>
              <p style="margin:8px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#1976D2;">
                You'll receive ${totalBatches} emails today covering ${totalProducts} total products. This is part ${batchNum}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting" />
  <title>Product Expiry Reminder</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .product-card { padding: 15px !important; }
      .product-image { width: 50px !important; height: 50px !important; }
      .hide-mobile { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#2C2C2C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#2C2C2C;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#F8F8F8;border-radius:0;">
          <tr>
            <td style="padding:40px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:600;color:#333333;">
                      Product Expiry reminder
                    </p>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#666666;">
                      Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </td>
                  <td align="right" style="vertical-align:top;width:100px;">
                    <div style="width:100px;height:100px;display:flex;align-items:center;justify-content:center;">
                      <img src="https://expiro.pages.dev/icon-512.png" alt="Expiro" width="60" height="60" style="display:block;width:60px;height:60px;" />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px 0 40px;">
              <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:700;color:#333333;">
                Hello ${name},
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:15px 40px 0 40px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:24px;color:#4A4A4A;">
                Hello! Your daily inventory report is ready for review. We've identified <strong>${products.length} items</strong> that need your attention to minimize waste and ensure product safety.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#000000;border-radius:50px;padding:14px 60px;">
                    <a href="https://expiro.pages.dev/" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">
                      OPEN THE APP
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${batchInfo}
          <tr>
            <td style="padding:30px 40px;">
              ${expired.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#D32F2F;text-transform:uppercase;">
                      EXPIRED PRODUCTS (${expired.length})
                    </h2>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#666666;">
                      Remove immediately from shelves to maintain safety compliance
                    </p>
                  </td>
                </tr>
                ${expired.map(p => generateProductCard(p, 'EXPIRED', '#FF0000')).join('')}
              </table>
              ` : ''}
              ${urgent.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#F57C00;text-transform:uppercase;">
                      URGENT - EXPIRES WITHIN 7 DAYS (${urgent.length})
                    </h2>
                  </td>
                </tr>
                ${urgent.map(p => generateProductCard(p, 'URGENT', '#FFA726')).join('')}
              </table>
              ` : ''}
              ${expiringSoon.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#388E3C;text-transform:uppercase;">
                      EXPIRING SOON - 8 TO 90 DAYS (${expiringSoon.length})
                    </h2>
                  </td>
                </tr>
                ${expiringSoon.map(p => generateProductCard(p, 'EXPIRING', '#4CAF50')).join('')}
              </table>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEFEF;">
                <tr>
                  <td style="padding:35px;">
                    <h3 style="margin:0 0 15px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#1A1A1A;text-transform:uppercase;">
                      RECOMMENDATIONS
                    </h3>
                    <p style="margin:0 0 5px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;color:#1A1A1A;">
                      Dispose Expired Stock
                    </p>
                    <p style="margin:0 0 15px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#4A4A4A;line-height:20px;">
                      Immediately pull these items from the floor to maintain safety compliance.
                    </p>
                    <p style="margin:0 0 5px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;color:#1A1A1A;">
                      Discount Expiring Items
                    </p>
                    <p style="margin:0 0 15px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#4A4A4A;line-height:20px;">
                      Apply clear-out pricing to items expiring within the next couple of days.
                    </p>
                    <p style="margin:0 0 5px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;color:#1A1A1A;">
                      Plan Ahead for Expiring Soon Items
                    </p>
                    <p style="margin:0 0 20px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#4A4A4A;line-height:20px;">
                      Start planning promotions, bundle deals, and marketing campaigns for products expiring in 8-90 days.
                    </p>
                    <h3 style="margin:20px 0 10px 0;padding-top:20px;border-top:1px solid #CCCCCC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#1A1A1A;text-transform:uppercase;">
                      FOR ASSSISTANCE OR HELP
                    </h3>
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#4A4A4A;">
                      Email: samuelleonard63@gmail.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// ===== Helper: Generate Product Card =====
function generateProductCard(product: any, statusLabel: string, statusColor: string): string {
  const statusTextColor = statusLabel === 'URGENT' ? '#000000' : '#FFFFFF'

  return `
    <tr>
      <td style="padding-bottom:15px;">
        <table class="product-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEFEF;">
          <tr>
            <td style="padding:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:80px;vertical-align:middle;padding-right:20px;">
                    ${product.photo_url
                      ? `<img class="product-image" src="${product.photo_url}" alt="${product.name}" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:cover;" />`
                      : `<div style="width:80px;height:80px;background:linear-gradient(135deg,#E0E0E0,#BDBDBD);display:flex;align-items:center;justify-content:center;font-size:32px;">📦</div>`
                    }
                  </td>
                  <td style="vertical-align:middle;padding-right:20px;">
                    <h3 style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:800;color:#1A1A1A;text-transform:uppercase;line-height:18px;">
                      ${product.name}
                    </h3>
                    <p style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;font-weight:700;color:#666666;text-transform:uppercase;">
                      ${product.category || 'INVENTORY ITEM'}
                    </p>
                    <p style="margin:0;padding-top:12px;border-top:1px solid #CCCCCC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:700;color:#333333;text-transform:uppercase;letter-spacing:0.3px;">
                      ${product.quantity ? `QTY: ${product.quantity}` : 'INVENTORY'} • ${statusLabel === 'EXPIRED' ? 'EXPIRED' : 'EXP'}: ${formatDate(product.expiry_date)}
                    </p>
                  </td>
                  <td align="right" style="vertical-align:middle;padding-left:20px;white-space:nowrap;">
                    <span style="display:inline-block;background:${statusColor};color:${statusTextColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;font-weight:800;text-transform:uppercase;padding:8px 16px;border-radius:50px;white-space:nowrap;letter-spacing:0.5px;">
                      ${statusLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

// ===== Helper: Format Date =====
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(dateString)
  expiry.setHours(0, 0, 0, 0)

  const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  if (daysUntil < 0) return `${formatted} (${Math.abs(daysUntil)} days ago)`
  if (daysUntil === 0) return `${formatted} (TODAY)`
  if (daysUntil === 1) return `${formatted} (Tomorrow)`
  if (daysUntil <= 7) return `${formatted} (${daysUntil} days)`

  return formatted
}