import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/AuthContext';
import { UserRole } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Coins, LogOut, Menu, X, BookOpen, GraduationCap, FileText, Wrench, Shield, ChevronDown, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { credits, isUnlimited } = useCredits();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => { 
    logout(); 
    navigate('/'); 
    setIsMobileMenuOpen(false); 
  };
  
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const isStudent = user?.role === UserRole.STUDENT;
  const dashboardPath = user
    ? (user.role === UserRole.SUPER_ADMIN ? '/super-admin' : (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER ? '/admin' : '/dashboard'))
    : '/';

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <div className="flex items-center">
            <Link to={dashboardPath} className="flex items-center gap-2.5 group" onClick={closeMobileMenu}>
              <img 
                src="/img/logo.jpeg" 
                alt="UNIEVAL" 
                className="w-8 h-8 rounded-lg object-contain shadow-sm border border-slate-200/60 group-hover:border-blue-500 transition-colors" 
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 tracking-tight leading-none">UNIEVAL</span>
                <span className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase">SPPU Engineering</span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/browse" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Courses</Link>
                <Link to="/notes" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Notes</Link>
                <Link to="/syllabus" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Syllabus</Link>
                <Link to="/exam-intelligence" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Exam Prep</Link>
                <Link to="/be-toolkit" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">BE Toolkit</Link>
                {isStudent && (
                  <Link to="/dashboard?tab=live" className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 transition-colors">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    Live Classes
                  </Link>
                )}
                {user.role === UserRole.TEACHER && (
                  <>
                    <Link to="/teacher/live-classes" className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 transition-colors">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      Live Classes
                    </Link>
                    <Link to="/teacher/upload" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Upload</Link>
                  </>
                )}
                {user.role === UserRole.ADMIN && (
                  <>
                    <Link to="/teacher/live-classes" className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 transition-colors">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      Live Classes
                    </Link>
                    <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Admin</Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/browse" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Courses</Link>
                <Link to="/notes" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Notes & PYQs</Link>
                <Link to="/syllabus" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Syllabus</Link>
                <Link to="/exam-intelligence" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Exam Intelligence</Link>
                <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About</Link>
              </>
            )}

            {/* Auth / Profile Actions */}
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                {isStudent && (
                  <Link 
                    to="/dashboard" 
                    title="Quiz Credits"
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isUnlimited ? '∞ Unlimited' : `${credits} Credits`}</span>
                  </Link>
                )}
                
                <Link 
                  to={dashboardPath} 
                  className="flex items-center gap-2 py-1 px-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                >
                  <div className="h-7 w-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden lg:block max-w-[120px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>

                <button 
                  onClick={handleLogout} 
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all hover:shadow active:scale-[0.98]"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="text-slate-600 hover:text-slate-900 focus:outline-none p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200" 
          onClick={closeMobileMenu} 
        />
      )}

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full left-0 shadow-xl z-50 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-64px)] overflow-y-auto">
          <div className="px-4 py-4 space-y-1.5">
            {user ? (
              <>
                <Link 
                  to={dashboardPath} 
                  onClick={closeMobileMenu} 
                  className="flex items-center gap-3 px-3 py-3 border border-slate-100 rounded-xl bg-slate-50 mb-3"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()} Dashboard</p>
                  </div>
                  {isStudent && (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-700">
                      <Coins className="w-3 h-3 text-amber-500" />
                      {isUnlimited ? '∞' : credits}
                    </div>
                  )}
                </Link>

                {isStudent && (
                  <Link 
                    to="/dashboard?tab=live" 
                    onClick={closeMobileMenu} 
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Live Classes
                  </Link>
                )}
                <Link to="/browse" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  <BookOpen className="w-4 h-4 text-slate-400" /> Course Catalog
                </Link>
                <Link to="/notes" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  <FileText className="w-4 h-4 text-slate-400" /> Notes & PYQs
                </Link>
                <Link to="/syllabus" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  <BookOpen className="w-4 h-4 text-slate-400" /> SPPU Syllabus
                </Link>
                <Link to="/exam-intelligence" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  <GraduationCap className="w-4 h-4 text-slate-400" /> Exam Prep
                </Link>
                <Link to="/be-toolkit" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  <Wrench className="w-4 h-4 text-slate-400" /> BE Toolkit
                </Link>
                
                {user.role === UserRole.TEACHER && (
                  <>
                    <Link to="/teacher/live-classes" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50">
                      <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Teacher Live Studio
                    </Link>
                    <Link to="/teacher/upload" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                      Upload Content
                    </Link>
                  </>
                )}
                {user.role === UserRole.ADMIN && (
                  <>
                    <Link to="/admin" onClick={closeMobileMenu} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                      <Shield className="w-4 h-4 text-slate-400" /> Admin Console
                    </Link>
                  </>
                )}

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/browse" onClick={closeMobileMenu} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  Courses
                </Link>
                <Link to="/notes" onClick={closeMobileMenu} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  Notes & PYQs
                </Link>
                <Link to="/syllabus" onClick={closeMobileMenu} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  SPPU Syllabus (2024 Pattern)
                </Link>
                <Link to="/exam-intelligence" onClick={closeMobileMenu} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  Exam Intelligence
                </Link>
                <Link to="/about" onClick={closeMobileMenu} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                  About Us
                </Link>
                <div className="pt-3 mt-2 border-t border-slate-100">
                  <Link 
                    to="/login" 
                    onClick={closeMobileMenu} 
                    className="block w-full text-center bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    Sign In
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
