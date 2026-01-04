import { appStorage } from './storage';
import { api } from './api';

/**
 * Sync Queue Item
 */
interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: 'habit' | 'execution' | 'plan';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

/**
 * Basic Offline Sync Service
 * Note: For a full implementation, consider using WatermelonDB
 */
class SyncService {
  private isSyncing: boolean = false;
  private onlineStatus: boolean = true;

  /**
   * Initialize sync service
   */
  initialize(): void {
    // In a real app, you'd listen to network status changes
    this.checkConnectivity();
  }

  /**
   * Check network connectivity
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      this.onlineStatus = true;
      return true;
    } catch {
      this.onlineStatus = false;
      return false;
    }
  }

  /**
   * Get current online status
   */
  isOnline(): boolean {
    return this.onlineStatus;
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queue = await this.getQueue();
    
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    queue.push(newItem);
    await this.saveQueue(queue);
  }

  /**
   * Get sync queue
   */
  async getQueue(): Promise<SyncQueueItem[]> {
    const queue = await appStorage.getItem<SyncQueueItem[]>(SYNC_QUEUE_KEY);
    return queue || [];
  }

  /**
   * Save sync queue
   */
  private async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    await appStorage.setItem(SYNC_QUEUE_KEY, queue);
  }

  /**
   * Remove item from queue
   */
  private async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filteredQueue = queue.filter((item) => item.id !== id);
    await this.saveQueue(filteredQueue);
  }

  /**
   * Update item retry count
   */
  private async updateRetryCount(id: string): Promise<void> {
    const queue = await this.getQueue();
    const item = queue.find((i) => i.id === id);
    if (item) {
      item.retryCount++;
      await this.saveQueue(queue);
    }
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.onlineStatus) {
      await this.checkConnectivity();
      if (!this.onlineStatus) return;
    }

    this.isSyncing = true;
    const queue = await this.getQueue();

    for (const item of queue) {
      if (item.retryCount >= MAX_RETRIES) {
        // Remove failed items after max retries
        await this.removeFromQueue(item.id);
        continue;
      }

      try {
        await this.syncItem(item);
        await this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Sync error:', error);
        await this.updateRetryCount(item.id);
      }
    }

    this.isSyncing = false;
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, resource, data } = item;

    switch (resource) {
      case 'habit':
        await this.syncHabit(type, data);
        break;
      case 'execution':
        await this.syncExecution(type, data);
        break;
      case 'plan':
        await this.syncPlan(type, data);
        break;
    }
  }

  /**
   * Sync habit
   */
  private async syncHabit(type: SyncQueueItem['type'], data: unknown): Promise<void> {
    switch (type) {
      case 'create':
        await api.post('/habits', data);
        break;
      case 'update':
        const updateData = data as { id: string; data: unknown };
        await api.patch(`/habits/${updateData.id}`, updateData.data);
        break;
      case 'delete':
        await api.delete(`/habits/${data}`);
        break;
    }
  }

  /**
   * Sync execution
   */
  private async syncExecution(type: SyncQueueItem['type'], data: unknown): Promise<void> {
    const execData = data as { executionId: string; habitId?: string; action: string; payload?: unknown };
    
    switch (execData.action) {
      case 'complete_habit':
        await api.post(
          `/executions/${execData.executionId}/habits/${execData.habitId}/complete`,
          execData.payload
        );
        break;
      case 'uncomplete_habit':
        await api.post(
          `/executions/${execData.executionId}/habits/${execData.habitId}/uncomplete`
        );
        break;
      case 'add_reflection':
        await api.post(
          `/executions/${execData.executionId}/reflection`,
          execData.payload
        );
        break;
    }
  }

  /**
   * Sync plan
   */
  private async syncPlan(type: SyncQueueItem['type'], data: unknown): Promise<void> {
    switch (type) {
      case 'create':
        await api.post('/plans', data);
        break;
      case 'update':
        const updateData = data as { id: string; data: unknown };
        await api.patch(`/plans/${updateData.id}`, updateData.data);
        break;
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  }
}

export const syncService = new SyncService();
