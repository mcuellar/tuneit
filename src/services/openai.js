import {
  detectCurrencyCodeFromText,
  detectPeriodFromText,
  extractSalaryDetailsFromText,
  formatSalaryAmount,
  formatSalaryRange,
  normalizeSalaryDetails,
  parseSalaryNumber,
} from '../utils/salary';
import { getSupabaseFunctionsUrl } from './functionsClient';
import { supabase } from './supabaseClient';

export async function formatJobDescription(jobDescription) {
  const trimmed = jobDescription?.trim();

  if (!trimmed) {
    throw new Error('Please provide a job description to format.');
  }

  const supabaseUrl = getSupabaseFunctionsUrl();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data} = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  if (!supabaseAnonKey) {
    if (import.meta.env.PROD) {
      throw new Error('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Update .env.local with your local anon key.');
    }

    console.warn('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Falling back to local formatter for development.');
    return buildFormattedResponse(localMarkdownFallback(trimmed), trimmed);
  }

  const requestPayload = {
    job_description: trimmed,
  };

  const payloadSize = new TextEncoder().encode(JSON.stringify(requestPayload)).length;
  logSize('Job format payload', payloadSize);

  let response;

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/format-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (error) {
    console.error('[TuneIt] Failed to reach local job formatter.', error);
    if (import.meta.env.PROD) {
      throw new Error('Unable to reach Supabase Edge function for job formatting.');
    }
    return buildFormattedResponse(localMarkdownFallback(trimmed), trimmed);
  }

  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseSize = new TextEncoder().encode(responseText).length;
  logSize('Job format response', responseSize);

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const message =
      errorPayload?.error?.message || errorPayload?.message || 'Unable to format job description with Supabase.';
    throw new Error(message);
  }

  const responsePayload = await response.json();
  const formattedJob = responsePayload?.formatted_job_description;
  const success = responsePayload?.success ?? true;

  if (success === false) {
    const errorMessage = responsePayload?.error || 'Supabase formatter reported a failure.';
    throw new Error(errorMessage);
  }

  if (!formattedJob) {
    console.error('[Supabase] formatJobDescription missing formatted_job_description payload:', responsePayload);
    throw new Error('Supabase response did not include formatted job content.');
  }

  const hasSalaryFields =
    responsePayload?.salary_range ||
    responsePayload?.salary_min != null ||
    responsePayload?.salary_max != null ||
    responsePayload?.salary_currency ||
    responsePayload?.salary_period;

  const salaryDetailsFromResponse = hasSalaryFields
    ? normalizeSalaryDetails({
        range: responsePayload?.salary_range ?? null,
        min: parseSalaryField(responsePayload?.salary_min),
        max: parseSalaryField(responsePayload?.salary_max),
        currency: responsePayload?.salary_currency ?? null,
        period: responsePayload?.salary_period ?? null,
      })
    : null;

  return buildFormattedResponse(formattedJob, trimmed, salaryDetailsFromResponse);
}

export async function formatBaseResume(rawResume) {
  const trimmed = rawResume?.trim();

  if (!trimmed) {
    throw new Error('Add resume details before formatting.');
  }

  const supabaseUrl = getSupabaseFunctionsUrl();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    if (import.meta.env.PROD) {
      throw new Error('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Update .env.local with your local anon key.');
    }

    console.warn('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Returning development fallback for base resume.');
    return localBaseResumeFallback(trimmed);
  }

  const requestPayload = {
    resume_content: trimmed,
  };

  const payloadSize = new TextEncoder().encode(JSON.stringify(requestPayload)).length;
  logSize('Base resume format payload', payloadSize);

  let response;

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/format-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (error) {
    console.error('[TuneIt] Failed to reach local resume formatter.', error);
    if (import.meta.env.PROD) {
      throw new Error('Unable to reach Supabase Edge function for resume formatting.');
    }
    return localBaseResumeFallback(trimmed);
  }

  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseSize = new TextEncoder().encode(responseText).length;
  logSize('Base resume format response', responseSize);

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const message =
      errorPayload?.error?.message || errorPayload?.message || 'Unable to format your resume with Supabase.';
    throw new Error(message);
  }

  const responsePayload = await response.json();
  const formattedResume = responsePayload?.formatted_resume;
  const success = responsePayload?.success ?? true;

  if (success === false) {
    const errorMessage = responsePayload?.error || 'Supabase formatter reported a failure.';
    throw new Error(errorMessage);
  }

  if (!formattedResume) {
    console.error('[Supabase] formatBaseResume missing formatted_resume payload:', responsePayload);
    throw new Error('Supabase response did not include resume content.');
  }

  return normalizeMarkdown(formattedResume);
}

