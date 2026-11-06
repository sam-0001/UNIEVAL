import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthForm } from './auth/AuthForm';

const LoginModal: React.FC = () => {
  const { showLoginModal, setShowLoginModal, onLoginSuccess, setOnLoginSuccess } = useAuth();

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[460px] rounded-2xl shadow-2xl relative p-6 sm:p-8 max-h-[92vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200 border border-slate-100">
        <AuthForm
          mode="modal"
          onClose={() => {
            setShowLoginModal(false);
            setOnLoginSuccess(null);
          }}
          onSuccess={(user) => {
            setShowLoginModal(false);
            if (onLoginSuccess) {
              onLoginSuccess(user);
              setOnLoginSuccess(null);
            }
          }}
        />
      </div>
    </div>
  );
};

export default LoginModal;
