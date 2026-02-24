import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const config = {
  verify_jwt: false,
}

const GMAIL_USER = Deno.env.get('GMAIL_USER')!
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')!
const ADMIN_EMAIL = 'samuelleonard63@gmail.com'
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET')!

serve(async (req) => {
  try {
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

    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(newUser.id)

    if (authError || !authUser?.user) {
      throw new Error('Failed to fetch auth user')
    }

    const userEmail = authUser.user.email || 'Unknown'

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    })

    await client.send({
      from: GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: 'New Expiro Signup - Approval Needed',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>New User Signup</h2>
          <p>A new user has signed up for Expiro and is waiting for your approval.</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Signed up:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    })

    await client.close()

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