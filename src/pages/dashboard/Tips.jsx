import './Tips.css';

const JOB_STEPS = [
  {
    title: 'Start with a base resume',
    body:
      'Load your master resume into TuneIt with as much detail as possible. The platform keeps everything handy and pulls only what each job needs during optimization.',
    extra:
      'Think of this as your personal knowledge base. Projects, metrics, and stories are safe to keep even if they do not apply to every role.',
  },
  {
    title: 'Paste the job description',
    body:
      'Drop the full posting into the Jobs board. No cleanup is necessary—TuneIt automatically formats, analyzes keywords, and extracts role essentials for you.',
    extra:
      'The richer the description, the better the tailoring engine can mirror the opportunity.',
  },
  {
    title: 'Optimize and download',
    body:
      'Select a job and click “Optimize.” TuneIt compares the active job against your base resume to generate a tailored version with matching language and prioritization.',
    extra:
      'Download the polished resume or the formatted job description whenever you need to share context with a coach or interviewer.',
  },
];

const ENCOURAGEMENTS = [
  'Content is what we are after to land you more interviews—detail every impact, metric, and story.',
  'Prepare for each interview using the same job description and resume you submitted so your narrative stays aligned.',
  'Use complementary AI tools like ChatGPT to rehearse interview answers that mirror the posting’s requirements.',
  'Remember: you are competing with other candidates. Repetition builds momentum, so every interview is productive practice.',
  'The more you fail, the more opportunities you unlock for a future “yes.” Keep iterating.',
];

function DashboardTips() {
  return (
    <section className="tips-page">
      <header className="tips-hero">
        <p className="tips-eyebrow">TuneIt Playbook</p>
        <h2>Tips for crushing the Jobs board</h2>
        <p className="tips-intro">
          These reminders keep members focused on the workflow that gets results: rich base
          resumes, complete job descriptions, and confident optimizations.
        </p>
      </header>

      <div className="tips-grid" role="list">
        {JOB_STEPS.map((step, index) => (
          <article key={step.title} className="tips-card" role="listitem">
            <span className="tips-step-label">Step {index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <p className="tips-extra">{step.extra}</p>
          </article>
        ))}
      </div>

      <div className="tips-encouragement">
        <h3>Encouragement from the team</h3>
        <ul>
          {ENCOURAGEMENTS.map(tip => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default DashboardTips;
