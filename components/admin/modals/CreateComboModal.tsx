import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Course, Note, Subject, Combo } from '../../../types';
import { Layers, Tag, Search, CheckSquare, Square, Loader2 } from 'lucide-react';
import { INPUT_CLASS, LABEL_CLASS } from './common';

export interface CreateComboModalProps {
    onClose: () => void;
    editItem?: Combo | null;
    onSave: (data: Combo) => void;
    allCourses: Course[];
    allNotes: Note[];
    allSubjects: Subject[];
}

export const CreateComboModal: React.FC<CreateComboModalProps> = ({
    onClose,
    editItem,
    onSave,
    allCourses,
    allNotes,
    allSubjects
}) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(editItem?.subjectIds || []);
    const [comboType, setComboType] = useState<'all' | 'notes' | 'courses'>(editItem?.comboType || 'all');
    const [price, setPrice] = useState(editItem?.price !== undefined ? editItem.price.toString() : '499');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice ? editItem.originalPrice.toString() : '');
    const [collegeName, setCollegeName] = useState(editItem?.collegeConfig?.name || '');
    const [collegeDomain, setCollegeDomain] = useState(editItem?.collegeConfig?.emailDomain || '');
    const [enableCollegeFree, setEnableCollegeFree] = useState(!!(editItem?.collegeConfig?.name && editItem?.collegeConfig?.emailDomain));
    const [validityType, setValidityType] = useState<'months' | 'date'>(editItem?.validityType || 'months');
    const [validityMonths, setValidityMonths] = useState<number>(editItem?.validityMonths || 6);
    const [validityDate, setValidityDate] = useState<string>(
        editItem?.validityDate ? new Date(editItem.validityDate).toISOString().split('T')[0] : ''
    );
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>(editItem?.thumbnailUrl || '');
    const [thumbnailUploading, setThumbnailUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Subject filtering inside modal
    const [subjectSearch, setSubjectSearch] = useState('');
    const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');

    const toggleSubject = (id: string) => {
        setSelectedSubjectIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const uniqueBranches = React.useMemo(() => {
        const set = new Set<string>();
        allSubjects.forEach(s => { if (s.branch) set.add(s.branch); });
        return Array.from(set).sort();
    }, [allSubjects]);

    const filteredSubjects = React.useMemo(() => {
        return allSubjects.filter(s => {
            if (yearFilter !== 'all' && s.year !== yearFilter) return false;
            if (branchFilter !== 'all' && s.branch !== branchFilter) return false;
            if (subjectSearch.trim()) {
                const q = subjectSearch.toLowerCase();
                const matchName = s.name.toLowerCase().includes(q);
                const matchCode = (s.code || '').toLowerCase().includes(q);
                const matchBranch = (s.branch || '').toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchBranch) return false;
            }
            return true;
        });
    }, [allSubjects, yearFilter, branchFilter, subjectSearch]);

    const selectAllFiltered = () => {
        const ids = filteredSubjects.map(s => s.id);
        setSelectedSubjectIds(prev => Array.from(new Set([...prev, ...ids])));
    };

    const deselectAllFiltered = () => {
        const idsToRemove = new Set(filteredSubjects.map(s => s.id));
        setSelectedSubjectIds(prev => prev.filter(id => !idsToRemove.has(id)));
    };

    // Live calculation of included items
    const includedCourses = React.useMemo(() => {
        if (comboType === 'notes') return [];
        return allCourses.filter(c => selectedSubjectIds.includes(c.subjectId));
    }, [allCourses, selectedSubjectIds, comboType]);

    const includedNotes = React.useMemo(() => {
        if (comboType === 'courses') return [];
        return allNotes.filter(n => selectedSubjectIds.includes(n.subjectId));
    }, [allNotes, selectedSubjectIds, comboType]);

    // Calculate sum of individual items' prices
    const estimatedTotalValue = React.useMemo(() => {
        const courseSum = includedCourses.reduce((sum, c) => sum + (c.price || 0), 0);
        const noteSum = includedNotes.reduce((sum, n) => sum + (n.price || 0), 0);
        return courseSum + noteSum;
    }, [includedCourses, includedNotes]);

    const autoSetOriginalPrice = () => {
        if (estimatedTotalValue > 0) {
            setOriginalPrice(String(estimatedTotalValue));
        }
    };

    const parsedPrice = parseFloat(price) || 0;
    const parsedOriginalPrice = parseFloat(originalPrice) || 0;
    const discountPercent = parsedOriginalPrice > parsedPrice
        ? Math.round(((parsedOriginalPrice - parsedPrice) / parsedOriginalPrice) * 100)
        : null;

    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a title for the combo');
            return;
        }
        if (selectedSubjectIds.length === 0) {
            alert('Please select at least one subject to include in the combo');
            return;
        }
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            alert('Please enter a valid price (0 for Free)');
            return;
        }

        setIsSaving(true);
        let finalThumbnail = thumbnailPreview;

        if (thumbnailFile) {
            setThumbnailUploading(true);
            try {
                const { uploadUrl, publicUrl } = await api.getPresignedUrl(
                    thumbnailFile.name,
                    thumbnailFile.type,
                    thumbnailFile.size,
                    false
                );
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl);
                    xhr.setRequestHeader('Content-Type', thumbnailFile.type);
                    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(null) : reject();
                    xhr.onerror = reject;
                    xhr.send(thumbnailFile);
                });
                finalThumbnail = publicUrl;
            } catch (err) {
                console.error('Thumbnail upload failed:', err);
                alert('Thumbnail upload failed. Saving combo with default styling.');
            } finally {
                setThumbnailUploading(false);
            }
        }

        const comboData: Combo = {
            id: editItem?.id || '',
            title: title.trim(),
            description: description.trim(),
            subjectIds: selectedSubjectIds,
            comboType,
            teacherId: editItem?.teacherId || user?.id || '',
            thumbnailUrl: finalThumbnail,
            price: parsedPrice,
            originalPrice: parsedOriginalPrice > 0 ? parsedOriginalPrice : undefined,
            collegeConfig: (enableCollegeFree && collegeName.trim() && collegeDomain.trim())
                ? { name: collegeName.trim(), emailDomain: collegeDomain.trim().toLowerCase() }
                : null,
            validityType,
            validityMonths: validityType === 'months' ? validityMonths : 6,
            validityDate: validityType === 'date' && validityDate ? validityDate : undefined
        };

        try {
            await onSave(comboData);
        } catch (err) {
            console.error('Failed to save combo', err);
            alert('Failed to save combo');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-900 to-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-yellow-300 border border-white/15">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold">
                                {editItem ? 'Edit Subject Combo' : 'Create Subject Combo'}
                            </h2>
                            <p className="text-xs text-indigo-200 mt-0.5">
                                Bundle subjects together. Buyers unlock all corresponding courses and notes.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white font-bold text-2xl transition-colors">
                        &times;
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>Combo Title *</label>
                            <input
                                type="text"
                                className={INPUT_CLASS}
                                placeholder="e.g., FE Sem 2 All Subjects Complete Prep Combo"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>Description</label>
                            <textarea
                                rows={2}
                                className={INPUT_CLASS}
                                placeholder="Brief overview of what subjects and materials this combo contains..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Combo Inclusions Type */}
                        <div>
                            <label className={LABEL_CLASS}>Materials Included in this Combo</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'all', title: 'All Materials', desc: 'Video Courses + Exam Notes' },
                                    { id: 'notes', title: 'Notes Only', desc: 'All Exam Note packages' },
                                    { id: 'courses', title: 'Courses Only', desc: 'All Video Lectures' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setComboType(t.id as any)}
                                        className={`p-3 rounded-xl border text-left transition-all ${comboType === t.id ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <p className={`font-bold text-xs sm:text-sm ${comboType === t.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {t.title}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Select Subjects */}
                    <div className="border-t border-slate-200/80 pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-indigo-600" />
                                    Select Subjects to Include *
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Click subjects to add/remove them from this combo.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllFiltered}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                                >
                                    Select All Filtered
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAllFiltered}
                                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search subjects by name or code..."
                                    value={subjectSearch}
                                    onChange={(e) => setSubjectSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Year filter pills */}
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'all', label: 'All Years' },
                                    { id: 1, label: 'FE (1st)' },
                                    { id: 2, label: 'SE (2nd)' },
                                    { id: 3, label: 'TE (3rd)' },
                                    { id: 4, label: 'BE (4th)' }
                                ].map(yf => (
                                    <button
                                        key={yf.id}
                                        type="button"
                                        onClick={() => setYearFilter(yf.id as any)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${yearFilter === yf.id ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {yf.label}
                                    </button>
                                ))}
                            </div>

                            {/* Branch filter */}
                            {uniqueBranches.length > 1 && (
                                <select
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-indigo-500"
                                >
                                    <option value="all">All Branches</option>
                                    {uniqueBranches.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Subjects Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                            {filteredSubjects.length === 0 ? (
                                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                                    No subjects match the filter.
                                </div>
                            ) : (
                                filteredSubjects.map(sub => {
                                    const isSelected = selectedSubjectIds.includes(sub.id);
                                    const subCoursesCount = allCourses.filter(c => c.subjectId === sub.id).length;
                                    const subNotesCount = allNotes.filter(n => n.subjectId === sub.id).length;

                                    return (
                                        <div
                                            key={sub.id}
                                            onClick={() => toggleSubject(sub.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${isSelected ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="pt-0.5 shrink-0">
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs text-slate-800 leading-tight truncate">
                                                    {sub.name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                                                    <span>Yr {sub.year}</span>
                                                    <span>•</span>
                                                    <span className="truncate">{sub.branch}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold">
                                                    <span className="text-blue-600">{subCoursesCount} Courses</span>
                                                    <span>•</span>
                                                    <span className="text-purple-600">{subNotesCount} Notes</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Selected Subjects Content Summary Banner */}
                        <div className="mt-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {selectedSubjectIds.length}
                                </div>
                                <div className="text-xs">
                                    <span className="font-bold text-indigo-950">
                                        {selectedSubjectIds.length} Subject{selectedSubjectIds.length === 1 ? '' : 's'} Selected:
                                    </span>{' '}
                                    <span className="text-indigo-800">
                                        Includes <strong className="text-blue-700">{includedCourses.length} Video Courses</strong> and <strong className="text-purple-700">{includedNotes.length} Note Packages</strong>
                                    </span>
                                </div>
                            </div>
                            {estimatedTotalValue > 0 && (
                                <div className="text-xs text-slate-600 shrink-0">
                                    Individual items value: <span className="font-bold text-slate-900">₹{estimatedTotalValue}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Pricing & Validity */}
                    <div className="border-t border-slate-200/80 pt-6 space-y-4">
                        <h3 className="font-bold text-slate-800 text-base">Pricing & Student Access</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>Combo Offer Price (₹) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    className={INPUT_CLASS}
                                    placeholder="e.g., 499 (0 for Free)"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Amount student pays to unlock all included courses & notes.
                                </p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className={LABEL_CLASS}>Original Price / MRP (₹)</label>
                                    {estimatedTotalValue > 0 && (
                                        <button
                                            type="button"
                                            onClick={autoSetOriginalPrice}
                                            className="text-[11px] font-bold text-indigo-600 hover:underline"
                                        >
                                            Auto-fill (₹{estimatedTotalValue})
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    className={INPUT_CLASS}
                                    placeholder="Original crossed out price (optional)"
                                    value={originalPrice}
                                    onChange={(e) => setOriginalPrice(e.target.value)}
                                />
                                {discountPercent && (
                                    <span className="inline-block mt-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                        Student saves {discountPercent}%!
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Validity Configuration */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <label className={LABEL_CLASS}>Student Access Validity</label>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                    <input
                                        type="radio"
                                        name="comboValidityType"
                                        value="months"
                                        checked={validityType === 'months'}
                                        onChange={() => setValidityType('months')}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Duration in Months
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                    <input
                                        type="radio"
                                        name="comboValidityType"
                                        value="date"
                                        checked={validityType === 'date'}
                                        onChange={() => setValidityType('date')}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Exact Expiry Date
                                </label>
                            </div>

                            {validityType === 'months' ? (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        className="w-32 border border-gray-300 rounded-lg p-2 text-sm bg-white"
                                        value={validityMonths}
                                        onChange={(e) => setValidityMonths(Math.max(1, parseInt(e.target.value) || 6))}
                                    />
                                    <span className="text-xs text-slate-500">
                                        Months from the purchase date (Default is 6 months).
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="date"
                                        className="w-48 border border-gray-300 rounded-lg p-2 text-sm bg-white"
                                        value={validityDate}
                                        onChange={(e) => setValidityDate(e.target.value)}
                                    />
                                    <span className="text-xs text-slate-500">
                                        Access expires at 11:59 PM on this exact date.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* College-Specific Free Access Toggle */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-gray-800">
                                        College-Specific Free Access (Optional)
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Allow students from a specific college to enroll in this combo for free.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={enableCollegeFree}
                                    onChange={(e) => setEnableCollegeFree(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                />
                            </div>

                            {enableCollegeFree && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                                    <div>
                                        <label className={LABEL_CLASS}>College Name</label>
                                        <input
                                            type="text"
                                            className={INPUT_CLASS}
                                            placeholder="e.g. COEP Technological University"
                                            value={collegeName}
                                            onChange={(e) => setCollegeName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>College Email Domain</label>
                                        <input
                                            type="text"
                                            className={INPUT_CLASS}
                                            placeholder="e.g. @coep.ac.in"
                                            value={collegeDomain}
                                            onChange={(e) => setCollegeDomain(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Upload (Optional) */}
                        <div className="space-y-2">
                            <label className={LABEL_CLASS}>Combo Cover Image (Optional 16:9)</label>
                            <div className="flex items-center gap-4">
                                <div className="aspect-video w-36 bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                                    {thumbnailPreview ? (
                                        <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center p-2 text-indigo-300">
                                            <Layers className="w-6 h-6 mx-auto mb-1 opacity-70" />
                                            <span className="text-[9px] block">Auto Gradient</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailSelect}
                                        className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Upload a 16:9 widescreen thumbnail, or leave empty to use our elegant default combo cover card.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving || thumbnailUploading}
                        className="px-5 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-xl text-sm transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || thumbnailUploading}
                        className="px-6 py-2.5 font-bold text-white bg-indigo-900 hover:bg-indigo-800 rounded-xl text-sm shadow-md shadow-indigo-900/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving || thumbnailUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving Combo...</span>
                            </>
                        ) : (
                            <span>{editItem ? 'Save Changes' : 'Publish Subject Combo'}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateComboModal;
