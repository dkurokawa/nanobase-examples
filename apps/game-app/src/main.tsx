import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// API設定
const API_CONFIG = {
  easyauthUrl: import.meta.env.VITE_EASYAUTH_URL || 'http://localhost:3201',
  pocketdataUrl: import.meta.env.VITE_POCKETDATA_URL || 'http://localhost:3202',
  monitorUrl: import.meta.env.VITE_MONITOR_URL || 'http://localhost:3204',
  projectId: import.meta.env.VITE_PROJECT_ID || 'game-app',
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
  async update(collection: string, id: string, record: Record<string, unknown>) {
    return apiFetch(`${API_CONFIG.pocketdataUrl}/api/v1/data/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(record),
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
  container: { maxWidth: '800px', margin: '0 auto', padding: '20px' },
  header: { textAlign: 'center' as const, marginBottom: '30px' },
  card: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' },
  button: { padding: '10px 20px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSecondary: { padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSuccess: { padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  gameArea: { textAlign: 'center' as const, padding: '40px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' },
  score: { fontSize: '48px', fontWeight: 'bold', color: '#0066cc' },
  clickButton: { padding: '30px 60px', fontSize: '24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', margin: '20px 0' },
  leaderboard: { listStyle: 'none', padding: 0 },
  leaderboardItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' },
  rank: { fontWeight: 'bold', width: '30px' },
  playerName: { flex: 1 },
  playerScore: { fontWeight: 'bold', color: '#0066cc' },
  tabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#e9ecef' },
  tabActive: { background: '#0066cc', color: 'white' },
  error: { color: 'red', marginBottom: '10px' },
};

// ==========================================
// コンポーネント
// ==========================================
interface LeaderboardEntry {
  id: string;
  data: { playerId: string; playerName: string; score: number; createdAt: string };
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
        trackEvent(isSignup ? 'player_signup' : 'player_login', { email });
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

function ClickerGame({ user }: { user: { id: string; email: string } }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');
  const [myBest, setMyBest] = useState(0);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  useEffect(() => {
    let timer: number;
    if (isPlaying && timeLeft > 0) {
      timer = window.setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      endGame();
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft]);

  const loadLeaderboard = async () => {
    const result = await data.list('leaderboard');
    if (result.success && result.data) {
      const sorted = (result.data as LeaderboardEntry[])
        .sort((a, b) => b.data.score - a.data.score)
        .slice(0, 10);
      setLeaderboard(sorted);

      // 自己ベスト取得
      const myScores = result.data.filter((e: { data: Record<string, unknown> }) => e.data.playerId === user.id);
      if (myScores.length > 0) {
        const best = Math.max(...myScores.map((e: { data: Record<string, unknown> }) => e.data.score as number));
        setMyBest(best);
      }
    }
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(10);
    setIsPlaying(true);
    trackEvent('game_started');
  };

  const endGame = async () => {
    setIsPlaying(false);

    // スコア送信
    const playerName = user.email.split('@')[0];
    await data.create('leaderboard', {
      playerId: user.id,
      playerName,
      score,
      createdAt: new Date().toISOString(),
    });

    trackEvent('game_ended', { score });

    if (score > myBest) {
      setMyBest(score);
      trackEvent('new_high_score', { score, previousBest: myBest });
    }

    loadLeaderboard();
  };

  const handleClick = () => {
    if (isPlaying) {
      setScore(s => s + 1);
    }
  };

  return (
    <>
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'game' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('game')}
        >
          ゲーム
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'leaderboard' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('leaderboard')}
        >
          ランキング
        </button>
      </div>

      {activeTab === 'game' && (
        <div style={styles.card}>
          <div style={styles.gameArea}>
            <h2>10秒クリッカー</h2>
            <p style={{ marginBottom: '20px' }}>10秒間で何回クリックできるか挑戦！</p>

            <div style={styles.score}>{score}</div>

            {isPlaying ? (
              <>
                <button onClick={handleClick} style={styles.clickButton}>
                  クリック！
                </button>
                <p style={{ fontSize: '24px' }}>残り {timeLeft} 秒</p>
              </>
            ) : (
              <>
                <button onClick={startGame} style={{ ...styles.clickButton, background: '#0066cc' }}>
                  スタート
                </button>
                {score > 0 && (
                  <p style={{ marginTop: '10px' }}>
                    {score > myBest ? '🎉 新記録！' : `スコア: ${score}`}
                  </p>
                )}
              </>
            )}

            {myBest > 0 && <p style={{ marginTop: '20px', color: '#666' }}>自己ベスト: {myBest}</p>}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div style={styles.card}>
          <h2>ランキング TOP 10</h2>
          {leaderboard.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>まだスコアがありません</p>
          ) : (
            <ul style={styles.leaderboard}>
              {leaderboard.map((entry, index) => (
                <li key={entry.id} style={{
                  ...styles.leaderboardItem,
                  ...(entry.data.playerId === user.id ? { background: '#e8f4ff' } : {}),
                }}>
                  <span style={styles.rank}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span style={styles.playerName}>{entry.data.playerName}</span>
                  <span style={styles.playerScore}>{entry.data.score}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={loadLeaderboard} style={{ ...styles.buttonSecondary, marginTop: '15px', width: '100%' }}>
            更新
          </button>
        </div>
      )}
    </>
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
    trackEvent('player_logout');
    await auth.logout();
    setUser(null);
  };

  if (loading) return <div style={styles.container}>読み込み中...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Game App</h1>
        <p>Nanobase APIを使ったゲームサンプル</p>
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
        <ClickerGame user={user} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
