import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Building, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Settings,
  UserCircle,
  ChevronUp
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} /> },
  ];

  if (user?.role === 'tenant_admin' || user?.role === 'super_admin') {
    navItems.push({ name: 'Tasks', path: '/tasks', icon: <CheckSquare size={20} /> });
  }

  if (user?.role === 'tenant_admin') {
    navItems.push({ name: 'Team Members', path: '/users', icon: <Users size={20} /> });
  }

  if (user?.role === 'super_admin') {
    navItems.push({ name: 'Tenants', path: '/tenants', icon: <Building size={20} /> });
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-xl z-20 transition-all duration-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              S
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SaaS App</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {user?.tenant?.name || 'Workspace'}
              </p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ease-in-out ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-indigo-200" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 relative" ref={userMenuRef}>
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden animate-fade-in-up origin-bottom">
              <div className="py-1">
                <Link to="/profile" className="flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                  <UserCircle size={18} />
                  <span>Profile</span>
                </Link>
                <Link to="/settings" className="flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
                <div className="border-t border-slate-700 my-1"></div>
                <button onClick={logout} className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors">
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${isUserMenuOpen ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                <UserCircle size={20} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-white truncate max-w-[120px]">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {user?.role?.replace('_', ' ') || 'Member'}
                </p>
              </div>
            </div>
            <ChevronUp size={16} className={`text-slate-500 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center md:hidden z-30">
          <div className="flex items-center space-x-2">
             <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
             <span className="font-bold text-gray-800 text-lg">SaaS App</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-gray-50 rounded-lg text-gray-600">
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </header>

        {/* MOBILE MENU OVERLAY */}
        {isMobileMenuOpen && (
           <div className="absolute inset-0 bg-slate-900 z-40 p-6 md:hidden animate-fade-in flex flex-col">
             <div className="flex justify-end mb-4">
               <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2 bg-slate-800 rounded-full">
                 <X size={24} />
               </button>
             </div>
             
             {/* Main Nav Items */}
             <nav className="space-y-2 flex-1 overflow-y-auto">
               {navItems.map((item) => (
                 <Link
                   key={item.path}
                   to={item.path}
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="flex items-center space-x-4 px-6 py-4 rounded-xl text-lg font-medium text-slate-300 hover:bg-indigo-600 hover:text-white transition"
                 >
                   {item.icon}
                   <span>{item.name}</span>
                 </Link>
               ))}

               <div className="border-t border-slate-700 my-4"></div>

               {/* FIX: ADDED PROFILE & SETTINGS HERE */}
               <Link
                 to="/profile"
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="flex items-center space-x-4 px-6 py-4 rounded-xl text-lg font-medium text-slate-300 hover:bg-indigo-600 hover:text-white transition"
               >
                 <UserCircle size={20} />
                 <span>My Profile</span>
               </Link>
               
               <Link
                 to="/settings"
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="flex items-center space-x-4 px-6 py-4 rounded-xl text-lg font-medium text-slate-300 hover:bg-indigo-600 hover:text-white transition"
               >
                 <Settings size={20} />
                 <span>Settings</span>
               </Link>

               <div className="border-t border-slate-700 my-4"></div>
               
               <button onClick={logout} className="flex items-center space-x-4 px-6 py-4 text-red-400 w-full text-left font-medium hover:bg-red-500/10 rounded-xl transition">
                  <LogOut size={24} />
                  <span>Sign Out</span>
               </button>
             </nav>
           </div>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10 scroll-smooth">
           <div className="max-w-7xl mx-auto">
             <Outlet />
           </div>
        </main>
      </div>
    </div>
  );
}