// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")
console.log("ALL ENV VARS:", Deno.env.toObject());


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL='gpt-4o-mini';

// System prompt for job description formatting
const SYSTEM_PROMPT = `
You are a helpful assistant that formats job descriptions into clean, well-structured markdown with appropriate headers.
The very first line must be a level-one heading in the format # Company Name: Job Title using details found in the description.
Use headers like # Job Title, ## Overview, ## Responsibilities, ## Requirements, ## Benefits, etc.
Do not add any extra content beyond formatting, even if the input is incomplete.
Do not include any commentary outside the Markdown formatting. Do not fabricate details not present in the original description.
`;



Deno.serve(async (req) => {
// Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { job_description } = await req.json();

    if (!job_description) {
      return new Response(
        JSON.stringify({ error: 'job_description is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // OpenAI API configuration
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("OpenAI API Key:", openaiApiKey ? 'Loaded' : 'Not Found');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call OpenAI API to format the job description
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Please format the following job description in markdown format with appropriate headers:\n\n${job_description}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2200,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${error}` }),
        { 
          status: openaiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await openaiResponse.json();
    
    // Validate OpenAI response structure
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
      return new Response(
        JSON.stringify({ error: 'Invalid response from OpenAI API' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const formattedJobDescription = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        formatted_job_description: formattedJobDescription,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in format_job function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while formatting the job description. Please try again later.' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/format-job' \
    --header 'Authorization: Bearer ****' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
