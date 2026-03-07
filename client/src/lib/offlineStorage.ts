const DB_NAME = 'pressstart-offline';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_QUEUE = 'syncQueue';
const STORE_META = 'syncMeta';

const LAST_SYNC_KEY = 'pressstart-last-sync';
const SYNC_INTERVAL = 30000;

let backgroundSyncTimer: ReturnType<typeof setInterval> | null = null;
let syncListeners: Array<(status: SyncStatus) => void> = [];

export interface SyncStatus {
  pendingCount: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

export interface ConflictInfo {
  projectId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
}

let currentSyncStatus: SyncStatus = {
  pendingCount: 0,
  lastSyncTime: null,
  isSyncing: false,
};

function notifyListeners() {
  for (const listener of syncListeners) {
    listener({ ...currentSyncStatus });
  }
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener);
  listener({ ...currentSyncStatus });
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectOffline(project: any): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, 'readwrite');
  tx.objectStore(STORE_PROJECTS).put({
    ...project,
    offlineSavedAt: Date.now(),
    needsSync: true,
  });
  db.close();
  await updatePendingCount();
}

export async function getOfflineProject(id: string): Promise<any | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, 'readonly');
  const result = await promisifyRequest(tx.objectStore(STORE_PROJECTS).get(id));
  db.close();
  return result || null;
}

export async function getAllOfflineProjects(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, 'readonly');
  const result = await promisifyRequest(tx.objectStore(STORE_PROJECTS).getAll());
  db.close();
  return result || [];
}

export async function deleteOfflineProject(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, 'readwrite');
  tx.objectStore(STORE_PROJECTS).delete(id);
  db.close();
}

export async function queueOfflineAction(action: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_QUEUE, 'readwrite');
  tx.objectStore(STORE_QUEUE).add({ ...action, queuedAt: Date.now() });
  db.close();

  await updatePendingCount();

  if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as any).sync.register('sync-projects');
  }
}

export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const result = await promisifyRequest(tx.objectStore(STORE_QUEUE).count());
    db.close();
    return result;
  } catch {
    return 0;
  }
}

async function updatePendingCount() {
  const count = await getPendingSyncCount();
  currentSyncStatus.pendingCount = count;
  notifyListeners();
}

export function getLastSyncTime(): number | null {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored, 10) : null;
}

function setLastSyncTime(time: number) {
  localStorage.setItem(LAST_SYNC_KEY, String(time));
  currentSyncStatus.lastSyncTime = time;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export async function detectConflict(projectId: string, serverData: any): Promise<ConflictInfo | null> {
  const localProject = await getOfflineProject(projectId);
  if (!localProject || !localProject.needsSync) return null;

  const localTimestamp = localProject.offlineSavedAt || 0;
  const serverTimestamp = serverData?.updatedAt
    ? new Date(serverData.updatedAt).getTime()
    : 0;

  if (localTimestamp > 0 && serverTimestamp > 0 && serverTimestamp > localTimestamp) {
    return {
      projectId,
      localData: localProject,
      serverData,
      localTimestamp,
      serverTimestamp,
    };
  }
  return null;
}

export async function resolveConflict(
  projectId: string,
  resolution: 'keep-local' | 'keep-server' | 'keep-both'
): Promise<any> {
  const localProject = await getOfflineProject(projectId);
  if (!localProject) return null;

  if (resolution === 'keep-server') {
    await deleteOfflineProject(projectId);
    return null;
  }

  if (resolution === 'keep-local') {
    return localProject;
  }

  if (resolution === 'keep-both') {
    const duplicate = {
      ...localProject,
      id: `${projectId}-local-${Date.now()}`,
      title: `${localProject.title || 'Untitled'} (Local Copy)`,
      needsSync: true,
    };
    await saveProjectOffline(duplicate);
    await deleteOfflineProject(projectId);
    return duplicate;
  }

  return null;
}

export async function syncPendingChanges(): Promise<{ synced: number; failed: number; conflicts: ConflictInfo[] }> {
  if (currentSyncStatus.isSyncing) return { synced: 0, failed: 0, conflicts: [] };

  currentSyncStatus.isSyncing = true;
  notifyListeners();

  const conflicts: ConflictInfo[] = [];
  const db = await openDB();
  const tx = db.transaction(STORE_QUEUE, 'readonly');
  const items = await promisifyRequest(tx.objectStore(STORE_QUEUE).getAll());
  
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: 'include',
      });

      if (response.ok) {
        const deleteTx = db.transaction(STORE_QUEUE, 'readwrite');
        deleteTx.objectStore(STORE_QUEUE).delete(item.id);
        synced++;
      } else if (response.status === 409) {
        const serverData = await response.json().catch(() => null);
        const bodyData = JSON.parse(item.body || '{}');
        const projectId = item.url.match(/\/api\/projects\/(\d+)/)?.[1];
        if (projectId) {
          conflicts.push({
            projectId,
            localData: bodyData,
            serverData,
            localTimestamp: item.queuedAt || Date.now(),
            serverTimestamp: serverData?.updatedAt ? new Date(serverData.updatedAt).getTime() : Date.now(),
          });
        }
        const deleteTx = db.transaction(STORE_QUEUE, 'readwrite');
        deleteTx.objectStore(STORE_QUEUE).delete(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
      break;
    }
  }

  db.close();

  if (synced > 0) {
    setLastSyncTime(Date.now());
  }

  currentSyncStatus.isSyncing = false;
  await updatePendingCount();

  return { synced, failed, conflicts };
}

export function startBackgroundSync(): () => void {
  if (backgroundSyncTimer) return () => {};

  currentSyncStatus.lastSyncTime = getLastSyncTime();
  updatePendingCount();

  backgroundSyncTimer = setInterval(async () => {
    if (!navigator.onLine) return;
    const count = await getPendingSyncCount();
    if (count > 0) {
      await syncPendingChanges();
    }
  }, SYNC_INTERVAL);

  const cleanupOnline = onOnlineStatusChange(async (online) => {
    if (online) {
      await syncPendingChanges();
    }
  });

  return () => {
    if (backgroundSyncTimer) {
      clearInterval(backgroundSyncTimer);
      backgroundSyncTimer = null;
    }
    cleanupOnline();
  };
}

export async function saveProjectWithOfflineFallback(
  projectId: string | number,
  data: { title: string; data: any },
  type: string = 'comic'
): Promise<boolean> {
  const url = `/api/projects/${projectId}/autosave`;
  const body = JSON.stringify(data);
  const headers = { 'Content-Type': 'application/json' };

  if (navigator.onLine) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body,
      });
      if (response.ok) {
        setLastSyncTime(Date.now());
        currentSyncStatus.lastSyncTime = Date.now();
        notifyListeners();
        return true;
      }
      throw new Error('Server error');
    } catch {
      await saveProjectOffline({
        id: String(projectId),
        type,
        ...data,
      });
      await queueOfflineAction({ url, method: 'POST', headers, body });
      return false;
    }
  } else {
    await saveProjectOffline({
      id: String(projectId),
      type,
      ...data,
    });
    await queueOfflineAction({ url, method: 'POST', headers, body });
    return false;
  }
}
