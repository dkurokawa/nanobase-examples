import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// API設定（環境変数で上書き可能）
const API_CONFIG = {
  easyauthUrl: import.meta.env.VITE_EASYAUTH_URL || 'http://localhost:3201',
  pocketdataUrl: import.meta.env.VITE_POCKETDATA_URL || 'http://localhost:3202',
  monitorUrl: import.meta.env.VITE_MONITOR_URL || 'http://localhost:3204',
  projectId: import.meta.env.VITE_PROJECT_ID || 'recipes-app',
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
  async delete(collection: string, id: string) {
    return apiFetch(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}/${id}`, {
      method: 'DELETE',
    });
  },
};

// Monitor API
function logEvent(name: string, properties?: Record<string, unknown>) {
  apiFetch(`${API_CONFIG.monitorUrl}/api/v1/log/event`, {
    method: 'POST',
    body: JSON.stringify({ name, properties }),
  }).catch(console.error);
}

function logError(err: Error | string, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : err;
  apiFetch(`${API_CONFIG.monitorUrl}/api/v1/log/error`, {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  }).catch(console.error);
}

// ==========================================
// スタイル
// ==========================================
const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '20px' },
  header: { textAlign: 'center' as const, marginBottom: '30px' },
  card: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' },
  textarea: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', minHeight: '100px' },
  button: { padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSecondary: { padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  recipeItem: { borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' },
  recipeTitle: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' },
  error: { color: 'red', marginBottom: '10px' },
};

// ==========================================
// コンポーネント
// ==========================================
interface Recipe {
  id: string;
  data: { title: string; ingredients: string; instructions: string; userId: string };
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
        logEvent(isSignup ? 'user_signup' : 'user_login', { email });
        onLogin();
      } else {
        setError(result.error?.message || 'エラーが発生しました');
        logError(result.error?.message || 'Auth error', { email, isSignup });
      }
    } catch (err) {
      setError('通信エラーが発生しました');
      logError(err as Error, { context: 'auth_form' });
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

function RecipeForm({ userId, onAdd }: { userId: string; onAdd: () => void }) {
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await data.create('recipes', { title, ingredients, instructions, userId });
      if (result.success) {
        logEvent('recipe_created', { title });
        setTitle(''); setIngredients(''); setInstructions('');
        onAdd();
      }
    } catch (err) {
      logError(err as Error, { context: 'recipe_create' });
    }
  };

  return (
    <div style={styles.card}>
      <h2>📝 レシピを追加</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input type="text" placeholder="レシピ名" value={title} onChange={e => setTitle(e.target.value)} style={styles.input} required />
        <textarea placeholder="材料（1行に1つ）" value={ingredients} onChange={e => setIngredients(e.target.value)} style={styles.textarea} required />
        <textarea placeholder="作り方" value={instructions} onChange={e => setInstructions(e.target.value)} style={styles.textarea} required />
        <button type="submit" style={styles.button}>追加</button>
      </form>
    </div>
  );
}

function RecipeList({ recipes, onDelete }: { recipes: Recipe[]; onDelete: (id: string) => void }) {
  if (recipes.length === 0) return <p style={{ textAlign: 'center', color: '#666' }}>まだレシピがありません</p>;

  return (
    <div style={styles.card}>
      <h2>📚 マイレシピ</h2>
      {recipes.map(recipe => (
        <div key={recipe.id} style={styles.recipeItem}>
          <div style={styles.recipeTitle}>{recipe.data.title}</div>
          <p><strong>材料:</strong></p>
          <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '14px' }}>{recipe.data.ingredients}</pre>
          <p><strong>作り方:</strong></p>
          <p>{recipe.data.instructions}</p>
          <button onClick={() => onDelete(recipe.id)} style={{ ...styles.buttonSecondary, marginTop: '10px' }}>削除</button>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (auth.isLoggedIn()) {
        const result = await auth.me();
        if (result.success && result.data) {
          setUser(result.data);
          logEvent('app_loaded', { userId: result.data.id });
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (user) loadRecipes();
  }, [user]);

  const loadRecipes = async () => {
    const result = await data.list('recipes');
    if (result.success && result.data) {
      setRecipes(result.data.filter((r: any) => r.data.userId === user?.id) as Recipe[]);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await data.delete('recipes', id);
    if (result.success) {
      logEvent('recipe_deleted', { recipeId: id });
      loadRecipes();
    }
  };

  const handleLogout = async () => {
    logEvent('user_logout');
    await auth.logout();
    setUser(null);
    setRecipes([]);
  };

  if (loading) return <div style={styles.container}>読み込み中...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>🍳 マイレシピ帳</h1>
        <p>Kickstart APIを使ったサンプルアプリ</p>
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
          <RecipeForm userId={user.id} onAdd={loadRecipes} />
          <RecipeList recipes={recipes} onDelete={handleDelete} />
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
