import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Edit2, Trash2, Calendar, User, 
  ArrowLeft, Filter, AlertTriangle, Users
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Filters (Server-Side)
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all'); // <--- ADDED

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);

  // Form States
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: '' });
  const [taskForm, setTaskForm] = useState({ 
    title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' 
  });

  // 1. Initial Load (Project + Users)
  useEffect(() => {
    fetchProjectDetails();
    fetchUsers(); 
  }, [projectId]);

  // 2. Fetch Tasks (Whenever Filters Change)
  useEffect(() => {
    fetchTasks();
  }, [projectId, statusFilter, priorityFilter, assignedToFilter]);

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data.data);
      setProjectForm(projRes.data.data);
    } catch (err) {
      toast.error('Failed to load project.');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      // Build Query Params for API
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (assignedToFilter !== 'all') params.append('assignedTo', assignedToFilter);

      const tasksRes = await api.get(`/projects/${projectId}/tasks?${params.toString()}`);
      setTasks(tasksRes.data.data.tasks);
    } catch (err) {
      console.error("Task Fetch Error:", err);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Robust Tenant ID check
      const currentTenantId = user.tenantId || user.tenant_id || (user.tenant && user.tenant.id);
      if (!currentTenantId && user.role !== 'super_admin') return;

      // If super_admin, we might need a different way to get tenant users, 
      // but usually they are viewing a specific tenant's project.
      // Ideally, the API should allow fetching users of the project's tenant.
      // For now, we fall back to the user's tenant ID.
      
      const res = await api.get(`/tenants/${currentTenantId}/users`).catch(() => ({ data: { data: { users: [] } } })); 
      setUsers(res.data.data.users || []);
    } catch (err) {
      console.log("Could not fetch users");
    }
  };

  // Actions...
  const handleUpdateProject = async () => {
    try {
      await api.put(`/projects/${projectId}`, projectForm);
      setProject(projectForm);
      setIsEditingProject(false);
      toast.success('Project updated');
    } catch (err) {
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if(!window.confirm("Delete this project?")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...taskForm,
      assignedTo: taskForm.assignedTo === '' ? null : taskForm.assignedTo,
      dueDate: taskForm.dueDate === '' ? null : taskForm.dueDate
    };

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post(`/projects/${projectId}/tasks`, payload);
        toast.success('Task created');
      }
      closeTaskModal();
      fetchTasks(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if(!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success("Status updated");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      let assignedUserId = '';
      if (task.assignedTo) {
        assignedUserId = typeof task.assignedTo === 'object' ? task.assignedTo.id : task.assignedTo;
      }
      setTaskForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        assignedTo: assignedUserId
      });
    } else {
      setEditingTask(null);
      setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' });
    }
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const getPriorityColor = (p) => {
    if (p === 'high') return 'bg-red-100 text-red-700';
    if (p === 'medium') return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStatusColor = (s) => {
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'in_progress') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>;
  if (!project) return <div className="p-10 text-center">Project not found</div>;

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      
      {/* Project Header */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <button onClick={() => navigate('/projects')} className="text-gray-400 hover:text-indigo-600 flex items-center mb-4 transition-colors">
            <ArrowLeft size={18} className="mr-2" /> Back to Projects
          </button>
          <div className="flex space-x-2">
            {!isEditingProject ? (
              <>
                <button onClick={() => setIsEditingProject(true)} className="p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">
                  <Edit2 size={20} />
                </button>
                <button onClick={handleDeleteProject} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition">
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              <div className="flex space-x-2">
                <button onClick={() => setIsEditingProject(false)} className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleUpdateProject} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            )}
          </div>
        </div>

        {isEditingProject ? (
          <div className="space-y-4 max-w-xl">
            <input 
              type="text" 
              className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-200 focus:border-indigo-600 outline-none w-full pb-2"
              value={projectForm.name}
              onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
            />
            <textarea 
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 outline-none"
              rows="3"
              value={projectForm.description}
              onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
            />
            <select
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg"
              value={projectForm.status}
              onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-3xl font-extrabold text-gray-900">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {project.status}
              </span>
            </div>
            <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">{project.description || "No description provided."}</p>
          </div>
        )}
      </div>

      {/* Task Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">Tasks ({tasks.length})</h2>
        
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
            <Filter size={16} className="text-gray-400" />
            <select 
              className="bg-transparent text-sm text-gray-600 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          {/* Priority Filter */}
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
            <AlertTriangle size={16} className="text-gray-400" />
            <select 
              className="bg-transparent text-sm text-gray-600 outline-none cursor-pointer"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assigned User Filter (NEW) */}
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
            <Users size={16} className="text-gray-400" />
            <select 
              className="bg-transparent text-sm text-gray-600 outline-none cursor-pointer max-w-[150px]"
              value={assignedToFilter}
              onChange={(e) => setAssignedToFilter(e.target.value)}
            >
              <option value="all">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => openTaskModal()}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto min-h-[200px] relative">
        {tasksLoading && (
           <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
             <div className="text-indigo-600 font-medium">Loading tasks...</div>
           </div>
        )}
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Assigned To</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{task.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className={`px-2 py-1 rounded-md text-xs font-bold uppercase cursor-pointer border-0 outline-none ${getStatusColor(task.status)}`}
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center space-x-2">
                       <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                         {task.assignedTo ? task.assignedTo.fullName.charAt(0) : <User size={12} />}
                       </div>
                       <span className="text-sm text-gray-600">
                         {task.assignedTo ? task.assignedTo.fullName : 'Unassigned'}
                       </span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1.5 text-gray-400" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openTaskModal(task)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                  No tasks found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Task Modal (Create/Edit) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{editingTask ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={closeTaskModal} className="text-gray-400 hover:text-gray-600">X</button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select 
                     className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                     value={taskForm.status}
                     onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                   >
                     <option value="todo">To Do</option>
                     <option value="in_progress">In Progress</option>
                     <option value="completed">Completed</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                   <select 
                     className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                     value={taskForm.priority}
                     onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                   >
                     <option value="low">Low</option>
                     <option value="medium">Medium</option>
                     <option value="high">High</option>
                   </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                   <input 
                     type="date" 
                     className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                     value={taskForm.dueDate}
                     onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                   <select 
                     className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                     value={taskForm.assignedTo}
                     onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                   >
                     <option value="">Unassigned</option>
                     {users.map(u => (
                       <option key={u.id} value={u.id}>{u.fullName}</option>
                     ))}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  rows="3"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                 <button type="button" onClick={closeTaskModal} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                 <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                   {editingTask ? 'Update Task' : 'Create Task'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}