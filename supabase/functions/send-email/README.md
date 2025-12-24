# send-email Edge Function

This Supabase Edge Function delivers transactional emails through [Resend](https://resend.com) using HTML templates stored alongside the function.

## Prerequisites
- Supabase CLI installed and authenticated.
- Environment variables configured (locally via `.env`, deployed via dashboard):
  - `RESEND_API_KEY` (required) — Resend API token.
  - Sender default (any of these, in order): `RESEND_FROM_EMAIL`, `RESEND_FROM`, `DEFAULT_FROM_EMAIL`, or `SMTP_FROM`.

## How to Invoke
```bash
supabase functions serve send-email
```

Send a POST request to the local endpoint:
```bash
curl -i --location --request POST \
  'http://127.0.0.1:54321/functions/v1/send-email' \
  --header 'Authorization: Bearer <anon-or-service-role-token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "member@example.com",
    "subject": "Welcome to TuneIt",
    "template_name": "welcome",
    "key_value_pairs": {"firstName": "Jamie"}
  }'
```

> Replace the URL and Authorization header with your deployed project details when testing in production.

## Request Payload
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | `string \| string[]` | Yes | Primary recipient or array of recipients. |
| `subject` | `string` | Yes | Email subject line. |
| `template_name` | `string` | Yes | HTML template filename (without `.html`) located in `templates/`. |
| `key_value_pairs` | `Record<string, unknown>` | No | Values for `{{placeholders}}` inside the template. |
| `from` | `string` | No | Overrides default sender. |
| `cc` | `string \| string[]` | No | Carbon copy recipients. |
| `bcc` | `string \| string[]` | No | Blind carbon copy recipients. |
| `reply_to` | `string` | No | Reply-to email address. |

### Sample Request Body
```json
{
  "to": ["new.user@example.com"],
  "subject": "Your TuneIt Dashboard",
  "template_name": "welcome",
  "key_value_pairs": {
    "firstName": "Taylor"
  },
  "cc": "support@tuneit.ai",
  "reply_to": "hello@tuneit.ai"
}
```

## Response Format
### Success
```json
{
  "success": true,
  "message": "Email sent successfully",
  "template_used": "welcome",
  "to": ["new.user@example.com"],
  "email_id": "71fd1e43-..."
}
```

### Error
```json
{
  "error": "Email delivery failed via Resend",
  "details": "{\"name\":\"validation_error\",...}"
}
```

- HTTP 4xx indicates validation issues, missing parameters, or template problems.
- HTTP 5xx indicates configuration issues (missing API key, sender) or upstream Resend failures.

## Template Management
- Store HTML templates in `templates/` (e.g., `templates/welcome.html`).
- Use `{{placeholder}}` syntax. Whitespace around the key is ignored: `{{ firstName }}` is valid.
- Add additional templates as needed; no redeploy required if the function is already running locally (Supabase hot reloads file changes).
- Ensure the bundle includes your templates by listing them under `static_files` in `supabase/config.toml`:
  ```toml
  [functions.send-email]
  static_files = ["./functions/send-email/templates/*.html"]
  ```

## Deployment
```bash
supabase functions deploy send-email
```
After deployment, call the function via Supabase's hosted URL:
```
https://<project-ref>.functions.supabase.co/send-email
```
Remember to supply a valid `Authorization` header (service role recommended for server-to-server calls).
