import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bug, Trophy, Shield, Award, User, LogOut, LogIn, Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Labs & Challenges', path: '/labs', icon: Bug },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Achievements', path: '/badges', icon: Award },
    ...(user?.role === 'ADMIN' ? [{ name: 'Admin Control', path: '/admin', icon: LayoutDashboard }] : []),
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition">
              <div className="w-full h-full bg-[#080c14] rounded-[10px] flex items-center justify-center">
                <Bug className="w-5 h-5 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                PET<span className="text-emerald-400 font-extrabold">BUG</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-mono -mt-1 font-semibold">
                Security Labs
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: User & Auth */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Points Pill */}
                <div className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold font-mono shadow-sm">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{user.points || 0} PTS</span>
                </div>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-700 transition"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[120px]">{user.username}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  title="ออกจากระบบ"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  to="/register"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-sm transition shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0c121e] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-800 mt-2">
            {user ? (
              <div className="flex items-center justify-between px-2 pt-1">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-sm text-slate-200"
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>{user.username} ({user.points} pts)</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm bg-emerald-500 text-slate-950 font-semibold rounded-lg"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
