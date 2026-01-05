import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const JobsIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <path
      d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M4.5 9.75a2.25 2.25 0 0 1 2.25-2.25h10.5a2.25 2.25 0 0 1 2.25 2.25v6.75a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 16.5V9.75Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 12v1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const BillingIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <rect
      x="3.5"
      y="5.5"
      width="17"
      height="13"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M3.5 9.5h17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M8.5 14.5h3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M15.5 14.5h2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const ResumesIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <path
      d="M7 4.5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 9.5h6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M9 13.5h6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M15.5 2.5v2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8.5 2.5v2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const TipsIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <path
      d="M12 3.5a6.5 6.5 0 0 0-3.48 12.01c.31.2.5.53.5.9v1.34c0 .88.72 1.6 1.6 1.6h2.76c.88 0 1.6-.72 1.6-1.6v-1.32c0-.38.18-.72.5-.92A6.5 6.5 0 0 0 12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 20.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M11 22.3h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <path
      d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.2 9.5a1 1 0 0 0 .2-.62 8.14 8.14 0 0 0-.36-2.07 1 1 0 0 0-1.2-.65l-1.1.33a1 1 0 0 1-1.08-.45l-.2-.35a1 1 0 0 1 .06-1.1l.75-.95a1 1 0 0 0-.07-1.33A7.84 7.84 0 0 0 14.19 1a1 1 0 0 0-1.13.3l-.73.9a1 1 0 0 1-1.62 0l-.73-.9A1 1 0 0 0 8.85 1a7.84 7.84 0 0 0-2.41 1.81 1 1 0 0 0-.07 1.33l.75.95a1 1 0 0 1 .06 1.1l-.2.35a1 1 0 0 1-1.08.45l-1.1-.33a1 1 0 0 0-1.2.65 8.14 8.14 0 0 0-.36 2.07 1 1 0 0 0 .2.62l.68.93a1 1 0 0 1 0 1.2l-.68.93a1 1 0 0 0-.2.62 8.14 8.14 0 0 0 .36 2.07 1 1 0 0 0 1.2.65l1.1-.33a1 1 0 0 1 1.08.45l.2.35a1 1 0 0 1-.06 1.1l-.75.95a1 1 0 0 0 .07 1.33 7.84 7.84 0 0 0 2.41 1.81 1 1 0 0 0 1.13-.3l.73-.9a1 1 0 0 1 1.62 0l.73.9a1 1 0 0 0 1.13.3 7.84 7.84 0 0 0 2.41-1.81 1 1 0 0 0 .07-1.33l-.75-.95a1 1 0 0 1-.06-1.1l.2-.35a1 1 0 0 1 1.08-.45l1.1.33a1 1 0 0 0 1.2-.65 8.14 8.14 0 0 0 .36-2.07 1 1 0 0 0-.2-.62l-.68-.93a1 1 0 0 1 0-1.2Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SidebarControlIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <rect
      x="3.5"
      y="4.5"
      width="17"
      height="15"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M9.5 4.5v15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M13.5 9.5h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M13.5 13.5h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const SIDEBAR_MODES = [
  { value: 'expanded', label: 'Expanded' },
  { value: 'collapsed', label: 'Collapsed' },
  { value: 'hover', label: 'Expand on Hover' },
];

const NAV_ITEMS = [
  {
    id: 'jobs',
    label: 'Jobs',
    icon: JobsIcon,
    to: '/dashboard',
    description: 'Manage job tailoring workflows in one place.',
    end: true,
  },
  {
    id: 'tips',
    label: 'Tips',
    icon: TipsIcon,
    to: '/dashboard/tips',
    description: 'Best practices for base resumes and optimizations.',
    end: false,
  },
  {
    id: 'resumes',
    label: 'Resumes',
    icon: ResumesIcon,
    to: '/dashboard/resumes',
    description: 'Store your base resume and tailored variations.',
    end: false,
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: BillingIcon,
    to: '/dashboard/billing',
    description: 'Billing plans, invoices, and usage insights.',
    end: false,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    to: '/dashboard/settings',
    description: 'Configure TuneIt preferences and integrations.',
    end: false,
  },
];

function Dashboard() {
  const [theme, setTheme] = useState('light');
  const [sidebarMode, setSidebarMode] = useState('expanded');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const { profile, user, signOut } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        setIsMobileNavOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSidebarModeChange = mode => {
    setSidebarMode(mode);
  };

  const handleMobileToggle = () => {
    setIsMobileNavOpen(prev => !prev);
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('[TuneIt] Sign out failed.', error);
    }
  };

  const dashboardClasses = [
    'dashboard',
    `dashboard--${theme}`,
    `sidebar-${sidebarMode}`,
    isMobileNavOpen ? 'dashboard--mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const normalizedPath = location.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  const activeItem =
    NAV_ITEMS.find(item =>
      item.end
        ? normalizedPath === item.to
        : normalizedPath === item.to || normalizedPath.startsWith(`${item.to}/`),
    ) || NAV_ITEMS[0];

  const displayName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const primaryLabel = displayName || user?.email || 'Your Workspace';
  const secondaryLabel = user?.email ? 'Logged in' : 'Sign in to your account';

  return (
    <div className={dashboardClasses}>
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar dashboard-sidebar--${sidebarMode}${isMobileNavOpen ? ' is-open' : ''}`}
      >
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <span className="sidebar-logo-icon" aria-hidden="true">
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
            <span className="sidebar-logo-text">TuneIt</span>
          </Link>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' is-active' : ''}`
              }
              onClick={closeMobileNav}
            >
              <span className="sidebar-nav-icon">
                <item.icon />
              </span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-label">
            <span className="sidebar-footer-icon" aria-hidden="true">
              <SidebarControlIcon />
            </span>
            <span className="sidebar-footer-text">Sidebar Control</span>
          </span>
          <div className="sidebar-toggle-group" role="radiogroup" aria-label="Sidebar display mode">
            {SIDEBAR_MODES.map(mode => (
              <label key={mode.value} className="sidebar-toggle-option">
                <input
                  type="radio"
                  name="sidebar-mode"
                  value={mode.value}
                  checked={sidebarMode === mode.value}
                  onChange={() => handleSidebarModeChange(mode.value)}
                />
                <span>{mode.label}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div
        className="dashboard-overlay"
        aria-hidden={isMobileNavOpen ? 'false' : 'true'}
        onClick={closeMobileNav}
      />

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={handleMobileToggle}
            aria-expanded={isMobileNavOpen}
            aria-controls="dashboard-sidebar"
            aria-label="Toggle navigation"
          >
            <span className="mobile-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="mobile-menu-label">Menu</span>
          </button>
          <div className="topbar-heading">
            <h1>{activeItem.label}</h1>
            <p>{activeItem.description}</p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            </button>
            <div className="auth-placeholder" role="group" aria-label="Account actions">
              <span className="auth-label">{primaryLabel}</span>
              <span className="auth-subtext">{secondaryLabel}</span>
              {user ? (
                <div className="auth-actions">
                  <button type="button" className="sign-out-button" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default Dashboard;
