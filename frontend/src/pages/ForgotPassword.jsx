import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { passwordError, PASSWORD_HINT, authError } from '../utils/password';
import {
  TrendingUp,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Send,
  CheckCircle2,
  Wallet,
  PiggyBank,
} from 'lucide-react';

const SmartFinLogo = ({ sizeClass = 'text-4xl sm:text-5xl' }) => (
  <span
    className={`${sizeClass} font-extrabold tracking-tight bg-gradient-to-r from-[#60A5FA] via-[#34D399] to-[#2DD4BF] bg-clip-text text-transparent select-none leading-none`}
  >
    SmartFin
  </span>
);

const SAMPLE_TRANSACTIONS = [
  {
    id: 1,
    title: 'Ăn trưa cơm tấm sườn bì chả',
    date: '19/11/2026 12:15',
    type: 'expense',
    label: 'Chi tiêu',
    amount: '-45.000 ₫',
  },
  {
    id: 2,
    title: 'Lương thực tập / làm thêm tháng 11',
    date: '15/11/2026 09:00',
    type: 'income',
    label: 'Thu nhập',
    amount: '+8.500.000 ₫',
  },
  {
    id: 3,
    title: 'Nạp tiền vào tiết kiệm Mua nhà',
    date: '10/11/2026 20:30',
    type: 'saving',
    label: 'Tiết kiệm',
    amount: '-1.000.000 ₫',
  },
];

const SAMPLE_GOALS = [
  {
    name: 'Quỹ dự phòng cá nhân',
    current: '18.500.000 ₫',
    target: '30.000.000 ₫',
    percent: 62,
    barClass: 'bg-blue-500',
  },
  {
    name: 'Du lịch cuối năm',
    current: '4.200.000 ₫',
    target: '6.000.000 ₫',
    percent: 70,
    barClass: 'bg-emerald-400',
  },
];

