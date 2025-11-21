import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// API設定
const API_CONFIG = {
  easyauthUrl: import.meta.env.VITE_EASYAUTH_URL || 'http://localhost:3201',
  pocketdataUrl: import.meta.env.VITE_POCKETDATA_URL || 'http://localhost:3202',
  noticoUrl: import.meta.env.VITE_NOTICO_URL || 'http://localhost:3203',
  monitorUrl: import.meta.env.VITE_MONITOR_URL || 'http://localhost:3204',
  projectId: import.meta.env.VITE_PROJECT_ID || 'chat-app',
};

// ==========================================
// API クライアント
// ==========================================
const TOKEN_KEY = 'nanobase_token';

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: { message: string } }> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Project-Id': API_CONFIG.projectId,
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  return response.json();
}

// Auth API
const auth = {
  async signup(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: { id: string; email: string } }>(
      `${API_CONFIG.easyauthUrl}/api/v1/auth/signup-email`,
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    if (result.success && result.data) localStorage.setItem(TOKEN_KEY, result.data.token);
    return result;
  },
  async login(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: { id: string; email: string } }>(
      `${API_CONFIG.easyauthUrl}/api/v1/auth/login-email`,
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    if (result.success && result.data) localStorage.setItem(TOKEN_KEY, result.data.token);
    return result;
  },
  async me() {
    return apiFetch<{ id: string; email: string }>(`${API_CONFIG.easyauthUrl}/api/v1/auth/me`);
  },
  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    await apiFetch(`${API_CONFIG.easyauthUrl}/api/v1/auth/logout`, { method: 'POST' });
  },
  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

// Data API
const data = {
  async list(collection: string) {
    return apiFetch<Array<{ id: string; data: Record<string, unknown> }>>(
      `${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}`
    );
  },
  async create(collection: string, record: Record<string, unknown>) {
    return apiFetch<{ id: string; data: Record<string, unknown> }>(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },
  async delete(collection: string, id: string) {
    return apiFetch(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}/${id}`, {
      method: 'DELETE',
    });
  },
};

// Monitor API
function trackEvent(name: string, properties?: Record<string, unknown>) {
  apiFetch(`${API_CONFIG.monitorUrl}/api/v1/log/event`, {
    method: 'POST',
    body: JSON.stringify({ name, properties }),
  }).catch(console.error);
}

// ==========================================
// スタイル
// ==========================================
const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' as const },
  header: { textAlign: 'center' as const, marginBottom: '20px' },
  card: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' },
  button: { padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSecondary: { padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  chatContainer: { flex: 1, display: 'flex', flexDirection: 'column' as const, background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' },
  messages: { flex: 1, overflow: 'auto', padding: '20px' },
  message: { marginBottom: '15px', maxWidth: '70%' },
  messageOwn: { marginLeft: 'auto', textAlign: 'right' as const },
  messageBubble: { display: 'inline-block', padding: '10px 15px', borderRadius: '18px', background: '#f0f0f0' },
  messageBubbleOwn: { background: '#0066cc', color: 'white' },
  messageTime: { fontSize: '11px', color: '#999', marginTop: '4px' },
  inputArea: { display: 'flex', gap: '10px', padding: '15px', borderTop: '1px solid #eee' },
  messageInput: { flex: 1, padding: '10px 15px', border: '1px solid #ddd', borderRadius: '20px', fontSize: '16px' },
  sendButton: { padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' },
  error: { color: 'red', marginBottom: '10px' },
  roomInfo: { padding: '15px', borderBottom: '1px solid #eee', background: '#f8f9fa' },
};

// ==========================================
// コンポーネント
// ==========================================
interface Message {
  id: string;
  data: { content: string; userId: string; userEmail: string; roomId: string; createdAt: string };
}

function AuthForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = isSignup ? await auth.signup(email, password) : await auth.login(email, password);
      if (result.success) {
        trackEvent(isSignup ? 'user_signup' : 'user_login', { email });
        onLogin();
      } else {
        setError(result.error?.message || 'エラーが発生しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  return (
    <div style={styles.card}>
      <h2>{isSignup ? '新規登録' : 'ログイン'}</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
        <input type="password" placeholder="パスワード（8文字以上）" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
        <button type="submit" style={styles.button}>{isSignup ? '登録' : 'ログイン'}</button>
      </form>
      <p style={{ marginTop: '10px', textAlign: 'center' }}>
        <button onClick={() => setIsSignup(!isSignup)} style={{ ...styles.buttonSecondary, background: 'transparent', color: '#0066cc' }}>
          {isSignup ? 'ログインはこちら' : '新規登録はこちら'}
        </button>
      </p>
    </div>
  );
}

function ChatRoom({ user }: { user: { id: string; email: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomId = 'general'; // 簡略化: 単一のパブリックルーム

  useEffect(() => {
    loadMessages();
    // ポーリングで新着メッセージを取得
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const result = await data.list('messages');
    if (result.success && result.data) {
      const roomMessages = result.data
        .filter((m: { data: Record<string, unknown> }) => m.data.roomId === roomId)
        .sort((a: { data: Record<string, unknown> }, b: { data: Record<string, unknown> }) =>
          new Date(a.data.createdAt as string).getTime() - new Date(b.data.createdAt as string).getTime()
        ) as Message[];
      setMessages(roomMessages);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const result = await data.create('messages', {
      content: newMessage,
      userId: user.id,
      userEmail: user.email,
      roomId,
      createdAt: new Date().toISOString(),
    });

    if (result.success) {
      trackEvent('message_sent', { roomId });
      setNewMessage('');
      loadMessages();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.roomInfo}>
        <strong>General</strong> - パブリックチャットルーム
      </div>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999' }}>メッセージがありません。最初のメッセージを送信しましょう！</p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.data.userId === user.id ? styles.messageOwn : {}),
            }}
          >
            {msg.data.userId !== user.id && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                {msg.data.userEmail.split('@')[0]}
              </div>
            )}
            <div
              style={{
                ...styles.messageBubble,
                ...(msg.data.userId === user.id ? styles.messageBubbleOwn : {}),
              }}
            >
              {msg.data.content}
            </div>
            <div style={styles.messageTime}>{formatTime(msg.data.createdAt)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={styles.inputArea}>
        <input
          type="text"
          placeholder="メッセージを入力..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          style={styles.messageInput}
        />
        <button type="submit" style={styles.sendButton}>送信</button>
      </form>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (auth.isLoggedIn()) {
        const result = await auth.me();
        if (result.success && result.data) {
          setUser(result.data);
          trackEvent('app_loaded', { userId: result.data.id });
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    trackEvent('user_logout');
    await auth.logout();
    setUser(null);
  };

  if (loading) return <div style={styles.container}>読み込み中...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Chat App</h1>
        <p>Nanobase APIを使ったリアルタイムチャット</p>
        {user && (
          <p style={{ marginTop: '10px' }}>
            {user.email} でログイン中
            <button onClick={handleLogout} style={{ ...styles.buttonSecondary, marginLeft: '10px' }}>ログアウト</button>
          </p>
        )}
      </header>
      {!user ? (
        <AuthForm onLogin={async () => {
          const result = await auth.me();
          if (result.success && result.data) setUser(result.data);
        }} />
      ) : (
        <ChatRoom user={user} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
