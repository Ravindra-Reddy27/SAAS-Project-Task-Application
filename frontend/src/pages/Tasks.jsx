import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Clock, User } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const fetchAllTasks = async () => {
    try {
      // 1. Get all projects first
      const projectRes = await api.get('/projects');
      const projects = projectRes.data.data.projects;

      // 2. Fetch ALL tasks for each project (Removed 'assignedTo' filter)
      const taskPromises = projects.map(project => 
        api.get(`/projects/${project.id}/tasks`) // <--- CHANGED: No filter
           .then(res => res.data.data.tasks.map(t => ({
             ...t, 
             projectName: project.name,
             projectId: project.id
           })))
           .catch(() => [])
      );

      const results = await Promise.all(taskPromises);
      
      // Flatten the array
      const allTasks = results.flat();
      
      setTasks(allTasks);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Tasks...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">All Tasks</h1>
        <p className="text-gray-500 mt-1">View and manage all tasks across your projects.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
              <CheckSquare size={48} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
            <p className="text-gray-500">There are no tasks in any project yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className={`mt-1 p-2 rounded-lg ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <h4 className={`font-semibold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {task.projectName}
                      </span>
                      
                      {/* Show Assigned User */}
                      {task.assignedTo && (
                         <span className="flex items-center text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                           <User size={10} className="mr-1" />
                           {task.assignedTo.fullName || 'Assigned'}
                         </span>
                      )}

                      <span className="flex items-center text-gray-500">
                        <Clock size={12} className="mr-1" /> 
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize w-fit ${getPriorityColor(task.priority)}`}>
                    {task.priority} Priority
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize w-fit border ${
                        task.status === 'completed' ? 'border-emerald-200 text-emerald-600' : 
                        task.status === 'in_progress' ? 'border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'
                    }`}>
                    {task.status.replace('_', ' ')}
                    </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}