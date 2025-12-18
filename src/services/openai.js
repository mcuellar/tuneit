import {
  detectCurrencyCodeFromText,
  detectPeriodFromText,
  extractSalaryDetailsFromText,
  formatSalaryAmount,
  formatSalaryRange,
  normalizeSalaryDetails,
  parseSalaryNumber,
} from '../utils/salary';

const OPENAI_MODEL = 'gpt-5-mini';
const STORAGE_WARNING = 'Set VITE_OPENAI_API_KEY in your Vite environment to enable OpenAI formatting.';

export async function formatJobDescription(jobDescription) {
  const trimmed = jobDescription?.trim();

  if (!trimmed) {
    throw new Error('Please provide a job description to format.');
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    if (import.meta.env.PROD) {
      throw new Error(STORAGE_WARNING);
    }

    console.warn('[TuneIt] Missing VITE_OPENAI_API_KEY. Falling back to local formatter for development.');
    return buildFormattedResponse(localMarkdownFallback(trimmed), trimmed);
  }

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant that formats job descriptions for recruiters. Return polished Markdown with clear section headings, bullet lists, and emphasis where appropriate. Do not include any commentary outside the Markdown. The very first line must be a level-one heading in the format `# Company Name: Job Title` using details found in the description. After formatting every other section, append a `## Salary` section with three bullet points labeled Range, Minimum, and Maximum. Use compensation figures from the source material when available, otherwise state `Not provided`. Immediately after the Salary section, append an HTML comment exactly in the format `<!-- salary_summary: {"range":"$120k - $150k per year","min":120000,"max":150000,"currency":"USD","period":"year"} -->`. Use numeric min/max values without currency symbols or commas, ISO currency codes, and null for unknown fields. Do not wrap the comment in code fences or add any prose outside the Markdown.',
      },
      {
        role: 'user',
        content: `Format the following job description using Markdown. Do not invent new details, and always follow the salary instructions above by clearly stating when data is unavailable.\n\n${trimmed}`,
      },
    ],
    max_tokens: 2200,
  };

  const payloadSize = new TextEncoder().encode(JSON.stringify(body)).length;
  logSize('Job format payload', payloadSize);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseSize = new TextEncoder().encode(responseText).length;
  logSize('Job format response', responseSize);

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const message = errorPayload?.error?.message || 'Unable to format job description with OpenAI.';
    throw new Error(message);
  }

  const payload = await response.json();
  const markdown = extractMessageContent(payload);

  if (!markdown) {
    console.error('[OpenAI] formatJobDescription missing content payload:', payload);
    throw new Error('OpenAI response did not include formatted content.');
  }

  return buildFormattedResponse(markdown, trimmed);
}

export async function formatBaseResume(rawResume) {
  const trimmed = rawResume?.trim();

  if (!trimmed) {
    throw new Error('Add resume details before formatting.');
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    if (import.meta.env.PROD) {
      throw new Error(STORAGE_WARNING);
    }

    console.warn('[TuneIt] Missing VITE_OPENAI_API_KEY. Returning development fallback for base resume.');
    return localBaseResumeFallback(trimmed);
  }

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You are an elite resume editor. Convert raw resume notes into polished Markdown with concise headings and bullet points. Use only the provided facts—never invent employers, titles, dates, skills, or metrics. Begin with a level-one heading that includes the candidate name if present, otherwise "Professional Profile". Include the sections Summary, Experience, Skills, Education, and Certifications only when details exist, preserving chronological order. Respond with Markdown only.',
      },
      {
        role: 'user',
        content: `Format the following resume content into Markdown using the rules above. Retain every factual detail without embellishing.\n\n${trimmed}`,
      },
    ],
    max_tokens: 1200,
  };

  const payloadSize = new TextEncoder().encode(JSON.stringify(body)).length;
  logSize('Base resume format payload', payloadSize);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseSize = new TextEncoder().encode(responseText).length;
  logSize('Base resume format response', responseSize);

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const message = errorPayload?.error?.message || 'Unable to format your resume with OpenAI.';
    throw new Error(message);
  }

  const payload = await response.json();
  const markdown = extractMessageContent(payload);

  if (!markdown) {
    console.error('[OpenAI] formatBaseResume missing content payload:', payload);
    throw new Error('OpenAI response did not include resume content.');
  }

  return normalizeMarkdown(markdown);
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

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    if (import.meta.env.PROD) {
      throw new Error(STORAGE_WARNING);
    }

    console.warn('[TuneIt] Missing VITE_OPENAI_API_KEY. Returning development fallback resume.');
    return localResumeFallback(resumeTrimmed, jobTrimmed, jobTitle);
  }

  const body = {
    model: OPENAI_MODEL,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert career coach and meticulous fact-checker. Rewrite resumes so they align with a target job description using only information that already exists in the provided base resume. Do not fabricate or infer new employers, titles, dates, technologies, certifications, responsibilities, or metrics. You may reorder, merge, or rephrase existing content, but every factual statement must be traceable to the base resume. If the base resume lacks details for a requirement, leave it out rather than inventing it. Add appropriate markdown headers where needed (e.g., ## Core Skills, ## Experience). Ensure to start in a new line when writing Job Descriptions. Usually in a new line after job location and date.',
      },
      {
        role: 'user',
        content: `Base resume (source of truth, do not introduce new facts):\n${resumeTrimmed}\n\nTarget job description:\n${jobTrimmed}\n\nRewrite the resume so it is tailored to this role. Rephrase and reprioritize existing achievements to match the role, mirror the terminology of the job description when appropriate, and keep the tone professional. Use the target job title${jobTitle ? ` "${jobTitle}"` : ''} in the summary. If a detail is not present in the base resume, leave it out instead of inventing it. Use proper markdown headers where needed. Keep my name and contact details unchanged and with same format, including any profile links. Begin with a level-one heading containing my name as it appears in the base resume.`,
      },
    ],
    max_completion_tokens: 4096,
  };

  const payloadSize = new TextEncoder().encode(JSON.stringify(body)).length;
  logSize('Resume optimize payload', payloadSize);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseSize = new TextEncoder().encode(responseText).length;
  logSize('Resume optimize response', responseSize);

  if (!response.ok) {
    const errorPayload = await safeParseJSON(response);
    const message = errorPayload?.error?.message || 'Unable to optimize resume with OpenAI.';
    throw new Error(message);
  }

  // const payload = await response.json();
  // const markdown = extractMessageContent(payload);
  const output = await response.json();
  const responseContent = output.choices?.[0]?.message?.content;

  console.log('[OpenAI] optimizeResume response content:', responseContent); 

  // if (!markdown) {
  //   console.error('[OpenAI] optimizeResume missing content payload:', payload);
  //   throw new Error('OpenAI response did not include resume content.');
  // }

  return responseContent;
  // return normalizeMarkdown(markdown);
}

