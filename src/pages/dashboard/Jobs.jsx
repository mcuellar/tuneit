import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatJobDescription, optimizeResume } from '../../services/openai';
import { formatSalaryRange, normalizeSalaryDetails } from '../../utils/salary';
import { useAuth } from '../../context/AuthContext';

const STORAGE_KEY = 'tuneit_jobs_v1';
const RESUMES_STORAGE_KEY = 'tuneit_resumes_v1';
const BASE_RESUME_COLLAPSE_KEY = 'tuneit_base_resume_collapsed_v1';
const JOB_LIST_COLLAPSE_KEY = 'tuneit_job_list_collapsed_v1';
const PREVIEW_MODES = {
  JOB: 'job',
  RESUME: 'resume',
};

function sortJobsByCreated(entries = []) {
  return entries
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

const MARKDOWN_TIPS_SNIPPET = `# Summary
- Start with a strong achievement or core value
- Mention the years of experience that match the role

## Experience
**Senior Product Manager — Acme Corp** _(2022 – Present)_
- Ship outcomes using verbs + metrics ("Increased NPS by 14%")
- Mirror keywords from the job description naturally

## Skills
- Group skills with commas (Design Strategy, Roadmapping, A/B Testing)`;

function DashboardJobs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateBaseResume } = useAuth();
  const [jobInput, setJobInput] = useState('');
  const [jobs, setJobs] = useState([]);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editingError, setEditingError] = useState(null);
  const [previewMode, setPreviewMode] = useState(PREVIEW_MODES.JOB);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState(null);
  const [optimizingJobTitle, setOptimizingJobTitle] = useState('');
  const [baseResume, setBaseResume] = useState('');
  const [baseResumeDraft, setBaseResumeDraft] = useState('');
  const [baseResumeMessage, setBaseResumeMessage] = useState(null);
  const [isBaseResumeEditing, setIsBaseResumeEditing] = useState(false);
  const [isBaseResumeSaving, setIsBaseResumeSaving] = useState(false);
  const [isBaseResumeCollapsed, setIsBaseResumeCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    try {
      const stored = window.localStorage.getItem(BASE_RESUME_COLLAPSE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // ignore storage errors and fall back to default collapsed state
    }
    return true;
  });
  const [isJobListCollapsed, setIsJobListCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const stored = window.localStorage.getItem(JOB_LIST_COLLAPSE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // ignore storage errors and fall back to default expanded state
    }
    return false;
  });
  const [isCompareView, setIsCompareView] = useState(false);
  const [isMarkdownTipsOpen, setIsMarkdownTipsOpen] = useState(false);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const [previewBanner, setPreviewBanner] = useState(null);
  const baseResumeCardRef = useRef(null);
  const baseResumeEditorRef = useRef(null);
  const editingTextareaRef = useRef(null);
  const jobPreviewRef = useRef(null);
  const previewBannerTimeoutRef = useRef(null);

  useEffect(() => {
    if (!profile) {
      setBaseResume('');
      if (!isBaseResumeEditing) {
        setBaseResumeDraft('');
      }
      return;
    }

    const nextResume = typeof profile.base_resume === 'string' ? profile.base_resume : '';
    setBaseResume(nextResume);
    if (!isBaseResumeEditing) {
      setBaseResumeDraft(nextResume);
    }
  }, [profile, isBaseResumeEditing]);

  const showPreviewBanner = nextBanner => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(previewBannerTimeoutRef.current ?? undefined);
    }

    if (!nextBanner) {
      setPreviewBanner(null);
      previewBannerTimeoutRef.current = null;
      return;
    }

    setPreviewBanner(nextBanner);

    if (typeof window !== 'undefined') {
      previewBannerTimeoutRef.current = window.setTimeout(() => {
        setPreviewBanner(null);
        previewBannerTimeoutRef.current = null;
      }, 2600);
    }
  };

  const persistBaseResumeCollapsed = nextValue => {
    setIsBaseResumeCollapsed(nextValue);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(BASE_RESUME_COLLAPSE_KEY, String(nextValue));
      } catch {
        // ignore storage errors
      }
    }
  };

  const persistJobListCollapsed = nextValue => {
    setIsJobListCollapsed(nextValue);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(JOB_LIST_COLLAPSE_KEY, String(nextValue));
      } catch {
        // ignore storage errors
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .filter(Boolean)
            .map(job => ({
              ...job,
              original: job.original ?? '',
              formatted: job.formatted ?? job.original ?? '',
              optimizedResume: job.optimizedResume ?? '',
              salary: normalizeSalaryDetails(job.salary) ?? null,
            }));

          if (normalized.length > 0) {
            const ordered = sortJobsByCreated(normalized);
            setJobs(ordered);
            setSelectedJobId(ordered[0].id);
          }
        }
      }
    } catch (storageError) {
      console.warn('[TuneIt] Unable to hydrate saved jobs from localStorage.', storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch (storageError) {
      console.warn('[TuneIt] Unable to persist jobs to localStorage.', storageError);
    }
  }, [jobs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const snapshot = {
      jobs: jobs
        .filter(job => job.optimizedResume)
        .map(job => ({
          jobId: job.id,
          title: getJobTitle(job),
          content: job.optimizedResume,
          optimizedAt: job.resumeUpdatedAt ?? job.updatedAt ?? job.createdAt,
        })),
    };

    try {
      window.localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (storageError) {
      console.warn('[TuneIt] Unable to persist resumes snapshot to localStorage.', storageError);
    }
  }, [jobs]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedResumes = window.localStorage.getItem(RESUMES_STORAGE_KEY);
      if (!storedResumes) {
        return;
      }

      const parsed = JSON.parse(storedResumes);
      if (parsed && typeof parsed === 'object') {
        const resumeJobs = parsed.jobs || [];
        if (Array.isArray(resumeJobs) && resumeJobs.length > 0) {
          setJobs(prevJobs => {
            const merged = [...prevJobs];

            resumeJobs.forEach(resumeEntry => {
              const index = merged.findIndex(job => job.id === resumeEntry.jobId);
              if (index !== -1) {
                merged[index] = {
                  ...merged[index],
                  optimizedResume: resumeEntry.content,
                  resumeUpdatedAt: resumeEntry.optimizedAt,
                };
              }
            });

            return sortJobsByCreated(merged);
          });
        }

      }
    } catch (storageError) {
      console.warn('[TuneIt] Unable to hydrate resume data from localStorage.', storageError);
    }
  }, []);

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
      setPreviewMode(PREVIEW_MODES.JOB);
      return;
    }

    if (selectedJobId && !jobs.some(job => job.id === selectedJobId)) {
      setSelectedJobId(jobs[0]?.id ?? null);
      setPreviewMode(PREVIEW_MODES.JOB);
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    if (!isMarkdownTipsOpen) {
      return;
    }

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setIsMarkdownTipsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMarkdownTipsOpen]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(previewBannerTimeoutRef.current ?? undefined);
    }
  }, []);

  const dateFormatter = useMemo(
    () =>
      typeof Intl !== 'undefined'
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : null,
    [],
  );

  const filteredJobs = useMemo(() => {
    const term = jobSearchTerm.trim().toLowerCase();
    if (!term) {
      return jobs;
    }

    return jobs.filter(job => {
      const titleText = getJobTitle(job).toLowerCase();
      const jobText = `${job.formatted || ''} ${job.original || ''}`.toLowerCase();
      const resumeText = (job.optimizedResume || '').toLowerCase();
      const salaryLabel = getJobSalaryLabel(job);
      const salaryText = salaryLabel && salaryLabel !== 'Not provided' ? salaryLabel.toLowerCase() : '';
      return (
        titleText.includes(term) ||
        jobText.includes(term) ||
        resumeText.includes(term) ||
        salaryText.includes(term)
      );
    });
  }, [jobs, jobSearchTerm]);

  const jobStatusLabel = jobSearchTerm.trim()
    ? `${filteredJobs.length} match${filteredJobs.length === 1 ? '' : 'es'}`
    : `${jobs.length} saved`;

  const selectedJob = jobs.find(job => job.id === selectedJobId) || null;
  useEffect(() => {
    if (!selectedJob && isCompareView) {
      setIsCompareView(false);
    }
  }, [selectedJob, isCompareView]);
  const activePreviewContent = selectedJob
    ? previewMode === PREVIEW_MODES.RESUME
      ? selectedJob.optimizedResume || ''
      : selectedJob.formatted || selectedJob.original || ''
    : '';
  const optimizingLabel = optimizingJobTitle || (selectedJob ? getJobTitle(selectedJob) : 'selected job');
  const canDownloadPreview = Boolean(
    selectedJob &&
      !isEditing &&
      activePreviewContent &&
      activePreviewContent.trim(),
  );

  const handleSave = async event => {
    event.preventDefault();

    const trimmed = jobInput.trim();
    if (!trimmed) {
      setError('Paste a job description before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { markdown: formatted, salary } = await formatJobDescription(trimmed);
      const normalizedSalary = normalizeSalaryDetails(salary) ?? null;
      const job = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        original: trimmed,
        formatted,
        salary: normalizedSalary,
        createdAt: new Date().toISOString(),
      };

      setJobs(prev => sortJobsByCreated([job, ...prev]));
      setSelectedJobId(job.id);
      setJobInput('');
    } catch (formatError) {
      console.error('[TuneIt] Unable to save job description.', formatError);
      setError(formatError.message || 'Unable to save job. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const createPrintablePreview = () => {
    if (typeof document === 'undefined' || !jobPreviewRef.current) {
      return null;
    }

    const source = jobPreviewRef.current;
    const sourceBounds = source.getBoundingClientRect();
    const computed = typeof window !== 'undefined' ? window.getComputedStyle(source) : null;
    const backgroundColor = computed && computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? computed.backgroundColor
      : '#ffffff';
    const textColor = computed && computed.color ? computed.color : '#1f2333';
    const fontFamily = computed && computed.fontFamily ? computed.fontFamily : 'inherit';
    const width = sourceBounds && sourceBounds.width ? Math.ceil(sourceBounds.width) : 680;

    const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.width = `${Math.max(480, width)}px`;
  wrapper.style.maxWidth = `${Math.max(480, width)}px`;
    wrapper.style.padding = '0';
    wrapper.style.backgroundColor = backgroundColor;
    wrapper.style.color = textColor;
    wrapper.style.zIndex = '-1';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.fontFamily = fontFamily;
  wrapper.style.overflow = 'visible';
  wrapper.style.lineHeight = computed && computed.lineHeight ? computed.lineHeight : 'inherit';

    const clone = source.cloneNode(true);
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.paddingRight = '0';
    clone.style.boxSizing = 'border-box';
    clone.style.backgroundColor = backgroundColor;
    clone.style.color = textColor;
    clone.style.fontFamily = fontFamily;
  clone.style.lineHeight = wrapper.style.lineHeight;
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    return {
      node: wrapper,
      cleanup: () => {
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
      },
    };
  };

  const createDownloadFilename = suffix => {
    if (!selectedJob) {
      return `tuneit-${suffix}.pdf`;
    }

    const title = getJobTitle(selectedJob);
    const normalized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const safeSlug = normalized || 'job';
    return `${safeSlug}-${suffix}.pdf`;
  };

  const handleDownloadPreviewPdf = async () => {
    if (!selectedJob || !jobPreviewRef.current || !canDownloadPreview) {
      return;
    }

    setIsDownloadingPreview(true);
    showPreviewBanner(null);

    const printable = createPrintablePreview();
    if (!printable) {
      setIsDownloadingPreview(false);
      showPreviewBanner({ type: 'error', text: 'Unable to prepare PDF. Please try again.' });
      return;
    }

    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const suffix = previewMode === PREVIEW_MODES.RESUME ? 'resume' : 'job-description';
      const filename = createDownloadFilename(suffix);
      const scaleBase = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
      const scale = Math.min(2.8, Math.max(1.8, scaleBase));

      const captureTarget = printable.node.firstChild || printable.node;
      const captureRect = captureTarget.getBoundingClientRect();
      const rawAnchors = Array.from(captureTarget.querySelectorAll('a[href]')).map(anchor => {
        const rect = anchor.getBoundingClientRect();
        return {
          href: anchor.getAttribute('href') || anchor.href || '',
          left: rect.left - captureRect.left,
          top: rect.top - captureRect.top,
          width: rect.width,
          height: rect.height,
        };
      }).filter(item => item.href && item.width > 1 && item.height > 1);

      const canvas = await html2canvas(captureTarget, {
        scale,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
      });

      const scaleFactor = captureRect.width ? canvas.width / captureRect.width : scale;
      const anchorRegions = rawAnchors.map(anchor => ({
        href: anchor.href,
        leftPx: anchor.left * scaleFactor,
        topPx: anchor.top * scaleFactor,
        widthPx: anchor.width * scaleFactor,
        heightPx: anchor.height * scaleFactor,
      }));

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 40;
      const marginY = 48;
      const printableWidth = pageWidth - marginX * 2;
      const printableHeight = pageHeight - marginY * 2;
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeightPx = Math.floor((canvas.width * printableHeight) / imgWidth);
      let remainingHeight = canvas.height;
      let positionPx = 0;
      let pageIndex = 0;

      const sliceCanvas = document.createElement('canvas');

      while (remainingHeight > 0) {
        const sliceHeightPx = Math.min(pageHeightPx, remainingHeight);
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const sliceContext = sliceCanvas.getContext('2d');
        if (!sliceContext) {
          throw new Error('Unable to capture PDF slice.');
        }
        sliceContext.drawImage(
          canvas,
          0,
          positionPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );

        const sliceImageData = sliceCanvas.toDataURL('image/png');
        const sliceHeightPdf = (sliceHeightPx * imgWidth) / canvas.width;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(sliceImageData, 'PNG', marginX, marginY, imgWidth, sliceHeightPdf);

        const sliceStartPx = positionPx;
        const sliceEndPx = positionPx + sliceHeightPx;
        anchorRegions.forEach(anchor => {
          const anchorBottom = anchor.topPx + anchor.heightPx;
          if (anchorBottom <= sliceStartPx || anchor.topPx >= sliceEndPx) {
            return;
          }

          const overlapTopPx = Math.max(anchor.topPx, sliceStartPx);
          const overlapBottomPx = Math.min(anchorBottom, sliceEndPx);
          const overlapHeightPx = Math.max(0, overlapBottomPx - overlapTopPx);
          const offsetWithinSlicePx = overlapTopPx - sliceStartPx;
          const linkX = marginX + (anchor.leftPx * imgWidth) / canvas.width;
          const linkY = marginY + (offsetWithinSlicePx * imgWidth) / canvas.width;
          const linkWidth = (anchor.widthPx * imgWidth) / canvas.width;
          const linkHeight = (overlapHeightPx * imgWidth) / canvas.width;

          if (!linkWidth || !linkHeight) {
            return;
          }

          pdf.link(linkX, linkY, linkWidth, linkHeight, { url: anchor.href });
        });

        remainingHeight -= sliceHeightPx;
        positionPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(filename);
      showPreviewBanner({ type: 'success', text: 'PDF download ready.' });
    } catch (downloadError) {
      console.error('[TuneIt] Unable to download preview PDF.', downloadError);
      showPreviewBanner({ type: 'error', text: 'Unable to download PDF. Please try again.' });
    } finally {
      printable.cleanup();
      setIsDownloadingPreview(false);
    }
  };

  const handleSelectJob = (jobId, mode = PREVIEW_MODES.JOB) => {
    if (isEditing) {
      setIsEditing(false);
      setEditingError(null);
    }
    const targetJob = jobs.find(job => job.id === jobId);
    if (mode === PREVIEW_MODES.RESUME && targetJob && !targetJob.optimizedResume) {
      setOptimizeError('Optimize this job to generate a tailored resume.');
      return;
    }

    setPreviewMode(mode);
    setOptimizeError(null);
    showPreviewBanner(null);
    setSelectedJobId(jobId);
  };

  useEffect(() => {
    if (!location.state || typeof location.state !== 'object') {
      return;
    }

    const { jobId, previewMode: requestedMode } = location.state;
    if (!jobId) {
      navigate('/dashboard', { replace: true, state: null });
      return;
    }

    const targetJob = jobs.find(job => job.id === jobId);
    if (!targetJob) {
      // Wait until jobs hydrate before clearing navigation state.
      return;
    }

    const mode = requestedMode === PREVIEW_MODES.RESUME ? PREVIEW_MODES.RESUME : PREVIEW_MODES.JOB;

    if (isEditing) {
      setIsEditing(false);
      setEditingError(null);
    }

    if (mode === PREVIEW_MODES.RESUME && !targetJob.optimizedResume) {
      setOptimizeError('Optimize this job to generate a tailored resume.');
    } else {
      setOptimizeError(null);
      setPreviewMode(mode);
      setSelectedJobId(jobId);
    }

    navigate('/dashboard', { replace: true, state: null });
  }, [location.state, jobs, isEditing, navigate]);

  const handleDeleteRequest = job => {
    setPendingDeleteJob(job);
  };

  const handleDeleteCancel = () => {
    setPendingDeleteJob(null);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDeleteJob) {
      return;
    }

    const jobId = pendingDeleteJob.id;

    setJobs(prev => {
      const updated = sortJobsByCreated(prev.filter(item => item.id !== jobId));
      if (selectedJobId === jobId) {
        setSelectedJobId(updated[0]?.id ?? null);
      }
      return updated;
    });

    setPendingDeleteJob(null);
    setIsEditing(false);
    setEditingContent('');
    setEditingError(null);
  };

  const startBaseResumeEditing = () => {
    persistBaseResumeCollapsed(false);
    setIsBaseResumeEditing(true);
    setBaseResumeDraft(baseResume);
    setBaseResumeMessage(null);
    setOptimizeError(null);
    setTimeout(() => {
      baseResumeEditorRef.current?.focus();
      baseResumeEditorRef.current?.setSelectionRange(0, 0);
    }, 0);
  };

  const cancelBaseResumeEditing = () => {
    setIsBaseResumeEditing(false);
    setBaseResumeDraft(baseResume);
    setBaseResumeMessage(null);
    setOptimizeError(null);
  };

  const handleBaseResumeSave = async () => {
    const trimmed = baseResumeDraft.trim();

    if (!trimmed) {
      setBaseResumeMessage({ type: 'error', text: 'Add resume content before saving.' });
      return;
    }

    if (!updateBaseResume) {
      setBaseResumeMessage({ type: 'error', text: 'You must be signed in to save your resume.' });
      return;
    }

    setIsBaseResumeSaving(true);
    setBaseResumeMessage(null);

    try {
      await updateBaseResume(trimmed);
      setBaseResume(trimmed);
      setBaseResumeDraft(trimmed);
      setBaseResumeMessage({ type: 'success', text: 'Base resume synced to your account.' });
      setIsBaseResumeEditing(false);
      setOptimizeError(null);

      if (typeof window !== 'undefined') {
        window.clearTimeout(handleBaseResumeSave.timeoutId);
        handleBaseResumeSave.timeoutId = window.setTimeout(() => {
          setBaseResumeMessage(null);
        }, 2500);
      }
    } catch (saveError) {
      console.error('[TuneIt] Unable to save base resume to Supabase.', saveError);
      setBaseResumeMessage({
        type: 'error',
        text: saveError?.message || 'Unable to save your base resume. Please try again.',
      });
    } finally {
      setIsBaseResumeSaving(false);
    }
  };

  const handleBaseResumeReset = () => {
    setBaseResumeDraft(baseResume);
    setBaseResumeMessage(null);
    setOptimizeError(null);
  };

  const toggleBaseResumeCollapsed = () => {
    if (isBaseResumeCollapsed) {
      persistBaseResumeCollapsed(false);
      return;
    }

    setIsBaseResumeEditing(false);
    setBaseResumeDraft(baseResume);
    setBaseResumeMessage(null);
    persistBaseResumeCollapsed(true);
  };

  const toggleJobListCollapsed = () => {
    persistJobListCollapsed(!isJobListCollapsed);
  };

  const openMarkdownTips = () => {
    setIsMarkdownTipsOpen(true);
  };

  const closeMarkdownTips = () => {
    setIsMarkdownTipsOpen(false);
  };

  const applyBaseResumeMarkdown = action => {
    const textarea = baseResumeEditorRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    let updatedValue = value;
    let cursorStart = selectionStart;
    let cursorEnd = selectionEnd;

    const wrapSelection = (before, after, placeholder = '') => {
      const insert = selectedText || placeholder;
      updatedValue = `${value.slice(0, selectionStart)}${before}${insert}${after}${value.slice(selectionEnd)}`;
      cursorStart = selectionStart + before.length;
      cursorEnd = cursorStart + insert.length;
    };

    switch (action) {
      case 'bold':
        wrapSelection('**', '**', 'bold text');
        break;
      case 'italic':
        wrapSelection('_', '_', 'italic text');
        break;
      case 'heading': {
        const lines = value.split('\n');
        const startLineIndex = value.slice(0, selectionStart).split('\n').length - 1;
        const line = lines[startLineIndex] ?? '';
        const trimmedLine = line.replace(/^#+\s*/, '');
        lines[startLineIndex] = `## ${trimmedLine || 'Heading'}`;
        updatedValue = lines.join('\n');
        cursorStart = value.indexOf(line);
        cursorEnd = cursorStart + lines[startLineIndex].length;
        break;
      }
      case 'bullet': {
        const before = value.slice(0, selectionStart);
        const selected = value.slice(selectionStart, selectionEnd) || 'List item';
        const after = value.slice(selectionEnd);
        const formatted = selected
          .split('\n')
          .map(line => (line.trim().startsWith('- ') ? line : `- ${line.trim()}`))
          .join('\n');
        updatedValue = `${before}${formatted}${after}`;
        cursorStart = selectionStart;
        cursorEnd = selectionStart + formatted.length;
        break;
      }
      case 'numbered': {
        const before = value.slice(0, selectionStart);
        const selected = value.slice(selectionStart, selectionEnd) || 'First item\nSecond item';
        const formatted = selected
          .split('\n')
          .map((line, index) => {
            const trimmed = line.trim().replace(/^\d+\.\s*/, '');
            return `${index + 1}. ${trimmed}`;
          })
          .join('\n');
        updatedValue = `${before}${formatted}${value.slice(selectionEnd)}`;
        cursorStart = selectionStart;
        cursorEnd = selectionStart + formatted.length;
        break;
      }
      case 'quote': {
        const before = value.slice(0, selectionStart);
        const selected = value.slice(selectionStart, selectionEnd) || 'Quoted text';
        const formatted = selected
          .split('\n')
          .map(line => (line.trim().startsWith('>') ? line : `> ${line.trim()}`))
          .join('\n');
        updatedValue = `${before}${formatted}${value.slice(selectionEnd)}`;
        cursorStart = selectionStart;
        cursorEnd = selectionStart + formatted.length;
        break;
      }
      default:
        return;
    }

    setBaseResumeDraft(updatedValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 0);
  };

  const handleOptimizeResume = async job => {
    if (!job) {
      return;
    }

    if (isEditing) {
      setIsEditing(false);
      setEditingError(null);
    }

    if (isBaseResumeEditing) {
      setIsBaseResumeEditing(false);
      setBaseResumeDraft(baseResume);
    }

    const trimmedResume = baseResume.trim();
    if (!trimmedResume) {
      setOptimizeError('Add your base resume above before optimizing.');
      baseResumeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const jobContent = (job.formatted || job.original || '').trim();
    if (!jobContent) {
      setOptimizeError('This job does not have content to optimize yet.');
      return;
    }

    setPreviewMode(PREVIEW_MODES.RESUME);
    setOptimizeError(null);
    setOptimizingJobTitle(getJobTitle(job));
    setIsOptimizing(true);

    try {
      const optimized = await optimizeResume({
        baseResume: trimmedResume,
        jobDescription: jobContent,
        jobTitle: getJobTitle(job),
      });

      let updatedJobsSnapshot = [];
      setJobs(prev => {
        const next = sortJobsByCreated(
          prev.map(item =>
          item.id === job.id
            ? {
                ...item,
                optimizedResume: optimized,
                resumeUpdatedAt: new Date().toISOString(),
              }
              : item,
          ),
        );
        updatedJobsSnapshot = next;
        return next;
      });

      if (typeof window !== 'undefined' && updatedJobsSnapshot.length > 0) {
        const snapshot = {
          baseResume: trimmedResume,
          jobs: updatedJobsSnapshot
            .filter(item => item.optimizedResume)
            .map(item => ({
              jobId: item.id,
              title: getJobTitle(item),
              content: item.optimizedResume,
              optimizedAt: item.resumeUpdatedAt ?? item.updatedAt ?? item.createdAt,
            })),
        };

        try {
          window.localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(snapshot));
        } catch (snapshotError) {
          console.warn('[TuneIt] Unable to persist optimized resume snapshot.', snapshotError);
        }
      }

      setSelectedJobId(job.id);
      setEditingContent(optimized);
      navigate('/dashboard/resumes', { state: { highlightJobId: job.id } });
    } catch (optimizationError) {
      console.error('[TuneIt] Unable to optimize resume.', optimizationError);
      setOptimizeError(optimizationError.message || 'Unable to optimize resume. Please try again.');
    } finally {
      setIsOptimizing(false);
      setOptimizingJobTitle('');
    }
  };
  
  const toggleCompareView = () => {
    if (!selectedJob || isEditing) {
      return;
    }
    setIsCompareView(prev => !prev);
    showPreviewBanner(null);
  };

  const handleFocusPreviewPane = pane => {
    if (!selectedJob) {
      return;
    }
    if (pane === PREVIEW_MODES.RESUME && !selectedJob.optimizedResume) {
      setOptimizeError('Optimize this job to generate a tailored resume.');
      return;
    }
    setPreviewMode(pane);
    setOptimizeError(null);
    showPreviewBanner(null);
  };

  const startEditing = () => {
    if (!selectedJob) {
      return;
    }
    if (previewMode === PREVIEW_MODES.RESUME && !selectedJob.optimizedResume) {
      setOptimizeError('Optimize this job before editing the tailored resume.');
      return;
    }

    setIsCompareView(false);
    setIsEditing(true);
    setEditingError(null);
    showPreviewBanner(null);

    const source =
      previewMode === PREVIEW_MODES.RESUME
        ? selectedJob.optimizedResume || ''
        : selectedJob.formatted || selectedJob.original || '';

    setEditingContent(source);

    requestAnimationFrame(() => {
      editingTextareaRef.current?.focus();
      editingTextareaRef.current?.setSelectionRange(0, 0);
    });
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingError(null);
    setEditingContent(activePreviewContent);
    showPreviewBanner(null);
  };

  const handleEditSave = () => {
    if (!selectedJob) {
      return;
    }

    const trimmed = editingContent.trim();
    if (!trimmed) {
      setEditingError('Provide Markdown content before saving.');
      return;
    }

    setJobs(prev =>
      sortJobsByCreated(
        prev.map(job => {
        if (job.id !== selectedJob.id) {
          return job;
        }

        if (previewMode === PREVIEW_MODES.RESUME) {
          return {
            ...job,
            optimizedResume: trimmed,
            resumeUpdatedAt: new Date().toISOString(),
          };
        }

        return {
          ...job,
          formatted: trimmed,
          updatedAt: new Date().toISOString(),
        };
        }),
      ),
    );

    setIsEditing(false);
    setEditingError(null);
    setEditingContent(trimmed);
  };

  const renderJobPaneContent = ref => {
    if (!selectedJob) {
      return (
        <p className="job-preview-empty">
          Select a job to see the AI-formatted Markdown preview.
        </p>
      );
    }

    const jobContent = selectedJob.formatted || selectedJob.original;
    if (!jobContent) {
      return (
        <p className="job-preview-empty">
          This job does not have content yet. Paste a description to get started.
        </p>
      );
    }

    return (
      <div className="job-preview-content" ref={ref ?? undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{jobContent}</ReactMarkdown>
      </div>
    );
  };

  const renderResumePaneContent = ref => {
    if (!selectedJob) {
      return (
        <p className="job-preview-empty">
          Select a job to view its tailored resume once optimized.
        </p>
      );
    }

    if (!selectedJob.optimizedResume) {
      return (
        <p className="job-preview-empty">
          Optimize this job to generate and view a tailored resume.
        </p>
      );
    }

    return (
      <div className="job-preview-content" ref={ref ?? undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {selectedJob.optimizedResume}
        </ReactMarkdown>
      </div>
    );
  };

  const applyMarkdownSnippet = action => {
    const textarea = editingTextareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    let updatedValue = value;
    let cursorStart = selectionStart;
    let cursorEnd = selectionEnd;

    const wrapSelection = (before, after, placeholder = '') => {
      const insert = selectedText || placeholder;
      updatedValue = `${value.slice(0, selectionStart)}${before}${insert}${after}${value.slice(selectionEnd)}`;
      cursorStart = selectionStart + before.length;
      cursorEnd = cursorStart + insert.length;
    };

    switch (action) {
      case 'bold':
        wrapSelection('**', '**', 'bold text');
        break;
      case 'italic':
        wrapSelection('_', '_', 'italic text');
        break;
      case 'heading': {
        const lines = value.split('\n');
        const startLineIndex = value.slice(0, selectionStart).split('\n').length - 1;
        const line = lines[startLineIndex] ?? '';
        const trimmedLine = line.replace(/^#+\s*/, '');
        lines[startLineIndex] = `## ${trimmedLine || 'Heading'}`;
        updatedValue = lines.join('\n');
        cursorStart = value.indexOf(line);
        cursorEnd = cursorStart + lines[startLineIndex].length;
        break;
      }
      case 'bullet': {
        const before = value.slice(0, selectionStart);
        const selected = value.slice(selectionStart, selectionEnd) || 'List item';
        const after = value.slice(selectionEnd);
        const formatted = selected
          .split('\n')
          .map(line => (line.trim().startsWith('- ') ? line : `- ${line.trim()}`))
          .join('\n');
        updatedValue = `${before}${formatted}${after}`;
        cursorStart = selectionStart;
        cursorEnd = selectionStart + formatted.length;
        break;
      }
      case 'numbered': {
        const before = value.slice(0, selectionStart);
        const selected = value.slice(selectionStart, selectionEnd) || 'First item\nSecond item';
        const formatted = selected
          .split('\n')
          .map((line, index) => {
            const trimmed = line.trim().replace(/^\d+\.\s*/, '');
            return `${index + 1}. ${trimmed}`;
          })
          .join('\n');
        updatedValue = `${before}${formatted}${value.slice(selectionEnd)}`;
        cursorStart = selectionStart;
        cursorEnd = selectionStart + formatted.length;
        break;
      }
      case 'quote': {
        const before = value.slice(0, selectionStart);
        const selected = value.slice(selectionStart, selectionEnd) || 'Quoted text';
        const formatted = selected
          .split('\n')
          .map(line => (line.trim().startsWith('>') ? line : `> ${line.trim()}`))
          .join('\n');
        updatedValue = `${before}${formatted}${value.slice(selectionEnd)}`;
        cursorStart = selectionStart;
        cursorEnd = selectionStart + formatted.length;
        break;
      }
      default:
        return;
    }

    setEditingContent(updatedValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  useEffect(() => {
    if (!selectedJob) {
      setIsEditing(false);
      setEditingContent('');
      return;
    }

    if (!isEditing) {
      setEditingContent(activePreviewContent);
    }
  }, [selectedJob, isEditing, activePreviewContent]);

  function getJobTitle(job) {
    const source = (job.formatted || job.original || '').toString();
    const lines = source
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return 'Untitled Job';
    }

    const firstContentLine = lines.find(line => !line.startsWith('![')) ?? lines[0];
    return firstContentLine.replace(/^#+\s*/, '') || 'Untitled Job';
  }

  function getJobSnippet(job) {
    const source = (job.formatted || job.original || '').toString();
    const plain = source.replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim();
    if (plain.length <= 120) {
      return plain;
    }
    return `${plain.slice(0, 117)}…`;
  }

  function getJobSalaryLabel(job) {
    const salaryDetails = normalizeSalaryDetails(job?.salary);
    if (!salaryDetails) {
      return 'Not provided';
    }

    return salaryDetails.range || formatSalaryRange(salaryDetails) || 'Not provided';
  }

  return (
    <section className="dashboard-content jobs-layout">
      <article className="dashboard-card job-entry-card">
        <div className="card-header">
          <div className="card-header-main">
            <h2>Add a Job</h2>
            <span className="card-status">AI Markdown Formatting</span>
          </div>
        </div>
        <p>Paste a new job description below and TuneIt will polish it as Markdown once you save.</p>

        <form className="job-entry-form" onSubmit={handleSave}>
          <label htmlFor="job-description" className="job-entry-label">
            Job Description
          </label>
          <textarea
            id="job-description"
            name="job-description"
            className="job-entry-textarea"
            placeholder="Paste the full job description here..."
            value={jobInput}
            onChange={event => setJobInput(event.target.value)}
            disabled={isSaving}
            required
          />

          {error ? <p className="job-entry-error" role="alert">{error}</p> : null}

          <div className="job-entry-actions">
            <span className="job-entry-hint">Supports plain text or Markdown snippets.</span>
            <button type="submit" className="job-entry-save" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </article>

      <article ref={baseResumeCardRef} className="dashboard-card base-resume-card">
        <div className="card-header">
          <div className="card-header-main">
            <h2>Your Base Resume</h2>
            <span className="card-status">
              {baseResume ? 'Saved' : 'Required for Optimization'}
            </span>
          </div>
          <div className="card-header-actions">
            {baseResume && !isBaseResumeEditing && !isBaseResumeCollapsed ? (
              <button
                type="button"
                className="preview-edit-trigger"
                onClick={startBaseResumeEditing}
                title="Edit base resume"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                  <path
                    d="M5 18.5 3.5 20 4 17l9.5-9.5 2 2L5 18.5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m14.5 5.5 2-2 2 2-2 2-2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className={`collapse-toggle${isBaseResumeCollapsed ? ' is-collapsed' : ''}`}
              onClick={toggleBaseResumeCollapsed}
              aria-expanded={!isBaseResumeCollapsed}
              aria-controls="base-resume-panel"
              disabled={isBaseResumeEditing}
            >
              <span>{isBaseResumeCollapsed ? 'Expand' : 'Collapse'}</span>
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d={isBaseResumeCollapsed ? 'M12 9l6 6H6l6-6Z' : 'M12 15l-6-6h12l-6 6Z'}
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          id="base-resume-panel"
          className={`base-resume-panel${isBaseResumeCollapsed ? ' is-collapsed' : ''}`}
        >
          {isBaseResumeCollapsed ? (
            <p className="base-resume-collapsed-message">
              Base resume hidden. Expand to review, edit, or add details before optimizing.
            </p>
          ) : isBaseResumeEditing ? (
            <div className="job-preview-editor base-resume-editor">
              <p className="base-resume-lede">
                TuneIt uses your base resume as the starting point for every tailored version.
              </p>
              <div className="markdown-toolbar" role="group" aria-label="Markdown formatting options">
                <button type="button" onClick={() => applyBaseResumeMarkdown('bold')}>
                  Bold
                </button>
                <button type="button" onClick={() => applyBaseResumeMarkdown('italic')}>
                  Italic
                </button>
                <button type="button" onClick={() => applyBaseResumeMarkdown('heading')}>
                  Heading
                </button>
                <button type="button" onClick={() => applyBaseResumeMarkdown('bullet')}>
                  Bullet List
                </button>
                <button type="button" onClick={() => applyBaseResumeMarkdown('numbered')}>
                  Numbered List
                </button>
                <button type="button" onClick={() => applyBaseResumeMarkdown('quote')}>
                  Quote
                </button>
              </div>
              <textarea
                ref={baseResumeEditorRef}
                className="job-preview-textarea base-resume-textarea"
                placeholder="Paste your core resume here before tailoring it to each job."
                value={baseResumeDraft}
                onChange={event => setBaseResumeDraft(event.target.value)}
                rows={12}
              />
              <div className="base-resume-editor-actions">
                <button type="button" className="editor-cancel" onClick={cancelBaseResumeEditing}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="editor-cancel"
                  onClick={handleBaseResumeReset}
                  disabled={isBaseResumeSaving || baseResumeDraft === baseResume}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="editor-save"
                  onClick={handleBaseResumeSave}
                  disabled={
                    isBaseResumeSaving ||
                    !baseResumeDraft.trim() ||
                    baseResumeDraft.trim() === baseResume.trim()
                  }
                >
                  {isBaseResumeSaving ? 'Saving…' : 'Save Base Resume'}
                </button>
              </div>
            </div>
          ) : baseResume ? (
            <>
              <p className="base-resume-lede">
                TuneIt uses your base resume as the starting point for every tailored version.
              </p>
              <div className="job-preview-content base-resume-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{baseResume}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="base-resume-empty">
              <p>
                Save your base resume to give TuneIt the right context before optimizing a job.
              </p>
              <button type="button" className="base-resume-button" onClick={startBaseResumeEditing}>
                Add Base Resume
              </button>
            </div>
          )}

          {!isBaseResumeCollapsed && baseResumeMessage ? (
            <p
              className={`resume-status resume-status--${baseResumeMessage.type}`}
              role={baseResumeMessage.type === 'error' ? 'alert' : 'status'}
            >
              {baseResumeMessage.text}
            </p>
          ) : null}
        </div>
      </article>

      {optimizeError ? (
        <p className="optimize-error" role="alert">{optimizeError}</p>
      ) : null}

      <div className="jobs-grid">
        <article className="dashboard-card job-list-card">
          <div className="card-header">
            <div className="card-header-main">
              <h2>Your Jobs</h2>
              <span className="card-status">{jobStatusLabel}</span>
            </div>
            <div className="card-header-actions job-list-header-actions">
              <div className="job-list-toolbar">
                <div className="job-search" role="search">
                  <svg
                    className="job-search-icon"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="m16 16 4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="search"
                    className="job-search-input"
                    placeholder="Search jobs"
                    value={jobSearchTerm}
                    onChange={event => setJobSearchTerm(event.target.value)}
                    aria-label="Search saved jobs"
                  />
                  {jobSearchTerm ? (
                    <button
                      type="button"
                      className="job-search-clear"
                      onClick={() => setJobSearchTerm('')}
                      aria-label="Clear job search"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className={`collapse-toggle${isJobListCollapsed ? ' is-collapsed' : ''}`}
                onClick={toggleJobListCollapsed}
                aria-expanded={!isJobListCollapsed}
                aria-controls="job-list-panel"
              >
                <span>{isJobListCollapsed ? 'Expand' : 'Collapse'}</span>
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d={isJobListCollapsed ? 'M12 9l6 6H6l6-6Z' : 'M12 15l-6-6h12l-6 6Z'}
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div
            id="job-list-panel"
            className={`job-list-panel${isJobListCollapsed ? ' is-collapsed' : ''}`}
          >
            {isJobListCollapsed ? (
              <p className="job-list-collapsed-message">
                Job list hidden. Expand to manage and optimize saved postings.
              </p>
            ) : filteredJobs.length === 0 ? (
              <p className="job-list-empty">
                {jobs.length === 0
                  ? 'No jobs yet. Save your first job description to get started.'
                  : 'No jobs match your search. Try a different keyword.'}
              </p>
            ) : (
              <ul className="job-list" role="list">
                {filteredJobs.map(job => (
                  <li
                    key={job.id}
                    className={`job-list-item${job.id === selectedJobId ? ' is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="job-list-trigger"
                      onClick={() => handleSelectJob(job.id)}
                      aria-pressed={job.id === selectedJobId}
                    >
                      <span className="job-list-title">{getJobTitle(job)}</span>
                      <span className="job-list-snippet">{getJobSnippet(job)}</span>
                      <span className="job-list-salary">Salary: {getJobSalaryLabel(job)}</span>
                      {dateFormatter ? (
                        <span className="job-list-timestamp">
                          Saved {dateFormatter.format(new Date(job.createdAt))}
                        </span>
                      ) : null}
                    </button>
                    <div className="job-list-actions">
                      <button
                        type="button"
                        className="job-action-button job-action-button--ghost"
                        onClick={() => handleSelectJob(job.id, PREVIEW_MODES.JOB)}
                      >
                        View JD
                      </button>
                      <button
                        type="button"
                        className="job-action-button job-action-button--ghost"
                        onClick={() => handleSelectJob(job.id, PREVIEW_MODES.RESUME)}
                        title={job.optimizedResume ? 'View tailored resume' : 'Optimize this job to view the tailored resume'}
                        disabled={!job.optimizedResume}
                      >
                        View Resume
                      </button>
                      <button
                        type="button"
                        className="job-action-button"
                        onClick={() => handleOptimizeResume(job)}
                        disabled={isOptimizing}
                      >
                        Optimize
                      </button>
                      <button
                        type="button"
                        className="job-action-button job-action-button--danger"
                        onClick={() => handleDeleteRequest(job)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article className="dashboard-card job-preview-card">
          <div className="card-header">
            <div className="card-header-main">
              <h2>Preview</h2>
              <span className="card-status">
                {previewMode === PREVIEW_MODES.RESUME ? 'Tailored Resume' : 'Markdown'}
              </span>
            </div>
            <div className="card-header-actions">
              <button
                type="button"
                className={`compare-toggle${isCompareView ? ' is-active' : ''}`}
                onClick={toggleCompareView}
                aria-pressed={isCompareView}
                disabled={!selectedJob || isEditing}
              >
                {isCompareView ? 'Single View' : 'Compare View'}
              </button>
              <button
                type="button"
                className="markdown-tips-button"
                onClick={openMarkdownTips}
              >
                Markdown Tips
              </button>
              <button
                type="button"
                className="preview-download-button"
                onClick={handleDownloadPreviewPdf}
                disabled={!canDownloadPreview || isDownloadingPreview}
                title={canDownloadPreview ? 'Download current preview as PDF' : 'Select a job preview to download as PDF'}
              >
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3.5a.75.75 0 0 1 .75.75v7.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4.02 4.02a.75.75 0 0 1-1.06 0L7.47 9.78a.75.75 0 0 1 1.06-1.06l2.72 2.72V4.25A.75.75 0 0 1 12 3.5Zm-7 11.75a.75.75 0 0 0-.75.75v2.25A2.25 2.25 0 0 0 6.5 20.5h11a2.25 2.25 0 0 0 2.25-2.25V16a.75.75 0 0 0-1.5 0v2.25c0 .414-.336.75-.75.75h-11a.75.75 0 0 1-.75-.75V16a.75.75 0 0 0-.75-.75Z"
                    fill="currentColor"
                  />
                </svg>
                <span>{isDownloadingPreview ? 'Preparing…' : 'Download PDF'}</span>
              </button>
              {selectedJob && !isEditing ? (
                <button
                  type="button"
                  className="preview-edit-trigger"
                  onClick={startEditing}
                  title="Edit Markdown"
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                    <path
                      d="M5 18.5 3.5 20 4 17l9.5-9.5 2 2L5 18.5Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m14.5 5.5 2-2 2 2-2 2-2-2Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          {!selectedJob ? (
            <p className="job-preview-empty">
              {previewMode === PREVIEW_MODES.RESUME
                ? 'Select a job to view its tailored resume.'
                : 'Select a job to see the AI-formatted Markdown preview.'}
            </p>
          ) : isEditing ? (
            <div className="job-preview-editor">
              <div className="markdown-toolbar" role="group" aria-label="Markdown formatting options">
                <button type="button" onClick={() => applyMarkdownSnippet('bold')}>
                  Bold
                </button>
                <button type="button" onClick={() => applyMarkdownSnippet('italic')}>
                  Italic
                </button>
                <button type="button" onClick={() => applyMarkdownSnippet('heading')}>
                  Heading
                </button>
                <button type="button" onClick={() => applyMarkdownSnippet('bullet')}>
                  Bullet List
                </button>
                <button type="button" onClick={() => applyMarkdownSnippet('numbered')}>
                  Numbered List
                </button>
                <button type="button" onClick={() => applyMarkdownSnippet('quote')}>
                  Quote
                </button>
              </div>
              <textarea
                ref={editingTextareaRef}
                className="job-preview-textarea"
                value={editingContent}
                onChange={event => setEditingContent(event.target.value)}
                aria-label={
                  previewMode === PREVIEW_MODES.RESUME
                    ? 'Edit tailored resume Markdown'
                    : 'Edit job Markdown'
                }
              />
              {editingError ? (
                <p className="job-preview-error" role="alert">
                  {editingError}
                </p>
              ) : null}
              <div className="job-preview-editor-actions">
                <button type="button" className="editor-cancel" onClick={cancelEditing}>
                  Cancel
                </button>
                <button type="button" className="editor-save" onClick={handleEditSave}>
                  Save Changes
                </button>
              </div>
            </div>
          ) : isCompareView ? (
            <div className="job-preview-compare">
              <section className="job-preview-pane" aria-label="Job description preview">
                <div className="job-preview-pane-header">
                  <div className="pane-header-text">
                    <span className="pane-title">Job Description</span>
                    <span className="pane-subtitle">AI-formatted Markdown</span>
                  </div>
                  <button
                    type="button"
                    className={`pane-focus-toggle${previewMode === PREVIEW_MODES.JOB ? ' is-active' : ''}`}
                    onClick={() => handleFocusPreviewPane(PREVIEW_MODES.JOB)}
                    aria-pressed={previewMode === PREVIEW_MODES.JOB}
                  >
                    {previewMode === PREVIEW_MODES.JOB ? 'Active' : 'Set Active'}
                  </button>
                </div>
                {renderJobPaneContent(previewMode === PREVIEW_MODES.JOB ? jobPreviewRef : null)}
              </section>
              <section className="job-preview-pane" aria-label="Tailored resume preview">
                <div className="job-preview-pane-header">
                  <div className="pane-header-text">
                    <span className="pane-title">Tailored Resume</span>
                    <span className="pane-subtitle">Optimization Output</span>
                  </div>
                  <button
                    type="button"
                    className={`pane-focus-toggle${previewMode === PREVIEW_MODES.RESUME ? ' is-active' : ''}`}
                    onClick={() => handleFocusPreviewPane(PREVIEW_MODES.RESUME)}
                    aria-pressed={previewMode === PREVIEW_MODES.RESUME}
                    disabled={!selectedJob.optimizedResume}
                  >
                    {previewMode === PREVIEW_MODES.RESUME ? 'Active' : 'Set Active'}
                  </button>
                </div>
                {renderResumePaneContent(previewMode === PREVIEW_MODES.RESUME ? jobPreviewRef : null)}
              </section>
            </div>
          ) : previewMode === PREVIEW_MODES.RESUME ? (
            renderResumePaneContent(jobPreviewRef)
          ) : (
            renderJobPaneContent(jobPreviewRef)
          )}
          {previewBanner ? (
            <p
              className={`resume-status resume-status--${previewBanner.type}`}
              role={previewBanner.type === 'error' ? 'alert' : 'status'}
            >
              {previewBanner.text}
            </p>
          ) : null}
        </article>
      </div>

      {isMarkdownTipsOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="markdown-tips-title"
          onClick={closeMarkdownTips}
        >
          <div
            className="modal markdown-tips-modal"
            onClick={event => event.stopPropagation()}
          >
            <h3 id="markdown-tips-title" className="modal-title">Markdown Tips</h3>
            <p className="modal-description">
              Use these quick pointers to format your job notes and tailored resumes with clarity.
            </p>
            <ul className="markdown-tips-list">
              <li><strong>Headings:</strong> Start sections with <code>#</code>, <code>##</code>, or <code>###</code>.</li>
              <li><strong>Bullet items:</strong> Use <code>-</code> or <code>*</code> followed by a space for concise achievements.</li>
              <li><strong>Bold keywords:</strong> Wrap important phrases with <code>**double asterisks**</code>.</li>
              <li><strong>Emphasis:</strong> Use <code>_single underscores_</code> to call out timeframe or context.</li>
              <li><strong>Line breaks:</strong> Leave a blank line between paragraphs and section headings.</li>
            </ul>
            <div className="markdown-tips-example">
              <div className="markdown-tips-code">
                <span className="markdown-tips-label">Example Markdown</span>
                <pre>{MARKDOWN_TIPS_SNIPPET}</pre>
              </div>
              <div className="markdown-tips-preview">
                <span className="markdown-tips-label">Renders As</span>
                <div className="markdown-tips-preview-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{MARKDOWN_TIPS_SNIPPET}</ReactMarkdown>
                </div>
              </div>
            </div>
            <div className="modal-actions markdown-tips-actions">
              <button
                type="button"
                className="modal-button modal-button--primary"
                onClick={closeMarkdownTips}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteJob ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-job-title" aria-describedby="delete-job-description">
          <div className="modal">
            <h3 id="delete-job-title" className="modal-title">Delete job?</h3>
            <p id="delete-job-description" className="modal-description">
              "{getJobTitle(pendingDeleteJob)}" will be permanently removed. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="modal-button modal-button--secondary" onClick={handleDeleteCancel}>
                Keep job
              </button>
              <button type="button" className="modal-button modal-button--danger" onClick={handleDeleteConfirm}>
                Delete job
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOptimizing ? (
        <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-live="assertive">
          <div className="modal optimizing-modal">
            <h3 className="modal-title">Optimizing… Please wait</h3>
            <p className="modal-description">
              Tailoring your resume for "{optimizingLabel}".
            </p>
            <div className="optimizing-spinner" aria-hidden="true" />
          </div>
        </div>
      ) : null}

    </section>
  );
}

export default DashboardJobs;
