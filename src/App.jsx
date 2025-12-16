import { Routes, Route, HashRouter, BrowserRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardJobs from './pages/dashboard/Jobs';
import DashboardResumes from './pages/dashboard/Resumes';
import BillingPage from './pages/dashboard/Billing';
import SettingsPage from './pages/dashboard/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const RouterComponent =
  import.meta.env.MODE === 'production' ? HashRouter : BrowserRouter;

function App() {
  return (
    <RouterComponent>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute redirectTo="/login" />}>
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardJobs />} />
            <Route path="resumes" element={<DashboardResumes />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </RouterComponent>
  );
}

export default App;
