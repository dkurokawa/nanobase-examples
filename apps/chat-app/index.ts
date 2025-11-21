/**
 * Chat App Sample - nanobase実用例
 *
 * 使用API:
 * - EasyAuth: ユーザー認証
 * - PocketData: メッセージ・ルーム管理
 * - Notico: メッセージ通知
 * - Monitor: オンライン状態追跡
 */

import { NanobaseClient } from '../todo-app/client';

// 型定義
interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  members: string[];
  createdAt: string;
  lastMessageAt: string;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  readBy: string[];
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  displayName?: string;
  lastSeenAt?: string;
}

// チャットアプリクライアント
export class ChatApp {
  private client: NanobaseClient;
  private user: User | null = null;

  constructor(apiKey: string) {
    this.client = new NanobaseClient(apiKey);
  }

  // 認証
  async login(email: string, password: string): Promise<User> {
    const result = await this.client.auth.login(email, password);
    this.user = result.user;
    await this.updatePresence();
    return result.user;
  }

  async logout(): Promise<void> {
    await this.client.auth.logout();
    this.user = null;
  }

  // プレゼンス更新
  private async updatePresence(): Promise<void> {
    if (!this.user) return;

    await this.client.monitor.track('user_online', {
      userId: this.user.id,
      timestamp: new Date().toISOString(),
    });
  }

  // ルーム操作
  async createDirectRoom(otherUserId: string): Promise<ChatRoom> {
    if (!this.user) throw new Error('Not authenticated');

    // 既存のダイレクトルームを確認
    const existing = await this.client.data.find<ChatRoom>('chat_rooms', {
      where: {
        type: 'direct',
        members: [this.user.id, otherUserId].sort(),
      },
    });

    if (existing.length > 0) {
      return existing[0];
    }

    return this.client.data.create<ChatRoom>('chat_rooms', {
      name: '',
      type: 'direct',
      members: [this.user.id, otherUserId].sort(),
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    });
  }

  async createGroupRoom(name: string, memberIds: string[]): Promise<ChatRoom> {
    if (!this.user) throw new Error('Not authenticated');

    const members = [...new Set([this.user.id, ...memberIds])];

    return this.client.data.create<ChatRoom>('chat_rooms', {
      name,
      type: 'group',
      members,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    });
  }

  async getRooms(): Promise<ChatRoom[]> {
    if (!this.user) throw new Error('Not authenticated');

    return this.client.data.find<ChatRoom>('chat_rooms', {
      where: { members: { $contains: this.user.id } },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.user) throw new Error('Not authenticated');

    const room = await this.client.data.findOne<ChatRoom>('chat_rooms', {
      where: { id: roomId },
    });

    if (!room) throw new Error('Room not found');

    const updatedMembers = room.members.filter(id => id !== this.user!.id);

    if (updatedMembers.length === 0) {
      await this.client.data.delete('chat_rooms', roomId);
    } else {
      await this.client.data.update('chat_rooms', roomId, {
        members: updatedMembers,
      });
    }
  }

  // メッセージ操作
  async sendMessage(roomId: string, content: string, type: 'text' | 'image' | 'file' = 'text'): Promise<Message> {
    if (!this.user) throw new Error('Not authenticated');

    const message = await this.client.data.create<Message>('messages', {
      roomId,
      userId: this.user.id,
      content,
      type,
      readBy: [this.user.id],
      createdAt: new Date().toISOString(),
    });

    // ルームの最終メッセージ時刻を更新
    await this.client.data.update('chat_rooms', roomId, {
      lastMessageAt: message.createdAt,
    });

    // 他のメンバーに通知
    await this.notifyMembers(roomId, message);

    return message;
  }

  async getMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    if (!this.user) throw new Error('Not authenticated');

    const messages = await this.client.data.find<Message>('messages', {
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      limit,
    });

    return messages.reverse();
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    if (!this.user) throw new Error('Not authenticated');

    for (const messageId of messageIds) {
      const message = await this.client.data.findOne<Message>('messages', {
        where: { id: messageId },
      });

      if (message && !message.readBy.includes(this.user.id)) {
        await this.client.data.update('messages', messageId, {
          readBy: [...message.readBy, this.user.id],
        });
      }
    }
  }

  // 通知
  private async notifyMembers(roomId: string, message: Message): Promise<void> {
    const room = await this.client.data.findOne<ChatRoom>('chat_rooms', {
      where: { id: roomId },
    });

    if (!room) return;

    const otherMembers = room.members.filter(id => id !== this.user!.id);

    for (const memberId of otherMembers) {
      await this.client.notify.send({
        userId: memberId,
        type: 'push',
        message: `新しいメッセージ: ${message.content.substring(0, 50)}`,
        metadata: {
          roomId,
          messageId: message.id,
          senderId: this.user!.id,
        },
      });
    }
  }

  // 未読数
  async getUnreadCount(roomId?: string): Promise<number> {
    if (!this.user) throw new Error('Not authenticated');

    const query: Record<string, any> = {
      readBy: { $not: { $contains: this.user.id } },
    };

    if (roomId) {
      query.roomId = roomId;
    }

    const messages = await this.client.data.find<Message>('messages', {
      where: query,
    });

    return messages.length;
  }

  // オンラインユーザー取得（簡易版）
  async getOnlineUsers(roomId: string): Promise<string[]> {
    // 実際の実装ではMonitor APIを使用
    const room = await this.client.data.findOne<ChatRoom>('chat_rooms', {
      where: { id: roomId },
    });

    return room?.members || [];
  }
}

// 使用例
export async function chatAppExample() {
  const app = new ChatApp('your-api-key');

  // ログイン
  await app.login('user1@example.com', 'password123');

  // グループルーム作成
  const room = await app.createGroupRoom('開発チーム', ['user2', 'user3']);

  // メッセージ送信
  await app.sendMessage(room.id, 'こんにちは！');

  // メッセージ取得
  const messages = await app.getMessages(room.id);
  console.log('Messages:', messages);

  // 未読数
  const unread = await app.getUnreadCount();
  console.log('Unread:', unread);
}
