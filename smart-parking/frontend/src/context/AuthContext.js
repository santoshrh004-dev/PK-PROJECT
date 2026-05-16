// C:\Users\User\Desktop\PK\smart-parking\frontend\src\context\AuthContext.js
import React, { createContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext({});

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    const savedUser = rawUser ? JSON.parse(rawUser) : null;

    setToken(savedToken || null);
    setUser(savedUser || null);
  }, []);

  const login = (data) => {
    const nextToken = data?.token || null;
    const nextUser = data?.user || null;

    setToken(nextToken);
    setUser(nextUser);

    if (nextToken) localStorage.setItem('token', nextToken);
    else localStorage.removeItem('token');

    if (nextUser) localStorage.setItem('user', JSON.stringify(nextUser));
    else localStorage.removeItem('user');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'admin';

  const value = useMemo(() => ({ user, token, login, logout, isAdmin }), [user, token]);
  return React.createElement(AuthContext.Provider, { value }, children);
}





