import { getSupabaseFunctionsUrl } from './functionsClient';

const DEFAULT_CC = 'support@tuneit.ai';
const DEFAULT_REPLY_TO = 'hello@tuneit.ai';
const DEFAULT_SUBJECT = 'Your TuneIt Dashboard';

export async function sendWelcomeEmail({ email, firstName }) {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    console.warn('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Skipping welcome email trigger.');
    return null;
  }

  const recipient = email?.trim();
  if (!recipient) {
    throw new Error('Recipient email is required to send the welcome email.');
  }

  const payload = {
    to: [recipient],
    subject: DEFAULT_SUBJECT,
    template_name: 'welcome',
    key_value_pairs: {
      firstName: firstName?.trim() || 'there',
    },
    cc: DEFAULT_CC,
    reply_to: DEFAULT_REPLY_TO,
  };

  return invokeSendEmail(payload, supabaseAnonKey);
}

async function invokeSendEmail(payload, anonKey) {
  const functionsBaseUrl = getSupabaseFunctionsUrl();
  const endpoint = `${functionsBaseUrl}/functions/v1/send-email`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (parseError) {
    console.warn('[TuneIt] send-email response was not valid JSON.', parseError);
  }

  if (!response.ok) {
    const message = data?.error || data?.message || 'Unable to deliver welcome email.';
    throw new Error(message);
  }

  if (data?.success === false) {
    throw new Error(data?.error || 'Welcome email Edge function reported failure.');
  }

  return data;
}

export default sendWelcomeEmail;
