import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks'; 
import Tenants from './pages/Tenants'; // <--- 1. IMPORT ADDED
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes (require login) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/projects" element={<Projects />} />
             <Route path="/projects/:projectId" element={<ProjectDetails />} />
             <Route path="/tasks" element={<Tasks />} /> 
             
             {/* 2. ROUTE REGISTERED HERE */}
             <Route path="/tenants" element={<Tenants />} />

             <Route path="/users" element={<Users />} />
             <Route path="/profile" element={<Profile />} />
             <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Catch-all: Redirect unknown pages to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;