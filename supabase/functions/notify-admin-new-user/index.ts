import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const config = {
  verify_jwt: false,
}

// Secrets required:
// - WHATSAPP_ACCESS_TOKEN
// - WHATSAPP_PHONE_NUMBER_ID
// - INTERNAL_SECRET
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET')!

async function sendWhatsApp(to: string, templateName: string, components: object[]) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_GB' },
          components,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error: ${res.status} ${err}`)
  }

  return res.json()
}

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
    const newUserId = payload?.record?.id

    if (!newUserId) {
      return new Response('Invalid payload', { status: 400 })
    }

    // Fetch new user's name and email from user_profiles
    const { data: newUser, error: newUserError } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('id', newUserId)
      .single()

    if (newUserError || !newUser) {
      throw new Error('Failed to fetch new user profile')
    }

    // Fetch all admins' phone numbers
    const { data: admins, error: adminsError } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('role', 'admin')
      .eq('is_approved', true)
      .not('phone', 'is', null)

    if (adminsError) {
      throw new Error('Failed to fetch admin profiles')
    }

    if (!admins || admins.length === 0) {
      console.warn('No admins found to notify')
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }				// Send WhatsApp to every user with role=admin
				const results = await Promise.allSettled(
					admins.map((admin) =>
						sendWhatsApp(
							admin.phone,
							"admin_new_signup_alert", // PLACEHOLDER: replace with approved template name
							[
								{
									type: "body",
									parameters: [
										{ type: "text", text: newUser.name || "Unknown" },
										{ type: "text", text: newUser.email || "Unknown" },
									],
								},
							],
						),
					),
				)

    // Log each attempt
    await Promise.all(
      results.map((result) =>
        supabase.from('notifications').insert({
          type: 'whatsapp',
          status: result.status === 'fulfilled' ? 'sent' : 'failed',
          product_id: null,
          error_message: result.status === 'rejected' ? String(result.reason) : null,
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(JSON.stringify({ success: true, sent, failed }), {
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
