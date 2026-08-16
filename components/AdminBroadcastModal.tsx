import React, { useState } from 'react';
import { Send, Users, AlertCircle, CheckCircle } from 'lucide-react';

const AdminBroadcastModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [campaignName, setCampaignName] = useState('');
    const [creditsToAdd, setCreditsToAdd] = useState(50);
    const [targetType, setTargetType] = useState<'all'>('all');

    const handleBroadcast = async () => {
        if (!campaignName.trim()) {
            alert('Please enter the AiSensy Campaign Name');
            return;
        }
        
        const confirmMsg = `Are you sure you want to give ${creditsToAdd} credits to ALL users and send a WhatsApp broadcast via "${campaignName}"?`;
        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        setStatus('idle');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/broadcast-offers', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    target: targetType,
                    campaignName,
                    creditsToAdd
                })
            });
            
            if (!res.ok) throw new Error('Broadcast failed');
            
            setStatus('success');
            setTimeout(() => setIsOpen(false), 3000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
                <Send className="w-5 h-5" />
                WhatsApp Broadcast & Offers
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
                                <Send className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Broadcast Offer</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
                                <select 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                                    value={targetType}
                                    onChange={(e) => setTargetType(e.target.value as any)}
                                >
                                    <option value="all">All Students</option>
                                    {/* Add specific selection logic later if needed */}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">AiSensy Campaign Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. unieval_50_credits_offer"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">Must exactly match the approved template name in AiSensy.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Credits to Award</label>
                                <input
                                    type="number"
                                    value={creditsToAdd}
                                    onChange={(e) => setCreditsToAdd(Number(e.target.value))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {status === 'success' && (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Broadcast started securely in the background!</span>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>Failed to start broadcast. Check console.</span>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBroadcast}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Starting...' : 'Send Broadcast'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBroadcastModal;
