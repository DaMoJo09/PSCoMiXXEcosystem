const DB_NAME = 'pressstart-offline';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_QUEUE = 'syncQueue';

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
  tx.objectStore(STORE_QUEUE).add(action);
  db.close();

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

export async function syncPendingChanges(): Promise<{ synced: number; failed: number }> {
  const db = await openDB();
  const tx = db.transaction(STORE_QUEUE, 'readonly');
  const items = await promisifyRequest(tx.objectStore(STORE_QUEUE).getAll());
  
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: 'include',
      });
      const deleteTx = db.transaction(STORE_QUEUE, 'readwrite');
      deleteTx.objectStore(STORE_QUEUE).delete(item.id);
      synced++;
    } catch {
      failed++;
      break;
    }
  }

  db.close();
  return { synced, failed };
}
