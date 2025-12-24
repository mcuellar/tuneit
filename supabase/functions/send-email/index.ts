// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

type EmailPayload = {
  to: string | string[]
  subject: string
  template_name: string
  key_value_pairs?: Record<string, unknown>
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  reply_to?: string
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
}

const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders })

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const normalizeEmails = (input?: string | string[]) => {
  if (!input) return []
  const list = Array.isArray(input) ? input : [input]
  return list
    .map((email) => (typeof email === "string" ? email.trim() : ""))
    .filter((email) => Boolean(email))
}

const renderTemplate = async (
  templateName: string,
  keyValuePairs: Record<string, unknown>,
) => {
  const templateUrl = new URL(`./templates/${templateName}.html`, import.meta.url)
  const template = await Deno.readTextFile(templateUrl)
  return Object.entries(keyValuePairs).reduce((content, [key, value]) => {
    const matcher = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g")
    return content.replace(matcher, String(value))
  }, template)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return respond(405, { error: "Method not allowed" })
  }

  let payload: EmailPayload
  try {
    payload = await req.json()
  } catch (error) {
    console.error("Invalid JSON body", error)
    return respond(400, { error: "Request body must be valid JSON" })
  }

  if (!payload) {
    return respond(400, { error: "Request body is required" })
  }

  const {
    to,
    subject,
    template_name: templateName,
    key_value_pairs: keyValuePairs = {},
    from,
    cc,
    bcc,
    reply_to: replyTo,
  } = payload

  if (!to || !subject || !templateName) {
    return respond(400, {
      error: "Missing required fields: to, subject, and template_name",
    })
  }

  const toList = normalizeEmails(to)
  if (!toList.length) {
    return respond(400, { error: "At least one recipient is required" })
  }

  let htmlContent: string
  try {
    htmlContent = await renderTemplate(templateName, keyValuePairs)
  } catch (error) {
    console.error("Template rendering failed", error)
    return respond(404, {
      error: `Template '${templateName}' could not be found or read`,
    })
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    return respond(500, {
      error: "RESEND_API_KEY is not configured in the environment",
    })
  }

  const defaultFrom =
    Deno.env.get("RESEND_FROM_EMAIL") ??
    Deno.env.get("RESEND_FROM") ??
    Deno.env.get("DEFAULT_FROM_EMAIL") ??
    Deno.env.get("SMTP_FROM")
  const fromEmail = from ?? defaultFrom
  if (!fromEmail) {
    return respond(500, {
      error: "Sender email is not configured. Provide 'from' or set RESEND_FROM_EMAIL/RESEND_FROM/DEFAULT_FROM_EMAIL",
    })
  }

  const ccList = normalizeEmails(cc)
  const bccList = normalizeEmails(bcc)

  const resendPayload: Record<string, unknown> = {
    from: fromEmail,
    to: toList,
    subject,
    html: htmlContent,
  }

  if (ccList.length) resendPayload.cc = ccList
  if (bccList.length) resendPayload.bcc = bccList
  if (replyTo && typeof replyTo === "string" && replyTo.trim()) {
    resendPayload.reply_to = replyTo.trim()
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error("Resend API error", errorText)
      return respond(resendResponse.status, {
        error: "Email delivery failed via Resend",
        details: errorText,
      })
    }

    const result = await resendResponse.json()
    return respond(200, {
      success: true,
      message: "Email sent successfully",
      template_used: templateName,
      to: toList,
      email_id: result?.id ?? null,
    })
  } catch (error) {
    console.error("Resend request failed", error)
    return respond(500, {
      error: "Unable to reach Resend API",
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-email' \
    --header 'Authorization: Bearer <anon-key>' \
    --header 'Content-Type: application/json' \
    --data '{"to":"person@example.com","subject":"Hi","template_name":"welcome","key_value_pairs":{"name":"Functions"}}'

*/
