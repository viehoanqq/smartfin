import { 
  Home, PieChart, Wallet, User, Settings, Activity, 
  Zap, ShoppingCart, Briefcase, Film 
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: Home, active: true },
  { id: 'analytics', label: 'Thống kê', icon: PieChart, active: false },
  { id: 'wallet', label: 'Ví của tôi', icon: Wallet, active: false },
  { id: 'transactions', label: 'Giao dịch', icon: Zap, active: false },
  { id: 'profile', label: 'Cá nhân', icon: User, active: false },
  { id: 'settings', label: 'Cài đặt', icon: Settings, active: false },
  { id: 'activity', label: 'Hoạt động', icon: Activity, active: false },
  
];

export const TRANSACTIONS = [
  { id: 1, name: 'Tiền điện', date: '28 Tháng 10', time: '08:00', amount: '- 1.250.000 ₫', icon: Zap, active: false },
  { id: 2, name: 'Cửa hàng tiện lợi', date: '28 Tháng 10', time: '12:30', amount: '- 124.000 ₫', icon: ShoppingCart, active: true },
  { id: 3, name: 'Mua sắm quần áo', date: '27 Tháng 10', time: '15:00', amount: '- 850.000 ₫', icon: Briefcase, active: false },
  { id: 4, name: 'Xem phim rạp', date: '26 Tháng 10', time: '20:00', amount: '- 220.000 ₫', icon: Film, active: false },
];

export const CONTACTS = [
  { id: 1, name: 'Bảo', img: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, name: 'Linh', img: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, name: 'Châu', img: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, name: 'Dương', img: 'https://i.pravatar.cc/150?u=4' },
  { id: 5, name: 'Yến', img: 'https://i.pravatar.cc/150?u=5' },
];

export const RECENT_TRANSFERS = [
  { id: 1, name: 'Nguyễn Minh Tuấn', card: 'VCB 4012 2287 ****', img: 'https://i.pravatar.cc/150?u=6' },
  { id: 2, name: 'Trần Thị Mai', card: 'TCB 3275 2887 ****', img: 'https://i.pravatar.cc/150?u=7' },
];