const ForgotPassword = () => {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const redirectTimer = useRef(null);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearTimeout(redirectTimer.current); };
  }, []);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      const requestedAt = Date.now();
      setNow(requestedAt);
      setExpiresAt(requestedAt + (response.expires_in ?? 300) * 1000);
      setResendAt(requestedAt + (response.resend_after ?? 60) * 1000);
      setResetCode('');
      setSuccess(response.message);
      setStep(2);
    } catch (err) {
      setError(authError(err, 'Có lỗi xảy ra, vui lòng thử lại.'));
      if (err?.response?.status === 429) {
        const wait = Number(err.response.headers?.['retry-after']) || 60;
        setResendAt(Date.now() + wait * 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const validation = passwordError(newPassword);
    if (validation || newPassword !== confirmPassword) {
      setError(validation || 'Xác nhận mật khẩu không khớp.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        email,
        reset_code: resetCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      localStorage.removeItem('access_token');
      setNewPassword('');
      setConfirmPassword('');
      setResetCode('');
      setSuccess(response.message || 'Đặt lại mật khẩu thành công!');
      redirectTimer.current = setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err) {
      setError(authError(err, 'Mã OTP không hợp lệ hoặc lỗi kết nối.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0F111A] text-white grid grid-cols-1 lg:grid-cols-12 items-start">
      {/* CỘT TRÁI CUỘN NỘI DUNG GIỚI THIỆU (8/12) */}
      <div className="lg:col-span-8 p-8 sm:p-12 xl:p-16 bg-[#12151E] border-b lg:border-b-0 lg:border-r border-[#2E3448] flex flex-col justify-between relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-0 w-[460px] h-[460px] rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative z-10 max-w-4xl space-y-10">
          <div>
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <TrendingUp size={24} />
              </div>
              <SmartFinLogo sizeClass="text-2xl sm:text-3xl" />
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white leading-[1.12] tracking-tight mb-4">
             Ghi chép thu chi hằng ngày,{' '}
              <span className="text-blue-400">rõ ràng từng đồng.</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl">
              Thiết lập ví tiền, thu nhập hằng tháng và mục tiêu tiết kiệm chỉ trong một bước để theo dõi mọi khoản thu chi rõ ràng.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-[28px] p-6 xl:p-7 bg-gradient-to-br from-[#252836] via-[#222738] to-[#1b2234] border border-[#343B52] shadow-xl flex flex-col justify-between min-h-[180px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-300">VISA</span>
                  <CreditCard size={20} className="text-amber-400/90" />
                </div>
                <div className="my-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Số dư khả dụng</p>
                  <p className="text-3xl xl:text-[34px] font-extrabold text-white tracking-tight">
                    74.682.000 <span className="text-base font-bold text-blue-400">₫</span>
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>VÍ CHÍNH</span>
                  <span>Cập nhật tức thì</span>
                </div>
              </div>

              <div className="rounded-[28px] p-6 xl:p-7 bg-[#181B26] border border-[#2E3448] shadow-xl flex flex-col justify-between min-h-[180px]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Tổng thu tháng</p>
                    <p className="text-xl xl:text-2xl font-extrabold text-white">
                      90.000.000 <span className="text-sm text-emerald-400">₫</span>
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ArrowUpRight size={18} />
                  </div>
                </div>

                <div className="border-t border-[#2E3448] pt-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">Tổng chi tháng</p>
                    <p className="text-xl font-bold text-gray-100">
                      15.318.000 <span className="text-sm text-rose-400">₫</span>
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <ArrowDownRight size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4 pl-5 bg-[#181B26] border border-blue-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-blue-400 shrink-0">Ghi nhanh</span>
                <span className="h-4 w-[1px] bg-[#2E3448]" />
                <span className="text-xs sm:text-sm text-gray-400 truncate">
                  Ăn phở bò 45k lúc sáng, đổ xăng 50k...
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold shrink-0">
                <Send size={13} />
                Ghi chép
              </span>
            </div>
          </div>

          <div className="rounded-3xl p-6 bg-[#181B26] border border-[#2E3448] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Giao dịch trong tháng</h2>
                <p className="text-xs text-gray-400">Phân biệt rõ chi tiêu, thu nhập và khoản tiết kiệm</p>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-[#12151E] border border-[#2E3448] px-3 py-1 rounded-full">
                Xem trước
              </span>
            </div>

            <div className="space-y-3">
              {SAMPLE_TRANSACTIONS.map((item) => {
                const isIncome = item.type === 'income';
                const isSaving = item.type === 'saving';
                const Icon = isIncome ? ArrowDown : isSaving ? PiggyBank : ArrowUp;
                const iconBox = isIncome
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : isSaving
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-400';
                const pillClass = isIncome
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : isSaving
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-400';
                const amountClass = isIncome
                  ? 'text-emerald-400'
                  : isSaving
                    ? 'text-blue-400'
                    : 'text-rose-400';

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl p-4 bg-[#12151E]/90 border border-[#2E3448]/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center ${iconBox}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        <p className="text-xs text-gray-400">{item.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${pillClass}`}>
                        {item.label}
                      </span>
                      <span className={`text-sm font-bold whitespace-nowrap ${amountClass}`}>
                        {item.amount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl p-6 bg-[#181B26] border border-[#2E3448] space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Mục tiêu tiết kiệm</h2>
              <p className="text-xs text-gray-400">Theo dõi từng hũ tiền và mức hoàn thành mục tiêu</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SAMPLE_GOALS.map((goal) => (
                <div key={goal.name} className="rounded-2xl p-4 bg-[#12151E] border border-[#2E3448]/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{goal.name}</span>
                    <span className="text-xs font-bold text-blue-400">{goal.percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#252836] overflow-hidden">
                    <div className={`h-full rounded-full ${goal.barClass}`} style={{ width: `${goal.percent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Đã tích: <strong className="text-gray-200">{goal.current}</strong></span>
                    <span>Mục tiêu: {goal.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-gray-300">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Phân loại thu chi tự động
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Quản lý hũ tiết kiệm
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Báo cáo theo tháng
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-6 border-t border-[#2E3448] max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Đã nhớ lại mật khẩu?</p>
            <p className="text-xs text-gray-400">Quay lại trang đăng nhập để vào bảng điều khiển của bạn.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#252836] hover:bg-[#2F3346] border border-[#3A4158] text-sm font-semibold text-white transition-all cursor-pointer shrink-0"
          >
            <span>Về đăng nhập</span>
            <ArrowRight size={16} className="text-blue-400" />
          </button>
        </div>
      </div>

      {/* CỘT PHẢI CỐ ĐỊNH TRÊN DESKTOP (4/12) */}
      <div className="lg:col-span-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto px-7 py-10 sm:px-9 sm:py-12 xl:px-11 xl:py-14 flex flex-col justify-between bg-[#181B26]">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-3.5 pb-6 mb-7 border-b border-[#2E3448]">
            <div className="w-12 h-12 rounded-2xl bg-[#252836] border border-[#343B52] flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp size={24} />
            </div>
            <SmartFinLogo sizeClass="text-4xl sm:text-[42px]" />
          </div>

          {step === 1 ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">Khôi phục mật khẩu</h2>
                <p className="text-sm text-gray-400">
                  Nhập email đăng ký của bạn để nhận mã xác nhận OTP.
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium">
                  {success}
                </div>
              )}

              <form onSubmit={handleRequestOTP} className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Email đăng ký
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || resendLeft > 0}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <span>{resendLeft > 0 ? `Gửi lại sau ${resendLeft}s` : 'Gửi mã OTP'}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">Đặt lại mật khẩu</h2>
                <p className="text-sm text-gray-400">
                  Nhập mã OTP đã gửi tới <strong className="text-gray-200">{email}</strong> và mật khẩu mới.
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium">
                  {success}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="reset-otp" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Mã xác nhận (OTP)
                  </label>
                  <input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Nhập mã OTP"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-400">{secondsLeft > 0 ? `Mã hết hạn sau ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'Mã đã hết hạn. Vui lòng yêu cầu mã mới.'}</p>
                  <button type="button" disabled={isLoading || resendLeft > 0} onClick={handleRequestOTP}
                    className="text-sm text-blue-400 disabled:opacity-50">{resendLeft > 0 ? `Gửi lại sau ${resendLeft}s` : 'Gửi lại mã OTP'}</button>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Mật khẩu mới
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu mới"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-gray-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400">{PASSWORD_HINT}</p>
                <div className="flex flex-col gap-2">
                  <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-wider text-gray-400">Xác nhận mật khẩu mới</label>
                  <input id="confirm-password" type="password" autoComplete="new-password" required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm text-white outline-none" />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || secondsLeft === 0 || Boolean(success?.includes('thành công'))}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận đổi</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white pt-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Đổi email nhận mã OTP</span>
                </button>
              </form>
            </>
          )}

          <div className="mt-7 pt-5 border-t border-[#2E3448] text-center text-xs sm:text-sm text-gray-400">
            Đã nhớ mật khẩu?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Đăng nhập ngay
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto mt-10 pt-4 border-t border-[#2E3448]/70 flex items-center justify-between text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Wallet size={14} className="text-blue-400" />
            Quản lý ví & thu chi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PiggyBank size={14} className="text-emerald-400" />
            Mục tiêu tiết kiệm
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
