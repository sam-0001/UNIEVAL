import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Quiz } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/AuthContext';

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  { id: '15',            label: '15 Credits',      price: 29, icon: '🪙', desc: 'Play 15 quizzes',              badge: '' },
  { id: '25',            label: '25 Credits',      price: 49, icon: '💎', desc: 'Play 25 quizzes',              badge: 'Popular' },
  { id: '75',            label: '75 Credits',      price: 99, icon: '🚀', desc: 'Play 75 quizzes',              badge: 'Best Value' },
  { id: 'unlimited_24h', label: '24hr Unlimited',  price: 19, icon: '⚡', desc: 'Unlimited quizzes for 24 hrs', badge: 'Flash' },
] as const;
type PlanId = typeof PLANS[number]['id'];

declare const Cashfree: any;

// ─── Shared Buy Credits Modal ─────────────────────────────────────────────────
export const BuyCreditsModal: React.FC<{
  onClose: () => void;
  onSuccess?: () => void;
  userName?: string;
  userEmail?: string;
}> = ({ onClose, onSuccess, userName, userEmail }) => {
  const { credits, freeLeft, freeQuizLimit, freeQuizUsed, refresh } = useCredits();
  const [selected, setSelected] = useState<PlanId>('25');
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const handleBuy = async () => {
    setBuying(true); setMsg('');
    try {
      const orderData = await api.createCreditOrder(selected);
      if (orderData.devMode) {
        await refresh();
        setMsg('✅ Credits added! (dev mode)');
        setMsgType('success');
        setTimeout(() => { onSuccess?.(); onClose(); }, 1400);
        setBuying(false);
        return;
      }
      const plan = PLANS.find(p => p.id === selected)!;
      const cashfree = Cashfree({ mode: "sandbox" });
      cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: "_modal"
      }).then((result: any) => {
        if(result.error) {
           setMsg(result.error.message || 'Payment failed');
           setMsgType('error');
        } else {
           api.verifyCreditPayment({
              cashfree_order_id: orderData.orderId,
              cashfree_payment_session_id: orderData.paymentSessionId,
              plan: selected,
           }).then(() => {
              refresh();
              setMsg('✅ Payment successful! Credits added.');
              setMsgType('success');
              setTimeout(() => { onSuccess?.(); onClose(); }, 1400);
           }).catch(() => {
              setMsg('⚠️ Payment received but verification failed. Contact support.');
              setMsgType('error');
           });
        }
      });
    } catch (err: any) {
      setMsg(err.message || 'Failed to initiate payment. Try again.');
      setMsgType('error');
      setBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold leading-none">&times;</button>
          <div className="flex items-center gap-3 mb-1">
            <img src="/img/logo.jpeg" alt="UNIEVAL" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg">UNIEVAL Credits</span>
          </div>
          <p className="text-indigo-200 text-sm">Credits never expire — use them anytime</p>
          <div className="mt-3 flex gap-3 flex-wrap text-xs">
            <span className="bg-white/20 px-3 py-1 rounded-full font-bold">🪙 {credits} credits</span>
            <span className="bg-white/20 px-3 py-1 rounded-full font-bold">🆓 {freeLeft} free plays left</span>
          </div>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase mb-3">Choose a plan</p>
          {PLANS.map(plan => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                selected === plan.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{plan.icon}</span>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">{plan.label}</span>
                  {plan.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      plan.badge === 'Popular' ? 'bg-indigo-100 text-indigo-700' :
                      plan.badge === 'Best Value' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{plan.badge}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{plan.desc}</p>
              </div>
              <span className="font-extrabold text-indigo-700 text-base shrink-0">Rs.{plan.price}</span>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selected === plan.id ? 'border-indigo-600' : 'border-gray-300'
              }`}>
                {selected === plan.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
              </div>
            </button>
          ))}
          {msg && (
            <div className={`text-sm text-center py-2 px-3 rounded-lg font-medium mt-1 ${
              msgType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>{msg}</div>
          )}
          <button onClick={handleBuy} disabled={buying}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            {buying
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Processing...</>
              : <>Pay Rs.{PLANS.find(p => p.id === selected)?.price} &amp; Get Credits</>
            }
          </button>
          <p className="text-center text-xs text-gray-400 mt-1">Secured via Cashfree · Credits never expire</p>
        </div>
      </div>
    </div>
  );
};

