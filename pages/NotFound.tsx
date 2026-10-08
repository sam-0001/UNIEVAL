import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-lg mx-auto">
        {/* Visual indicator */}
        <div className="text-8xl mb-6" role="img" aria-label="Lost">
          🔍
        </div>

        {/* Large 404 */}
        <p className="text-8xl font-bold leading-none mb-4" style={{ color: '#131A3F' }}>
          404
        </p>

        {/* H1 — Page Not Found */}
        <h1 className="text-3xl font-bold mb-4" style={{ color: '#131A3F' }}>
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-500 mb-10 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary — bg-gradient-main */}
          <Link
            to="/"
            className="inline-block px-8 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1F81FC 0%, #7F26FE 100%)' }}
          >
            Go to Homepage
          </Link>

          {/* Secondary — outlined */}
          <Link
            to="/browse"
            className="inline-block px-8 py-3 rounded-lg font-bold border-2 border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
