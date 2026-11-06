import React from 'react';
import { useLocation } from 'react-router-dom';
import { AuthForm, AuthView } from '../components/auth/AuthForm';

const Login: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialView: AuthView = (location.state as any)?.view || (searchParams.get('mode') === 'signup' ? 'SIGNUP' : 'LOGIN');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden font-sans">
      <div className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl relative p-6 sm:p-10 max-h-[92vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200 border border-slate-100">
        <AuthForm mode="page" initialView={initialView} />
      </div>
    </div>
  );
};

export default Login;
