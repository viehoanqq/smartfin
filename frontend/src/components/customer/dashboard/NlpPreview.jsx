import React from 'react';

const toLocalInput = (value) => value ? value.slice(0, 16) : '';
const visibleWarnings = (draft) => (draft.warnings || []).filter((warning) => !(
  (warning === 'Chọn danh mục' && draft.category_id) ||
  (warning === 'Chọn ví' && draft.wallet_id) ||
  (warning === 'Nhập số tiền' && Number(draft.amount) > 0) ||
  (warning === 'Chọn loại thu hoặc chi' && draft.type)
));

export default function NlpPreview({ drafts, options, onChange, onCancel, onSave, saving, error }) {
  const ready = drafts.length > 0 && drafts.every((item) =>
    Number(item.amount) > 0 && item.wallet_id && item.category_id &&
    ['income', 'expense'].includes(item.type) && item.txn_date && item.note?.trim()
  );

  return (
    <section aria-label="Xem trước giao dịch từ câu nhập" className="mt-4 rounded-2xl border border-[#33394c] bg-[#181b26] p-5 text-gray-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Kiểm tra trước khi lưu</h3>
          <p className="text-sm text-gray-400">Sửa mọi thông tin chưa đúng. Chưa có giao dịch nào được lưu.</p>
        </div>
        <button type="button" onClick={onCancel} disabled={saving} className="text-sm text-gray-300 hover:text-white">Hủy</button>
      </div>
      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <div key={`${index}-${draft.raw_text}`} className="rounded-xl border border-[#33394c] bg-[#11141d] p-4">
            <p className="mb-3 text-xs text-gray-400">Câu gốc: {draft.raw_text}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-gray-400">Loại
                <select value={draft.type || ''} onChange={(e) => onChange(index, 'type', e.target.value)} className="mt-1 w-full rounded-lg border border-[#44495a] bg-[#1d2230] p-2 text-sm text-white">
                  <option value="">Chọn loại</option><option value="expense">Chi</option><option value="income">Thu</option>
                </select>
              </label>
              <label className="text-xs text-gray-400">Số tiền (VND)
                <input type="text" inputMode="numeric" value={draft.amount ? Number(draft.amount).toLocaleString('vi-VN') : ''} onChange={(e) => onChange(index, 'amount', e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-lg border border-[#44495a] bg-[#1d2230] p-2 text-sm text-white" />
              </label>
              <label className="text-xs text-gray-400">Ngày và giờ
                <input type="datetime-local" value={toLocalInput(draft.txn_date)} onChange={(e) => onChange(index, 'txn_date', e.target.value ? `${e.target.value}:00+07:00` : '')} className="mt-1 w-full rounded-lg border border-[#44495a] bg-[#1d2230] p-2 text-sm text-white [color-scheme:dark]" />
              </label>
              <label className="text-xs text-gray-400">Ví
                <select value={draft.wallet_id ?? ''} onChange={(e) => onChange(index, 'wallet_id', Number(e.target.value) || null)} className="mt-1 w-full rounded-lg border border-[#44495a] bg-[#1d2230] p-2 text-sm text-white">
                  <option value="">Chọn ví</option>{options.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Danh mục
                <select value={draft.category_id ?? ''} onChange={(e) => onChange(index, 'category_id', Number(e.target.value) || null)} className="mt-1 w-full rounded-lg border border-[#44495a] bg-[#1d2230] p-2 text-sm text-white">
                  <option value="">Chọn danh mục</option>{options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Ghi chú
                <input type="text" value={draft.note || ''} onChange={(e) => onChange(index, 'note', e.target.value)} className="mt-1 w-full rounded-lg border border-[#44495a] bg-[#1d2230] p-2 text-sm text-white" />
              </label>
            </div>
            {draft.suggestions?.length > 0 && <p className="mt-2 text-xs text-blue-300">Gợi ý: {draft.suggestions.map((s) => s.category_name).join(', ')}. Điểm tương đồng: {draft.confidence?.toFixed(2)} (không phải xác suất).</p>}
            {(draft.merchant || draft.location) && <p className="mt-2 text-xs text-gray-400">{draft.merchant && `Cửa hàng gợi ý: ${draft.merchant}`}{draft.location && ` · Địa điểm: ${draft.location}`}</p>}
            {visibleWarnings(draft).length > 0 && <p className="mt-2 text-xs text-amber-300">Cần kiểm tra: {visibleWarnings(draft).join(' · ')}</p>}
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <button type="button" onClick={onSave} disabled={!ready || saving} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? 'Đang lưu...' : `Xác nhận lưu ${drafts.length} giao dịch`}
      </button>
    </section>
  );
}
