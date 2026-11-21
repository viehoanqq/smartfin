import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { notificationAPI } from '../../services/notificationAPI';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const root = useRef(null);
  const generation = useRef(0);
  const mounted = useRef(false);

  const refresh = useCallback(async (quiet = false) => {
    const request = ++generation.current;
    if (!quiet) setLoading(true);
    try {
      const [unread, list] = await Promise.all([
        notificationAPI.unreadCount(), open ? notificationAPI.list(page) : Promise.resolve(null),
      ]);
      if (!mounted.current || request !== generation.current) return;
      setCount(unread.unread_count);
      if (list) setData(list);
      setError('');
    } catch {
      if (mounted.current && request === generation.current) setError('Không tải được thông báo. Vui lòng thử lại.');
    } finally {
      if (mounted.current && request === generation.current) setLoading(false);
    }
  }, [open, page]);

  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => refresh(), 0);
    const timer = setInterval(() => { if (!document.hidden) refresh(true); }, 30000);
    const onChanged = () => refresh(true);
    window.addEventListener('notifications-changed', onChanged);
    return () => {
      mounted.current = false;
      generation.current += 1;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener('notifications-changed', onChanged);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [open]);

  const markRead = async (id) => {
    setSaving(true);
    try {
      if (id === undefined) await notificationAPI.markAllRead();
      else await notificationAPI.markRead(id);
      await refresh(true);
    } catch {
      setError('Không cập nhật được trạng thái thông báo. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={root}>
      <button type="button" aria-label={`Thông báo, ${count} chưa đọc`} aria-expanded={open}
        aria-controls="notification-panel" onClick={() => { setOpen(!open); setPage(1); }}
        className="relative w-10 h-10 rounded-full bg-[#181920] border border-[#2d3142] flex items-center justify-center text-gray-400 hover:text-white">
        <Bell size={18} />
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-5 px-1 rounded-full bg-rose-500 text-white text-xs">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && <section id="notification-panel" aria-label="Thông báo" className="absolute right-0 mt-3 w-[min(360px,90vw)] rounded-2xl bg-[#1a1c24] border border-[#2d3142] shadow-xl text-white z-50">
        <div className="flex items-center justify-between p-4 border-b border-[#2d3142]">
          <h2 className="font-semibold">Thông báo</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng thông báo"><X size={18} /></button>
        </div>
        <button type="button" disabled={saving || count === 0} onClick={() => markRead()}
          className="px-4 py-3 text-sm text-blue-400 disabled:opacity-50">Đánh dấu tất cả đã đọc</button>
        {error && <div className="px-4 text-sm text-rose-400" role="alert">{error} <button type="button" onClick={() => refresh()}>Thử lại</button></div>}
        <div className="max-h-80 overflow-y-auto" aria-busy={loading}>
          {loading ? <p className="p-4 text-gray-400">Đang tải...</p> : data.items.length === 0 ? <p className="p-4 text-gray-400">Chưa có thông báo.</p> : data.items.map((item) => (
            <button type="button" key={item.id} disabled={saving || item.is_read} onClick={() => markRead(item.id)}
              className={`w-full text-left p-4 border-t border-[#2d3142] ${item.is_read ? 'text-gray-400' : 'bg-blue-500/10 text-white hover:bg-blue-500/20'}`}>
              <p className="text-sm font-semibold">{!item.is_read && <span aria-label="Chưa đọc" className="text-blue-400">● </span>}{item.title}</p>
              <p className="text-sm mt-1">{item.content}</p>
              <time className="text-xs text-gray-400 mt-2 block">{new Date(item.created_at).toLocaleString('vi-VN')}</time>
            </button>
          ))}
        </div>
        <div className="flex justify-between p-3 text-sm border-t border-[#2d3142]">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Trước</button>
          <span>Trang {page}</span>
          <button type="button" disabled={loading || page * 10 >= data.total} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Sau</button>
        </div>
      </section>}
    </div>
  );
}