export async function optimizeResume({ baseResume, jobDescription, jobTitle }) {
  const resumeTrimmed = baseResume?.trim();
  const jobTrimmed = jobDescription?.trim();

  if (!resumeTrimmed) {
    throw new Error('Add your base resume before optimizing.');
  }

  if (!jobTrimmed) {
    throw new Error('Select a job description before optimizing a resume.');
  }

  const supabaseUrl = getSupabaseFunctionsUrl();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    if (import.meta.env.PROD) {
      throw new Error('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Update .env.local with your local anon key.');
    }

    console.warn('[TuneIt] Missing VITE_SUPABASE_ANON_KEY. Returning development fallback resume.');
    return localResumeFallback(resumeTrimmed, jobTrimmed, jobTitle);
  }

  const requestPayload = {
    resume_content: resumeTrimmed,
    job_description: jobTrimmed,
    ...(jobTitle ? { job_title: jobTitle } : {}),
  };

  const payloadSize = new TextEncoder().encode(JSON.stringify(requestPayload)).length;
  logSize('Resume optimize payload', payloadSize);

  let response;

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/optimize-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (error) {
    console.error('[TuneIt] Failed to reach local resume optimizer.', error);
    if (import.meta.env.PROD) {
      throw new Error('Unable to reach Supabase Edge function for resume optimization.');
    }
    return localResumeFallback(resumeTrimmed, jobTrimmed, jobTitle);
  }

  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseSize = new TextEncoder().encode(responseText).length;
  logSize('Resume optimize response', responseSize);

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const message =
      errorPayload?.error?.message || errorPayload?.message || 'Unable to optimize resume with Supabase.';
    throw new Error(message);
  }

  const responsePayload = await response.json();
  const optimizedResume = responsePayload?.optimized_resume;
  const success = responsePayload?.success ?? true;

  if (success === false) {
    const errorMessage = responsePayload?.error || 'Supabase optimizer reported a failure.';
    throw new Error(errorMessage);
  }

  if (!optimizedResume) {
    console.error('[Supabase] optimizeResume missing optimized_resume payload:', responsePayload);
    throw new Error('Supabase response did not include optimized resume content.');
  }

  return normalizeMarkdown(optimizedResume);
}

function logSize(label, bytes) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  console.log(`[OpenAI] ${label}: ${bytes} bytes | ${kb.toFixed(2)} KB | ${mb.toFixed(4)} MB`);
}

