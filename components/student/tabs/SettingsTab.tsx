import React from 'react';
import { User } from '../../../types';

export interface SettingsTabProps {
  user: User;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ user }) => {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
        <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1F81FC] to-[#7F26FE] flex items-center justify-center text-white font-bold text-4xl shadow-lg shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{user.name}</h3>
            <p className="text-slate-500 text-sm mt-1">{user.email}</p>
            <span className="inline-block mt-3 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-100 uppercase tracking-wide">
              STUDENT
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-4 text-lg">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Phone Number</p>
              <p className="font-medium text-slate-900">{user.phoneNumber || 'Not provided'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Account ID</p>
              <p className="font-mono text-xs text-slate-900 truncate">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
