const DEFAULT_FUNCTIONS_URL = 'http://127.0.0.1:54321';

export function getSupabaseFunctionsUrl() {
  const baseUrl =
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_FUNCTIONS_URL;

  return baseUrl.replace(/\/$/, '');
}

export default getSupabaseFunctionsUrl;