function parseSalaryField(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = parseSalaryNumber(String(value));
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

async function safeParseJSON(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function localMarkdownFallback(raw) {
  const normalized = raw.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return '# Job Description';
  }

  const lines = normalized.split('\n');
  const firstContentIndex = lines.findIndex(line => line.trim().length > 0);
  if (firstContentIndex === -1) {
    return '# Job Description';
  }

  const headingSource = lines[firstContentIndex];
  const trimmedHeading = headingSource.trim();
  const remainingLines = lines.slice(firstContentIndex + 1);
  const hasAdditionalContent = remainingLines.some(line => line.trim().length > 0);

  if (trimmedHeading.startsWith('#')) {
    return normalized;
  }

  const heading = trimmedHeading.replace(/^[#\s]+/, '').trim() || 'Job Description';
  if (!hasAdditionalContent) {
    return `# ${heading}`;
  }

  let body = remainingLines.join('\n').trim();
  if (!body) {
    return `# ${heading}`;
  }

  const duplicateHeadingPattern = new RegExp(
    `^(?:#{1,6}\\s*)?${escapeRegExp(heading)}\\s*(?:\\n|$)`,
    'i',
  );
  if (duplicateHeadingPattern.test(body)) {
    body = body.replace(duplicateHeadingPattern, '').trimStart();
  }

  return `# ${heading}\n\n${body}`.trim();
}

function localResumeFallback(baseResume, jobDescription, jobTitle) {
  const heading = jobTitle ? `# ${jobTitle} Resume (Dev Fallback)` : '# Tailored Resume (Dev Fallback)';
  return `${heading}\n\n> This resume was generated using the local development fallback.\n\n${baseResume}\n\n---\n\n## Target Role Notes\n\n${jobDescription}`;
}

function escapeRegExp(value) {
  return value.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function localBaseResumeFallback(content) {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '# Professional Profile\n\n_Add resume details here before saving._';
  }

  const [firstLine = 'Professional Profile'] = normalized.split('\n').filter(Boolean);
  const heading = firstLine.replace(/^[#\s]+/, '').trim() || 'Professional Profile';
  return `# ${heading}\n\n${normalized}`;
}

function normalizeMarkdown(raw) {
  const trimmed = raw.replace(/\r\n/g, '\n').trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const firstLineBreak = trimmed.indexOf('\n');
  const fenceEnd = trimmed.lastIndexOf('```');

  if (firstLineBreak === -1 || fenceEnd <= firstLineBreak) {
    return trimmed.replace(/```/g, '').trim();
  }

  const content = trimmed.slice(firstLineBreak + 1, fenceEnd).trim();
  return content;
}

const SALARY_COMMENT_REGEX = /<!--\s*salary_summary\s*:(.*?)-->/is;
const SALARY_SECTION_REGEX = /(#{2,6}\s*salary\b[^\n]*)([\s\S]*?)(?=\n#{1,6}\s|$)/i;

function buildFormattedResponse(rawMarkdown, sourceText, salaryOverride) {
  const normalized = normalizeMarkdown(rawMarkdown);
  const overrideDetails = salaryOverride ? normalizeSalaryDetails(salaryOverride) : null;
  let { sanitizedMarkdown, salary } = extractSalaryMetadata(normalized);
  let hasSectionFlag = hasSalarySection(sanitizedMarkdown);

  const overrideHasValues =
    overrideDetails &&
    (overrideDetails.range || typeof overrideDetails.min === 'number' || typeof overrideDetails.max === 'number');

  if (overrideHasValues) {
    const withoutSection = removeSalarySection(sanitizedMarkdown);
    const withOverrideSection = appendSalarySection(withoutSection, overrideDetails);
    ({ sanitizedMarkdown, salary } = extractSalaryMetadata(withOverrideSection));
    hasSectionFlag = hasSalarySection(sanitizedMarkdown);
  }

  if (!salary && hasSectionFlag) {
    const derived = deriveSalaryFromSection(sanitizedMarkdown);
    if (derived) {
      const updated = replaceSalarySection(sanitizedMarkdown, derived);
      ({ sanitizedMarkdown, salary } = extractSalaryMetadata(updated));
      hasSectionFlag = hasSalarySection(sanitizedMarkdown);
    }
  }

  if (!salary && sourceText) {
    const extracted = extractSalaryDetailsFromText(sourceText);
    if (extracted) {
      const updated = hasSectionFlag
        ? replaceSalarySection(sanitizedMarkdown, extracted)
        : appendSalarySection(sanitizedMarkdown, extracted);
      ({ sanitizedMarkdown, salary } = extractSalaryMetadata(updated));
      hasSectionFlag = hasSalarySection(sanitizedMarkdown);
    }
  }

  if (!hasSectionFlag) {
    const withSection = appendSalarySection(sanitizedMarkdown, salary);
    ({ sanitizedMarkdown, salary } = extractSalaryMetadata(withSection));
    hasSectionFlag = true;
  }

  if (!salary) {
    const withComment = appendSalaryComment(sanitizedMarkdown, getDefaultSalaryDetails());
    ({ sanitizedMarkdown, salary } = extractSalaryMetadata(withComment));
  }

  return { markdown: sanitizedMarkdown, salary };
}

function extractSalaryMetadata(markdown) {
  if (typeof markdown !== 'string') {
    return { sanitizedMarkdown: '', salary: null };
  }

  let sanitizedMarkdown = markdown;
  let salaryDetails = null;
  const match = SALARY_COMMENT_REGEX.exec(markdown);

  if (match) {
    const jsonPayload = match[1].trim();
    try {
      const parsed = JSON.parse(jsonPayload);
      salaryDetails = normalizeSalaryDetails(parsed);
    } catch (error) {
      console.warn('[TuneIt] Unable to parse salary metadata comment.', error);
    }

    sanitizedMarkdown = sanitizedMarkdown.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
  } else {
    sanitizedMarkdown = sanitizedMarkdown.trim();
  }

  return { sanitizedMarkdown, salary: salaryDetails };
}

function hasSalarySection(markdown) {
  if (typeof markdown !== 'string') {
    return false;
  }
  return SALARY_SECTION_REGEX.test(markdown);
}

function appendSalarySection(markdown, salaryDetails) {
  const normalized = normalizeSalaryDetails(salaryDetails) ?? getDefaultSalaryDetails();
  const rangeLabel = normalized.range || formatSalaryRange(normalized) || 'Not provided';
  const minLabel = formatSalaryAmount(normalized.min, normalized.currency) || 'Not provided';
  const maxLabel = formatSalaryAmount(normalized.max, normalized.currency) || 'Not provided';

  const commentPayload = JSON.stringify({
    range: normalized.range,
    min: normalized.min,
    max: normalized.max,
    currency: normalized.currency,
    period: normalized.period,
  });

  const sectionLines = [
    '## Salary',
    `- Range: ${rangeLabel}`,
    `- Minimum: ${minLabel}`,
    `- Maximum: ${maxLabel}`,
    '',
    `<!-- salary_summary: ${commentPayload} -->`,
  ];

  return `${markdown.trim()}\n\n${sectionLines.join('\n')}`.trim();
}

function replaceSalarySection(markdown, salaryDetails) {
  const withoutSection = removeSalarySection(markdown);
  return appendSalarySection(withoutSection, salaryDetails);
}

function removeSalarySection(markdown) {
  if (typeof markdown !== 'string') {
    return '';
  }
  return markdown.replace(SALARY_SECTION_REGEX, '').trim();
}

function appendSalaryComment(markdown, salaryDetails) {
  const normalized = normalizeSalaryDetails(salaryDetails) ?? getDefaultSalaryDetails();
  const commentPayload = JSON.stringify({
    range: normalized.range,
    min: normalized.min,
    max: normalized.max,
    currency: normalized.currency,
    period: normalized.period,
  });

  return `${markdown.trim()}\n\n<!-- salary_summary: ${commentPayload} -->`;
}

function getDefaultSalaryDetails() {
  return {
    range: null,
    min: null,
    max: null,
    currency: null,
    period: null,
  };
}


function deriveSalaryFromSection(markdown) {
  const sectionBody = getSalarySectionBody(markdown);
  if (!sectionBody) {
    return null;
  }

  const rangeMatch = /(?:-|\*)\s*Range:\s*(.+)/i.exec(sectionBody);
  const minMatch = /(?:-|\*)\s*Minimum:\s*(.+)/i.exec(sectionBody);
  const maxMatch = /(?:-|\*)\s*Maximum:\s*(.+)/i.exec(sectionBody);

  if (!rangeMatch && !minMatch && !maxMatch) {
    return null;
  }

  const range = rangeMatch ? rangeMatch[1].trim() : null;
  const min = minMatch ? parseSalaryNumber(minMatch[1]) : null;
  const max = maxMatch ? parseSalaryNumber(maxMatch[1]) : null;

  const currencySource = rangeMatch?.[1] || minMatch?.[1] || maxMatch?.[1] || '';
  const periodSource = rangeMatch?.[1] || sectionBody;

  const currency = detectCurrencyCodeFromText(currencySource);
  const period = detectPeriodFromText(periodSource);

  return normalizeSalaryDetails({
    range,
    min,
    max,
    currency,
    period,
  });
}

function getSalarySectionBody(markdown) {
  if (typeof markdown !== 'string') {
    return null;
  }

  const match = SALARY_SECTION_REGEX.exec(markdown);
  if (!match) {
    return null;
  }

  return match[2].trim();
}
