import React, { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthProvider, { AuthContext } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EntryGate from './pages/EntryGate';
import ExitGate from './pages/ExitGate';
import Dashboard from './pages/Dashboard';
import SlotDisplay from './pages/SlotDisplay';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Navbar from './components/Navbar';
import ChatBox from './components/ChatBox';
import VoiceAssistant from './components/VoiceAssistant';
import Notifications, { NotificationProvider } from './components/Notifications';

function RequireAuth({ children }) {
  const { token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Navbar />
        <ChatBox />
        <VoiceAssistant />
        <Notifications />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/entry" element={<EntryGate />} />
          <Route path="/exit" element={<ExitGate />} />
          <Route path="/slots" element={<SlotDisplay />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            }
          />
          <Route
            path="/analytics"
            element={
              <RequireAuth>
                <Analytics />
              </RequireAuth>
            }
          />


          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

