import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/AuthContext';
import { UserRole } from '../types';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { credits, isUnlimited } = useCredits();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setIsMobileMenuOpen(false); };
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const isStudent = user?.role === UserRole.STUDENT;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">

          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3" onClick={closeMobileMenu}>
              <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-9 h-9 rounded-lg object-cover shadow-md" />
              <span className="text-xl font-bold text-slate-900 tracking-tight">UNIEVAL</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link to="/browse" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Browse</Link>
                <Link to="/notes" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Notes</Link>
                <Link to="/exam-intelligence" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Exam Prep</Link>
                <Link to="/be-toolkit" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">BE Toolkit</Link>
                {user.role === UserRole.TEACHER && (
                  <Link to="/teacher/upload" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Upload</Link>
                )}
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Admin</Link>
                )}
              </>
            ) : (
              <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About Us</Link>
            )}

            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                {/* Live Classes & Credit Badge — students only */}
                {isStudent && (
                  <>
                    <Link to="/profile#live-classes-section" title="Live Classes"
                      className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-full transition-colors">
                      <span className="text-sm animate-pulse">🔴</span>
                      <span className="text-xs font-extrabold text-red-700">Live</span>
                    </Link>
                    <Link to="/profile" title="Quiz Credits"
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-colors">
                      <span className="text-sm">{isUnlimited ? '⚡' : '🪙'}</span>
                      <span className="text-xs font-extrabold text-indigo-700">{isUnlimited ? '∞' : credits}</span>
                    </Link>
                  </>
                )}
                <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {user.name[0]}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden lg:block">{user.name.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-[#0f172a] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg animate-in slide-in-from-top-5 duration-200">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {user ? (
              <>
                <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-2 hover:bg-gray-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {user.name[0]}
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">View Profile</p>
                  </div>
                  {isStudent && (
                    <div className="flex flex-col gap-1 items-end">
                      <span className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-full text-xs font-extrabold text-red-700">
                        <span className="animate-pulse">🔴</span> Live
                      </span>
                      <span className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full text-xs font-extrabold text-indigo-700">
                        {isUnlimited ? '⚡ ∞' : `🪙 ${credits}`}
                      </span>
                    </div>
                  )}
                </Link>
                <Link to="/browse" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Browse Content</Link>
                <Link to="/notes" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Notes Library</Link>
                <Link to="/exam-intelligence" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Exam Prep</Link>
                <Link to="/be-toolkit" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">BE Toolkit</Link>
                {user.role === UserRole.TEACHER && (
                  <Link to="/teacher/upload" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Upload Content</Link>
                )}
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">Admin Dashboard</Link>
                )}
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 mt-2">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/about" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50">About Us</Link>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <Link to="/login" onClick={closeMobileMenu} className="block w-full text-center bg-[#0f172a] text-white px-4 py-3 rounded-lg text-base font-medium hover:bg-slate-800 shadow-sm">
                    Login / Sign Up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
