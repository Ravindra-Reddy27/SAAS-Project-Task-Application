import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Search, Filter, Edit2, 
  CheckCircle, XCircle, Users, FolderKanban, AlertTriangle 
} from 'lucide-react';
import { toast } from 'react-toastify';

// Define Plan Limits configuration (Must match backend)
const PLAN_LIMITS = {
  free: { maxUsers: 5, maxProjects: 3 },
  pro: { maxUsers: 25, maxProjects: 15 },
  enterprise: { maxUsers: 100, maxProjects: 50 }
};

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', status: 'active', subscriptionPlan: 'free', maxUsers: 5, maxProjects: 3 
  });

  useEffect(() => {
    fetchTenants();
  }, [statusFilter]);

  const fetchTenants = async () => {
    try {
      let query = '/tenants?limit=100';
      if (statusFilter && statusFilter !== 'all') query += `&status=${statusFilter}`;
      
      const res = await api.get(query);
      setTenants(res.data.data.tenants);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editingTenant) return;

      await api.put(`/tenants/${editingTenant.id}`, formData);
      toast.success('Tenant updated successfully');
      
      closeModal();
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const openModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      status: tenant.status,
      subscriptionPlan: tenant.subscriptionPlan,
      maxUsers: tenant.maxUsers, 
      maxProjects: tenant.maxProjects
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTenant(null);
  };

  // Handle Plan Change (Auto-update limits)
  const handlePlanChange = (newPlan) => {
    const limits = PLAN_LIMITS[newPlan] || PLAN_LIMITS['free'];
    setFormData(prev => ({
      ...prev,
      subscriptionPlan: newPlan,
      maxUsers: limits.maxUsers,
      maxProjects: limits.maxProjects
    }));
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  // Helper for Status Badges
  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit"><CheckCircle size={12} className="mr-1" /> Active</span>;
      case 'suspended':
        return <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full w-fit"><XCircle size={12} className="mr-1" /> Suspended</span>;
      case 'trial':
        return <span className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full w-fit"><AlertTriangle size={12} className="mr-1" /> Trial</span>;
      default:
        return <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">{status}</span>;
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Tenants...</div>;
  if (user.role !== 'super_admin') return <div className="p-10 text-center text-red-500">Access Denied: Super Admin Only</div>;

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Organizations</h1>
        <p className="text-gray-500 mt-1">Manage all registered tenants and subscriptions.</p>
      </div>

      {/* Toolbar - Responsive Flex */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or subdomain..."
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <select 
            className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
          </select>
        </div>
      </div>

      {/* Tenants Table - Scrollable on mobile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]"> {/* min-w ensures table doesn't crush on mobile */}
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Usage</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg mr-3">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.subdomain}.yourapp.com</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    t.subscriptionPlan === 'enterprise' ? 'bg-purple-50 text-purple-700' :
                    t.subscriptionPlan === 'pro' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {t.subscriptionPlan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(t.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1 text-xs text-gray-500">
                    <div className="flex items-center justify-between gap-2">
                       <span className="flex items-center"><Users size={12} className="mr-1.5"/> Users</span>
                       <span className="font-medium">{t.totalUsers} / {t.maxUsers}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                       <span className="flex items-center"><FolderKanban size={12} className="mr-1.5"/> Projects</span>
                       <span className="font-medium">{t.totalProjects} / {t.maxProjects}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openModal(t)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                    <Edit2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTenants.length === 0 && (
          <div className="p-10 text-center text-gray-400">No tenants found.</div>
        )}
      </div>

      {/* Edit Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Edit Organization</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* FIX: Responsive Grid (1 column on mobile, 2 on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                   <select 
                     className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-white"
                     value={formData.subscriptionPlan}
                     onChange={(e) => handlePlanChange(e.target.value)}
                   >
                     <option value="free">Free</option>
                     <option value="pro">Pro</option>
                     <option value="enterprise">Enterprise</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select 
                     className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-white"
                     value={formData.status}
                     onChange={(e) => setFormData({...formData, status: e.target.value})}
                   >
                     <option value="active">Active</option>
                     <option value="suspended">Suspended</option>
                     <option value="trial">Trial</option>
                   </select>
                </div>
              </div>

              {/* FIX: Responsive Grid (1 column on mobile, 2 on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-gray-50 text-gray-500"
                      value={formData.maxUsers}
                      readOnly 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Projects</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-gray-50 text-gray-500"
                      value={formData.maxProjects}
                      readOnly 
                    />
                 </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                 <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                 <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                   Save Changes
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}