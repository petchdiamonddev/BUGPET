import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ActiveInstanceBar from './components/ActiveInstanceBar';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';

import HomePage from './pages/HomePage';
import LabsPage from './pages/LabsPage';
import LabDetailPage from './pages/LabDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BadgesPage from './pages/BadgesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#eceff5] text-[#1c1e21] font-classic">
      <ActiveInstanceBar />
      <Navbar />

      <div className="max-w-[1020px] w-full mx-auto px-3 py-4 flex flex-col sm:flex-row gap-4 flex-1">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Main Feed */}
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/labs" element={<LabsPage />} />
            <Route path="/labs/:id" element={<LabDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Right Sidebar */}
        <RightSidebar />
      </div>

      <footer className="border-t border-[#d8dfea] bg-[#eceff5] py-4 text-center text-[11px] text-gray-500">
        <div className="max-w-[1020px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-[#3b5998]">PETBUG</span> &copy; 2026 &bull; BugForge Web Security Platform
          </div>
          <div className="space-x-3 text-[#385898]">
            <a href="#" className="hover:underline">About</a>
            <a href="#" className="hover:underline">Security Policy</a>
            <a href="#" className="hover:underline">Rules of Engagement</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
