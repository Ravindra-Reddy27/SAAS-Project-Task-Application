import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: Handle Auto-Logout
  const setupAutoLogout = (token) => {
    const decoded = jwtDecode(token);
    const expireTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpire = expireTime - currentTime;

    if (timeUntilExpire > 0) {
      // Set a timer to logout automatically when token expires
      const timer = setTimeout(() => {
        logout();
      }, timeUntilExpire);
      return timer; // Return timer ID to clear it later if needed
    } else {
      logout(); // Token already expired
      return null;
    }
  };

  useEffect(() => {
    let logoutTimer;

    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;

          if (decoded.exp < currentTime) {
            // Token Expired
            logout();
          } else {
            // Token Valid
            try {
              // 1. Fetch latest user details from API
              const { data } = await api.get('/auth/me');
              setUser({ ...data.data, token });
              
              // 2. Setup Auto-Logout Timer
              logoutTimer = setupAutoLogout(token);
            } catch (err) {
              logout();
            }
          }
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    checkUser();

    // Cleanup timer on unmount
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser({ ...userData, token });
    setupAutoLogout(token); // Start timer on login
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('remember_email'); // Optional: Keep or clear based on preference
    localStorage.removeItem('remember_subdomain');
    setUser(null);
    window.location.href = '/login'; // Force full reload to clear states
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);