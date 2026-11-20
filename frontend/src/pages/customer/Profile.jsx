import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { passwordError, PASSWORD_HINT } from '../../utils/password';
import { userAPI } from '../../services/userAPI';
import ConfirmModal from '../../components/common/ConfirmModal';
import defaultAvatar from '../../assets/imgs/avt-default.png';


const Profile = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  // State cho chức năng Đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDanger: false,
    icon: AlertTriangle,
    onConfirm: null,
  });

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await userAPI.getMe();
        setUser(response);
      } catch (error) {
        console.error('Lỗi lấy thông tin:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const SETTING_TABS = [
    { id: 'profile', label: 'Hồ sơ của tôi', icon: User },
    { id: 'security', label: 'Bảo mật & Đăng nhập', icon: Lock },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.target);
    const rawDate = formData.get('date_of_birth');

    const data = {
      full_name: formData.get('full_name') || '',
      phone_number: formData.get('phone_number') || '',
      date_of_birth: rawDate ? rawDate : null,
    };

    try {
      await userAPI.updateUser(data);

      setModalConfig({
        isOpen: true,
        title: 'Cập nhật thành công',
        message: 'Hồ sơ cá nhân của bạn đã được lưu trên hệ thống.',
        isDanger: false,
        icon: CheckCircle,
        onConfirm: () => window.location.reload(),
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);

      setModalConfig({
        isOpen: true,
        title: 'Cập nhật thất bại',
        message: error?.response?.data?.detail || 'Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại.',
        isDanger: true,
        icon: AlertTriangle,
        onConfirm: closeModal,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordError(passwordForm.new_password)) {
      setModalConfig({
        isOpen: true,
        title: 'Mật khẩu chưa hợp lệ',
        message: passwordError(passwordForm.new_password),
        isDanger: true,
        icon: AlertTriangle,
        onConfirm: closeModal,
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setModalConfig({
        isOpen: true,
        title: 'Mật khẩu không khớp',
        message: 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp.',
        isDanger: true,
        icon: AlertTriangle,
        onConfirm: closeModal,
      });
      return;
    }

    if (passwordForm.old_password === passwordForm.new_password) {
      setModalConfig({
        isOpen: true,
        title: 'Mật khẩu trùng lặp',
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
        isDanger: true,
        icon: AlertTriangle,
        onConfirm: closeModal,
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(passwordForm);
      window.dispatchEvent(new Event('notifications-changed'));

      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });

      setModalConfig({
        isOpen: true,
        title: 'Đổi mật khẩu thành công',
        message: 'Mật khẩu của bạn đã được cập nhật trên hệ thống.',
        isDanger: false,
        icon: CheckCircle,
        onConfirm: closeModal,
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const errMsg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d?.msg || JSON.stringify(d)).join(' | ')
            : 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.';

      setModalConfig({
        isOpen: true,
        title: 'Đổi mật khẩu thất bại',
        message: errMsg,
        isDanger: true,
        icon: AlertTriangle,
        onConfirm: closeModal,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0F111A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0F111A] pt-8">
      <div className="w-full max-w-6xl mx-auto px-4 pb-10 animate-[fadeIn_0.3s_ease-out]">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Quản lý tài khoản</h2>
          <p className="text-gray-400">Xem thông tin cá nhân và thiết lập các tùy chọn hệ thống của bạn.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-[#1a1c24] border border-[#2d3142] rounded-3xl p-3 shadow-lg flex flex-col gap-1">
              {SETTING_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner'
                        : 'text-gray-400 hover:bg-[#252836] hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-blue-500' : 'text-gray-500'} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 bg-[#1a1c24] border border-[#2d3142] rounded-3xl shadow-lg overflow-hidden relative min-h-[500px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {activeTab === 'profile' && (
              <div className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Hồ sơ cá nhân</h3>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-1">
                      <img
                        src={defaultAvatar}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover border-4 border-[#1a1c24] bg-[#252836]"
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="text-white font-medium text-xl">{user?.full_name || 'Người dùng SmartFin'}</h4>
                    <p className="text-gray-400 text-sm mb-3">
                      {user?.role === 'admin' ? 'Quản trị viên hệ thống' : 'Thành viên'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-[#181920]/50 border border-[#252836] p-4 rounded-2xl">
                    <p className="text-gray-400 text-sm mb-1">Thu nhập hàng tháng</p>
                    <p className="text-xl font-bold text-green-400">
                      {user?.monthly_income ? user.monthly_income.toLocaleString('vi-VN') : '0'} {user?.currency || 'VND'}
                    </p>
                  </div>
                  <div className="bg-[#181920]/50 border border-[#252836] p-4 rounded-2xl">
                    <p className="text-gray-400 text-sm mb-1">Đơn vị tiền tệ</p>
                    <p className="text-xl font-bold text-blue-400">
                      {user?.currency || 'VND'}
                    </p>
                  </div>
                </div>

                <hr className="border-[#2d3142] mb-8" />

                <h4 className="text-lg font-medium text-white mb-6">Cập nhật thông tin</h4>
                <form key={user?.email || 'profile-form'} onSubmit={handleUpdateProfile}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2 relative z-10">
                      <label className="text-sm font-medium text-gray-400">Họ và tên</label>
                      <input
                        name="full_name"
                        type="text"
                        defaultValue={user?.full_name || ''}
                        placeholder="VD: Nguyễn Việt Hoàng"
                        className="bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                      <label className="text-sm font-medium text-gray-400">Email đăng nhập (Không thể thay đổi)</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        disabled
                        className="bg-[#181920]/50 border border-[#252836] text-gray-500 rounded-xl px-4 py-3.5 outline-none cursor-not-allowed"
                      />
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                      <label className="text-sm font-medium text-gray-400">Số điện thoại</label>
                      <input
                        name="phone_number"
                        type="tel"
                        defaultValue={user?.phone_number || ''}
                        placeholder="VD: 0987654321"
                        className="bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-2 relative z-10">
                      <label className="text-sm font-medium text-gray-400">Ngày sinh</label>
                      <input
                        name="date_of_birth"
                        type="date"
                        defaultValue={user?.date_of_birth ? String(user.date_of_birth) : ''}
                        className="bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-4 py-3.5 text-white outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end relative z-10">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
                    <KeyRound size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Đổi mật khẩu</h3>
                </div>
                <p className="text-gray-400 text-sm mb-8">
                  Nhập mật khẩu hiện tại và mật khẩu mới để bảo vệ tài khoản của bạn.
                </p>

                <form onSubmit={handleChangePassword} className="max-w-lg space-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Mật khẩu hiện tại *</label>
                    <div className="relative flex items-center">
                      <input
                        name="old_password"
                        type={showPasswords.old ? 'text' : 'password'}
                        required
                        value={passwordForm.old_password}
                        onChange={handlePasswordChange}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-4 py-3.5 pr-12 text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('old')}
                        className="absolute right-3.5 text-gray-400 hover:text-white cursor-pointer"
                      >
                        {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Mật khẩu mới *</label>
                    <div className="relative flex items-center">
                      <input
                        name="new_password"
                        type={showPasswords.new ? 'text' : 'password'}
                        required
                        value={passwordForm.new_password}
                        onChange={handlePasswordChange}
                        placeholder="Ít nhất 8 ký tự"
                        className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-4 py-3.5 pr-12 text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3.5 text-gray-400 hover:text-white cursor-pointer"
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-400">{PASSWORD_HINT}</p>
                    <label className="text-sm font-medium text-gray-300">Xác nhận mật khẩu mới *</label>
                    <div className="relative flex items-center">
                      <input
                        name="confirm_password"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        required
                        value={passwordForm.confirm_password}
                        onChange={handlePasswordChange}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full bg-[#0F111A] border border-[#2d3142] focus:border-blue-500 rounded-xl px-4 py-3.5 pr-12 text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3.5 text-gray-400 hover:text-white cursor-pointer"
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                    >
                      {isChangingPassword ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {isChangingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        isDanger={modalConfig.isDanger}
        icon={modalConfig.icon}
        confirmText="Đồng ý"
        cancelText="Đóng"
        onConfirm={modalConfig.onConfirm}
        onCancel={closeModal}
      />
    </div>
  );
};

export default Profile;
