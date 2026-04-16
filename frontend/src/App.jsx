import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Heatmap from './pages/Heatmap';
import Insights from './pages/Insights';
import Complaints from './pages/Complaints';
import Eligibility from './pages/Eligibility';
import Simulation from './pages/Simulation';
import CitizenVoices from './pages/CitizenVoices';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RoleRedirect = () => {
  const role = localStorage.getItem('role');
  return <Navigate to={role === 'Authority' ? '/dashboard' : '/eligibility'} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/:portalType" element={<Login />} />
          <Route path="/signup/:portalType" element={<Signup />} />
          
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/heatmap" element={<Heatmap />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/eligibility" element={<Eligibility />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/voices" element={<CitizenVoices />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
