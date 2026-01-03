import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  FolderGit2, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight, 
  Clock, 
  Calendar
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalProjects: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('pending'); // 'all', 'pending', 'completed'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Projects
        const projectsRes = await api.get('/projects');
        const projects = projectsRes.data.data.projects;

        // Calculate Project Stats
        let totalT = 0;
        let completedT = 0;
        projects.forEach(p => {
          totalT += p.taskCount || 0;
          completedT += p.completedTaskCount || 0;
        });

        setStats({
          totalProjects: projects.length,
          totalTasks: totalT,
          completedTasks: completedT,
          pendingTasks: totalT - completedT
        });

        setRecentProjects(projects.slice(0, 5));

        // 2. Fetch "My Tasks" (Corrected Logic)
        if (projects.length > 0) {
          const activeProjects = projects.filter(p => p.status === 'active');
          
          // FIX: Use the API filter '?assignedTo=' as per requirements
          const taskPromises = activeProjects.map(p => 
            api.get(`/projects/${p.id}/tasks?assignedTo=${user.id}`)
               .catch(() => ({ data: { data: { tasks: [] } } }))
          );
          
          const tasksResponses = await Promise.all(taskPromises);
          
          let allMyTasks = [];
          tasksResponses.forEach((res, index) => {
            const projectTasks = res.data.data.tasks || [];
            
            // Attach project info
            const tasksWithProject = projectTasks.map(t => ({
              ...t,
              projectName: activeProjects[index].name,
              projectId: activeProjects[index].id
            }));
            
            allMyTasks = [...allMyTasks, ...tasksWithProject];
          });

          // Additional Safety Filter: Handle case where API might return object in assignedTo
          // API returns assignedTo: { id: "..." }, so we must check assignedTo.id
          const myOwnTasks = allMyTasks.filter(t => 
            t.assignedTo && (t.assignedTo === user.id || t.assignedTo.id === user.id)
          );

          setMyTasks(myOwnTasks);
        }

      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user.id]);

  // Filter Logic for "My Tasks" view (Pending vs Done)
  const filteredTasks = myTasks.filter(task => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'completed') return task.status === 'completed'; // Changed 'done' to 'completed' to match API enum
    return task.status !== 'completed';
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center text-gray-400">Loading Dashboard...</div>;

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-gray-500 mt-2">Welcome back, {user?.fullName?.split(' ')[0]}. </p>
        </div>
        <div className="hidden sm:block text-sm text-gray-400 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Projects" value={stats.totalProjects} icon={<FolderGit2 size={24} className="text-white" />} gradient="bg-gradient-to-br from-indigo-500 to-blue-600" />
        <StatCard title="Total Tasks" value={stats.totalTasks} icon={<AlertCircle size={24} className="text-white" />} gradient="bg-gradient-to-br from-gray-500 to-gray-600" />
        <StatCard title="Pending" value={stats.pendingTasks} icon={<Clock size={24} className="text-white" />} gradient="bg-gradient-to-br from-orange-400 to-red-500" />
        <StatCard title="Completed" value={stats.completedTasks} icon={<CheckCircle size={24} className="text-white" />} gradient="bg-gradient-to-br from-emerald-400 to-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Recent Projects Section (Left - 2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center">
              View All <ArrowUpRight size={16} className="ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="text-gray-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentProjects.length > 0 ? (
                  recentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/projects/${project.id}`} className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors block">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          project.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                             <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${project.taskCount ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{project.completedTaskCount}/{project.taskCount}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">No projects yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. My Tasks Section (Right - 1/3 width) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">My Tasks</h2>
            <div className="flex space-x-1 bg-white rounded-lg p-0.5 border border-gray-200">
               <button 
                 onClick={() => setTaskFilter('pending')}
                 className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors ${taskFilter === 'pending' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
               >Pending</button>
               <button 
                 onClick={() => setTaskFilter('completed')}
                 className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors ${taskFilter === 'completed' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
               >Done</button>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[400px] p-2">
            {filteredTasks.length > 0 ? (
              <div className="space-y-2">
                {filteredTasks.map(task => (
                  <div key={task.id} className="p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all group">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">{task.title}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-500 font-medium mb-2">{task.projectName}</p>
                    <div className="flex items-center text-xs text-gray-400 space-x-3">
                      <div className="flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </div>
                      <span className={`capitalize ${task.status === 'completed' ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                <CheckCircle size={32} className="mb-2 opacity-20" />
                <p>No {taskFilter} tasks found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl shadow-lg ${gradient} text-white transform group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
  );
}