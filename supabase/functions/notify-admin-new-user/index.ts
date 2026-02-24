import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const config = {
  verify_jwt: false, // JWT turned off
}

// Secrets:
// - RESEND_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - INTERNAL_SECRET

const ADMIN_EMAIL = 'samuelleonard63@gmail.com' // verified email
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET')!

serve(async (req) => {
  try {
    // Internal secret check
    const secret = req.headers.get('x-internal-secret')
    if (secret !== INTERNAL_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    const newUser = payload?.record

    if (!newUser?.id) {
      return new Response('Invalid payload', { status: 400 })
    }

    // Fetch user email from Supabase Auth
    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(newUser.id)

    if (authError || !authUser?.user) {
      throw new Error('Failed to fetch auth user')
    }

    const userEmail = authUser.user.email || 'Unknown'

    // Send email via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Expiro <${ADMIN_EMAIL}>`, // sender is the verified admin email
        to: [ADMIN_EMAIL],
        subject: '🔔 New Expiro Signup - Approval Needed',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>New User Signup</h2>
            <p>A new user has signed up for Expiro and is waiting for your approval.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Email</td>
                <td style="padding: 8px; background: #f9f9f9;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Signed up</td>
                <td style="padding: 8px; background: #f9f9f9;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <p>Open the Expiro app and go to <strong>Admin → Pending Users</strong> to approve or ignore this request.</p>
          </div>
        `,
      }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      throw new Error(`Resend API error: ${resendRes.status} ${errText}`)
    }

    // Log notification in Supabase
    await supabase.from('notifications').insert({
      type: 'email',
      status: 'sent',
      product_id: null,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-admin-new-user error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})