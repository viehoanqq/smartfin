import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign, Tag, Calendar, FileText, ArrowDownRight, PiggyBank } from 'lucide-react';
import { transactionAPI } from '../../../services/transactionAPI';
import { walletAPI } from '../../../services/walletAPI';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

const TransactionModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [categories, setCategories] = useState([]);
  const [savingsList, setSavingsList] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [formData, setFormData] = useState({
    wallet_id: '',
    category_id: '',
    saving_id: '',
    type: 'expense',
    amount: '',
    txn_date: '',
    note: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatDateOnly = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseErrorDetail = (err) => {
    const data = err?.response?.data;
    const detail = data?.detail ?? data?.message ?? data;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          const loc = Array.isArray(item?.loc) ? item.loc.slice(1).join('.') : '';
          return loc ? `${loc}: ${item?.msg || ''}` : (item?.msg || JSON.stringify(item));
        })
        .join(' | ');
    }
    if (typeof detail === 'object' && detail !== null) {
      return detail.detail || detail.message || JSON.stringify(detail);
    }
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    return err?.message || 'Không thể lưu giao dịch. Vui lòng kiểm tra lại.';
  };

  const fetchModalData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const w = await walletAPI.getMyWallet();
      if (w) {
        setFormData((prev) => ({ ...prev, wallet_id: String(w.id) }));
        setWalletBalance(Number(w.balance ?? 0));
      }

      const catRes = await axios.get(`${API_BASE}/categories`, { headers });
      if (Array.isArray(catRes.data)) {
        const activeCats = catRes.data.filter((cat) => !cat.is_hidden);
        setCategories(activeCats);
        if (activeCats.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category_id: prev.category_id || String(activeCats[0].id)
          }));
        }
      }

      const savRes = await axios.get(`${API_BASE}/savings`, { headers });
      const raw = savRes.data;
      const list = Array.isArray(raw)
        ? raw
        : (raw?.items || raw?.data || raw?.savings || []);

      const activeSavings = list.filter((s) => {
        if (s?.status) {
          return String(s.status).toLowerCase() === 'active';
        }
        if (s?.target_amount != null) {
          return Number(s.current_amount || 0) < Number(s.target_amount);
        }
        return true;
      });

      setSavingsList(activeSavings);
      setFormData((prev) => {
        const stillValid = activeSavings.some((s) => String(s.id) === String(prev.saving_id));
        return {
          ...prev,
          saving_id: stillValid
            ? prev.saving_id
            : (activeSavings.length > 0 ? String(activeSavings[0].id) : '')
        };
      });
    } catch (error) {
      console.error('Lỗi tải dữ liệu cho modal:', error);
      setErrorMessage(
        parseErrorDetail(error) || 'Không tải được dữ liệu ví, danh mục hoặc mục tiêu tiết kiệm.'
      );
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchModalData();
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      const txnType = editData.type === 'saving' ? 'saving' : 'expense';
      setFormData({
        wallet_id: String(editData.wallet_id || ''),
        category_id: String(editData.category_id || (categories[0]?.id ?? '')),
        saving_id: String(editData.saving_id || editData.goal_id || (savingsList[0]?.id ?? '')),
        type: txnType,
        amount: String(editData.amount || ''),
        txn_date: formatDateOnly(editData.txn_date),
        note: editData.note || ''
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        wallet_id: prev.wallet_id || '',
        category_id: prev.category_id || (categories[0]?.id ? String(categories[0].id) : ''),
        saving_id: prev.saving_id || (savingsList[0]?.id ? String(savingsList[0].id) : ''),
        type: 'expense',
        amount: '',
        txn_date: formatDateOnly(),
        note: ''
      }));
    }
    setErrorMessage('');
  }, [editData, isOpen, categories, savingsList]);

  if (!isOpen) return null;

  const isSaving = formData.type === 'saving';

  const availableBalance = editData
    ? walletBalance + Number(editData.amount || 0)
    : walletBalance;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrorMessage('');
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setErrorMessage('');
    setFormData((prev) => ({ ...prev, amount: rawDigits }));
  };

  const displayAmount = formData.amount
    ? Number(formData.amount).toLocaleString('vi-VN')
    : '';

  const resolveCategoryId = () => {
    if (!isSaving && formData.category_id) {
      return Number(formData.category_id);
    }
    const savingCat = categories.find(
      (c) =>
        c.name?.toLowerCase().includes('tiết kiệm') ||
        c.name?.toLowerCase().includes('saving')
    );
    return Number(savingCat?.id || formData.category_id || categories[0]?.id || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = Number(formData.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage('Số tiền giao dịch phải lớn hơn 0!');
      return;
    }

    if (parsedAmount > availableBalance) {
      setErrorMessage(
        `Số tiền vượt quá số dư ví hiện tại (${availableBalance.toLocaleString('vi-VN')} VND)!`
      );
      return;
    }

    const walletIdNum = Number(formData.wallet_id);
    if (!walletIdNum) {
      setErrorMessage('Vui lòng chọn Ví!');
      return;
    }

    const categoryIdNum = resolveCategoryId();
    if (!categoryIdNum) {
      setErrorMessage('Vui lòng chọn Danh mục!');
      return;
    }

    const effectiveSavingId = formData.saving_id || (savingsList[0]?.id ? String(savingsList[0].id) : '');
    const savingIdNum = Number(effectiveSavingId);
    if (isSaving && !savingIdNum) {
      setErrorMessage('Không có mục tiêu tiết kiệm đang hoạt động (active)!');
      return;
    }

    setIsLoading(true);

    try {
      const baseDate = editData ? new Date(editData.txn_date) : new Date();
      const selectedDate = new Date(formData.txn_date || formatDateOnly());
      selectedDate.setHours(baseDate.getHours());
      selectedDate.setMinutes(baseDate.getMinutes());
      selectedDate.setSeconds(baseDate.getSeconds());
      const finalDateIso = selectedDate.toISOString();

      const selectedGoal = savingsList.find((s) => String(s.id) === String(savingIdNum));
      const goalName = selectedGoal?.name || selectedGoal?.title || `Mục tiêu #${savingIdNum}`;
      const finalNote = formData.note || (isSaving ? `Tiết kiệm: ${goalName}` : '');

      const payload = {
        wallet_id: walletIdNum,
        category_id: categoryIdNum,
        type: formData.type,
        amount: parsedAmount,
        txn_date: finalDateIso,
        note: finalNote,
        ...(isSaving ? { goal_id: savingIdNum } : {}),
      };

      if (editData) {
        await transactionAPI.updateTransaction(editData.id, payload);
      } else {
        await transactionAPI.createTransaction({ ...payload, source: 'manual' });
      }

      setFormData((prev) => ({ ...prev, amount: '', note: '' }));
      onClose();

      if (onSuccess) {
        try {
          await onSuccess();
        } catch (refreshError) {
          console.error('Lỗi khi tải lại danh sách sau khi lưu:', refreshError);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lưu giao dịch:', error?.response?.data || error);
      setErrorMessage(parseErrorDetail(error));
      await fetchModalData();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/85 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        style={{ maxWidth: '520px', width: '100%' }}
        className="bg-[#181B26] border border-[#2E3448] rounded-2xl shadow-2xl overflow-hidden p-6 relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-300 hover:text-white bg-[#252A3A] hover:bg-[#31384D] p-2 rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">
          {editData
            ? (isSaving ? 'Chỉnh sửa khoản tiết kiệm' : 'Chỉnh sửa khoản chi tiêu')
            : (isSaving ? 'Thêm khoản tiết kiệm' : 'Thêm khoản chi tiêu')}
        </h3>
        <p className="text-gray-300 text-xs mb-5">
          {editData ? `Đang sửa giao dịch #${editData.id}` : 'Chọn loại giao dịch và nhập thông tin chi tiết.'}
        </p>

        {errorMessage && (
          <div className="mb-4 bg-[#7F1D1D] border border-[#DC2626] text-white p-3 rounded-xl text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Loại giao dịch *</label>
            <div className="grid grid-cols-2 gap-2.5 bg-[#0F111A] p-1.5 rounded-xl border border-[#2E3448]">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setFormData((prev) => ({ ...prev, type: 'expense' }));
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  !isSaving
                    ? 'bg-[#DC2626] text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-[#181B26]'
                }`}
              >
                <ArrowDownRight size={17} />
                <span>Chi tiêu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setFormData((prev) => ({
                    ...prev,
                    type: 'saving',
                    saving_id: prev.saving_id || (savingsList[0]?.id ? String(savingsList[0].id) : '')
                  }));
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isSaving
                    ? 'bg-[#2563EB] text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-[#181B26]'
                }`}
              >
                <PiggyBank size={17} />
                <span>Tiết kiệm</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-200">Số tiền (VND) *</label>
              <span className="text-xs text-gray-400">
                Số dư hiện tại:{' '}
                <strong className="text-emerald-400">
                  {availableBalance.toLocaleString('vi-VN')} VND
                </strong>
              </span>
            </div>
            <div className="relative flex items-center">
              <DollarSign size={18} className="absolute left-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                inputMode="numeric"
                name="amount"
                required
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="VD: 1.000.000"
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-14 py-3 text-base text-white outline-none font-bold placeholder-gray-500 tracking-wide"
              />
              <span className="absolute right-4 text-xs font-bold text-gray-400 pointer-events-none">
                VND
              </span>
            </div>
          </div>

          {!isSaving ? (
            <div>
              <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Danh mục *</label>
              <div className="relative flex items-center">
                <Tag size={18} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#181B26] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-200 mb-1.5 block">
                Danh sách tiết kiệm *
              </label>
              <div className="relative flex items-center">
                <PiggyBank size={18} className="absolute left-3.5 text-blue-400 pointer-events-none" />
                <select
                  name="saving_id"
                  value={formData.saving_id || (savingsList[0]?.id ? String(savingsList[0].id) : '')}
                  onChange={handleChange}
                  className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none cursor-pointer"
                >
                  {savingsList.length === 0 ? (
                    <option value="" className="bg-[#181B26] text-gray-400">
                      Không có mục tiêu tiết kiệm đang hoạt động
                    </option>
                  ) : (
                    savingsList.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#181B26] text-white">
                        {s.name || s.title || `Mục tiết kiệm #${s.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Ngày giao dịch</label>
            <div className="relative flex items-center">
              <Calendar size={18} className="absolute left-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                name="txn_date"
                value={formData.txn_date}
                onChange={handleChange}
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-200 mb-1.5 block">Ghi chú</label>
            <div className="relative">
              <FileText size={18} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
              <textarea
                name="note"
                rows="2"
                value={formData.note}
                onChange={handleChange}
                placeholder={isSaving ? 'VD: Bỏ heo mua laptop, quỹ dự phòng...' : 'VD: Ăn phở bò, đổ xăng...'}
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none resize-none placeholder-gray-500"
              ></textarea>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-[#2E3448]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#252A3A] hover:bg-[#31384D] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isLoading ? 'Đang lưu...' : (editData ? 'Cập nhật' : 'Lưu giao dịch')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;