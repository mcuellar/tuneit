import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Register.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, authError, clearAuthError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = event => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    if (authError) {
      clearAuthError();
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    }
    if (!formData.password) {
      nextErrors.password = 'Password is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: formData.email, password: formData.password });
      const redirect = location.state?.from || '/dashboard';
      navigate(redirect, { replace: true });
    } catch (error) {
      console.error('[TuneIt] Login failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-visual">
          <div className="visual-content">
            <Link to="/" className="logo-link">
              <div className="logo">
                <span className="logo-icon" aria-hidden="true">
                  <svg viewBox="-3 -3 38 38" xmlns="http://www.w3.org/2000/svg" fill="none">
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
            </Link>
            <h1>Welcome back to TuneIt</h1>
            <p>Sign in to access your tailored resumes and job applications.</p>
          </div>
        </div>

        <div className="register-form-container">
          <div className="form-content">
            <div className="form-header">
              <h2>Sign in</h2>
              <p>Enter your credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="you@example.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="••••••••"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              {authError ? (
                <p className="form-error" role="alert">
                  {authError.message || 'Unable to sign in. Please try again.'}
                </p>
              ) : null}

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>

              <div className="form-footer">
                <p>
                  Need an account? <Link to="/register" className="link">Create one</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
