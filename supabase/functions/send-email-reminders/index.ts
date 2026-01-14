import 'https://deno.land/x/dotenv/load.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  throw new Error('Missing required environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Constants
const RATE_LIMIT = 95

serve(async () => {
  console.log("🚀 Daily reminder check started")
  
  try {
    // === STEP 1: Rate Limit Check ===
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
        JSON.stringify({ error: 'Daily email limit reached' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // === STEP 2: Calculate Days Until Expiry for All Products ===
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)

    // Fetch all products
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, expiry_date, category, quantity, status, photo_url')
      .order('expiry_date', { ascending: true })

    if (productsError) throw productsError

    // Filter products at exact milestone days (90, 60, 30, 7, 0)
    const productsToAlert = allProducts?.filter(product => {
      const expiryDate = new Date(product.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Alert at exact milestones: 90, 60, 30, 7, or 0 (expired today)
      return daysUntilExpiry === 90 || 
             daysUntilExpiry === 60 || 
             daysUntilExpiry === 30 || 
             daysUntilExpiry === 7 || 
             daysUntilExpiry === 0
    }) || []

    console.log(`📦 Products at milestone dates: ${productsToAlert.length}`)

    if (productsToAlert.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send today' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // === STEP 3: Group Products by Milestone ===
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)

    const groupedProducts = {
      expired: [] as any[],       // 0 days (expired today)
      sevenDays: [] as any[],     // 7 days
      thirtyDays: [] as any[],    // 30 days
      sixtyDays: [] as any[],     // 60 days
      ninetyDays: [] as any[]     // 90 days
    }

    productsToAlert.forEach(product => {
      const expiryDate = new Date(product.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiry === 0) groupedProducts.expired.push(product)
      else if (daysUntilExpiry === 7) groupedProducts.sevenDays.push(product)
      else if (daysUntilExpiry === 30) groupedProducts.thirtyDays.push(product)
      else if (daysUntilExpiry === 60) groupedProducts.sixtyDays.push(product)
      else if (daysUntilExpiry === 90) groupedProducts.ninetyDays.push(product)
    })

    console.log(`📊 Grouped - Expired: ${groupedProducts.expired.length}, 7d: ${groupedProducts.sevenDays.length}, 30d: ${groupedProducts.thirtyDays.length}, 60d: ${groupedProducts.sixtyDays.length}, 90d: ${groupedProducts.ninetyDays.length}`)

    // === STEP 4: Get All Users ===
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError

    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, name')

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

    // === STEP 5: Send One Batch Email to All Users ===
    const results = []

    for (const user of allUsers) {
      try {
        const emailHtml = generateEmailHtml(groupedProducts, user.displayName)

        const totalProducts = productsToAlert.length
        const subject = `⚠️ Daily Expiry Alert - ${totalProducts} product${totalProducts > 1 ? 's' : ''} need attention`

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

        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'email',
          status: emailResponse.ok ? 'sent' : 'failed',
          products_count: totalProducts,
          error_message: emailResponse.ok ? null : JSON.stringify(emailResult),
        })

        if (emailResponse.ok) {
          console.log(`✅ Email sent to ${user.email} (${totalProducts} products)`)
          results.push({ user: user.email, products: totalProducts })
        } else {
          console.log(`❌ Failed to send to ${user.email}:`, emailResult)
        }

      } catch (error) {
        console.log(`❌ Error sending to ${user.email}:`, error)

        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'email',
          status: 'failed',
          products_count: productsToAlert.length,
          error_message: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${results.length} reminder emails`,
        total_products: productsToAlert.length,
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

// === Generate Email HTML ===
function generateEmailHtml(groupedProducts: any, name: string): string {
  const { expired, sevenDays, thirtyDays, sixtyDays, ninetyDays } = groupedProducts
  const totalProducts = expired.length + sevenDays.length + thirtyDays.length + sixtyDays.length + ninetyDays.length

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
          
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:600;color:#333333;">
                      Product Expiry reminder
                    </p>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:#666666;">
                      ${formatDateLong(new Date())}
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

          <!-- Greeting -->
          <tr>
            <td style="padding:30px 40px 0 40px;">
              <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:700;color:#333333;">
                Hello ${name},
              </h1>
            </td>
          </tr>
          
          <!-- Description -->
          <tr>
            <td style="padding:15px 40px 0 40px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:24px;color:#4A4A4A;">
                Your daily inventory report is ready. We've identified <strong>${totalProducts} items</strong> that need your attention to minimize waste and ensure product safety.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
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

          <!-- Product Sections -->
          <tr>
            <td style="padding:30px 40px;">
              
              ${expired.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#D32F2F;text-transform:uppercase;">
                      EXPIRED TODAY (${expired.length})
                    </h2>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#666666;">
                      Remove immediately from shelves
                    </p>
                  </td>
                </tr>
                ${expired.map(p => generateProductCard(p, 'EXPIRED', '#FF0000')).join('')}
              </table>
              ` : ''}

              ${sevenDays.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#F57C00;text-transform:uppercase;">
                      7 DAYS UNTIL EXPIRY (${sevenDays.length})
                    </h2>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#666666;">
                      Apply discounts and promote heavily
                    </p>
                  </td>
                </tr>
                ${sevenDays.map(p => generateProductCard(p, '7 DAYS', '#FFA726')).join('')}
              </table>
              ` : ''}

              ${thirtyDays.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#F57C00;text-transform:uppercase;">
                      30 DAYS UNTIL EXPIRY (${thirtyDays.length})
                    </h2>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#666666;">
                      Start planning promotions
                    </p>
                  </td>
                </tr>
                ${thirtyDays.map(p => generateProductCard(p, '30 DAYS', '#FFA726')).join('')}
              </table>
              ` : ''}

              ${sixtyDays.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#388E3C;text-transform:uppercase;">
                      60 DAYS UNTIL EXPIRY (${sixtyDays.length})
                    </h2>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#666666;">
                      Monitor inventory levels
                    </p>
                  </td>
                </tr>
                ${sixtyDays.map(p => generateProductCard(p, '60 DAYS', '#4CAF50')).join('')}
              </table>
              ` : ''}

              ${ninetyDays.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h2 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#388E3C;text-transform:uppercase;">
                      90 DAYS UNTIL EXPIRY (${ninetyDays.length})
                    </h2>
                    <p style="margin:5px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;color:#666666;">
                      Plan ahead for stock rotation
                    </p>
                  </td>
                </tr>
                ${ninetyDays.map(p => generateProductCard(p, '90 DAYS', '#4CAF50')).join('')}
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Recommendations -->
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
                      Apply clear-out pricing to items expiring within the next week.
                    </p>
                    <p style="margin:0 0 5px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:700;color:#1A1A1A;">
                      Plan Ahead
                    </p>
                    <p style="margin:0 0 20px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#4A4A4A;line-height:20px;">
                      Start planning promotions and marketing campaigns for products with 30-90 days remaining.
                    </p>
                    <h3 style="margin:20px 0 10px 0;padding-top:20px;border-top:1px solid #CCCCCC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#1A1A1A;text-transform:uppercase;">
                      FOR ASSISTANCE OR HELP
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

// === Generate Product Card ===
function generateProductCard(product: any, statusLabel: string, statusColor: string): string {
  const statusTextColor = statusLabel === '7 DAYS' || statusLabel === '30 DAYS' ? '#000000' : '#FFFFFF'

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

// === Format Date: "23 Jan 2026" ===
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// === Format Date with Time: "Wednesday, January 14, 2026 at 8:30 AM" ===
function formatDateLong(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
  return `${datePart} at ${timePart}`
}