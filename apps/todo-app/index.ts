/**
 * Todo App Sample - nanobase実用例
 *
 * 使用API:
 * - EasyAuth: ユーザー認証
 * - PocketData: タスクデータ管理
 * - Notico: 期限リマインダー通知
 */

import { NanobaseClient } from './client';

// 型定義
interface Todo {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
}

// Todoアプリクライアント
export class TodoApp {
  private client: NanobaseClient;
  private user: User | null = null;

  constructor(apiKey: string) {
    this.client = new NanobaseClient(apiKey);
  }

  // 認証
  async signup(email: string, password: string): Promise<User> {
    const result = await this.client.auth.signup(email, password);
    this.user = result.user;
    return result.user;
  }

  async login(email: string, password: string): Promise<User> {
    const result = await this.client.auth.login(email, password);
    this.user = result.user;
    return result.user;
  }

  async logout(): Promise<void> {
    await this.client.auth.logout();
    this.user = null;
  }

  // Todo操作
  async createTodo(title: string, dueDate?: string): Promise<Todo> {
    if (!this.user) throw new Error('Not authenticated');

    const todo = await this.client.data.create<Todo>('todos', {
      userId: this.user.id,
      title,
      completed: false,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 期限付きの場合、リマインダーを設定
    if (dueDate) {
      await this.scheduleReminder(todo);
    }

    return todo;
  }

  async getTodos(): Promise<Todo[]> {
    if (!this.user) throw new Error('Not authenticated');

    return this.client.data.find<Todo>('todos', {
      where: { userId: this.user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodo(id: string): Promise<Todo | null> {
    if (!this.user) throw new Error('Not authenticated');

    return this.client.data.findOne<Todo>('todos', {
      where: { id, userId: this.user.id },
    });
  }

  async updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'completed' | 'dueDate'>>): Promise<Todo> {
    if (!this.user) throw new Error('Not authenticated');

    const todo = await this.client.data.update<Todo>('todos', id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    // 期限が更新された場合、リマインダーを再設定
    if (updates.dueDate) {
      await this.scheduleReminder(todo);
    }

    return todo;
  }

  async deleteTodo(id: string): Promise<void> {
    if (!this.user) throw new Error('Not authenticated');

    await this.client.data.delete('todos', id);
  }

  async completeTodo(id: string): Promise<Todo> {
    return this.updateTodo(id, { completed: true });
  }

  // 統計
  async getStats(): Promise<{ total: number; completed: number; pending: number }> {
    const todos = await this.getTodos();
    const completed = todos.filter(t => t.completed).length;

    return {
      total: todos.length,
      completed,
      pending: todos.length - completed,
    };
  }

  // 期限切れ取得
  async getOverdueTodos(): Promise<Todo[]> {
    const todos = await this.getTodos();
    const now = new Date().toISOString();

    return todos.filter(t =>
      !t.completed &&
      t.dueDate &&
      t.dueDate < now
    );
  }

  // リマインダー設定
  private async scheduleReminder(todo: Todo): Promise<void> {
    if (!todo.dueDate || !this.user) return;

    const dueDate = new Date(todo.dueDate);
    const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000); // 1日前

    if (reminderTime > new Date()) {
      await this.client.notify.schedule({
        userId: this.user.id,
        type: 'email',
        subject: 'タスクリマインダー',
        message: `「${todo.title}」の期限が明日です`,
        scheduledAt: reminderTime.toISOString(),
        metadata: { todoId: todo.id },
      });
    }
  }
}

// 使用例
export async function todoAppExample() {
  const app = new TodoApp('your-api-key');

  // サインアップ
  await app.signup('user@example.com', 'password123');

  // Todo作成
  const todo1 = await app.createTodo('買い物リストを作る');
  const todo2 = await app.createTodo('レポート提出', '2024-12-31T23:59:59Z');

  // 一覧取得
  const todos = await app.getTodos();
  console.log('Todos:', todos);

  // 完了
  await app.completeTodo(todo1.id);

  // 統計
  const stats = await app.getStats();
  console.log('Stats:', stats);

  // 期限切れ確認
  const overdue = await app.getOverdueTodos();
  console.log('Overdue:', overdue);
}
