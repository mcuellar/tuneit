import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export function createAuthedClient(req: Request) {
    // Retrieve Supabase URL and Anon Key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")

    // Ensure the necessary environment variables are set, else return an error response with 500 status
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration")
      return new Response("Server not configured", { status: 500 })
    }

    const authHeader = req.headers.get("Authorization")

    // Ensure the Authorization header is present and properly formatted, else return an error response with 401 status
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Missing or invalid Authorization header", {
        status: 401,
      })
    }
  
  // Create a Supabase client with the Authorization header from the request
  return createClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization")!,
        },
      },
    }
  )
}
