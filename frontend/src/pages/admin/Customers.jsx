import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  Search,
  UserPlus,
  Eye,
  Pencil,
  X,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
} from 'lucide-react';

// Đổi lại đúng route backend của bạn nếu khác
const API_BASE_URL = 'http://localhost:8000/api/v1/admin/users';

const INITIAL_FORM = {
  full_name: '',
  email: '',
  password: '',
  phone_number: '',
  date_of_birth: '',
  monthly_income: '',
  role: 'user',
  is_active: true,
};

const formatVND = (val) => `${Number(val || 0).toLocaleString('vi-VN')} đ`;

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString('vi-VN');
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? val
    : d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const extractErrorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');
  }
  return err?.response?.data?.message || err?.message || fallback;
};

const normalizeCustomer = (item) => ({
  ...item,
  role: item?.role || 'user',
  is_active: item?.is_active !== undefined ? Boolean(item.is_active) : true,
  create_at: item?.create_at ?? item?.created_at ?? null,
  update_at: item?.update_at ?? item?.updated_at ?? null,
});

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const [detailCustomer, setDetailCustomer] = useState(null);
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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.get(API_BASE_URL, { headers: getAuthHeaders() });
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : [];
      const onlyUsers = rawList
        .map(normalizeCustomer)
        .filter((c) => String(c.role).toLowerCase() === 'user');
      setCustomers(onlyUsers);
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
      setCustomers([]);
      setErrorMsg(extractErrorMessage(err, 'Không thể tải danh sách khách hàng từ máy chủ.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const summary = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => Boolean(c.is_active)).length;
    const inactive = total - active;
    const avgIncome =
      total > 0
        ? Math.round(
            customers.reduce((sum, item) => sum + (Number(item.monthly_income) || 0), 0) / total
          )
        : 0;
    return { total, active, inactive, avgIncome };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchSearch =
        !kw ||
        c.full_name?.toLowerCase().includes(kw) ||
        c.email?.toLowerCase().includes(kw) ||
        c.phone_number?.toLowerCase().includes(kw) ||
        String(c.id).includes(kw);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && Boolean(c.is_active)) ||
        (statusFilter === 'inactive' && !c.is_active);

      return matchSearch && matchStatus;
    });
  }, [customers, search, statusFilter]);

  const openCreate = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setModalMode('create');
  };

  const openEdit = (customer) => {
    setFormData({
      full_name: customer.full_name || '',
      email: customer.email || '',
      password: '',
      phone_number: customer.phone_number || '',
      date_of_birth: customer.date_of_birth ? String(customer.date_of_birth).slice(0, 10) : '',
      monthly_income: customer.monthly_income ?? '',
      role: 'user',
      is_active: Boolean(customer.is_active),
    });
    setEditingId(customer.id);
    setModalMode('edit');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    const payload = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      monthly_income: Number(formData.monthly_income) || 0,
      role: 'user',
      is_active: Boolean(formData.is_active),
    };

    if (modalMode === 'create' || formData.password) {
      payload.password = formData.password;
    }

    try {
      if (modalMode === 'create') {
        await axios.post(API_BASE_URL, payload, { headers: getAuthHeaders() });
      } else if (modalMode === 'edit' && editingId !== null) {
        await axios.patch(`${API_BASE_URL}/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
      }
      setModalMode(null);
      await fetchCustomers();
    } catch (err) {
      console.error('Lỗi lưu khách hàng:', err);
      alert(extractErrorMessage(err, 'Không thể lưu thông tin khách hàng.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!toggleTarget) return;
    const nextActive = !Boolean(toggleTarget.is_active);

    try {
      setToggling(true);
      await axios.patch(
        `${API_BASE_URL}/${toggleTarget.id}`,
        { is_active: nextActive },
        { headers: getAuthHeaders() }
      );
      if (detailCustomer?.id === toggleTarget.id) {
        setDetailCustomer((prev) => (prev ? { ...prev, is_active: nextActive } : null));
      }
      setToggleTarget(null);
      await fetchCustomers();
    } catch (err) {
      console.error('Lỗi đổi trạng thái khách hàng:', err);
      alert(extractErrorMessage(err, 'Không thể đổi trạng thái tài khoản.'));
      setToggleTarget(null);
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
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Quản Lý Khách Hàng</h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              Danh sách tài khoản người dùng, thu nhập tháng và trạng thái hoạt động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchCustomers}
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
            <UserPlus size={18} /> Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Thông báo lỗi API nếu có */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-300">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={fetchCustomers}
            className="shrink-0 rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Tổng khách hàng</p>
            <p className="text-2xl font-bold text-white mt-1">{summary.total}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Đang hoạt động</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.active}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Đã khóa</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{summary.inactive}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <UserX size={20} />
          </div>
        </div>

        <div className="bg-[#1e2330] border border-[#252836] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Thu nhập TB / tháng</p>
            <p className="text-xl font-bold text-teal-300 mt-1">{formatVND(summary.avgIncome)}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
            <Wallet size={20} />
          </div>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm */}
      <div className="bg-[#1e2330]/80 border border-[#252836] rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT hoặc ID..."
            className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none cursor-pointer"
        >
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã khóa</option>
        </select>
      </div>

      {/* Bảng khách hàng */}
      <div className="bg-[#1e2330] border border-[#252836] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-500" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            {errorMsg ? 'Chưa có dữ liệu do lỗi kết nối API.' : 'Không có khách hàng nào phù hợp.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141721] border-b border-[#252836] text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">STT</th>
                  <th className="py-3.5 px-4">Khách hàng</th>
                  <th className="py-3.5 px-4">SĐT</th>
                  <th className="py-3.5 px-4">Ngày sinh</th>
                  <th className="py-3.5 px-4">Thu nhập / tháng</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252836] text-sm">
                {filteredCustomers.map((c, index) => (
                  <tr key={c.id} className="hover:bg-[#252836]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-400">{index + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold flex items-center justify-center shrink-0">
                          {c.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{c.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                      {c.phone_number || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                      {formatDate(c.date_of_birth)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-400 whitespace-nowrap">
                      {formatVND(c.monthly_income)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setToggleTarget(c)}
                        title="Đổi trạng thái"
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                          c.is_active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                        }`}
                      >
                        {c.is_active ? 'Hoạt động' : 'Đã khóa'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(c)}
                          title="Xem chi tiết"
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#141721] transition cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          title="Chỉnh sửa"
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal chi tiết */}
      {detailCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#252836] pb-3.5">
              <div>
                <h2 className="text-lg font-bold text-white">{detailCustomer.full_name}</h2>
                <p className="text-xs text-gray-400">
                  ID: #{detailCustomer.id} • Quyền: user
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2.5 text-sm text-gray-300">
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-blue-400" />
                <span>{detailCustomer.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-emerald-400" />
                <span>{detailCustomer.phone_number || '—'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar size={15} className="text-teal-300" />
                <span>Ngày sinh: {formatDate(detailCustomer.date_of_birth)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Wallet size={15} className="text-emerald-400" />
                <span>Thu nhập tháng: {formatVND(detailCustomer.monthly_income)}</span>
              </div>
            </div>

            <div className="bg-[#141721] border border-[#252836] rounded-xl p-3 text-xs text-gray-400 space-y-1">
              <p>
                Tạo lúc: <span className="text-gray-200">{formatDateTime(detailCustomer.create_at)}</span>
              </p>
              <p>
                Cập nhật:{' '}
                <span className="text-gray-200">{formatDateTime(detailCustomer.update_at)}</span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = detailCustomer;
                  setDetailCustomer(null);
                  openEdit(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white cursor-pointer"
              >
                Sửa thông tin
              </button>
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="px-4 py-2 rounded-xl bg-[#252836] hover:bg-[#31384d] text-sm font-medium text-gray-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm / sửa */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmitForm}
            className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#252836] pb-3.5">
              <h2 className="text-lg font-bold text-white">
                {modalMode === 'create'
                  ? 'Thêm khách hàng mới'
                  : `Chỉnh sửa khách hàng #${editingId}`}
              </h2>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Thu nhập / tháng (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  value={formData.monthly_income}
                  onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {modalMode === 'create' ? 'Mật khẩu *' : 'Mật khẩu mới (để trống nếu giữ nguyên)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#141721] border border-[#252836] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-[#252836] bg-[#141721] text-blue-500"
              />
              <span>Kích hoạt tài khoản</span>
            </label>

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

      {/* Modal xác nhận đổi trạng thái */}
      {toggleTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2330] border border-[#252836] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">
              {toggleTarget.is_active ? 'Khóa tài khoản?' : 'Kích hoạt tài khoản?'}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {toggleTarget.is_active
                ? `Đổi trạng thái của "${toggleTarget.full_name}" (${toggleTarget.email}) sang Đã khóa?`
                : `Đổi trạng thái của "${toggleTarget.full_name}" (${toggleTarget.email}) sang Hoạt động?`}
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
                onClick={handleConfirmStatusChange}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 cursor-pointer ${
                  toggleTarget.is_active
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {toggling
                  ? 'Đang cập nhật...'
                  : toggleTarget.is_active
                    ? 'Khóa'
                    : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}