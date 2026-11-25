import { useEffect, useRef, useState } from 'react';
import { Bot, Maximize2, Minimize2, Plus, Send, Trash2, X } from 'lucide-react';
import { chatAPI } from '../../../services/chatAPI';

const welcome = { id: 'welcome', role: 'model', content: 'Xin chào! Bạn có thể hỏi về số dư, thu chi, ngân sách hoặc mục tiêu tiết kiệm của mình.' };

export default function ChatbotPanel({ isOpen, onClose, isFullscreen, setIsFullscreen }) {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!isOpen || restoredRef.current) return;
    restoredRef.current = true;
    let active = true;
    setLoading(true);
    const restore = async () => {
      try {
        const saved = await chatAPI.sessions();
        if (!active) return;
        setSessions(saved);
        if (saved.length) {
          const history = await chatAPI.messages(saved[0].id);
          if (!active) return;
          setSessionId(saved[0].id);
          setMessages(history.length ? history : [welcome]);
        }
      } catch {
        if (active) setError('Không tải được lịch sử trò chuyện.');
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => { active = false; restoredRef.current = false; };
  }, [isOpen]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pending]);

  const openSession = async (id) => {
    setLoading(true); setError('');
    try {
      const data = await chatAPI.messages(id);
      setSessionId(id);
      setMessages(data.length ? data : [welcome]);
    } catch { setError('Không tải được cuộc trò chuyện.'); }
    finally { setLoading(false); }
  };

  const removeSession = async () => {
    if (!sessionId || pending || !window.confirm('Xóa cuộc trò chuyện này?')) return;
    try {
      await chatAPI.remove(sessionId);
      setSessions((old) => old.filter((s) => s.id !== sessionId));
      setSessionId(null);
      setMessages([welcome]);
      setError('');
    } catch { setError('Không xóa được cuộc trò chuyện.'); }
  };

  const send = async () => {
    const question = input.trim();
    if (!question || pending || loading) return;
    setPending(true); setError(''); setInput('');
    setMessages((old) => [...old, { id: `local-${Date.now()}`, role: 'user', content: question }]);
    try {
      const result = await chatAPI.send(question, sessionId);
      setSessionId(result.session_id);
      setMessages((old) => [...old, result.message]);
      if (!sessionId) setSessions((old) => [{ id: result.session_id, title: question.slice(0, 80) }, ...old]);
    } catch (err) {
      setMessages((old) => old.slice(0, -1));
      setInput(question);
      setError(err.response?.data?.detail || 'Không gửi được tin nhắn. Vui lòng thử lại.');
    } finally { setPending(false); }
  };

  return <aside aria-label="Trợ lý SmartFin" className={`fixed right-0 z-[100] flex flex-col bg-white text-slate-900 border-l border-slate-200 shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${isFullscreen ? 'inset-0 w-full' : 'top-0 h-full w-full sm:w-[420px]'}`}>
    <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white"><Bot size={20}/></span><div><h2 className="font-semibold">Trợ lý SmartFin</h2><p className="text-xs text-slate-500">Hỏi về tài chính của bạn</p></div></div>
      <div className="flex gap-1"><button aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" disabled={pending || loading} onClick={() => { setSessionId(null); setMessages([welcome]); setError(''); }} className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><Plus size={18}/></button><button aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện" disabled={!sessionId || pending || loading} onClick={removeSession} className="rounded-lg p-2 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Trash2 size={18}/></button><button aria-label="Đổi kích thước" onClick={() => setIsFullscreen(!isFullscreen)} className="hidden rounded-lg p-2 hover:bg-slate-100 sm:block">{isFullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button><button aria-label="Đóng" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={19}/></button></div>
    </header>
    {sessions.length > 0 && <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2">{sessions.map((s) => <button key={s.id} disabled={pending || loading} onClick={() => openSession(s.id)} className={`shrink-0 max-w-44 truncate rounded-full px-3 py-1.5 text-xs disabled:opacity-50 ${sessionId === s.id ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s.title}</button>)}</div>}
    <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5" aria-live="polite">
      {loading ? <p className="text-sm text-slate-500">Đang tải cuộc trò chuyện...</p> : messages.map((m) => <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>{m.content}</div></div>)}
      {pending && <p className="text-sm text-slate-500">Trợ lý đang trả lời...</p>}<div ref={endRef}/>
    </div>
    <div className="border-t border-slate-200 bg-white p-4">
      {error && <p role="alert" className="mb-2 text-sm text-rose-700">{error}</p>}
      <div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} maxLength={1000} rows={2} placeholder="Ví dụ: Tháng này tôi chi bao nhiêu?" className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"/><button aria-label="Gửi tin nhắn" disabled={pending || loading || !input.trim()} onClick={send} className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"><Send size={18}/></button></div>
      <p className="mt-2 text-xs text-slate-500">Số liệu lấy từ tài khoản của bạn. Trợ lý chỉ trả lời, không tự lưu giao dịch.</p>
    </div>
  </aside>;
}
