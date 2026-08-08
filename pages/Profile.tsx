import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Note, UserRole } from '../types';
import { Link, Navigate } from 'react-router-dom';
import { BuyCreditsModal } from './QuizDetail';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { credits, freeLeft, freeQuizLimit, freeQuizUsed, isUnlimited, unlimitedPlan, refresh: refreshCredits } = useCredits();

  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchPurchases = async () => {
        try {
          const [allCourses, allNotes] = await Promise.all([api.getCourses(), api.getNotes()]);
          setCourses(allCourses.filter(c => user.purchasedNoteIds.includes(c.id) || c.price === 0));
          setNotes(allNotes.filter(n =>
            user.purchasedNoteIds.includes(n.id) ||
            n.price === 0 ||
            (n.collegeConfig && user.email.endsWith(n.collegeConfig.emailDomain.trim()))
          ));
        } catch (error) {
          console.error('Failed to fetch purchases', error);
        } finally {
          setLoading(false);
        }
      };
      fetchPurchases();
    }
  }, [user]);

  if (!user) return <Navigate to="/" replace />;

  const isStudent = user.role === UserRole.STUDENT;
  const freeUsedCount = freeQuizUsed;
  const unlimitedExpiry = unlimitedPlan?.expiresAt ? new Date(unlimitedPlan.expiresAt) : null;
  const unlimitedActive = isUnlimited;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {showBuyModal && (
        <BuyCreditsModal
          onClose={() => setShowBuyModal(false)}
          onSuccess={refreshCredits}
          userName={user.name}
          userEmail={user.email}
        />
      )}

      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 bg-white text-indigo-600 rounded-full flex items-center justify-center text-3xl font-black shadow-lg shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">{user.name}</h1>
              <p className="text-indigo-200 mt-0.5 text-sm">{user.email}</p>
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-bold">
                {user.role === UserRole.STUDENT ? '🎓 Student' : user.role === UserRole.TEACHER ? '👨‍🏫 Teacher' : user.role === UserRole.ADMIN ? '⚙️ Admin' : '🌐 Super Admin'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Credits Card (Students only) ────────────────────────────────── */}
      {isStudent && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">🪙 Quiz Credits</h2>
            <button
              onClick={() => setShowBuyModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition shadow-sm shadow-indigo-100"
            >
              + Buy Credits
            </button>
          </div>

          <div className="p-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-center">
                <p className="text-3xl font-black text-indigo-700">{unlimitedActive ? '∞' : credits}</p>
                <p className="text-xs font-bold text-indigo-500 uppercase mt-1">Credits Left</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center">
                <p className="text-3xl font-black text-green-700">{Math.max(0, freeQuizLimit - freeUsedCount)}</p>
                <p className="text-xs font-bold text-green-500 uppercase mt-1">Free Plays Left</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-3xl font-black text-gray-700">{freeUsedCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Free Used</p>
              </div>
              <div className={`rounded-xl p-4 border text-center ${unlimitedActive ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-2xl font-black ${unlimitedActive ? 'text-orange-600' : 'text-gray-400'}`}>
                  {unlimitedActive ? '⚡' : '—'}
                </p>
                <p className={`text-xs font-bold uppercase mt-1 ${unlimitedActive ? 'text-orange-500' : 'text-gray-400'}`}>
                  {unlimitedActive ? 'Unlimited' : 'No Plan'}
                </p>
              </div>
            </div>

            {/* Unlimited expiry banner */}
            {unlimitedActive && unlimitedExpiry && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-bold text-orange-800">24hr Unlimited plan is active</p>
                  <p className="text-xs text-orange-600">Expires at {unlimitedExpiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {unlimitedExpiry.toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {/* Free quota bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                <span>Free Plays Used</span>
                <span>{freeUsedCount} / {freeQuizLimit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (freeUsedCount / freeQuizLimit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {freeUsedCount >= freeQuizLimit
                  ? 'All free plays used. Purchase credits to keep playing.'
                  : `${freeQuizLimit - freeUsedCount} free plays remaining (lifetime)`}
              </p>
            </div>

            {/* Buy plans teaser */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {[
                { label: '15 Credits', price: '₹29', id: '15', icon: '🪙' },
                { label: '25 Credits', price: '₹49', id: '25', icon: '💎', badge: 'Popular' },
                { label: '75 Credits', price: '₹99', id: '75', icon: '🚀', badge: 'Best Value' },
                { label: '24hr Unlimited', price: '₹19', id: 'unlimited', icon: '⚡', badge: 'Flash' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setShowBuyModal(true)}
                  className="relative flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center"
                >
                  {p.badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      p.badge === 'Popular' ? 'bg-indigo-100 text-indigo-700' :
                      p.badge === 'Best Value' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{p.badge}</span>
                  )}
                  <span className="text-xl mb-1">{p.icon}</span>
                  <span className="text-xs font-bold text-gray-800 leading-tight">{p.label}</span>
                  <span className="text-sm font-extrabold text-indigo-600 mt-0.5">{p.price}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">Credits never expire · Secured via Razorpay</p>
          </div>
        </div>
      )}

      {/* ── My Courses ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-xl font-extrabold text-gray-900 mb-5">My Courses</h2>
        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(course => (
              <Link key={course.id} to={`/course/${course.id}`} className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="aspect-video bg-gray-100 relative">
                  {course.thumbnailUrl
                    ? <img 
                        src={course.thumbnailUrl} 
                        alt={course.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                        onError={(e) => { e.currentTarget.src = 'https://picsum.photos/800/600?random=' + course.id; }}
                      />
                    : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </div>
                  }
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-indigo-600 shadow-sm">Enrolled</div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                  <div className="mt-4 flex items-center text-sm font-medium text-indigo-600">
                    Continue Learning
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <span className="text-4xl block mb-3">📚</span>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No courses yet</h3>
            <p className="text-gray-500 mb-4 text-sm">You haven't enrolled in any courses.</p>
            <Link to="/browse" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700">Browse Courses</Link>
          </div>
        )}
      </div>

      {/* ── My Notes ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-5">My Notes</h2>
        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : notes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map(note => (
              <Link key={note.id} to={`/note/${note.id}`} className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Purchased</span>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{note.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{note.description}</p>
                  <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
                    View Notes
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <span className="text-4xl block mb-3">📄</span>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No notes yet</h3>
            <p className="text-gray-500 mb-4 text-sm">You haven't purchased any notes.</p>
            <Link to="/notes" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700">Browse Notes</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
