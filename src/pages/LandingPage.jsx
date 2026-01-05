import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './LandingPage.css';


function scrollToSection(section) {
  const el = document.getElementById(section);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to section if ?scroll=... is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('scroll');
    if (section) {
      scrollToSection(section);
    }
  }, [location]);

  // Handler for anchor links
  const handleNavClick = (e, section) => {
    e.preventDefault();
    navigate(`/?scroll=${section}`);
  };

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon" aria-hidden="true">
              <svg viewBox="-4 -4 38 38" xmlns="http://www.w3.org/2000/svg" fill="none">
                <path
                  d="M16 2.8c3 0 5.8 1.2 7.9 3.4l6.1 6.5c3.6 3.8 3.6 9.7 0 13.5-0.9 1-2 1.8-3.2 2.4-3.7 1.8-7.9 2.7-11.9 2.7s-8.2-0.9-11.9-2.7c-1.2-0.6-2.3-1.4-3.2-2.4-3.6-3.8-3.6-9.7 0-13.5l6.1-6.5C10.2 3.9 13 2.8 16 2.8z"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="20.2" r="6.6" stroke="currentColor" strokeWidth="2.6" fill="none" />
                <circle cx="16" cy="20.2" r="3.4" stroke="currentColor" strokeWidth="2.6" fill="none" />
              </svg>
            </span>
            <span className="logo-text">TuneIt</span>
          </div>
          <div className="nav-links">
            <a href="/?scroll=features" className="nav-link" onClick={e => handleNavClick(e, 'features')}>Features</a>
            <a href="/?scroll=how-it-works" className="nav-link" onClick={e => handleNavClick(e, 'how-it-works')}>How It Works</a>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              AI-Powered Resume Optimizer
            </h1>
            <p className="hero-subtitle">
              Tailor your resume to match any job description in seconds. 
              Boost your chances of landing interviews with AI-optimized resumes.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="btn-cta">Start Optimizing Free</Link>
              <a href="/?scroll=how-it-works" className="btn-secondary" onClick={e => handleNavClick(e, 'how-it-works')}>Learn More</a>
            </div>
            <p className="login-prompt">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
            <div className="hero-badges">
              <div className="badge">
                <span className="badge-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 2L4.5 13h6.1l-1 9 8.4-13H13l1-7z" fill="currentColor" />
                    <path d="M8 15l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M10 16.5l-1.8 1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </span>
                <span>Instant Results</span>
              </div>
              <div className="badge">
                <span className="badge-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    <path d="M12 5V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M12 21v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M3 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M19 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M15.5 8.5l1.8-1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <span>Perfect Match</span>
              </div>
              <div className="badge">
                <span className="badge-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="11" width="3" height="7" rx="1" fill="currentColor" />
                    <rect x="10.5" y="7" width="3" height="11" rx="1" fill="currentColor" />
                    <rect x="17" y="4" width="3" height="14" rx="1" fill="currentColor" />
                  </svg>
                </span>
                <span>Track Applications</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-card-header">
                <div className="card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="card-content">
                <div className="resume-preview">
                  <div className="preview-line long"></div>
                  <div className="preview-line medium"></div>
                  <div className="preview-line short"></div>
                  <div className="preview-section">
                    <div className="preview-line medium"></div>
                    <div className="preview-line long"></div>
                    <div className="preview-line medium"></div>
                  </div>
                </div>
                <div className="ai-overlay">
                  <div className="ai-pulse"></div>
                  <span className="ai-text">AI Optimizing...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">Everything you need to land your dream job</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <circle cx="7" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <circle cx="25" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <circle cx="16" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <circle cx="16" cy="25" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="none" />
                  <path d="M9 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M18 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M16 9v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M16 20v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <h3>AI-Powered Optimization</h3>
              <p>Our advanced AI analyzes job descriptions and tailors your resume to maximize your match score.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6h12l4 4v16H6V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <path d="M12 6v6h6V6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <path d="M11 19h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M11 23h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Save & Organize</h3>
              <p>Keep track of all your tailored resumes and job applications in one centralized dashboard.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 4L8 18h8l-1 10 9-16h-8l1-8z" fill="currentColor" />
                </svg>
              </div>
              <h3>Instant Results</h3>
              <p>Get your optimized resume in seconds. No waiting, no hassle, just results.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="8" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <rect x="24" y="4" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                  <path d="M7 11h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M7 15h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M26 7h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Responsive Design</h3>
              <p>Access your resumes anywhere, anytime. Our platform works seamlessly on all devices.</p>
            </div>
            {/* <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 10h14v4H9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <path d="M7 16h14v4H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <path d="M11 6h14v4H11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <path d="M11 22h14v4H11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h3>Professional Templates</h3>
              <p>Choose from beautifully designed templates that recruiters love.</p>
            </div> */}
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <rect x="7" y="14" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <path d="M12 14V10a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <circle cx="16" cy="20" r="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
                  <path d="M16 22v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Secure & Private</h3>
              <p>Your data is encrypted and secure. We take your privacy seriously.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three simple steps to your perfect resume</p>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Upload Your Resume</h3>
                <p>Start with your existing resume or create a new one from scratch.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Paste Job Description</h3>
                <p>Copy and paste the job description you're interested in applying for.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Optimized Resume</h3>
                <p>Our AI analyzes and tailors your resume to match the job perfectly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Land Your Dream Job?</h2>
            <p>Join thousands of job seekers who have optimized their resumes with TuneIt</p>
            <Link to="/register" className="btn-cta-large">Get Started for Free</Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="logo">
                <span className="logo-icon" aria-hidden="true">
                  <svg viewBox="-4 -3 38 38" xmlns="http://www.w3.org/2000/svg" fill="none">
                    <path
                      d="M16 2.8c3 0 5.8 1.2 7.9 3.4l6.1 6.5c3.6 3.8 3.6 9.7 0 13.5-0.9 1-2 1.8-3.2 2.4-3.7 1.8-7.9 2.7-11.9 2.7s-8.2-0.9-11.9-2.7c-1.2-0.6-2.3-1.4-3.2-2.4-3.6-3.8-3.6-9.7 0-13.5l6.1-6.5C10.2 3.9 13 2.8 16 2.8z"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="16" cy="20.2" r="6.6" stroke="currentColor" strokeWidth="2.6" fill="none" />
                    <circle cx="16" cy="20.2" r="3.4" stroke="currentColor" strokeWidth="2.6" fill="none" />
                  </svg>
                </span>
                <span className="logo-text">TuneIt</span>
              </div>
              <p>AI-powered resume optimization for job seekers.</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <Link to="/register">Sign Up</Link>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#privacy">Privacy</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 TuneIt. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
