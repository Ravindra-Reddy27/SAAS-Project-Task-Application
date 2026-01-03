import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Folder, 
  Calendar, 
  Search, 
  Filter, 
  User, 
  CheckSquare 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Searching State
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState({ id: null, name: '', description: '', status: 'active' });

  // 1. Fetch Projects (Triggered by filter or search changes)
  useEffect(() => {
    // Debounce search to prevent too many API calls while typing
    const timer = setTimeout(() => {
      fetchProjects();
    }, 500);

    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]); 

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Build Query String using API parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const { data } = await api.get(`/projects?${params.toString()}`);
      setProjects(data.data.projects);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Create/Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/projects/${currentProject.id}`, currentProject);
        toast.success('Project updated!');
      } else {
        await api.post('/projects', currentProject);
        toast.success('Project created!');
      }
      setShowModal(false);
      resetForm();
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  // 3. Handle Delete
  const handleDelete = async (e, id) => {
    e.preventDefault(); 
    if (!window.confirm('Are you sure? This will delete all tasks in this project.')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      // Optimistic update
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Unauthorized');
    }
  };

  // Helper: Open Modal for Edit
  const openEditModal = (e, project) => {
    e.preventDefault();
    setIsEditing(true);
    setCurrentProject({ 
      id: project.id, 
      name: project.name, 
      description: project.description || '', 
      status: project.status 
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setCurrentProject({ id: null, name: '', description: '', status: 'active' });
    setIsEditing(false);
  };

  if (loading && projects.length === 0) return <div className="p-10 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your team's ongoing work.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search projects by name..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="relative w-full sm:w-48">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Filter size={18} />
          </div>
          <select 
            className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm appearance-none bg-white transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Link 
              key={project.id} 
              to={`/projects/${project.id}`} 
              className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-64 relative"
            >
              {/* Header: Icon & Actions */}
              <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Folder size={24} />
                 </div>
                 <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.preventDefault(); openEditModal(e, project); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Metrics (Task Count & Creator) */}
              <div className="flex items-center space-x-4 my-4 text-xs font-medium text-gray-500">
                <div className="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded-md">
                   <CheckSquare size={14} className="text-gray-400" />
                   <span>{project.taskCount || 0} Tasks</span>
                </div>
                {/* FIX: Correctly access the nested createdBy object */}
                <div className="flex items-center space-x-1">
                   <User size={14} className="text-gray-400" />
                   <span>{project.createdBy?.fullName || 'Admin'}</span>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-400">
                 <div className="flex items-center space-x-1.5">
                   <Calendar size={14} />
                   <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                 </div>
                 <span className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] ${
                   project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                   project.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                 }`}>
                   {project.status}
                 </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 text-center">
             <div className="bg-gray-50 p-4 rounded-full mb-3">
               <Search size={32} className="text-gray-300" />
             </div>
             <h3 className="text-gray-900 font-medium">No projects found</h3>
             <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters.</p>
             <button 
               onClick={() => { resetForm(); setShowModal(true); }}
               className="mt-4 text-indigo-600 font-medium hover:text-indigo-700 text-sm"
             >
               Create a new project
             </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
               <h2 className="text-xl font-bold text-gray-800">
                 {isEditing ? 'Edit Project' : 'Create New Project'}
               </h2>
               <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                 ✕
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Name</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="e.g. Website Redesign"
                  value={currentProject.name}
                  onChange={(e) => setCurrentProject({...currentProject, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none"
                  rows="3"
                  value={currentProject.description}
                  onChange={(e) => setCurrentProject({...currentProject, description: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-white"
                  value={currentProject.status}
                  onChange={(e) => setCurrentProject({...currentProject, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                >
                  {isEditing ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}