function logSize(label, bytes) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  console.log(`[OpenAI] ${label}: ${bytes} bytes | ${kb.toFixed(2)} KB | ${mb.toFixed(4)} MB`);
}

async function safeParseJSON(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function localMarkdownFallback(raw) {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  const [firstLine = 'Job Description'] = normalized.split('\n').filter(Boolean);

  return `# ${firstLine.replace(/^[#\s]+/, '')}\n\n${normalized}`;
}

function localResumeFallback(baseResume, jobDescription, jobTitle) {
  const heading = jobTitle ? `# ${jobTitle} Resume (Dev Fallback)` : '# Tailored Resume (Dev Fallback)';
  return `${heading}\n\n> This resume was generated using the local development fallback.\n\n${baseResume}\n\n---\n\n## Target Role Notes\n\n${jobDescription}`;
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

function buildFormattedResponse(rawMarkdown, sourceText) {
  const normalized = normalizeMarkdown(rawMarkdown);
  let { sanitizedMarkdown, salary } = extractSalaryMetadata(normalized);
  let hasSectionFlag = hasSalarySection(sanitizedMarkdown);

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

function extractMessageContent(payload) {
  const text =
    flattenChoiceCollection(payload?.choices) || flattenChoiceCollection(payload?.output?.choices);
  return text?.trim() || null;
}

function flattenChoiceCollection(collection) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return null;
  }
  for (const choice of collection) {
    const message = choice?.message ?? choice?.delta ?? null;
    if (!message) {
      continue;
    }

    const flattened = flattenContent([
      message.content,
      message.text,
      choice.content,
      choice.text,
      message,
    ]);

    if (flattened?.trim()) {
      return flattened;
    }
  }
  return null;
}

function flattenContent(node) {
  if (node == null) {
    return '';
  }

  if (typeof node === 'string') {
    return node;
  }

  if (typeof node === 'number' || typeof node === 'boolean') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node
      .map(flattenContent)
      .filter(Boolean)
      .join('\n');
  }

  if (typeof node === 'object') {
    if (typeof node.type === 'string') {
      if (node.type === 'output_text' && Array.isArray(node.text)) {
        return node.text.map(flattenContent).join('\n');
      }

      if (node.type === 'text' && typeof node.text === 'string') {
        return node.text;
      }
    }

    if (typeof node.text === 'string') {
      return node.text;
    }

    if (node.text?.value) {
      return flattenContent(node.text.value);
    }

    if (Array.isArray(node.text)) {
      return node.text.map(flattenContent).join('\n');
    }

    if (typeof node.content === 'string') {
      return node.content;
    }

    if (Array.isArray(node.content)) {
      return node.content.map(flattenContent).join('\n');
    }

    if (node.content?.value) {
      return flattenContent(node.content.value);
    }

    if (typeof node.value === 'string') {
      return node.value;
    }

    if (Array.isArray(node.value)) {
      return node.value.map(flattenContent).join('\n');
    }

    if (typeof node.message === 'string') {
      return node.message;
    }

    if (Array.isArray(node.message)) {
      return node.message.map(flattenContent).join('\n');
    }

    if (typeof node.output_text === 'string') {
      return node.output_text;
    }

    if (Array.isArray(node.output_text)) {
      return node.output_text.map(flattenContent).join('\n');
    }

    if (typeof node.arguments === 'string') {
      try {
        const parsed = JSON.parse(node.arguments);
        return flattenContent(parsed);
      } catch {
        return node.arguments;
      }
    }

    if (Array.isArray(node.arguments)) {
      return node.arguments.map(flattenContent).join('\n');
    }

    return Object.values(node)
      .map(flattenContent)
      .filter(Boolean)
      .join('\n');
  }

  return '';
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
