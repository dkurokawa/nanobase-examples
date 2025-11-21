import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// API設定（環境変数で上書き可能）
const API_CONFIG = {
  easyauthUrl: import.meta.env.VITE_EASYAUTH_URL || 'http://localhost:3201',
  pocketdataUrl: import.meta.env.VITE_POCKETDATA_URL || 'http://localhost:3202',
  noticoUrl: import.meta.env.VITE_NOTICO_URL || 'http://localhost:3203',
  projectId: import.meta.env.VITE_PROJECT_ID || 'todo-app',
};

// ==========================================
// API クライアント（シンプル実装）
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
    return apiFetch(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },
  async update(collection: string, id: string, record: Record<string, unknown>) {
    return apiFetch(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(record),
    });
  },
  async delete(collection: string, id: string) {
    return apiFetch(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}/${id}`, {
      method: 'DELETE',
    });
  },
};

// Notico API (通知)
const notify = {
  async schedule(options: { userId: string; type: string; subject: string; message: string; scheduledAt: string }) {
    return apiFetch(`${API_CONFIG.noticoUrl}/api/v1/notifications/schedule`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
};

// ==========================================
// スタイル
// ==========================================
const styles = {
  container: { maxWidth: '600px', margin: '0 auto', padding: '20px' },
  header: { textAlign: 'center' as const, marginBottom: '30px' },
  card: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' },
  button: { padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSecondary: { padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonDanger: { padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  todoItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid #eee' },
  todoText: { flex: 1 },
  completed: { textDecoration: 'line-through', color: '#999' },
  checkbox: { width: '20px', height: '20px', cursor: 'pointer' },
  error: { color: 'red', marginBottom: '10px' },
  stats: { display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' },
  stat: { textAlign: 'center' as const },
};

// ==========================================
// コンポーネント
// ==========================================
interface Todo {
  id: string;
  data: { title: string; completed: boolean; dueDate?: string; userId: string; createdAt: string };
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

function TodoForm({ userId, onAdd }: { userId: string; onAdd: () => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const todoData: Record<string, unknown> = {
        title,
        completed: false,
        userId,
        createdAt: new Date().toISOString(),
      };
      if (dueDate) {
        todoData.dueDate = new Date(dueDate).toISOString();
        // リマインダーを設定（1日前）
        const reminderTime = new Date(new Date(dueDate).getTime() - 24 * 60 * 60 * 1000);
        if (reminderTime > new Date()) {
          await notify.schedule({
            userId,
            type: 'email',
            subject: 'タスクリマインダー',
            message: `「${title}」の期限が明日です`,
            scheduledAt: reminderTime.toISOString(),
          });
        }
      }

      const result = await data.create('todos', todoData);
      if (result.success) {
        setTitle('');
        setDueDate('');
        onAdd();
      }
    } catch (err) {
      console.error('Todo create error:', err);
    }
  };

  return (
    <div style={styles.card}>
      <h2>タスクを追加</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="タスク名"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="datetime-local"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>追加</button>
      </form>
    </div>
  );
}

function TodoList({ todos, onToggle, onDelete }: { todos: Todo[]; onToggle: (id: string, completed: boolean) => void; onDelete: (id: string) => void }) {
  if (todos.length === 0) return <p style={{ textAlign: 'center', color: '#666' }}>タスクがありません</p>;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div style={styles.card}>
      <h2>タスク一覧</h2>
      {todos.map(todo => (
        <div key={todo.id} style={styles.todoItem}>
          <input
            type="checkbox"
            checked={todo.data.completed}
            onChange={() => onToggle(todo.id, !todo.data.completed)}
            style={styles.checkbox}
          />
          <div style={{ ...styles.todoText, ...(todo.data.completed ? styles.completed : {}) }}>
            <div>{todo.data.title}</div>
            {todo.data.dueDate && (
              <small style={{ color: isOverdue(todo.data.dueDate) && !todo.data.completed ? 'red' : '#666' }}>
                期限: {formatDate(todo.data.dueDate)}
              </small>
            )}
          </div>
          <button onClick={() => onDelete(todo.id)} style={styles.buttonDanger}>削除</button>
        </div>
      ))}
    </div>
  );
}

function Stats({ todos }: { todos: Todo[] }) {
  const total = todos.length;
  const completed = todos.filter(t => t.data.completed).length;
  const pending = total - completed;

  return (
    <div style={styles.stats}>
      <div style={styles.stat}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{total}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>合計</div>
      </div>
      <div style={styles.stat}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{completed}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>完了</div>
      </div>
      <div style={styles.stat}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{pending}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>未完了</div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (auth.isLoggedIn()) {
        const result = await auth.me();
        if (result.success && result.data) {
          setUser(result.data);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (user) loadTodos();
  }, [user]);

  const loadTodos = async () => {
    const result = await data.list('todos');
    if (result.success && result.data) {
      const userTodos = result.data
        .filter((t: { id: string; data: Record<string, unknown> }) => t.data.userId === user?.id)
        .sort((a: { data: Record<string, unknown> }, b: { data: Record<string, unknown> }) =>
          new Date(b.data.createdAt as string).getTime() - new Date(a.data.createdAt as string).getTime()
        ) as Todo[];
      setTodos(userTodos);
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    const result = await data.update('todos', id, { completed });
    if (result.success) {
      loadTodos();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await data.delete('todos', id);
    if (result.success) {
      loadTodos();
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
    setTodos([]);
  };

  if (loading) return <div style={styles.container}>読み込み中...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Todo App</h1>
        <p>Nanobase APIを使ったサンプルアプリ</p>
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
        <>
          <Stats todos={todos} />
          <TodoForm userId={user.id} onAdd={loadTodos} />
          <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
