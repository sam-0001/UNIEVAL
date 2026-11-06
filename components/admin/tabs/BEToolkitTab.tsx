import React, { useState, useEffect } from 'react';
import { BEToolkitItem } from '../../../types';
import { BookOpen, ExternalLink, Loader2, Trash2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { getBEToolkitItems, addBEToolkitItem, deleteBEToolkitItem } from '../../../services/beToolkitApi';

export const BEToolkitTab: React.FC = () => {
  const [items, setItems] = useState<BEToolkitItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'project' | 'research' | 'case-study'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Item form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [toolkit, setToolkit] = useState({
    title: '',
    type: 'project' as const,
    branch: '',
    tags: '',
    difficulty: 'medium' as const,
    summary: '',
    source: '',
    link: ''
  });
  const [toolkitStatus, setToolkitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [toolkitMessage, setToolkitMessage] = useState('');

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const data = await getBEToolkitItems();
      setItems(data || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDeleteItem = async (item: BEToolkitItem) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteBEToolkitItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete toolkit item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToolkitChange = (key: string, value: string) => {
    setToolkit(prev => ({ ...prev, [key]: value }));
  };

  const handleToolkitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolkit.title || !toolkit.branch || !toolkit.summary || !toolkit.source || !toolkit.link) {
      setToolkitStatus('error');
      setToolkitMessage('Please fill in all required fields (*)');
      return;
    }
    setToolkitStatus('loading');
    setToolkitMessage('');
    try {
      const result = await addBEToolkitItem({
        ...toolkit,
        tags: toolkit.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setToolkitStatus('success');
      setToolkitMessage(result.message || 'Item added successfully!');
      setToolkit({ title: '', type: 'project', branch: '', tags: '', difficulty: 'medium', summary: '', source: '', link: '' });
      fetchItems();
      setTimeout(() => {
        setShowAddForm(false);
        setToolkitStatus('idle');
        setToolkitMessage('');
      }, 1500);
    } catch (err: any) {
      setToolkitStatus('error');
      setToolkitMessage(err.message || 'Failed to add item.');
    }
  };

  const handleLoadSampleToolkit = async () => {
    setToolkitStatus('loading');
    const samples = [
      { title: "Autonomous Robot Navigation using ROS", type: "project" as const, branch: "Mechanical Engineering", tags: ["ROS", "Robotics", "Python"], difficulty: "hard" as const, summary: "A ROS-based project implementing SLAM and path planning for autonomous indoor navigation.", source: "arXiv", link: "https://arxiv.org/abs/2106.11461" },
      { title: "Deep Learning for Image Classification", type: "research" as const, branch: "Computer Engineering", tags: ["CNN", "Deep Learning", "Python"], difficulty: "medium" as const, summary: "Survey of CNN architectures for image classification tasks with benchmark comparisons.", source: "arXiv", link: "https://arxiv.org/abs/1901.06032" },
      { title: "Smart Grid Power Distribution Optimization", type: "case-study" as const, branch: "Electrical Engineering", tags: ["Smart Grid", "IoT", "Power Systems"], difficulty: "medium" as const, summary: "A comprehensive case study on reducing transmission losses using automated load-balancing algorithms.", source: "IEEE Xplore", link: "https://ieeexplore.ieee.org" }
    ];
    let added = 0;
    for (const item of samples) {
      try {
        await addBEToolkitItem(item);
        added++;
      } catch {}
    }
    setToolkitStatus(added > 0 ? 'success' : 'error');
    setToolkitMessage(added > 0 ? `${added} sample items loaded!` : 'Failed to load samples.');
    fetchItems();
  };

  const filteredItems = items.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const inputClass = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            BE Toolkit Resources ({items.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Provide curated final year projects, research papers, and case studies to university students.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            {showAddForm ? '✕ Close Form' : '+ Add Toolkit Item'}
          </button>
          <button
            onClick={handleLoadSampleToolkit}
            disabled={toolkitStatus === 'loading'}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition border border-slate-200 disabled:opacity-50"
          >
            Load Sample Data
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleToolkitSubmit} className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm">Add New BE Toolkit Resource</h3>
            <span className="text-[11px] text-gray-400">Open-access links only (arXiv, DOAJ, GitHub, PDF)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Title *</label>
              <input className={inputClass} placeholder="e.g. Distributed Consensus in Cloud Systems" value={toolkit.title} onChange={e => handleToolkitChange('title', e.target.value)} required />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Branch *</label>
              <input className={inputClass} placeholder="e.g. Computer Engineering" value={toolkit.branch} onChange={e => handleToolkitChange('branch', e.target.value)} required />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Resource Type *</label>
              <select className={inputClass} value={toolkit.type} onChange={e => handleToolkitChange('type', e.target.value)}>
                <option value="project">🔧 Final Year Project</option>
                <option value="research">🔬 Research Paper</option>
                <option value="case-study">📋 Industrial Case Study</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Difficulty Level *</label>
              <select className={inputClass} value={toolkit.difficulty} onChange={e => handleToolkitChange('difficulty', e.target.value)}>
                <option value="easy">Easy (Beginner)</option>
                <option value="medium">Medium (Intermediate)</option>
                <option value="hard">Hard (Advanced)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tags (comma-separated)</label>
              <input className={inputClass} placeholder="e.g. Blockchain, Consensus, Raft" value={toolkit.tags} onChange={e => handleToolkitChange('tags', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Source Publisher *</label>
              <input className={inputClass} placeholder="e.g. arXiv, IEEE, GitHub" value={toolkit.source} onChange={e => handleToolkitChange('source', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Summary / Abstract *</label>
            <textarea className={inputClass} rows={3} placeholder="Comprehensive description of the project or study..." value={toolkit.summary} onChange={e => handleToolkitChange('summary', e.target.value)} required />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Link URL *</label>
            <input className={inputClass} type="url" placeholder="https://arxiv.org/abs/..." value={toolkit.link} onChange={e => handleToolkitChange('link', e.target.value)} required />
          </div>

          {toolkitMessage && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${toolkitStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {toolkitStatus === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {toolkitMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button type="submit" disabled={toolkitStatus === 'loading'} className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5">
              {toolkitStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Resource
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'project', label: 'Projects' },
            { id: 'research', label: 'Research' },
            { id: 'case-study', label: 'Case Studies' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search resources or tags..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          Loading BE Toolkit resources...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No resources found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search query.' : 'Add your first final year project, research paper, or case study.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    item.type === 'project'
                      ? 'bg-blue-100 text-blue-700'
                      : item.type === 'research'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.type}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                    item.difficulty === 'easy'
                      ? 'bg-green-50 text-green-700'
                      : item.difficulty === 'hard'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.difficulty}
                  </span>
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-gray-900 text-sm hover:text-indigo-600 transition flex items-center gap-1.5 group mb-1.5"
                >
                  <span className="line-clamp-2">{item.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 shrink-0" />
                </a>

                <p className="text-xs text-indigo-700 font-medium mb-2">{item.branch} • <span className="text-gray-500 font-normal">{item.source}</span></p>
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mb-3">{item.summary}</p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs mt-3">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Open Resource ↗
                </a>
                <button
                  onClick={() => handleDeleteItem(item)}
                  disabled={deletingId === item.id}
                  className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 disabled:opacity-50 transition"
                >
                  {deletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BEToolkitTab;
