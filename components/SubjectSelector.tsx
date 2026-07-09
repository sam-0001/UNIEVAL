import React, { useMemo } from 'react';
import { Subject } from '../types';
import { BRANCHES } from '../pages/Home';

interface SubjectSelectorProps {
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    selectedBranch: string;
    setSelectedBranch: (branch: string) => void;
    selectedSubjectId: string;
    setSelectedSubjectId: (id: string) => void;
    subjectName: string;
    setSubjectName: (name: string) => void;
    allSubjects: Subject[];
    inputClass: string;
    labelClass: string;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
    selectedYear, setSelectedYear,
    selectedBranch, setSelectedBranch,
    selectedSubjectId, setSelectedSubjectId,
    subjectName, setSubjectName,
    allSubjects,
    inputClass, labelClass
}) => {
    // Filter available subjects based on selection
    const availableSubjects = useMemo(() => allSubjects.filter(s => {
        if (selectedYear === 1) return s.year === 1;
        return s.year === selectedYear && s.branch === selectedBranch;
    }), [allSubjects, selectedYear, selectedBranch]);

    // Handle Year Change
    const handleYearChange = (newYear: number) => {
        setSelectedYear(newYear);
        
        let newBranch = selectedBranch;
        if (newYear !== 1 && selectedBranch === 'General') {
             newBranch = BRANCHES[0].title;
             setSelectedBranch(newBranch);
        }
        if (newYear === 1) {
             newBranch = 'General';
             setSelectedBranch('General');
        }

        const newAvailable = allSubjects.filter(s => {
            if (newYear === 1) return s.year === 1;
            return s.year === newYear && s.branch === newBranch;
        });
        
        if (newAvailable.length > 0) {
            setSelectedSubjectId(newAvailable[0].id);
            setSubjectName(newAvailable[0].name);
        } else {
            setSelectedSubjectId('');
            setSubjectName('');
        }
    };

    // Handle Branch Change
    const handleBranchChange = (newBranch: string) => {
        setSelectedBranch(newBranch);
        const newAvailable = allSubjects.filter(s => {
            if (selectedYear === 1) return s.year === 1;
            return s.year === selectedYear && s.branch === newBranch;
        });
        
        if (newAvailable.length > 0) {
             setSelectedSubjectId(newAvailable[0].id);
             setSubjectName(newAvailable[0].name);
        } else {
             setSelectedSubjectId('');
             setSubjectName('');
        }
    };

    // Handle Subject Selection/Typing
    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSubjectName(val);
        
        // Check if typed name matches an existing subject exactly
        const existing = availableSubjects.find(s => s.name.toLowerCase() === val.toLowerCase());
        if (existing) {
            setSelectedSubjectId(existing.id);
        } else {
            setSelectedSubjectId(''); // Empty ID means it's a new subject
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <label className={labelClass}>Year</label>
                <select 
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className={inputClass}
                >
                    <option value={1}>First Year (FE)</option>
                    <option value={2}>Second Year (SE)</option>
                    <option value={3}>Third Year (TE)</option>
                    <option value={4}>Final Year (BE)</option>
                </select>
            </div>
            
            <div>
                <label className={labelClass}>Branch</label>
                <select 
                    value={selectedBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className={inputClass}
                    disabled={selectedYear === 1}
                >
                    {selectedYear === 1 ? (
                        <option value="General">General (Common for FE)</option>
                    ) : (
                        BRANCHES.map(b => (
                            <option key={b.id} value={b.title}>{b.title}</option>
                        ))
                    )}
                </select>
            </div>

            <div>
                <label className={labelClass}>Subject Name</label>
                <div className="relative">
                    <input 
                        type="text"
                        value={subjectName}
                        onChange={handleSubjectChange}
                        className={inputClass}
                        placeholder="Type or select a subject..."
                        list="subjects-list"
                    />
                    <datalist id="subjects-list">
                        {availableSubjects.map(s => (
                            <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                        ))}
                    </datalist>
                </div>
                {!selectedSubjectId && subjectName && (
                    <p className="text-xs text-indigo-600 mt-1">A new subject will be created.</p>
                )}
            </div>
        </div>
    );
};
