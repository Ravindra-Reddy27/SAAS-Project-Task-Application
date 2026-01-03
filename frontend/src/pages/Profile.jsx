import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Building } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-extrabold text-gray-900">My Profile</h1>
      
    <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
        <div className="h-24 w-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold">
            {user?.fullName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user?.fullName}</h2>
            <p className="text-gray-500">Member since {new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <Mail className="text-gray-400 mr-4" size={20} />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <Shield className="text-gray-400 mr-4" size={20} />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</p>
              <p className="font-medium text-gray-900 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <Building className="text-gray-400 mr-4" size={20} />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Organization</p>
              <p className="font-medium text-gray-900">{user?.tenant?.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}