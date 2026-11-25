import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FolderKanban,
  Search,
  Plus,
  Pencil,
  EyeOff,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api/v1/categories';

const INITIAL_FORM = {
  name: '',
  description: '',
  keywords: '',
  icon: '',
  is_active: true,
};

const extractErrorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && detail.message) return detail.message;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');
  }
  return err?.response?.data?.message || err?.message || fallback;
};

const getIsActive = (cat) => {
  if (cat?.is_hidden !== undefined && cat?.is_hidden !== null) {
    return !Boolean(cat.is_hidden);
  }
  if (cat?.is_active !== undefined && cat?.is_active !== null) {
    return Boolean(cat.is_active);
  }
  return true;
};

const formatKeywords = (keywords) => {
  if (Array.isArray(keywords)) return keywords.join(', ');
  if (typeof keywords === 'string') return keywords;
  return '';
};

const parseKeywords = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const [modalMode, setModalMode] = useState(null); // null | 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.get(API_BASE_URL, {
        headers: getAuthHeaders(),
        params: { include_hidden: true },
      });
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : [];
      setCategories(list);
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
      setCategories([]);
      setErrorMsg(extractErrorMessage(err, 'Không thể tải danh sách danh mục từ máy chủ.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const summary = useMemo(() => {
    const total = categories.length;
    const activeCount = categories.filter((c) => getIsActive(c)).length;
    const inactiveCount = total - activeCount;
    return { total, activeCount, inactiveCount };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return categories.filter((c) => {
      const isActive = getIsActive(c);
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      if (!kw) return true;
      const name = String(c.name || c.title || '').toLowerCase();
      const desc = String(c.description || c.note || '').toLowerCase();
      const kws = formatKeywords(c.keywords).toLowerCase();
      const id = String(c.id || '').toLowerCase();
      return name.includes(kw) || desc.includes(kw) || kws.includes(kw) || id.includes(kw);
    });
  }, [categories, search, statusFilter]);

  const openCreate = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setModalMode('create');
  };

  const openEdit = (cat) => {
    setFormData({
      name: cat.name || cat.title || '',
      description: cat.description || cat.note || '',
      keywords: formatKeywords(cat.keywords),
      icon: cat.icon || '',
      is_active: getIsActive(cat),
    });
    setEditingId(cat.id);
    setModalMode('edit');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const isActive = Boolean(formData.is_active);
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      keywords: parseKeywords(formData.keywords),
      icon: formData.icon.trim() || null,
      is_active: isActive,
      is_hidden: !isActive,
    };

    try {
      if (modalMode === 'create') {
        await axios.post(API_BASE_URL, payload, { headers: getAuthHeaders() });
      } else if (modalMode === 'edit' && editingId !== null) {
        await axios.patch(`${API_BASE_URL}/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
      }
      setModalMode(null);
      await fetchCategories();
    } catch (err) {
      console.error('Lỗi lưu danh mục:', err);
      alert(extractErrorMessage(err, 'Không thể lưu danh mục.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleActive = async () => {
    if (!toggleTarget) return;
    const currentActive = getIsActive(toggleTarget);
    const nextActive = !currentActive;

    try {
      setToggling(true);
      await axios.patch(
        `${API_BASE_URL}/${toggleTarget.id}`,
        {
          is_active: nextActive,
          is_hidden: !nextActive,
        },
        { headers: getAuthHeaders() }
      );
      setToggleTarget(null);
      await fetchCategories();
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái danh mục:', err);
      alert(extractErrorMessage(err, 'Không thể cập nhật trạng thái danh mục.'));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="w-full text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e2330]/60 p-6 rounded-2xl border border-[#252836]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <FolderKanban size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Quản Lý Danh Mục</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              Thiết lập nhóm danh mục phục vụ phân loại giao dịch và NLP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchCategories}
            title="Tải lại danh sách"
            className="p-2.5 rounded-xl bg-[#141721] hover:bg-[#252836] border border-[#252836] text-gray-300 hover:text-white transition cursor-pointer"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={18} /> Thêm danh mục
          </button>
        </div>
      </div>

      {/* Thông báo lỗi API */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-300">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={fetchCategories}
            className="shrink-0 rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3 thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Tổng danh mục</p>
            <p className="text-2xl font-bold text-white mt-1">{summary.total}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <FolderKanban size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Đang hiển thị</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.activeCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Eye size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Đã ẩn</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{summary.inactiveCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <EyeOff size={20} />
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="bg-[#1e2330]/80 border border-[#252836] rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên danh mục, từ khóa, mô tả hoặc ID..."
            className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang hiển thị</option>
            <option value="inactive">Đã ẩn</option>
          </select>
        </div>
      </div>

      {/* Bảng danh mục */}
      <div className="bg-[#1e2330] border border-[#252836] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            {errorMsg ? 'Chưa có dữ liệu do lỗi kết nối API.' : 'Không có danh mục nào phù hợp.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141721] border-b border-[#252836] text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">STT</th>
                  <th className="py-3.5 px-4">Tên danh mục</th>
                  <th className="py-3.5 px-4">Từ khóa / Mô tả</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252836] text-sm">
                {filteredCategories.map((cat, index) => {
                  const catName = cat.name || cat.title || '—';
                  const isActive = getIsActive(cat);
                  const kwsText = formatKeywords(cat.keywords);
                  const descText = cat.description || cat.note || '';

                  return (
                    <tr key={cat.id} className="hover:bg-[#252836]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-400">{index + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{catName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 max-w-sm truncate">
                        {kwsText || descText || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isActive
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                              : 'bg-[#141721] border-[#252836] text-gray-400'
                          }`}
                        >
                          {isActive ? 'Hiển thị' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(cat)}
                            title="Chỉnh sửa"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal thêm / sửa danh mục */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmitForm}
            className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#252836] pb-3.5">
              <h2 className="text-lg font-bold text-white">
                {modalMode === 'create' ? 'Thêm danh mục mới' : `Sửa danh mục #${editingId}`}
              </h2>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ăn uống, Hóa đơn điện..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Từ khóa NLP (cách nhau bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="VD: ăn sáng, phở, cơm, trà sữa"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-[#252836] bg-[#141721] text-blue-500"
                />
                <span>Hiển thị danh mục</span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#252836]">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2.5 rounded-xl bg-[#252836] hover:bg-[#31384d] text-sm font-medium text-gray-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xác nhận ẩn / hiện danh mục */}
      {toggleTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">
              {getIsActive(toggleTarget)
                ? `Ẩn danh mục "${toggleTarget.name || toggleTarget.title}"?`
                : `Hiện danh mục "${toggleTarget.name || toggleTarget.title}"?`}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {getIsActive(toggleTarget)
                ? 'Danh mục sẽ chuyển sang trạng thái ẩn (vẫn giữ nguyên các giao dịch cũ).'
                : 'Danh mục sẽ được kích hoạt hiển thị trở lại.'}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={toggling}
                onClick={() => setToggleTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#252836] hover:bg-[#31384d] text-sm font-medium text-gray-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={toggling}
                onClick={handleConfirmToggleActive}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
              >
                {toggling ? 'Đang cập nhật...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}