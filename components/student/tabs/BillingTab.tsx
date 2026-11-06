import React from 'react';
import { Coins, CheckCircle, Zap } from 'lucide-react';

export interface BillingTabProps {
  credits: number;
  isUnlimited: boolean;
  unlimitedPlan?: { active?: boolean; expiresAt?: string | null } | null;
  freeUsedCount: number;
  freeQuizLimit: number;
  setShowBuyModal: (show: boolean) => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  credits,
  isUnlimited,
  unlimitedPlan,
  freeUsedCount,
  freeQuizLimit,
  setShowBuyModal
}) => {
  const unlimitedExpiry = unlimitedPlan?.expiresAt ? new Date(unlimitedPlan.expiresAt) : null;

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1F81FC]/10 to-[#7F26FE]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <Coins className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Practice Credits & Plans</h3>
              <p className="text-sm text-slate-500">Credits used for AI Vivas and Exam Diagnostics</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Current Balance</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-extrabold text-slate-900">{isUnlimited ? 'Unlimited' : credits}</span>
                {!isUnlimited && <span className="text-slate-500 font-medium mb-1">credits</span>}
              </div>
            </div>
            {isUnlimited ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Active until {unlimitedExpiry?.toLocaleDateString()}
              </div>
            ) : (
              <button 
                onClick={() => setShowBuyModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors w-full md:w-auto shadow-xs"
              >
                Top Up Credits
              </button>
            )}
          </div>

          {!isUnlimited && freeUsedCount < freeQuizLimit && (
            <p className="text-sm text-slate-600 flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-3 rounded-lg border border-blue-100">
              <Zap className="w-4 h-4 shrink-0 text-amber-500" />
              You have {freeQuizLimit - freeUsedCount} free trial credits remaining.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingTab;
