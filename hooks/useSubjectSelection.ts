import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Subject } from '../types';

export const useSubjectSelection = (initialSubjectId?: string) => {
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(1);
    const [selectedBranch, setSelectedBranch] = useState<string>('General');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
    const [subjectName, setSubjectName] = useState<string>('');

    useEffect(() => {
        api.getSubjects().then(subs => {
            setAllSubjects(subs);
            if (initialSubjectId) {
                const s = subs.find(sub => sub.id === initialSubjectId);
                if (s) {
                    setSelectedYear(s.year);
                    setSelectedBranch(s.branch);
                    setSelectedSubjectId(s.id);
                    setSubjectName(s.name);
                }
            } else {
                // Default to FE
                setSelectedYear(1);
                setSelectedBranch('General');
                const feSubs = subs.filter(s => s.year === 1);
                if (feSubs.length > 0) {
                    setSelectedSubjectId(feSubs[0].id);
                    setSubjectName(feSubs[0].name);
                }
            }
        });
    }, [initialSubjectId]);

    const getSubjectForSave = async (): Promise<string> => {
        if (selectedSubjectId) return selectedSubjectId;
        if (!subjectName.trim()) return 's1'; // Fallback

        // Create new subject
        try {
            const newSub = await api.createSubject(subjectName, selectedBranch, selectedYear);
            setAllSubjects([...allSubjects, newSub]);
            setSelectedSubjectId(newSub.id);
            return newSub.id;
        } catch (error) {
            console.error("Failed to create subject", error);
            return 's1'; // Fallback
        }
    };

    return {
        allSubjects, setAllSubjects,
        selectedYear, setSelectedYear,
        selectedBranch, setSelectedBranch,
        selectedSubjectId, setSelectedSubjectId,
        subjectName, setSubjectName,
        getSubjectForSave
    };
};
