import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Lock, Building2, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    tenantSubdomain: '' 
  });
  const [rememberMe, setRememberMe] = useState(false);

  // 1. Check for "Remember Me" data on load
  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    const savedSubdomain = localStorage.getItem('remember_subdomain');
    if (savedEmail && savedSubdomain) {
      setFormData(prev => ({ ...prev, email: savedEmail, tenantSubdomain: savedSubdomain }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 2. Handle "Remember Me" Logic
    if (rememberMe) {
      localStorage.setItem('remember_email', formData.email);
      localStorage.setItem('remember_subdomain', formData.tenantSubdomain);
    } else {
      localStorage.removeItem('remember_email');
      localStorage.removeItem('remember_subdomain');
    }

    try {
      // 3. API Integration
      const { data } = await api.post('/auth/login', formData);
      
      // 4. Store Token & Redirect (Handled by AuthContext + Navigate)
      login(data.data.user, data.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');

    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
          S
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
          Sign in to your workspace
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            Register
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Tenant Subdomain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace Subdomain</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Building2 size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all placeholder-gray-400"
                  // FIX: Updated placeholder to instruct Super Admins
                  placeholder="e.g. demo (or 'system' for super admin)"
                  value={formData.tenantSubdomain}
                  onChange={(e) => setFormData({ ...formData, tenantSubdomain: e.target.value })}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all placeholder-gray-400"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all placeholder-gray-400"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              </div>
            </div> */}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
              >
                {loading ? 'Signing in...' : (
                  <>
                    Sign in <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}