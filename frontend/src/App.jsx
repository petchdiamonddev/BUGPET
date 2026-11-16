import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ActiveInstanceBar from './components/ActiveInstanceBar';

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
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      <ActiveInstanceBar />
      <Navbar />

      <main className="flex-1">
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

      <footer className="border-t border-slate-800/80 bg-[#080c14] py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">PETBUG</span>
            <span>—</span>
            <span>BugForge-Inspired Web Application Pentesting Platform</span>
          </div>
          <div className="font-mono text-slate-400">
            Final Project • React 18 + Tailwind + Express 5 + Prisma 7 + Traefik v3 + Docker
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
