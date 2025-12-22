// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from optimize-resume!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL='gpt-5-mini';

// System prompt for job description formatting
const SYSTEM_PROMPT = `
  You are an expert career coach and meticulous fact-checker. 
  Do not add any commentary or analysis outside of the rewritten resume.
  Rewrite resumes so they align with a target job description using only information that already exists in the provided base resume. 
  Do not fabricate or infer new employers, titles, dates, technologies, certifications, responsibilities, or metrics. 
  You may reorder, merge, or rephrase existing content, but every factual statement must be traceable to the base resume. 
  If the base resume lacks details for a requirement, leave it out rather than inventing it. 
  Add appropriate markdown headers where needed (e.g., ## Core Skills, ## Experience). 
  Ensure to start in a new line when writing Job Descriptions. Usually in a new line after job location and date.
`;



Deno.serve(async (req) => {
// Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { resume_content, job_description } = await req.json();

    if (!resume_content) {
      return new Response(
      JSON.stringify({ error: 'resume_content is required' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
      );
    }

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

    const USER_PROMPT = `Please format the following resume content in markdown format with appropriate headers:\n\n${resume_content.trim()}`;

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
            content: `Please format the following resume content in markdown format with appropriate headers:\n\n${resume_content.trim()}
            Target Job Description:\n\n${job_description.trim()}\n\n
            Rewrite the resume so it is tailored to this role.
            Rephrase and reprioritize existing achievements to match the role, mirror the terminology of the job description when appropriate, 
            and keep the tone professional.
            `
          }
        ],
        temperature: 1,
        max_completion_tokens: 4096,
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
    
    const openai_response = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        optimized_resume: openai_response,
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/optimize-resume' \
    --header 'Authorization: Bearer ****' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
