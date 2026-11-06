import React, { useMemo } from 'react';

export interface PasswordRule {
  id: string;
  label: string;
  test: (pwd: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length',    label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)',     test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)',     test: (p) => /[a-z]/.test(p) },
  { id: 'number',    label: 'One number (0–9)',               test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'One special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const results = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );
  const passedCount = results.filter((r) => r.passed).length;

  const strengthConfig = [
    { label: '',        color: 'bg-gray-200'    },
    { label: 'Weak',    color: 'bg-red-500'     },
    { label: 'Fair',    color: 'bg-orange-400'  },
    { label: 'Good',    color: 'bg-yellow-400'  },
    { label: 'Strong',  color: 'bg-emerald-400' },
    { label: 'Perfect', color: 'bg-emerald-500' },
  ];
  const strength = password.length === 0 ? 0 : passedCount;
  const { label: strengthLabel, color: strengthColor } = strengthConfig[strength];

  if (password.length === 0) return null;

  return (
    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-gray-500">Password strength</span>
          {strengthLabel && (
            <span className={`text-xs font-bold transition-colors duration-300 ${
              passedCount <= 1 ? 'text-red-500' :
              passedCount === 2 ? 'text-orange-500' :
              passedCount === 3 ? 'text-yellow-500' :
              passedCount === 4 ? 'text-emerald-500' :
              'text-emerald-600'
            }`}>{strengthLabel}</span>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((seg) => (
            <div
              key={seg}
              className={`h-1.5 flex-1 rounded-full transition-all duration-400 ${
                seg <= passedCount ? strengthColor : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      <ul className="space-y-1.5">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs font-medium transition-all duration-300 ${
              rule.passed ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                rule.passed
                  ? 'bg-emerald-100 text-emerald-600 scale-110'
                  : 'bg-gray-100 text-gray-300'
              }`}
            >
              {rule.passed ? (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <circle cx="12" cy="12" r="5" />
                </svg>
              )}
            </span>
            <span className={`transition-colors duration-300 ${rule.passed ? 'line-through decoration-emerald-300' : ''}`}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
