/**
 * Centralized Academic Constants for UniEval (SPPU Curriculum)
 */

export type AcademicYearCode = 'FE' | 'SE' | 'TE' | 'BE';

export interface AcademicYear {
  id: number;
  code: AcademicYearCode;
  name: string;
  fullName: string;
  shortName: string;
  semesters: number[];
}

export interface AcademicYearMeta {
  code: AcademicYearCode;
  name: string;
  shortName: string;
  badgeColor: string;
  dotColor: string;
  accentText: string;
  pillActive: string;
  pillInactive: string;
  gradientBadge: string;
  borderColor: string;
  subtext: string;
}

export const ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 1,
    code: 'FE',
    name: 'First Year',
    fullName: 'First Year Engineering (FE)',
    shortName: 'FE (First Year)',
    semesters: [1, 2]
  },
  {
    id: 2,
    code: 'SE',
    name: 'Second Year',
    fullName: 'Second Year Engineering (SE)',
    shortName: 'SE (Second Year)',
    semesters: [3, 4]
  },
  {
    id: 3,
    code: 'TE',
    name: 'Third Year',
    fullName: 'Third Year Engineering (TE)',
    shortName: 'TE (Third Year)',
    semesters: [5, 6]
  },
  {
    id: 4,
    code: 'BE',
    name: 'Final Year',
    fullName: 'Final Year Engineering (BE)',
    shortName: 'BE (Final Year)',
    semesters: [7, 8]
  }
];

export const ENGINEERING_BRANCHES = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication (EnTC)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science (AI&DS)',
  'Electrical Engineering'
] as const;

export type EngineeringBranch = typeof ENGINEERING_BRANCHES[number] | 'General';

/**
 * Returns the short year code ('FE', 'SE', 'TE', 'BE') for a given numeric or string year.
 */
export function getYearCode(year?: number | string | null): AcademicYearCode {
  const num = typeof year === 'string' ? parseInt(year, 10) : Number(year);
  switch (num) {
    case 1:
      return 'FE';
    case 2:
      return 'SE';
    case 3:
      return 'TE';
    case 4:
      return 'BE';
    default:
      return 'FE';
  }
}

/**
 * Returns the descriptive year name (e.g., 'First Year', 'Second Year').
 */
export function getYearName(year?: number | string | null): string {
  const num = typeof year === 'string' ? parseInt(year, 10) : Number(year);
  const found = ACADEMIC_YEARS.find(y => y.id === num);
  return found ? found.name : 'First Year';
}

/**
 * Returns the full formatted year label (e.g., 'First Year Engineering (FE)').
 */
export function getYearFullName(year?: number | string | null): string {
  const num = typeof year === 'string' ? parseInt(year, 10) : Number(year);
  const found = ACADEMIC_YEARS.find(y => y.id === num);
  return found ? found.fullName : 'First Year Engineering (FE)';
}

/**
 * Returns complete visual and branding metadata for an academic year (used in Dashboards and Badges).
 */
export function getYearMeta(yearNumber: number): AcademicYearMeta {
  switch (yearNumber) {
    case 1:
      return {
        code: 'FE',
        name: 'First Year Engineering',
        shortName: 'FE (First Year)',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-[#1F81FC]',
        accentText: 'text-[#1F81FC]',
        pillActive: 'bg-[#1F81FC] text-white shadow-sm',
        pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50/50',
        gradientBadge: 'from-blue-600 to-indigo-600',
        borderColor: 'border-blue-100',
        subtext: 'Common foundational subjects & first year engineering curriculum'
      };
    case 2:
      return {
        code: 'SE',
        name: 'Second Year Engineering',
        shortName: 'SE (Second Year)',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotColor: 'bg-indigo-600',
        accentText: 'text-indigo-600',
        pillActive: 'bg-indigo-600 text-white shadow-sm',
        pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50/50',
        gradientBadge: 'from-indigo-600 to-purple-600',
        borderColor: 'border-indigo-100',
        subtext: 'Department-specific core engineering subjects & lab courses'
      };
    case 3:
      return {
        code: 'TE',
        name: 'Third Year Engineering',
        shortName: 'TE (Third Year)',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        dotColor: 'bg-purple-600',
        accentText: 'text-purple-600',
        pillActive: 'bg-purple-600 text-white shadow-sm',
        pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-purple-50/50',
        gradientBadge: 'from-purple-600 to-pink-600',
        borderColor: 'border-purple-100',
        subtext: 'Advanced specialization & applied engineering coursework'
      };
    case 4:
    default:
      return {
        code: 'BE',
        name: 'Final Year Engineering',
        shortName: 'BE (Final Year)',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-600',
        accentText: 'text-emerald-700',
        pillActive: 'bg-emerald-600 text-white shadow-sm',
        pillInactive: 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50/50',
        gradientBadge: 'from-emerald-600 to-teal-600',
        borderColor: 'border-emerald-100',
        subtext: 'Final year electives, capstone projects & industry topics'
      };
  }
}

/**
 * Normalizes branch name or returns fallback.
 */
export function formatBranch(branch?: string | null): string {
  if (!branch) return 'General';
  return branch.trim();
}
