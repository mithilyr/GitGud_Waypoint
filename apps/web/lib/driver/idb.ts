// Tiny IndexedDB wrapper for the driver's offline store: a key-value table (profile, run snapshot)
// and an append-only outbox of events that have not reached the server yet.

const DB_NAME = "waypoint-driver";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("kv");
      db.createObjectStore("outbox", { keyPath: "client_uuid" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const kvGet = <T>(key: string) => tx<T | undefined>("kv", "readonly", (s) => s.get(key)).catch(() => undefined);
export const kvSet = (key: string, value: unknown) => tx("kv", "readwrite", (s) => s.put(value, key)).catch(() => undefined);
export const kvDel = (key: string) => tx("kv", "readwrite", (s) => s.delete(key)).catch(() => undefined);

export type OutboxEvent = {
  client_uuid: string;
  kind: "trip_start" | "arrive" | "deliver" | "conflict_answer" | "notice_read";
  trip_id: number;
  stop_id?: number;
  device_ts: string;
  payload?: Record<string, unknown>;
  // Not sent to the server:
  state?: "waiting" | "sending";
  label?: string;
};

export const outboxAll = () => tx<OutboxEvent[]>("outbox", "readonly", (s) => s.getAll()).then((r) => (r ?? []).sort((a, b) => a.device_ts.localeCompare(b.device_ts))).catch(() => [] as OutboxEvent[]);
export const outboxPut = (e: OutboxEvent) => tx("outbox", "readwrite", (s) => s.put(e)).catch(() => undefined);
export const outboxDelete = (id: string) => tx("outbox", "readwrite", (s) => s.delete(id)).catch(() => undefined);
