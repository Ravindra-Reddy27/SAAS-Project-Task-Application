import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Building2, User, Mail, Lock, Globe, CheckCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Track if user manually typed the subdomain
  const [isSubdomainModified, setIsSubdomainModified] = useState(false);

  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    agreeTerms: false
  });

  // --- PASSWORD STRENGTH LOGIC ---
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200' };

    if (pass.length > 7) score += 1; // Min length 8
    if (/[0-9]/.test(pass)) score += 1; // Has number
    if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Has special char
    if (pass.length > 12) score += 1; // Bonus for length

    switch (score) {
      case 0:
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
      case 2:
      case 3:
        return { score: 2, label: 'Medium', color: 'bg-yellow-500' };
      case 4:
        return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: '', color: 'bg-gray-200' };
    }
  };

  const strength = getPasswordStrength(formData.adminPassword);
  // -------------------------------

  // Auto-generate subdomain from organization name
  useEffect(() => {
    if (!isSubdomainModified) {
      const slug = formData.tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      setFormData(prev => ({ ...prev, subdomain: slug }));
    }
  }, [formData.tenantName, isSubdomainModified]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- VALIDATION ---
    if (formData.adminPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.agreeTerms) {
      toast.error("You must agree to the Terms & Conditions");
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register-tenant', {
        tenantName: formData.tenantName,
        subdomain: formData.subdomain,
        adminEmail: formData.adminEmail,
        adminFullName: formData.adminFullName,
        adminPassword: formData.adminPassword
      });

      toast.success("Registration successful! Please login.");
      setTimeout(() => navigate('/login'), 2000);

    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Try a different subdomain.");
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
          Start your free trial
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Section: Organization Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Workspace Details</h3>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Building2 size={18} />
                    </div>
                    <input
                      type="text" required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                      placeholder="Acme Corp"
                      value={formData.tenantName}
                      onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workspace URL</label>
                  <div className="mt-1 flex rounded-xl shadow-sm">
                    <div className="relative flex-grow focus-within:z-10">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Globe size={18} />
                      </div>
                      <input
                        type="text" required
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-none rounded-l-xl pl-10 sm:text-sm border-gray-300 py-2.5 transition-all"
                        placeholder="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => {
                          setFormData({ ...formData, subdomain: e.target.value.toLowerCase() });
                          setIsSubdomainModified(true);
                        }}
                      />
                    </div>
                    <span className="inline-flex items-center px-4 rounded-r-xl border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm font-medium">
                      .yourapp.com
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* Section: Admin Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Admin Account</h3>
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text" required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="John Doe"
                      value={formData.adminFullName}
                      onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email" required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="john@company.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password Field with Strength Meter */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Min 8 chars"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Strength Meter UI */}
                  {formData.adminPassword && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Strength</span>
                        <span className="text-xs font-medium text-gray-700">{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${strength.color} transition-all duration-300 ease-out`}
                          // FIX: Changed denominator from 4 to 3 to ensure 100% width on 'Strong'
                          style={{ width: `${(strength.score / 3) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <CheckCircle size={18} />
                    </div>
                    {/* FIX: Removed showPassword dependency here */}
                    <input
                      type="password"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the Terms and Conditions
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-all transform active:scale-[0.98]"
              >
                {loading ? 'Creating Account...' : (
                  <>
                    Create Workspace <ArrowRight size={18} className="ml-2" />
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