// ─── Credit Gate Banner ────────────────────────────────────────────────────────
const CreditGateBanner: React.FC<{
  onBuy: () => void;
  onStart: () => void;
}> = ({ onBuy, onStart }) => {
  const { credits, freeLeft, freeQuizLimit, isUnlimited, hasAccess, loading } = useCredits();

  if (loading) return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 text-sm text-indigo-700">
      <span className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin inline-block" />
      Checking your credits...
    </div>
  );

  return (
    <div className={`rounded-xl border p-4 ${hasAccess ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{isUnlimited ? '⚡' : hasAccess ? '🪙' : '🔒'}</span>
        <div className="flex-grow">
          <p className="font-bold text-gray-900 text-sm">
            {isUnlimited ? 'Unlimited plan active!'
              : freeLeft > 0 ? `${freeLeft} free play${freeLeft !== 1 ? 's' : ''} remaining`
              : credits > 0 ? `${credits} credit${credits !== 1 ? 's' : ''} available`
              : 'No credits remaining'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isUnlimited ? 'Play unlimited quizzes until your plan expires.'
              : freeLeft > 0 ? `${freeLeft} of ${freeQuizLimit} lifetime free plays left. After that, 1 credit per quiz attempt.`
              : credits > 0 ? `Each quiz attempt costs 1 credit. You have ${credits} remaining.`
              : "You've used all 3 free plays. Buy credits — they never expire!"}
          </p>
          {!hasAccess && (
            <button onClick={onBuy} className="mt-3 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
              🛒 Buy Credits from Rs.19
            </button>
          )}
        </div>
        {hasAccess && (
          <button onClick={onStart} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition self-start">
            Start →
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Evaly Scorecard Modal ────────────────────────────────────────────────────
interface EvalyAnalysis {
  summary: string;
  weakTopics: Array<{ topic: string; reason: string; emoji: string }>;
  strongTopics: Array<{ topic: string }>;
  studyPlan: Array<{ action: string; priority: 'high' | 'medium' | 'low' }>;
  motivationalNote: string;
  explanations?: Record<string, string>;
}

const EvalyScorecardModal: React.FC<{
  quiz: Quiz;
  score: number;
  answers: Record<string, string>;
  onClose: () => void;
  onReAttempt: () => void;
  credits: number;
  isUnlimited: boolean;
  onBuyCredits: () => void;
}> = ({ quiz, score, answers, onClose, onReAttempt, credits, isUnlimited, onBuyCredits }) => {
  const [analysis, setAnalysis] = useState<EvalyAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [animIn, setAnimIn] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [evalyMood, setEvalyMood] = useState<'thinking' | 'happy' | 'encouraging' | 'concerned'>('thinking');

  const total = quiz.questions?.length ?? 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const incorrect = quiz.questions?.filter(q => answers[q.id] && answers[q.id] !== q.correctAnswer).length ?? 0;
  const skipped = quiz.questions?.filter(q => !answers[q.id]).length ?? 0;

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 50);
    setTimeout(() => setScoreAnimated(true), 400);
  }, []);

  useEffect(() => {
    if (!quiz.questions) return;
    const fetchAnalysis = async () => {
      setAnalyzing(true);
      try {
        const wrongQuestions = quiz.questions!.filter(q => answers[q.id] !== q.correctAnswer);
        const correctQuestions = quiz.questions!.filter(q => answers[q.id] === q.correctAnswer);
        const prompt = `You are Evaly, a warm and encouraging AI tutor for engineering students on UNIEVAL.

Quiz: "${quiz.title}"
Score: ${score}/${total} (${pct}%)

Correct (${correctQuestions.length}): ${correctQuestions.map((q,i) => `${i+1}. "${q.text}"`).join(' | ')}
Wrong/Skipped (${wrongQuestions.length}): ${wrongQuestions.map((q,i) => `${i+1}. "${q.text}" => student: "${answers[q.id]||'Skipped'}" correct: "${q.correctAnswer}"`).join(' | ')}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "summary": "2-sentence encouraging summary",
  "weakTopics": [{"topic":"concept name","reason":"why they struggled","emoji":"emoji"}],
  "strongTopics": [{"topic":"concept name"}],
  "studyPlan": [{"action":"specific action","priority":"high|medium|low"}],
  "motivationalNote": "1 uplifting sentence",
  "explanations": { "question_id": "Concise 1-2 sentence explanation of why the correct answer is right" }
}

Rules:
- weakTopics max 3, strongTopics max 2, studyPlan 2-3 items.
- Provide "explanations" for ALL questions listed above using their actual IDs as keys.
- Be supportive and educational.`;

        const token = localStorage.getItem('token');
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error('AI request failed');
        const data = await res.json();
        const text = (data.text || '').replace(/```json|```/g, '').trim();
        const parsed: EvalyAnalysis = JSON.parse(text);
        setAnalysis(parsed);
        setEvalyMood(pct >= 80 ? 'happy' : pct >= 50 ? 'encouraging' : 'concerned');
      } catch {
        setAnalysis({
          summary: pct >= 80 ? `Outstanding! You scored ${pct}% — your preparation really shows!` : pct >= 50 ? `Good effort! You scored ${pct}%. You're on the right track.` : `You scored ${pct}%. Don't worry — every attempt teaches you something new!`,
          weakTopics: quiz.questions!.filter(q => answers[q.id] !== q.correctAnswer).slice(0,3).map(q => ({ topic: q.text.length > 50 ? q.text.slice(0,50)+'...' : q.text, reason: 'Review this concept and the correct answer carefully', emoji: '📖' })),
          strongTopics: quiz.questions!.filter(q => answers[q.id] === q.correctAnswer).slice(0,2).map(q => ({ topic: q.text.length > 40 ? q.text.slice(0,40)+'...' : q.text })),
          studyPlan: [{ action: 'Review your incorrect answers and look up the correct concepts', priority: 'high' }, { action: 'Re-attempt this quiz after studying weak areas', priority: 'medium' }],
          motivationalNote: 'Every question you get wrong is a lesson learned. Keep going! 💪',
        });
        setEvalyMood(pct >= 80 ? 'happy' : pct >= 50 ? 'encouraging' : 'concerned');
      } finally {
        setAnalyzing(false);
      }
    };
    fetchAnalysis();
  }, []);

  const grade = pct >= 80
    ? { label: 'Excellent!', color: 'text-emerald-600', bg: 'from-emerald-50 to-teal-50', accent: '#10b981' }
    : pct >= 60
    ? { label: 'Good Job!', color: 'text-indigo-600', bg: 'from-indigo-50 to-violet-50', accent: '#6366f1' }
    : pct >= 40
    ? { label: 'Getting There!', color: 'text-amber-600', bg: 'from-amber-50 to-orange-50', accent: '#f59e0b' }
    : { label: 'Keep Trying!', color: 'text-rose-600', bg: 'from-rose-50 to-pink-50', accent: '#f43f5e' };

  const circ = 2 * Math.PI * 54;
  const offset = circ - (scoreAnimated ? (pct / 100) * circ : circ);
  const moodEmoji = { thinking: '⏳', happy: '🎉', encouraging: '😊', concerned: '💙' }[evalyMood];

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center p-4 pb-10 overflow-y-auto bg-slate-900/80 backdrop-blur-md transition-opacity duration-300 ${animIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`w-full max-w-2xl my-6 transition-all duration-500 space-y-4 ${animIn ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}>

        {/* ── Evaly Header + Score ── */}
        <div className={`bg-gradient-to-br ${grade.bg} border border-white/80 rounded-3xl shadow-2xl overflow-hidden`}>
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${grade.accent}, ${grade.accent}66)` }} />
          <div className="p-7">

            {/* Evaly row */}
            <div className="flex items-start gap-4 mb-6">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white shadow-lg">
                  <img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md text-sm">
                  {moodEmoji}
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Evaly</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">AI Tutor</span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {analyzing
                    ? <span className="flex items-center gap-2 text-indigo-600"><span className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin inline-block" />Analyzing your performance...</span>
                    : (analysis?.summary || '')}
                </p>
              </div>
            </div>

            {/* Score + Stats */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-36 h-36 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={grade.accent} strokeWidth="10"
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black ${grade.color}`}>{pct}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
                </div>
              </div>
              <div className="flex-grow w-full">
                <h2 className={`text-2xl font-black ${grade.color} mb-3`}>{grade.label}</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Total', val: total, icon: '📋', cls: 'bg-white/70 text-slate-700' },
                    { label: 'Correct', val: score, icon: '✅', cls: 'bg-emerald-100/70 text-emerald-700' },
                    { label: 'Incorrect', val: incorrect, icon: '❌', cls: 'bg-rose-100/70 text-rose-700' },
                    { label: 'Skipped', val: skipped, icon: '⏭️', cls: 'bg-slate-100/70 text-slate-600' },
                  ].map(s => (
                    <div key={s.label} className={`${s.cls} rounded-xl px-3 py-2.5 flex items-center gap-2.5`}>
                      <span className="text-lg">{s.icon}</span>
                      <div><div className="font-black text-xl leading-none">{s.val}</div><div className="text-[10px] font-semibold uppercase opacity-60">{s.label}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Analysis ── */}
        {!analyzing && analysis && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

            {analysis.weakTopics.length > 0 && (
              <div className="p-6 border-b border-slate-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-sm">🎯</div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Topics to Work On</h3>
                    <p className="text-[11px] text-slate-400">Evaly identified these weak areas</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {analysis.weakTopics.map((wt, i) => (
                    <div key={i} className="flex items-start gap-3 bg-rose-50 rounded-xl p-3.5 border border-rose-100">
                      <span className="text-xl flex-shrink-0 mt-0.5">{wt.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-rose-800 text-sm">{wt.topic}</p>
                        <p className="text-xs text-rose-600 mt-0.5 leading-relaxed">{wt.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.strongTopics.length > 0 && (
              <div className="p-6 border-b border-slate-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">⭐</div>
                  <h3 className="font-bold text-slate-900 text-sm">Your Strengths</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.strongTopics.map((st, i) => (
                    <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full">✓ {st.topic}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.studyPlan.length > 0 && (
              <div className="p-6 border-b border-slate-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📚</div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Evaly's Study Plan</h3>
                    <p className="text-[11px] text-slate-400">Recommended next steps for you</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {analysis.studyPlan.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5 ${step.priority === 'high' ? 'bg-rose-500 text-white' : step.priority === 'medium' ? 'bg-amber-400 text-white' : 'bg-slate-300 text-slate-600'}`}>{i+1}</div>
                      <p className="text-sm text-slate-700 leading-relaxed flex-1">{step.action}</p>
                      <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${step.priority === 'high' ? 'bg-rose-100 text-rose-600' : step.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{step.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.motivationalNote && (
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-violet-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-indigo-200 flex-shrink-0">
                    <img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-sm text-indigo-700 font-medium italic">"{analysis.motivationalNote}"</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Question Breakdown ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-50">
            <h3 className="font-bold text-slate-900">Question Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Full review of every answer</p>
          </div>
          <div className="divide-y divide-slate-50">
            {quiz.questions?.map((q, idx) => {
              const ua = answers[q.id];
              const ok = ua === q.correctAnswer;
              const explanation = analysis?.explanations?.[q.id];
              return (
                <div key={q.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center mt-0.5 ${ok ? 'bg-emerald-100 text-emerald-700' : !ua ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'}`}>{idx+1}</span>
                      <p className="text-sm text-slate-800 font-medium leading-relaxed">{q.text}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : !ua ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'}`}>{ok ? 'Correct' : !ua ? 'Skipped' : 'Wrong'}</span>
                  </div>
                  <div className="ml-9 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {ua && !ok && <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2"><p className="text-[10px] font-bold text-rose-400 uppercase mb-0.5">Your Answer</p><p className="text-sm font-semibold text-rose-700">{ua}</p></div>}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"><p className="text-[10px] font-bold text-emerald-400 uppercase mb-0.5">Correct Answer</p><p className="text-sm font-semibold text-emerald-700">{q.correctAnswer}</p></div>
                  </div>
                  {explanation && (
                    <div className="ml-9 mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs">💡</span>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Evaly's Explanation</p>
                      </div>
                      <p className="text-xs text-indigo-800 leading-relaxed">{explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{isUnlimited ? '⚡ Unlimited Active' : `🪙 ${credits} credits left`}</span>
              <button onClick={onBuyCredits} className="text-indigo-600 font-bold hover:underline">+ Buy More</button>
            </div>
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 font-medium">Close ×</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onReAttempt} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Re-Attempt Quiz
            </button>
            <Link to="/browse?tab=quizzes" className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm">
              Browse More Quizzes
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const QuizDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, setShowLoginModal, setOnLoginSuccess } = useAuth();
  const { hasAccess, isUnlimited, credits, freeLeft, refresh: refreshCredits } = useCredits();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [status, setStatus] = useState<'intro' | 'active' | 'result'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [showEvaly, setShowEvaly] = useState(false);

  useEffect(() => {
    if (id) { setLoading(true); api.getQuizById(id).then(d => { setQuiz(d || null); setLoading(false); }); }
  }, [id]);

  const doStart = async () => {
    try {
      await api.consumeCredit();
      await refreshCredits();
    } catch (err: any) {
      if (err.message?.includes('No credits') || err.message?.includes('402')) {
        setShowBuyModal(true);
        return;
      }
      console.error('Credit consume error:', err);
    }
    setStatus('active');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setScore(0);
    setShowEvaly(false);
  };

  const handleStart = async () => {
    if (!user) {
      setOnLoginSuccess(() => async () => { await refreshCredits(); });
      setShowLoginModal(true);
      return;
    }
    if (!hasAccess) { setShowBuyModal(true); return; }
    await doStart();
  };

  const handleReAttempt = async () => {
    setShowEvaly(false);
    await refreshCredits();
    try {
      const fresh = await api.getCredits();
      const freshIsUnlimited = !!(fresh.unlimitedPlan?.active && fresh.unlimitedPlan.expiresAt && new Date(fresh.unlimitedPlan.expiresAt) > new Date());
      const freshFreeLeft = Math.max(0, fresh.freeQuizLimit - fresh.freeQuizUsed);
      const freshHasAccess = freshIsUnlimited || freshFreeLeft > 0 || fresh.credits > 0;
      if (!freshHasAccess) { setShowBuyModal(true); return; }
    } catch { /* let it try */ }
    await doStart();
  };

  const handleSelectAnswer = (opt: string) => {
    if (!quiz?.questions) return;
    setAnswers(prev => ({ ...prev, [quiz.questions![currentQuestionIndex].id]: opt }));
  };

  const handleNext = () => {
    if (!quiz?.questions) return;
    currentQuestionIndex < quiz.questions.length - 1 ? setCurrentQuestionIndex(p => p + 1) : handleSubmit();
  };

  const handlePrev = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(p => p - 1); };

  const handleSubmit = () => {
    if (!quiz?.questions) return;
    let s = 0;
    quiz.questions.forEach(q => { if (answers[q.id] === q.correctAnswer) s++; });
    setScore(s);
    setStatus('result');
    setShowEvaly(true);
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading quiz...</div>;
  if (!quiz?.questions) return <div className="p-12 text-center text-slate-500">Quiz not found or empty.</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (status === 'intro') return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} onSuccess={() => setShowBuyModal(false)} userName={user?.name} userEmail={user?.email} />}
      <Link to="/browse?tab=quizzes" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Quizzes
      </Link>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎓</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">{quiz.title}</h1>
          <p className="text-slate-600 text-lg mb-6 max-w-lg mx-auto">{quiz.durationMinutes} minutes · {quiz.questions.length} questions</p>
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 max-w-xs mx-auto mb-6 text-left">
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-indigo-200 flex-shrink-0">
              <img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-500 uppercase tracking-wide">Evaly AI Tutor</p>
              <p className="text-xs text-indigo-700">I'll analyse your results and guide your study!</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8 text-sm">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><span className="block font-bold text-slate-900">{quiz.questions.length}</span><span className="text-slate-500">Questions</span></div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><span className="block font-bold text-slate-900">{quiz.durationMinutes} min</span><span className="text-slate-500">Duration</span></div>
          </div>
          {user ? (
            <div className="max-w-sm mx-auto space-y-3">
              <CreditGateBanner onBuy={() => setShowBuyModal(true)} onStart={doStart} />
              {isUnlimited && <div className="text-xs text-center text-orange-600 font-bold bg-orange-50 rounded-lg py-2 px-3">⚡ 24hr Unlimited active</div>}
              <button onClick={() => setShowBuyModal(true)} className="text-xs text-indigo-500 hover:underline font-medium block mx-auto">🛒 Buy more credits</button>
            </div>
          ) : (
            <button onClick={handleStart} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg shadow-indigo-200 transition-transform hover:scale-105">Start Quiz Now</button>
          )}
        </div>
        <div className="bg-slate-50 border-t border-slate-100 px-8 py-3">
          <p className="text-xs text-slate-500 text-center">🆓 First <strong>3 quizzes free</strong> (lifetime) &nbsp;·&nbsp; 🪙 Then <strong>1 credit per attempt</strong> &nbsp;·&nbsp; ⚡ <strong>Rs.19 for 24hr unlimited</strong> &nbsp;·&nbsp; Credits <strong>never expire</strong></p>
        </div>
      </div>
    </div>
  );

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (status === 'result') return (
    <>
      {showEvaly && quiz && (
        <EvalyScorecardModal
          quiz={quiz} score={score} answers={answers}
          onClose={() => setShowEvaly(false)}
          onReAttempt={handleReAttempt}
          credits={credits} isUnlimited={isUnlimited}
          onBuyCredits={() => { setShowEvaly(false); setShowBuyModal(true); }}
        />
      )}
      {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} onSuccess={() => setShowBuyModal(false)} userName={user?.name} userEmail={user?.email} />}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Score Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-center text-white">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl font-black text-white">
                {quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0}%
              </span>
            </div>
            <h2 className="text-2xl font-extrabold mb-1">Quiz Complete! 🎓</h2>
            <p className="text-indigo-200 text-sm">
              You answered <strong className="text-white">{score}</strong> out of <strong className="text-white">{quiz.questions.length}</strong> questions correctly
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
            {[
              { label: 'Correct', val: score, color: 'text-emerald-600' },
              { label: 'Incorrect', val: quiz.questions.filter(q => answers[q.id] && answers[q.id] !== q.correctAnswer).length, color: 'text-rose-500' },
              { label: 'Skipped', val: quiz.questions.filter(q => !answers[q.id]).length, color: 'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="py-4 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Analyze Quiz CTA — primary action */}
          <div className="p-6">
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-indigo-200 flex-shrink-0">
                  <img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-black text-indigo-800 text-sm">Evaly AI Analysis Ready</p>
                  <p className="text-xs text-indigo-500">Get your personalized scorecard + study plan</p>
                </div>
              </div>
              <button
                onClick={() => setShowEvaly(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2.5 text-base"
              >
                <span className="text-xl">🤖</span>
                Analyze Quiz — See Full Scorecard
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReAttempt}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Re-Attempt Quiz
              </button>
              <Link to="/browse?tab=quizzes" className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm border border-slate-200">
                Browse More Quizzes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── ACTIVE QUIZ ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{quiz.title}</h2>
            <div className="text-xs text-slate-500">Question {currentQuestionIndex + 1} of {quiz.questions.length}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-slate-700 flex items-center gap-2"><span>⏱️</span><span>{quiz.durationMinutes}:00</span></div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 font-bold">{isUnlimited ? '⚡ ∞' : `🪙 ${credits}`}</div>
          </div>
        </div>
        <div className="w-full h-1.5 bg-gray-100"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        <div className="flex-grow">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex flex-col">
            <h3 className="text-xl font-medium text-slate-900 leading-relaxed mb-8">{currentQuestion.text}</h3>
            <div className="space-y-3 mb-8">
              {currentQuestion.options?.map((opt, idx) => {
                const sel = answers[currentQuestion.id] === opt;
                return (
                  <button key={idx} onClick={() => handleSelectAnswer(opt)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 group ${sel ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}`}>
                      {sel && <div className="w-3 h-3 rounded-full bg-indigo-600" />}
                    </div>
                    <span className={`text-base ${sel ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto flex justify-between pt-8 border-t border-gray-100">
              <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition">Previous</button>
              {currentQuestionIndex === quiz.questions.length - 1
                ? <button onClick={handleSubmit} className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transition">Submit Quiz</button>
                : <button onClick={handleNext} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition">Next Question</button>
              }
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-24">
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, idx) => (
                <button key={q.id} onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-10 w-10 rounded-lg text-sm font-bold transition-all ${idx === currentQuestionIndex ? 'ring-2 ring-indigo-500 ring-offset-2' : ''} ${answers[q.id] ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600" /> Answered</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300" /> Unanswered</div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-1">Credits</p>
              <p className="text-lg font-extrabold text-indigo-700">{isUnlimited ? '⚡ ∞' : `🪙 ${credits}`}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 bg-indigo-50 rounded-lg p-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0"><img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" /></div>
                <p className="text-[10px] text-indigo-600 font-semibold leading-tight">Evaly will analyse your results after you submit!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizDetail;