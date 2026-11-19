import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/'); 
    } catch (err) {
      setError(err?.response?.data?.detail || 'Sai email hoặc mật khẩu.');
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
          {/* Header + Hero */}
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
             Thiết lập ví tiền, thu nhập hằng tháng và mục tiêu tiết kiệm chỉ trong một bước để theo dõi mọi khoản thu chi rõ ràng. thống nhất.
            </p>
          </div>

          {/* 1. Thẻ ví + Tổng thu/chi + Ghi nhanh */}
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

          {/* 2. Danh sách giao dịch mẫu theo tháng */}
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

          {/* 3. Tiến độ mục tiêu tiết kiệm mẫu */}
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

          {/* Điểm nổi bật gọn */}
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

        {/* Chân cột trái */}
        <div className="relative z-10 mt-10 pt-6 border-t border-[#2E3448] max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Bạn mới sử dụng SmartFin?</p>
            <p className="text-xs text-gray-400">Đăng ký tài khoản mới để bắt đầu quản lý ví và chi tiêu.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#252836] hover:bg-[#2F3346] border border-[#3A4158] text-sm font-semibold text-white transition-all cursor-pointer shrink-0"
          >
            <span>Tạo tài khoản</span>
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

          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">Đăng nhập</h2>
            
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email đăng nhập
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#0F111A] border border-[#2E3448] focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Mật khẩu
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.99] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-[#2E3448] text-center text-xs sm:text-sm text-gray-400">
            Bạn muốn tạo tài khoản mới?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Đăng ký tại đây
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

export default Login;