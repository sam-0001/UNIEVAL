import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Trash2, ChevronLeft, Menu, X } from 'lucide-react';
import { ExamIntelligenceDoc, ExamTopic, ExamUnit } from '../types';
import { listExamIntelligence, getExamIntelligence, deleteExamIntelligence, uploadExamIntelligence, ListItem } from '../services/examIntelligenceApi';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/AuthContext';
import { BuyCreditsModal } from './QuizDetail';
import { UserRole } from '../types';

const PRIORITY_CONFIG = {
  high:   { label: 'High',   icon: '🔥', classes: 'bg-red-100 text-red-700 border border-red-200' },
  medium: { label: 'Medium', icon: '⚡', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  low:    { label: 'Low',    icon: '❄️', classes: 'bg-blue-100 text-blue-700 border border-blue-200' },
};

interface QuizQuestion { question: string; options: string[]; correct: string; }

// ─── Topic Card ───────────────────────────────────────────────────────────────
const TopicCard: React.FC<{ topic: ExamTopic; onClick: () => void }> = ({ topic, onClick }) => {
  const p = PRIORITY_CONFIG[topic.priority] ?? PRIORITY_CONFIG.medium;
  return (
    <button onClick={onClick} className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 active:scale-[0.98]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{topic.name}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${p.classes}`}>{p.icon} {p.label}</span>
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span><span className="text-indigo-500 font-semibold">{topic.weightage}%</span> weightage</span>
        <span><span className="text-indigo-500 font-semibold">{topic.frequency}x</span> in exams</span>
      </div>
    </button>
  );
};

// ─── Topic Detail Modal ───────────────────────────────────────────────────────
const TopicDetail: React.FC<{ topic: ExamTopic; onClose: () => void }> = ({ topic, onClose }) => {
  const p = PRIORITY_CONFIG[topic.priority] ?? PRIORITY_CONFIG.medium;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-start justify-between rounded-t-2xl">
          {/* Mobile drag indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full sm:hidden" />
          <div className="mt-2 sm:mt-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">{topic.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1 text-xs">
              <span className={`font-medium px-2 py-0.5 rounded-full ${p.classes}`}>{p.icon} {p.label}</span>
              <span className="text-gray-500">{topic.weightage}% weightage · {topic.frequency}x frequency</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0 ml-4 mt-2 sm:mt-0">✕</button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-6">
          {topic.topQuestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Top Questions</h3>
              <ul className="space-y-2">
                {topic.topQuestions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700 bg-indigo-50 rounded-lg p-3">
                    <span className="shrink-0 font-semibold text-indigo-600">{i+1}.</span><span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {topic.pyqs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Previous Year Questions</h3>
              <div className="space-y-2">
                {topic.pyqs.map((pyq, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-2 mb-1">
                      <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{pyq.year}</span>
                      <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{pyq.marks} marks</span>
                    </div>
                    <p className="text-sm text-gray-800">{pyq.question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topic.topQuestions.length === 0 && topic.pyqs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No questions available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Quiz Modal ───────────────────────────────────────────────────────────────
const DIFF_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];

// ── Evaly AI Scorecard (inline, inside the modal) ──────────────────────────
interface EvalyAnalysis {
  summary: string;
  weakTopics: Array<{ topic: string; reason: string; emoji: string }>;
  strongTopics: Array<{ topic: string }>;
  studyPlan: Array<{ action: string; priority: 'high' | 'medium' | 'low' }>;
  motivationalNote: string;
  explanations?: Record<number, string>;
}

const guessGender = (name: string): 'male' | 'female' | 'unknown' => {
  if (!name) return 'unknown';
  const n = name.trim().toLowerCase();
  const femaleNames = ['priya','neha','pooja','sneha','ananya','isha','riya','siya','shreya','kavya','divya','nisha','rekha','sunita','meena','geeta','sonal','ankita','pallavi','swati','rutuja','shruti','gauri','tanvi','mansi','nidhi','sakshi'];
  const maleNames = ['rahul','rohit','amit','arjun','raj','rohan','aarav','dev','yash','kunal','sagar','nikhil','akash','vikas','suresh','ravi','anil','sunil','deepak','harsh','pratik','gaurav','ajay','vijay','abhishek','tushar','omkar','sanket','atharva'];
  const femaleHints = ['a','i','ee','ii','u','aa'];
  if (femaleNames.some(fn => n.startsWith(fn))) return 'female';
  if (maleNames.some(mn => n.startsWith(mn))) return 'male';
  if (femaleHints.some(h => n.endsWith(h) && n.length > 3)) return 'female';
  return 'unknown';
};

const EvalyScorecard: React.FC<{
  questions: QuizQuestion[];
  selected: Record<number, string>;
  score: number;
  subject: string;
  unitTitle: string;
  userName?: string;
  onTryAnother: () => void;
}> = ({ questions, selected, score, subject, unitTitle, userName, onTryAnother }) => {
  const [analysis, setAnalysis] = useState<EvalyAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [lang, setLang] = useState<'hindi' | 'marathi' | 'english'>('english');

  const total = questions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const incorrect = questions.filter((q, i) => selected[i] && selected[i] !== q.correct).length;
  const skipped = questions.filter((_, i) => !selected[i]).length;
  const gender = guessGender(userName || '');
  const firstName = userName ? userName.trim().split(' ')[0] : '';

  useEffect(() => { setTimeout(() => setScoreAnimated(true), 300); }, []);

  const buildPrompt = (language: 'hindi' | 'marathi' | 'english') => {
    const wrongQs = questions.filter((q, i) => selected[i] !== q.correct);
    const rightQs = questions.filter((q, i) => selected[i] === q.correct);
    const address = {
      hindi: gender === 'female' ? 'behen' : gender === 'male' ? 'bhai' : 'yaar',
      marathi: gender === 'female' ? 'tai' : gender === 'male' ? 'dada' : 'mitra',
      english: gender === 'female' ? 'hey' : gender === 'male' ? 'hey' : 'hey',
    }[language];
    const nameAddr = firstName ? `${address} ${firstName}` : address;
    const langInstructions = {
      hindi: `Write EVERYTHING in friendly Hinglish (Hindi written in English script). Score is ${pct}% — ${pct < 40 ? `Be extra warm.` : pct < 70 ? `Encouraging` : `Celebrate`}`,
      marathi: `Write EVERYTHING in friendly Marathlish (Marathi written in English script). Score is ${pct}% — ${pct < 40 ? `Be extra warm.` : pct < 70 ? `Encouraging` : `Celebrate`}`,
      english: `Write in friendly, casual English. Score is ${pct}% — ${pct < 40 ? `Be extra reassuring.` : pct < 70 ? `Encouraging` : `Celebratory`}`,
    }[language];
    return `You are Evaly, a super friendly, funny, supportive AI study buddy for engineering students on UNIEVAL.\nStudent name: "${firstName || 'friend'}" | Detected gender: ${gender}\nQuiz: "${subject} — ${unitTitle}"\nScore: ${score}/${total} (${pct}%)\n${langInstructions}\nCorrect questions (${rightQs.length}): ${rightQs.map(q => `"${q.question}"`).join(' | ')}\nWrong/Skipped (${wrongQs.length}): ${wrongQs.map(q => `"${q.question}" [correct: "${q.correct}"]`).join(' | ')}\nCRITICAL RULES:\n1. These marks are NOT saved anywhere. No one is judging. This is practice only.\n2. Encourage preparing genuinely.\n3. Be like a fun senior student, not a robot.\n4. NEVER write in actual Devanagari script.\n5. Every response must feel DIFFERENT.\n6. studyPlan actions must also be in the same language style.\nRespond ONLY with valid JSON (no markdown, no backticks, no extra text):\n{\n  "summary": "2-3 warm sentences",\n  "weakTopics": [{"topic":"concept name","reason":"why they struggled","emoji":"relevant emoji"}],\n  "strongTopics": [{"topic":"concept name"}],\n  "studyPlan": [{"action":"specific next step","priority":"high|medium|low"}],\n  "motivationalNote": "1 punchy motivational line",\n  "explanations": { "0": "Concise 1-sentence explanation of why the correct answer is right" }\n}\nRules: weakTopics max 3, strongTopics max 2, studyPlan exactly 3 items. Provide "explanations" for ALL questions using their indices as keys.`;
  };

  const fetchAnalysis = async (language: 'hindi' | 'marathi' | 'english') => {
    setAnalyzing(true); setAnalysis(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt: buildPrompt(language) }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const text = (data.text || '').replace(/```json|```/g, '').trim();
      setAnalysis(JSON.parse(text));
    } catch {
      const wrongQs = questions.filter((q, i) => selected[i] !== q.correct);
      const rightQs = questions.filter((q, i) => selected[i] === q.correct);
      const fallbacks = {
        hindi: {
          summary: pct >= 80 ? `Wah ${firstName || 'yaar'}! Ekdum zabardast! ${pct}%!` : pct >= 50 ? `Accha kiya ${firstName || 'bhai'}! Thodi aur mehnat!` : `Koi baat nahi ${firstName || 'yaar'}, dobara de!`,
          weakTopics: wrongQs.slice(0,3).map(q => ({ topic: q.question.slice(0,50), reason: 'Ek baar aur dekh!', emoji: '📖' })),
          strongTopics: rightQs.slice(0,2).map(q => ({ topic: q.question.slice(0,45) })),
          studyPlan: [
            { action: 'Jo galat hua uska correct answer padh', priority: 'high' as const },
            { action: 'Notes se weak topics cover kar', priority: 'medium' as const },
            { action: 'Jab ready feel ho tab dobara quiz de', priority: 'low' as const },
          ],
          motivationalNote: `${firstName || 'Yaar'}, tu kar sakta/sakti hai! 💪`,
        },
        marathi: {
          summary: pct >= 80 ? `Waah ${firstName || 'mitra'}! Bhari performance! ${pct}%!` : pct >= 50 ? `Chan prayatna ${firstName || 'mitra'}! ${pct}%!` : `Arre ${firstName || 'mitra'}, kahi nahi! Parivahan de!`,
          weakTopics: wrongQs.slice(0,3).map(q => ({ topic: q.question.slice(0,50), reason: 'Ha concept ek vela parivahan!', emoji: '📖' })),
          strongTopics: rightQs.slice(0,2).map(q => ({ topic: q.question.slice(0,45) })),
          studyPlan: [
            { action: 'Chukicha uttar ka hote te samjhun ghe', priority: 'high' as const },
            { action: 'Notes madhe weak topics cover kar', priority: 'medium' as const },
            { action: 'Ready vatla ki parivahan de', priority: 'low' as const },
          ],
          motivationalNote: `${firstName || 'Mitra'}, tu naakki karun shaktos! 💪`,
        },
        english: {
          summary: pct >= 80 ? `Absolutely crushed it, ${firstName || 'friend'}! ${pct}%!` : pct >= 50 ? `Good effort, ${firstName || 'friend'}! ${pct}%!` : `Hey ${firstName || 'friend'}, ${pct}% is totally okay. Study on your terms!`,
          weakTopics: wrongQs.slice(0,3).map(q => ({ topic: q.question.slice(0,50), reason: 'Review this concept once more!', emoji: '📖' })),
          strongTopics: rightQs.slice(0,2).map(q => ({ topic: q.question.slice(0,45) })),
          studyPlan: [
            { action: 'Read why the correct answers are right', priority: 'high' as const },
            { action: 'Cover your weak topics from notes', priority: 'medium' as const },
            { action: 'Retake the quiz when you feel ready', priority: 'low' as const },
          ],
          motivationalNote: `${firstName || 'Hey'}, prepare with confidence and come back stronger! 💪`,
        },
      };
      const fb = fallbacks[language];
      setAnalysis({ ...fb, weakTopics: fb.weakTopics as EvalyAnalysis['weakTopics'] });
    } finally { setAnalyzing(false); }
  };

  const wrongQs = questions.filter((q, i) => selected[i] !== q.correct);
  const rightQs = questions.filter((q, i) => selected[i] === q.correct);

  useEffect(() => { fetchAnalysis(lang); }, [lang]);

  const gradeLabels = {
    hindi: pct >= 80 ? 'Zabardast! 🔥' : pct >= 60 ? 'Accha kiya! 👍' : pct >= 40 ? 'Ho jayega! 💪' : 'Koi baat nahi! 🤜',
    marathi: pct >= 80 ? 'Ekdum Bhari! 🔥' : pct >= 60 ? 'Chan Kelas! 👍' : pct >= 40 ? 'Hoil Nakki! 💪' : 'Kahi Nahi! 🤜',
    english: pct >= 80 ? 'Excellent! 🔥' : pct >= 60 ? 'Good Job! 👍' : pct >= 40 ? 'Getting There! 💪' : 'Keep Going! 🤜',
  };

  const grade = pct >= 80
    ? { color: 'text-emerald-600', accent: '#10b981', bg: 'from-emerald-50 to-teal-50' }
    : pct >= 60
    ? { color: 'text-indigo-600', accent: '#6366f1', bg: 'from-indigo-50 to-violet-50' }
    : pct >= 40
    ? { color: 'text-amber-600', accent: '#f59e0b', bg: 'from-amber-50 to-orange-50' }
    : { color: 'text-rose-600', accent: '#f43f5e', bg: 'from-rose-50 to-pink-50' };

  const circ = 2 * Math.PI * 40;
  const offset = circ - (scoreAnimated ? (pct / 100) * circ : circ);

  const langConfig = [
    { key: 'english' as const, label: 'English', flag: '🇬🇧' },
    { key: 'hindi' as const, label: 'हिंदी', flag: '🇮🇳' },
    { key: 'marathi' as const, label: 'मराठी', flag: '🟠' },
  ];

  return (
    <div className="space-y-4">
      {/* Language switcher */}
      <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex-shrink-0 hidden xs:block">Evaly speaks:</span>
        <div className="flex gap-1 flex-1">
          {langConfig.map(l => (
            <button key={l.key} onClick={() => setLang(l.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all
                ${lang === l.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
              <span>{l.flag}</span>{l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Score header */}
      <div className={`bg-gradient-to-br ${grade.bg} rounded-2xl p-4 sm:p-5 border border-white/80`}>
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Donut */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="8" />
              <circle cx="44" cy="44" r="40" fill="none" stroke={grade.accent} strokeWidth="8"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black ${grade.color}`}>{pct}%</span>
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <h3 className={`text-lg sm:text-xl font-black ${grade.color} mb-2`}>{gradeLabels[lang]}</h3>
            <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
              {[
                { label: 'Correct', val: score, cls: 'bg-emerald-100/80 text-emerald-700' },
                { label: 'Wrong', val: incorrect, cls: 'bg-rose-100/80 text-rose-700' },
                { label: 'Skipped', val: skipped, cls: 'bg-slate-100/80 text-slate-500' },
                { label: 'Total', val: total, cls: 'bg-white/70 text-slate-700' },
              ].map(s => (
                <div key={s.label} className={`${s.cls} rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-center gap-1 sm:gap-1.5`}>
                  <span className="font-black text-base leading-none">{s.val}</span>
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase opacity-60">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evaly summary */}
        <div className="mt-4 flex items-start gap-3 bg-white/60 rounded-xl p-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-indigo-200 flex-shrink-0">
            <img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Evaly</span>
              <span className="text-[9px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">AI Tutor</span>
            </div>
            {analyzing
              ? <span className="flex items-center gap-1.5 text-xs text-indigo-500">
                  <span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin inline-block" />
                  {lang === 'hindi' ? 'Tera analysis ho raha hai...' : lang === 'marathi' ? 'Tuzha analysis chalu aahe...' : 'Analyzing your performance...'}
                </span>
              : <p className="text-xs text-slate-700 leading-relaxed">{analysis?.summary}</p>
            }
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      {!analyzing && analysis && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {analysis.weakTopics.length > 0 && (
            <div className="p-4 border-b border-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center text-xs">🎯</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {lang === 'hindi' ? 'In Topics Pe Dhyan De' : lang === 'marathi' ? 'Ya Topics Var Laks De' : 'Topics to Focus On'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'hindi' ? 'Yahan thodi aur mehnat chahiye' : lang === 'marathi' ? 'Itthe thodi jast mehnat havi' : 'Identified weak areas'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {analysis.weakTopics.map((wt, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-rose-50 rounded-xl p-3 border border-rose-100">
                    <span className="text-lg flex-shrink-0">{wt.emoji}</span>
                    <div>
                      <p className="font-bold text-rose-800 text-xs">{wt.topic}</p>
                      <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">{wt.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.strongTopics.length > 0 && (
            <div className="p-4 border-b border-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-xs">⭐</div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {lang === 'hindi' ? 'Teri Strengths' : lang === 'marathi' ? 'Tuzhe Strengths' : 'Your Strengths'}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.strongTopics.map((st, i) => (
                  <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full">✓ {st.topic}</span>
                ))}
              </div>
            </div>
          )}

          {analysis.studyPlan.length > 0 && (
            <div className="p-4 border-b border-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-xs">📚</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {lang === 'hindi' ? 'Aage Ka Plan' : lang === 'marathi' ? 'Pudhacha Plan' : 'Study Plan'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'hindi' ? 'Teri next steps' : lang === 'marathi' ? 'Tuzhe next steps' : 'Recommended next steps'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {analysis.studyPlan.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5
                      ${step.priority === 'high' ? 'bg-rose-500 text-white' : step.priority === 'medium' ? 'bg-amber-400 text-white' : 'bg-slate-300 text-slate-600'}`}>{i+1}</div>
                    <p className="text-xs text-slate-700 leading-relaxed flex-1">{step.action}</p>
                    <span className={`flex-shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full
                      ${step.priority === 'high' ? 'bg-rose-100 text-rose-600' : step.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{step.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.motivationalNote && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-indigo-200 flex-shrink-0">
                <img src="/img/logo.jpeg" alt="Evaly" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-indigo-700 font-medium italic">"{analysis.motivationalNote}"</p>
            </div>
          )}
        </div>
      )}

      {/* Question Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <h4 className="font-bold text-slate-900 text-sm">Question Breakdown</h4>
        </div>
        <div className="divide-y divide-slate-50">
          {questions.map((q, idx) => {
            const ua = selected[idx];
            const ok = ua === q.correct;
            const explanation = analysis?.explanations?.[idx];
            return (
              <div key={idx} className="p-3 sm:p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center mt-0.5
                    ${ok ? 'bg-emerald-100 text-emerald-700' : !ua ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'}`}>{idx+1}</span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed flex-1">{q.question}</p>
                  <span className={`flex-shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full
                    ${ok ? 'bg-emerald-100 text-emerald-700' : !ua ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'}`}>
                    {ok ? 'Correct' : !ua ? 'Skipped' : 'Wrong'}
                  </span>
                </div>
                <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ua && !ok && <div className="bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] font-bold text-rose-400 uppercase mb-0.5">Your Answer</p>
                    <p className="text-xs font-semibold text-rose-700">{ua}</p>
                  </div>}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] font-bold text-emerald-400 uppercase mb-0.5">Correct Answer</p>
                    <p className="text-xs font-semibold text-emerald-700">{q.correct}</p>
                  </div>
                </div>
                {explanation && (
                  <div className="ml-7 mt-2.5 p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs">💡</span>
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">Evaly's Explanation</p>
                    </div>
                    <p className="text-xs text-indigo-800 leading-relaxed">{explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <button onClick={onTryAnother}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2 text-sm active:scale-[0.98]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        Try Another Quiz
      </button>
    </div>
  );
};

const QuizModal: React.FC<{ subject: string; semester: string; unit: ExamUnit; branch: string; year: string; onClose: () => void }> = ({ subject, semester, unit, branch, year, onClose }) => {
  const { user, setShowLoginModal } = useAuth();
  const { hasAccess, freeLeft, credits, isUnlimited, refresh: refreshCredits } = useCredits();

  const [screen, setScreen]     = useState<'select' | 'active' | 'result'>('select');
  const [difficulty, setDifficulty] = useState(3);
  const [questions, setQuestions]   = useState<QuizQuestion[]>([]);
  const [selected, setSelected]     = useState<Record<number, string>>({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showBuy, setShowBuy]       = useState(false);

  useEffect(() => { refreshCredits(); }, []);

  const handleStart = async () => {
    if (!user) { setShowLoginModal(true); return; }
    setLoading(true); setError(''); setQuestions([]); setSelected({});
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subject, semester, unit: unit.unit, difficulty, branch, year }),
      });
      const data = await res.json();
      if (res.status === 402) { setShowBuy(true); setLoading(false); return; }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setQuestions(data.questions);
      setScreen('active');
      await refreshCredits();
    } catch (err: any) {
      setError(err.message || 'Quiz generation failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleTryAnother = () => { setScreen('select'); setQuestions([]); setSelected({}); setError(''); };
  const score = questions.filter((q, i) => selected[i] === q.correct).length;

  return (
    <>
      {showBuy && (
        <BuyCreditsModal
          onClose={() => setShowBuy(false)}
          onSuccess={async () => { await refreshCredits(); setShowBuy(false); }}
          userName={user?.name}
          userEmail={user?.email}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Mobile drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-start justify-between rounded-t-2xl">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Quiz — {unit.unit}</h2>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{unit.title}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!isUnlimited && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  🆓 {freeLeft} left
                </span>
              )}
              {isUnlimited && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                  ⚡ ∞
                </span>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
            {/* ── DIFFICULTY SELECT SCREEN ── */}
            {screen === 'select' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Difficulty: <span className="text-indigo-600">{DIFF_LABELS[difficulty]}</span>
                  </label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(d => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`flex-1 h-10 rounded-lg text-sm font-bold transition-colors border ${difficulty === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">1 = Easiest · 5 = Hardest</p>
                </div>

                <div className={`rounded-xl p-3 text-sm flex items-start gap-2 border ${hasAccess ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <span className="mt-0.5">{isUnlimited ? '⚡' : freeLeft > 0 ? '🆓' : credits > 0 ? '🪙' : '🔒'}</span>
                  <div>
                    {isUnlimited
                      ? <span className="font-semibold">Unlimited plan active</span>
                      : freeLeft > 0
                      ? <span><span className="font-semibold">{freeLeft} of 3 free quizzes</span> remaining</span>
                      : credits > 0
                      ? <span><span className="font-semibold">{credits} credit{credits !== 1 ? 's' : ''}</span> available</span>
                      : <span className="font-semibold">No credits left — buy some to continue!</span>
                    }
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}

                <div className="flex gap-3 items-center flex-wrap">
                  <button onClick={handleStart} disabled={loading}
                    className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors active:scale-[0.98]">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Generating...' : '⚡ Start Quiz'}
                  </button>
                  {!hasAccess && (
                    <button onClick={() => setShowBuy(true)}
                      className="px-4 py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                      🛒 Buy Credits
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">🆓 First 3 quizzes free · 🪙 1 credit per quiz after · Credits never expire</p>
              </div>
            )}

            {/* ── ACTIVE QUIZ SCREEN ── */}
            {screen === 'active' && questions.length > 0 && (
              <div className="space-y-4 sm:space-y-5">
                {questions.map((q, qi) => (
                  <div key={qi} className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      <span className="text-indigo-600 mr-1">Q{qi+1}.</span>{q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const isSel = selected[qi] === opt;
                        return (
                          <button key={oi} onClick={() => setSelected(p => ({...p, [qi]: opt}))}
                            className={`w-full text-left text-sm px-3 py-2.5 sm:py-2 rounded-lg transition-colors border active:scale-[0.98]
                              ${isSel ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 flex-col sm:flex-row">
                  <button
                    onClick={() => setScreen('result')}
                    disabled={Object.keys(selected).length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-100 active:scale-[0.98]">
                    <span className="text-base">🤖</span>
                    Submit & Analyze with Evaly
                  </button>
                  <button onClick={handleTryAnother}
                    className="sm:w-auto px-5 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── RESULT / EVALY SCORECARD ── */}
            {screen === 'result' && questions.length > 0 && (
              <EvalyScorecard
                questions={questions}
                selected={selected}
                score={score}
                subject={subject}
                unitTitle={unit.title}
                onTryAnother={handleTryAnother}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Unit Section ─────────────────────────────────────────────────────────────
const UnitSection: React.FC<{ unit: ExamUnit; subject: string; semester: string; branch: string; year: string; onTopicClick: (t: ExamTopic) => void }> = ({ unit, subject, semester, branch, year, onTopicClick }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="shrink-0 bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unit.unit}</span>
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 truncate">{unit.title}</h2>
        </div>
        <button onClick={() => setShowQuiz(true)}
          className="shrink-0 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap">
          ⚡ Quiz
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {unit.topics.map((topic, i) => (
          <TopicCard key={i} topic={topic} onClick={() => onTopicClick(topic)} />
        ))}
      </div>
      {showQuiz && <QuizModal subject={subject} semester={semester} unit={unit} branch={branch} year={year} onClose={() => setShowQuiz(false)} />}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const BRANCH_ORDER = ['FE', 'SE', 'TE', 'BE'];

const ExamIntelligence: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const [list, setList]               = useState<ListItem[]>([]);
  const [selected, setSelected]       = useState<ExamIntelligenceDoc | null>(null);
  const [activeTopic, setActiveTopic] = useState<ExamTopic | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc]   = useState(false);
  const [error, setError]             = useState('');
  const [activeBranch, setActiveBranch] = useState('');
  const [deletingId, setDeletingId]   = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle

  // ── Upload state (SUPER_ADMIN only) ──
  const [uploadText, setUploadText]     = useState('');
  const [uploading, setUploading]       = useState(false);
  const [uploadResult, setUploadResult] = useState<{ message: string; saved: string[]; skipped: string[] } | null>(null);
  const [uploadError, setUploadError]   = useState('');
  const [showUpload, setShowUpload]     = useState(false);

  const handleUpload = async () => {
    setUploadError(''); setUploadResult(null);
    let parsed: any;
    try { parsed = JSON.parse(uploadText.trim()); }
    catch { setUploadError('Invalid JSON — please check the format and try again.'); return; }
    setUploading(true);
    try {
      const result = await uploadExamIntelligence(parsed);
      setUploadResult(result);
      setUploadText('');
      loadList();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadText(ev.target?.result as string ?? '');
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadList = () => {
    setLoadingList(true);
    listExamIntelligence()
      .then(data => setList(data))
      .catch(() => setError('Failed to load subjects.'))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadList(); }, []);

  const deduped = useMemo(() => {
    const seen = new Map<string, ListItem>();
    const sorted = [...list].sort((a, b) => {
      const aHas = (a.branch || '') !== '' ? 0 : 1;
      const bHas = (b.branch || '') !== '' ? 0 : 1;
      return aHas - bHas;
    });
    for (const item of sorted) {
      const key = `${item.subject.toLowerCase().trim()}__${item.semester}`;
      if (!seen.has(key)) seen.set(key, item);
    }
    return Array.from(seen.values());
  }, [list]);

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, ListItem[]>> = {};
    for (const item of deduped) {
      const branch = item.branch?.trim() || 'Other';
      const year   = item.year?.trim()   || 'General';
      if (!map[branch]) map[branch] = {};
      if (!map[branch][year]) map[branch][year] = [];
      map[branch][year].push(item);
    }
    return map;
  }, [deduped]);

  const branches = useMemo(() => {
    const all = Object.keys(grouped);
    return [
      ...BRANCH_ORDER.filter(b => all.includes(b)),
      ...all.filter(b => !BRANCH_ORDER.includes(b)).sort(),
    ];
  }, [grouped]);

  useEffect(() => {
    if (branches.length > 0 && !activeBranch) setActiveBranch(branches[0]);
  }, [branches]);

  const handleSelect = async (item: ListItem) => {
    if (selected?.id === item.id) { setSelected(null); return; }
    setLoadingDoc(true); setError('');
    setSidebarOpen(false); // close sidebar on mobile after selecting
    try {
      const doc = await getExamIntelligence(item.id);
      setSelected(doc);
    } catch { setError('Failed to load exam data.'); }
    finally { setLoadingDoc(false); }
  };

  const handleDelete = async (item: ListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${item.subject}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteExamIntelligence(item.id);
      if (selected?.id === item.id) setSelected(null);
      loadList();
    } catch { setError('Failed to delete subject.'); }
    finally { setDeletingId(''); }
  };

  const currentYears = activeBranch ? grouped[activeBranch] ?? {} : {};

  // Sidebar content — shared between desktop sidebar and mobile drawer
  const SidebarContent = () => (
    <>
      {/* Branch tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {branches.map(branch => (
          <button key={branch} onClick={() => { setActiveBranch(branch); setSelected(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${activeBranch === branch ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {branch}
          </button>
        ))}
      </div>

      {/* Year → Semester → Subjects */}
      {Object.entries(currentYears).sort().map(([year, items]) => {
        const bySem: Record<string, ListItem[]> = {};
        for (const item of items) {
          const k = `Sem ${item.semester}`;
          if (!bySem[k]) bySem[k] = [];
          bySem[k].push(item);
        }
        return (
          <div key={year} className="mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{year}</p>
            {Object.entries(bySem).sort().map(([sem, semItems]) => (
              <div key={sem} className="mb-3">
                <p className="text-xs font-semibold text-gray-500 mb-1.5 px-1">{sem}</p>
                <div className="space-y-1">
                  {semItems.map(item => (
                    <div key={item.id} className={`flex items-center gap-1 rounded-lg border transition-colors ${selected?.id === item.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <button onClick={() => handleSelect(item)}
                        className={`flex-1 text-left px-3 py-2.5 sm:py-2 text-xs ${selected?.id === item.id ? 'text-white' : 'text-gray-700'}`}>
                        {item.subject}
                      </button>
                      {isSuperAdmin && (
                        <button onClick={(e) => handleDelete(item, e)} disabled={deletingId === item.id}
                          className={`p-1.5 mr-1 rounded transition-colors ${selected?.id === item.id ? 'text-indigo-200 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                          title="Delete">
                          {deletingId === item.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-screen">
      <div className="mb-4 sm:mb-6 border-b border-gray-200 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Exam Intelligence</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Stop wasting time. Study only what is asked in exams.</p>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* ── Super Admin Upload Panel ── */}
      {isSuperAdmin && (
        <div className="mb-6">
          <button
            onClick={() => { setShowUpload(v => !v); setUploadResult(null); setUploadError(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-200">
            <span className="text-base">{showUpload ? '✕' : '⬆️'}</span>
            {showUpload ? 'Close Upload' : 'Upload Exam Data'}
          </button>

          {showUpload && (
            <div className="mt-3 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-indigo-900 px-5 py-4">
                <h3 className="text-white font-bold text-sm">Upload Exam Intelligence JSON</h3>
                <p className="text-indigo-300 text-xs mt-0.5">Paste JSON directly or load from a file. Duplicates are auto-skipped.</p>
              </div>

              <div className="p-5 space-y-4">
                {/* File picker */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Load from File</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition border border-gray-200">
                    <span>📂</span> Choose JSON File
                    <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {uploadText && (
                    <span className="ml-3 text-xs text-green-600 font-medium">✓ File loaded ({uploadText.length.toLocaleString()} chars)</span>
                  )}
                </div>

                {/* JSON textarea */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Or Paste JSON</label>
                  <textarea
                    value={uploadText}
                    onChange={e => setUploadText(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-200 rounded-xl p-3 font-mono text-xs text-gray-800 bg-gray-50 focus:ring-2 focus:ring-indigo-400 outline-none resize-y"
                    placeholder={`// Single subject:\n{\n  "subject": "Engineering Mathematics III",\n  "semester": "5",\n  "branch": "CS",\n  "year": "TE",\n  "units": [...]\n}\n\n// Or an array of subjects:\n[{ "subject": "...", ... }, { "subject": "...", ... }]`}
                  />
                </div>

                {/* Result / Error */}
                {uploadResult && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 font-bold text-sm mb-1">✅ {uploadResult.message}</p>
                    {uploadResult.saved.length > 0 && (
                      <p className="text-green-700 text-xs">Saved: {uploadResult.saved.join(', ')}</p>
                    )}
                    {uploadResult.skipped.length > 0 && (
                      <p className="text-amber-600 text-xs mt-0.5">Skipped (duplicates): {uploadResult.skipped.join(', ')}</p>
                    )}
                  </div>
                )}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700 font-bold text-sm">❌ {uploadError}</p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadText.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-sm">
                  {uploading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
                    : <><span>⬆️</span> Upload</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loadingList ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
        </div>
      ) : deduped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-4xl mb-3">📚</span>
          <p className="text-sm">No exam data uploaded yet.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: Subject selector button ── */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <span className="flex items-center gap-2">
                <Menu className="w-4 h-4 text-indigo-500" />
                {selected ? (
                  <span className="truncate">{selected.subject} <span className="font-normal text-gray-400">— Sem {selected.semester}</span></span>
                ) : 'Select a Subject'}
              </span>
              <ChevronLeft className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
          </div>

          {/* ── Mobile Sidebar Drawer ── */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
              {/* Drawer */}
              <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between z-10">
                  <h2 className="font-bold text-gray-900 text-sm">Select Subject</h2>
                  <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-4 py-4">
                  <SidebarContent />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-6">
            {/* ── Desktop Sidebar ── */}
            <div className="hidden lg:block w-64 xl:w-72 shrink-0">
              <SidebarContent />
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0">
              {loadingDoc && (
                <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
                </div>
              )}
              {!loadingDoc && !selected && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-4xl mb-3 hidden lg:block">👈</span>
                  <span className="text-4xl mb-3 lg:hidden">☝️</span>
                  <p className="text-sm lg:hidden">Tap "Select a Subject" above.</p>
                  <p className="text-sm hidden lg:block">Select a subject from the sidebar.</p>
                </div>
              )}
              {!loadingDoc && selected && (
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selected.subject}</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Semester {selected.semester}</span>
                    {selected.branch && <span className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{selected.branch}</span>}
                  </div>
                  {selected.units.map((unit, i) => (
                    <UnitSection key={i} unit={unit} subject={selected.subject} semester={selected.semester}
                      branch={selected.branch ?? ''} year={selected.year ?? ''} onTopicClick={setActiveTopic} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTopic && <TopicDetail topic={activeTopic} onClose={() => setActiveTopic(null)} />}
    </div>
  );
};

export default ExamIntelligence;