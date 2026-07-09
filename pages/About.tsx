import React from 'react';

const About: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About UNIEVAL</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Empowering engineering students with accessible, high-quality educational resources and evaluation tools.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            UNIEVAL is dedicated to bridging the gap between traditional engineering education and modern learning needs. We provide a comprehensive platform where students can access curated notes, video courses, and interactive quizzes tailored to their curriculum.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            Our goal is to make quality education accessible to every engineering student, helping them excel in their academic journey and prepare for their future careers.
          </p>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-3xl font-bold mb-2">500+</div>
              <div className="text-gray-600 font-medium">Study Notes</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-3xl font-bold mb-2">50+</div>
              <div className="text-gray-600 font-medium">Video Courses</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-3xl font-bold mb-2">1000+</div>
              <div className="text-gray-600 font-medium">Active Students</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-indigo-600 text-3xl font-bold mb-2">24/7</div>
              <div className="text-gray-600 font-medium">AI Support</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Join Our Community</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Whether you're a student looking to excel or a teacher wanting to share knowledge, UNIEVAL is the place for you.
        </p>
        <div className="flex justify-center gap-4">
          <a href="/#/login" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            Get Started
          </a>
          <a href="/#/browse" className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
            Browse Courses
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;
