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

    // Fetch new user's name and phone from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('name, phone')
      .eq('id', newUserId)
      .single()

    if (profileError || !profile) {
      throw new Error('Failed to fetch new user profile')
    }

    if (!profile.phone) {
      console.warn('New user has no phone number, skipping notification')
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send WhatsApp message to the new user confirming their request was received
    await sendWhatsApp(
      profile.phone,
      'user_signup_received', // PLACEHOLDER: replace with approved template name
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: profile.name || 'there' },
          ],
        },
      ]
    )

    // Log notification
    await supabase.from('notifications').insert({
      type: 'whatsapp',
      status: 'sent',
      product_id: null,
      error_message: null,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-user-signup-received error:', err)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('notifications').insert({
      type: 'whatsapp',
      status: 'failed',
      product_id: null,
      error_message: String(err),
    })

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})