/**
 * CouponManager.tsx
 * Drop this inside TeacherUpload.tsx (or AdminDashboard.tsx) as a panel.
 *
 * Usage:
 *   <CouponManager productId={note.id} productType="note" />
 *   <CouponManager productId={course.id} productType="course" />
 */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Coupon {
  id: string;
  code: string;
  productId: string;
  productType: 'note' | 'course';
  discountType: 'flat' | 'percent';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  productId: string;
  productType: 'note' | 'course';
}

const CouponManager: React.FC<Props> = ({ productId, productType }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await api.getCouponsForProduct(productId);
      setCoupons(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, [productId]);

  const handleCreate = async () => {
    if (!code.trim() || !discountValue) { setError('Code and discount value are required'); return; }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await api.createCoupon({
        code: code.trim().toUpperCase(),
        productId,
        productType,
        discountType,
        discountValue: Number(discountValue),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
      });
      setSuccess(`Coupon "${code.toUpperCase()}" created successfully!`);
      setCode(''); setDiscountValue(''); setMaxUses(''); setExpiresAt('');
      setShowForm(false);
      fetchCoupons();
    } catch (e: any) {
      setError(e.message || 'Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      if (coupon.isActive) {
        await api.deactivateCoupon(coupon.id);
      } else {
        await api.activateCoupon(coupon.id);
      }
      fetchCoupons();
    } catch (e: any) {
      setError(e.message || 'Failed to update coupon');
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="font-semibold text-slate-800 text-sm">Coupon Codes</span>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{coupons.filter(c => c.isActive).length} active</span>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setError(''); setSuccess(''); }}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Coupon'}
        </button>
      </div>

      {/* Messages */}
      {error && <div className="mx-4 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="mx-4 mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</div>}

      {/* Create Form */}
      {showForm && (
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Coupon Code *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE50"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                maxLength={20}
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Discount Type *</label>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as 'flat' | 'percent')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {discountType === 'percent' ? 'Discount (%)  *' : 'Discount Amount (₹) *'}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percent' ? '20' : '50'}
                min="1"
                max={discountType === 'percent' ? '100' : undefined}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Max Uses */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Uses <span className="text-slate-400 font-normal">(blank = unlimited)</span></label>
              <input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="e.g. 100"
                min="1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Expiry */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date <span className="text-slate-400 font-normal">(blank = never expires)</span></label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {creating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Create Coupon
          </button>
        </div>
      )}

      {/* Coupon List */}
      <div className="divide-y divide-slate-100">
        {loading && (
          <div className="p-6 text-center text-sm text-slate-400">Loading coupons…</div>
        )}
        {!loading && coupons.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-400">No coupons yet. Create one to offer discounts.</div>
        )}
        {coupons.map(coupon => (
          <div key={coupon.id} className={`px-4 py-3 flex items-center justify-between gap-4 ${coupon.isActive ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm text-slate-800">{coupon.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                  {coupon.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                  {coupon.discountType === 'percent' ? `${coupon.discountValue}% off` : `₹${coupon.discountValue} off`}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-400">
                <span>Used: {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''}</span>
                {coupon.expiresAt && (
                  <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
                {!coupon.expiresAt && <span>No expiry</span>}
                <span>Created: {new Date(coupon.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
            <button
              onClick={() => handleToggle(coupon)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                coupon.isActive
                  ? 'text-red-600 border-red-200 hover:bg-red-50'
                  : 'text-green-700 border-green-200 hover:bg-green-50'
              }`}
            >
              {coupon.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CouponManager;
