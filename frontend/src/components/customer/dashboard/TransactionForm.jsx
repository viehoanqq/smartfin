import React, { useRef, useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { nlpAPI } from '../../../services/nlpAPI';
import NlpPreview from './NlpPreview';

const TransactionForm = () => {
  const [smartText, setSmartText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [options, setOptions] = useState({ wallets: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestVersion = useRef(0);

  const handleSmartSubmit = async (e) => {
    e.preventDefault();
    if (!smartText.trim()) return;
    setError('');
    setNotice('');
    setLoading(true);
    const version = ++requestVersion.current;
    try {
      const [parsed, available] = await Promise.all([nlpAPI.parseText(smartText), nlpAPI.getOptions()]);
      if (version !== requestVersion.current) return;
      setOptions(available);
      setDrafts((parsed.drafts || []).map((draft) => ({ ...draft, predicted_category_id: draft.category_id })));
    } catch (err) {
      if (version !== requestVersion.current) return;
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Không phân tích được câu nhập. Vui lòng thử lại.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const changeDraft = (index, field, value) => setDrafts((old) => old.map((draft, i) => i === index ? { ...draft, [field]: value } : draft));

  const saveDrafts = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = drafts.map((draft) => ({
        wallet_id: Number(draft.wallet_id), category_id: Number(draft.category_id),
        type: draft.type, amount: Number(draft.amount), txn_date: draft.txn_date,
        note: draft.note.trim(), source: 'nlp', raw_text: draft.raw_text,
        ai_confidence: draft.confidence,
      }));
      const saved = await nlpAPI.saveDrafts(payload);
      let feedbackFailures = 0;
      for (let i = 0; i < drafts.length; i += 1) {
        const predicted = drafts[i].predicted_category_id;
        if (['expense', 'income'].includes(drafts[i].type)) {
          try {
            await nlpAPI.saveFeedback({ transaction_id: saved[i].id, raw_text: drafts[i].raw_text,
              predicted_category_id: predicted ?? null, corrected_category_id: Number(drafts[i].category_id) });
          } catch (feedbackError) {
            console.warn('Giao dịch đã lưu, chưa lưu được phản hồi danh mục', feedbackError);
            feedbackFailures += 1;
          }
        }
      }
      setDrafts([]);
      setSmartText('');
      setNotice(feedbackFailures ? `Đã lưu ${saved.length} giao dịch, nhưng ${feedbackFailures} phản hồi danh mục chưa được ghi nhận.` : `Đã lưu ${saved.length} giao dịch.`);
      window.dispatchEvent(new Event('smartfin-transactions-changed'));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Không lưu được giao dịch. Bản xem trước vẫn được giữ lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full mb-8">
      {/* Khung bọc ngoài tạo hiệu ứng viền Gradient phát sáng tinh tế */}
      <div className="relative p-[1.5px] rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]">
        
        <form 
          onSubmit={handleSmartSubmit} 
          className="bg-[#181a24] rounded-[22px] px-5 py-3.5 flex flex-col sm:flex-row items-center gap-4 w-full relative"
        >
          {/* Nhãn hiệu ứng AI nổi bật */}
          <div className="flex items-center gap-2.5 text-blue-400 font-semibold whitespace-nowrap shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles size={20} className="animate-pulse text-indigo-400" />
            </div>
            <span className="text-sm tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 font-bold hidden sm:inline">
              Nhập thông minh
            </span>
          </div>
          
          <div className="h-7 w-[1px] bg-[#2d3142] hidden sm:block shrink-0"></div>
          
          {/* Ô input to bản, rõ ràng */}
          <input 
            type="text" 
            value={smartText}
            onChange={(e) => { requestVersion.current += 1; setLoading(false); setSmartText(e.target.value); setDrafts([]); setNotice(''); }}
            maxLength={2000}
            placeholder="Ví dụ: Ăn phở bò 45k lúc sáng, đổ xăng 50k..." 
            className="flex-1 bg-transparent border-none text-base text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0 w-full px-1"
          />
          
          {/* Nút Ghi chép cao cấp */}
          <button 
            type="submit"
            disabled={loading || saving || !smartText.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl py-3 px-7 flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] shrink-0 w-full sm:w-auto"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>{loading ? 'Đang phân tích...' : 'Xem trước'}</span>
          </button>
        </form>
      </div>
      {error && !drafts.length && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="mt-2 text-sm text-emerald-300">{notice}</p>}
      {drafts.length > 0 && <NlpPreview drafts={drafts} options={options} onChange={changeDraft} onCancel={() => { setDrafts([]); setError(''); }} onSave={saveDrafts} saving={saving} error={error} />}
    </div>
  );
};

export default TransactionForm;
