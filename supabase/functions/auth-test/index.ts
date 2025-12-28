// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createAuthedClient } from "../_shared/supabase.ts"
// import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  const supabase = createAuthedClient(req)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error("Auth error:", error)
    return new Response("Unauthorized", { status: 401 })
  }

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = {
    message: `Hello, ${user.email}! Your user ID is ${user.id}.`,
    user,
  }

  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  })
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/auth-test' \
    --header 'Authorization: Bearer *****' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
