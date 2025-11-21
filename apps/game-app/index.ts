/**
 * Game App Sample - nanobase実用例
 *
 * 使用API:
 * - EasyAuth: プレイヤー認証
 * - PocketData: セーブデータ・ランキング・実績
 * - Notico: 実績解除通知
 * - Monitor: プレイ統計追跡
 */

import { NanobaseClient } from '../todo-app/client';

// 型定義
interface Player {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

interface SaveData {
  id: string;
  playerId: string;
  slot: number;
  data: Record<string, any>;
  playtime: number;
  savedAt: string;
}

interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  category: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface Achievement {
  id: string;
  playerId: string;
  achievementId: string;
  unlockedAt: string;
}

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  secret?: boolean;
}

// ゲームアプリクライアント
export class GameApp {
  private client: NanobaseClient;
  private player: Player | null = null;

  constructor(apiKey: string) {
    this.client = new NanobaseClient(apiKey);
  }

  // 認証
  async signup(email: string, password: string, displayName: string): Promise<Player> {
    const result = await this.client.auth.signup(email, password);

    // プレイヤープロファイル作成
    await this.client.data.create('players', {
      id: result.user.id,
      email: result.user.email,
      displayName,
      createdAt: new Date().toISOString(),
    });

    this.player = {
      ...result.user,
      displayName,
      createdAt: new Date().toISOString(),
    };

    await this.trackEvent('player_registered');

    return this.player;
  }

