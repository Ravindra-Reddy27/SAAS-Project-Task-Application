import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Edit2, Trash2, Search, Filter, 
  User, Shield, Mail, CheckCircle, XCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // FIX: Renamed 'status' to 'isActive' to match backend requirements
  const [formData, setFormData] = useState({ 
    fullName: '', email: '', password: '', role: 'user', isActive: true 
  });

  const getTenantId = () => {
    return user?.tenantId || user?.tenant?.id || user?.tenant_id;
  };

  const tenantId = getTenantId();

  // Fetch Users
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      if (!tenantId) return;
      const res = await api.get(`/tenants/${tenantId}/users`);
      // Backend now returns { data: { users: [...], total: ..., pagination: ... } }
      // This line works for both old and new structure as long as data.users exists
      setUsers(res.data.data.users);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit (Create/Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!tenantId) {
        toast.error("Missing Tenant ID");
        return;
      }

      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      if (editingUser) {
        // Update
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        // Create
        await api.post(`/tenants/${tenantId}/users`, payload);
        toast.success('User created successfully');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
      toast.success('User deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Helper: Open Modal
  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        email: user.email,
        password: '',
        role: user.role,
        isActive: user.isActive // FIX: Use isActive from backend
      });
    } else {
      setEditingUser(null);
      setFormData({ fullName: '', email: '', password: '', role: 'user', isActive: true });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName?.toLowerCase().includes(search.toLowerCase()) || 
                          u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Team...</div>;

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Team Members</h1>
          <p className="text-gray-500 mt-1">Manage access and roles for your workspace.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          <span>Add User</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <select 
            className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="tenant_admin">Admins</option>
            <option value="user">Users</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg mr-3">
                      {u.fullName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{u.fullName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    u.role === 'tenant_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {u.role === 'tenant_admin' ? <Shield size={12} className="mr-1"/> : <User size={12} className="mr-1"/>}
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {/* FIX: Check isActive instead of status */}
                  {u.isActive ? (
                    <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                      <CheckCircle size={12} className="mr-1" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">
                      <XCircle size={12} className="mr-1" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(u)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-10 text-center text-gray-400">No users found.</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editingUser ? 'Edit User' : 'Add New Member'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="text" required
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-2.5 text-gray-400" />
                  <input 
                    type="email" required
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser && <span className="text-gray-400 font-normal">(Leave empty to keep current)</span>}
                </label>
                <input 
                  type="password"
                  required={!editingUser} // Required only for new users
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                   <select 
                     className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-white"
                     value={formData.role}
                     onChange={(e) => setFormData({...formData, role: e.target.value})}
                   >
                     <option value="user">User</option>
                     <option value="tenant_admin">Admin</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select 
                     className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none bg-white"
                     value={formData.isActive}
                     onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                   >
                     <option value="true">Active</option>
                     <option value="false">Inactive</option>
                   </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                 <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                 <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                   {editingUser ? 'Save Changes' : 'Add User'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}