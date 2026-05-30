import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import Insights from './pages/Insights';
import Complaints from './pages/Complaints';
import Eligibility from './pages/Eligibility';
import Simulation from './pages/Simulation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { API_BASE } from './lib/utils';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  // ── Backend Keep-Alive ─────────────────────────────────────────────
  // Free-tier hosting (Render, etc.) puts the backend to sleep after
  // ~15 min of inactivity. This hook:
  //   1. Immediately pings /api/health on page load so the server
  //      starts waking up while the user is still typing credentials.
  //   2. Repeats the ping every 14 minutes to keep the backend alive
  //      as long as the user has the tab open.
  useEffect(() => {
    const warmUpBackend = () => {
      fetch(`${API_BASE}/api/health`).catch(() => {});
    };

    // Warm up immediately on app load
    warmUpBackend();

    // Keep alive every 14 minutes (14 * 60 * 1000 = 840000 ms)
    const keepAliveInterval = setInterval(warmUpBackend, 14 * 60 * 1000);

    return () => clearInterval(keepAliveInterval);
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="heatmap" element={<Heatmap />} />
            <Route path="insights" element={<Insights />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="eligibility" element={<Eligibility />} />
            <Route path="simulation" element={<Simulation />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