  async login(email: string, password: string): Promise<Player> {
    const result = await this.client.auth.login(email, password);

    const profile = await this.client.data.findOne<Player>('players', {
      where: { id: result.user.id },
    });

    this.player = profile || {
      ...result.user,
      displayName: result.user.email.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    await this.trackEvent('player_login');

    return this.player;
  }

  // セーブデータ
  async saveGame(slot: number, data: Record<string, any>, playtime: number): Promise<SaveData> {
    if (!this.player) throw new Error('Not authenticated');

    const existing = await this.client.data.findOne<SaveData>('save_data', {
      where: { playerId: this.player.id, slot },
    });

    if (existing) {
      return this.client.data.update<SaveData>('save_data', existing.id, {
        data,
        playtime,
        savedAt: new Date().toISOString(),
      });
    }

    return this.client.data.create<SaveData>('save_data', {
      playerId: this.player.id,
      slot,
      data,
      playtime,
      savedAt: new Date().toISOString(),
    });
  }

  async loadGame(slot: number): Promise<SaveData | null> {
    if (!this.player) throw new Error('Not authenticated');

    return this.client.data.findOne<SaveData>('save_data', {
      where: { playerId: this.player.id, slot },
    });
  }

  async getSaveSlots(): Promise<SaveData[]> {
    if (!this.player) throw new Error('Not authenticated');

    return this.client.data.find<SaveData>('save_data', {
      where: { playerId: this.player.id },
      orderBy: { slot: 'asc' },
    });
  }

  async deleteSave(slot: number): Promise<void> {
    if (!this.player) throw new Error('Not authenticated');

    const save = await this.loadGame(slot);
    if (save) {
      await this.client.data.delete('save_data', save.id);
    }
  }

  // リーダーボード
  async submitScore(category: string, score: number, metadata?: Record<string, any>): Promise<LeaderboardEntry> {
    if (!this.player) throw new Error('Not authenticated');

    const entry = await this.client.data.create<LeaderboardEntry>('leaderboard', {
      playerId: this.player.id,
      playerName: this.player.displayName,
      score,
      category,
      metadata,
      createdAt: new Date().toISOString(),
    });

    await this.trackEvent('score_submitted', { category, score });

    // ハイスコア達成で実績チェック
    await this.checkScoreAchievements(category, score);

    return entry;
  }

  async getLeaderboard(category: string, limit: number = 100): Promise<LeaderboardEntry[]> {
    return this.client.data.find<LeaderboardEntry>('leaderboard', {
      where: { category },
      orderBy: { score: 'desc' },
      limit,
    });
  }

  async getMyRank(category: string): Promise<{ rank: number; score: number } | null> {
    if (!this.player) throw new Error('Not authenticated');

    const leaderboard = await this.getLeaderboard(category, 1000);
    const myIndex = leaderboard.findIndex(e => e.playerId === this.player!.id);

    if (myIndex === -1) return null;

    return {
      rank: myIndex + 1,
      score: leaderboard[myIndex].score,
    };
  }

  async getMyBestScore(category: string): Promise<number> {
    if (!this.player) throw new Error('Not authenticated');

    const entries = await this.client.data.find<LeaderboardEntry>('leaderboard', {
      where: { playerId: this.player.id, category },
      orderBy: { score: 'desc' },
      limit: 1,
    });

    return entries[0]?.score || 0;
  }

  // 実績
  async unlockAchievement(achievementId: string): Promise<Achievement | null> {
    if (!this.player) throw new Error('Not authenticated');

    // 既に解除済みか確認
    const existing = await this.client.data.findOne<Achievement>('achievements', {
      where: { playerId: this.player.id, achievementId },
    });

    if (existing) return null;

    const achievement = await this.client.data.create<Achievement>('achievements', {
      playerId: this.player.id,
      achievementId,
      unlockedAt: new Date().toISOString(),
    });

    // 通知送信
    const definition = await this.getAchievementDefinition(achievementId);
    if (definition) {
      await this.client.notify.send({
        userId: this.player.id,
        type: 'push',
        message: `実績解除！「${definition.name}」`,
        metadata: { achievementId, points: definition.points },
      });
    }

    await this.trackEvent('achievement_unlocked', { achievementId });

    return achievement;
  }

  async getUnlockedAchievements(): Promise<Achievement[]> {
    if (!this.player) throw new Error('Not authenticated');

    return this.client.data.find<Achievement>('achievements', {
      where: { playerId: this.player.id },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getAchievementProgress(): Promise<{ unlocked: number; total: number; points: number }> {
    const unlocked = await this.getUnlockedAchievements();
    const definitions = await this.getAllAchievementDefinitions();

    let points = 0;
    for (const unlock of unlocked) {
      const def = definitions.find(d => d.id === unlock.achievementId);
      if (def) points += def.points;
    }

    return {
      unlocked: unlocked.length,
      total: definitions.length,
      points,
    };
  }

  private async getAchievementDefinition(achievementId: string): Promise<AchievementDefinition | null> {
    return this.client.data.findOne<AchievementDefinition>('achievement_definitions', {
      where: { id: achievementId },
    });
  }

  private async getAllAchievementDefinitions(): Promise<AchievementDefinition[]> {
    return this.client.data.find<AchievementDefinition>('achievement_definitions', {});
  }

  private async checkScoreAchievements(category: string, score: number): Promise<void> {
    // スコアに基づく実績チェック
    if (score >= 10000) {
      await this.unlockAchievement(`${category}_master`);
    } else if (score >= 5000) {
      await this.unlockAchievement(`${category}_expert`);
    } else if (score >= 1000) {
      await this.unlockAchievement(`${category}_novice`);
    }
  }

  // イベント追跡
  private async trackEvent(event: string, properties?: Record<string, any>): Promise<void> {
    await this.client.monitor.track(event, {
      playerId: this.player?.id,
      ...properties,
    });
  }

  // プレイ時間更新
  async updatePlaytime(seconds: number): Promise<void> {
    if (!this.player) return;

    await this.trackEvent('playtime_update', { seconds });

    // プレイ時間実績
    const totalMinutes = seconds / 60;
    if (totalMinutes >= 60) {
      await this.unlockAchievement('playtime_1h');
    }
    if (totalMinutes >= 600) {
      await this.unlockAchievement('playtime_10h');
    }
  }
}

// 使用例
export async function gameAppExample() {
  const app = new GameApp('your-api-key');

  // サインアップ
  await app.signup('gamer@example.com', 'password123', 'ProGamer');

  // セーブ
  await app.saveGame(1, {
    level: 5,
    hp: 100,
    inventory: ['sword', 'shield'],
  }, 3600);

  // ロード
  const save = await app.loadGame(1);
  console.log('Save:', save);

  // スコア送信
  await app.submitScore('arcade', 5500);

  // ランキング取得
  const leaderboard = await app.getLeaderboard('arcade', 10);
  console.log('Leaderboard:', leaderboard);

  // 実績確認
  const progress = await app.getAchievementProgress();
  console.log('Achievements:', progress);
}
