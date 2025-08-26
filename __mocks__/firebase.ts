const db: any = { users: {} };

const currentUser = { uid: 'test-uid' };

function getNested(path: string[]): any {
  let node: any = db;
  for (const key of path) {
    node = node[key];
    if (node === undefined) return undefined;
  }
  return node;
}

function ensureNested(path: string[]): any {
  let node: any = db;
  for (const key of path) {
    if (!node[key]) node[key] = {};
    node = node[key];
  }
  return node;
}

class Document {
  path: string[];
  constructor(path: string[]) {
    this.path = path;
  }
  async get() {
    const data = getNested(this.path);
    return {
      exists: !!data,
      data: () => ({ ...(data || {}) }),
    };
  }
  async set(data: any, options?: { merge?: boolean }) {
    const existing = getNested(this.path) || {};
    const final = options?.merge ? { ...existing, ...data } : { ...data };
    const parent = ensureNested(this.path.slice(0, -1));
    parent[this.path[this.path.length - 1]] = final;
  }
  async update(data: any) {
    const target = ensureNested(this.path);
    for (const key in data) {
      applyField(target, key.split('.'), data[key]);
    }
  }
  async delete() {
    const parent = getNested(this.path.slice(0, -1));
    if (parent) delete parent[this.path[this.path.length - 1]];
  }
  collection(name: string) {
    return new Collection([...this.path, name]);
  }
}

class Collection {
  path: string[];
  constructor(path: string[]) {
    this.path = path;
  }
  doc(id: string) {
    return new Document([...this.path, id]);
  }
  async get() {
    const col = getNested(this.path) || {};
    const docs = Object.entries(col).map(([id, data]) => ({
      id,
      data: () => ({ ...(data as any) }),
      ref: new Document([...this.path, id]),
    }));
    return {
      docs,
      forEach: (cb: any) => docs.forEach(d => cb(d)),
    };
  }
}

function applyField(obj: any, parts: string[], value: any) {
  const last = parts.pop()!;
  let target = obj;
  for (const p of parts) {
    if (target[p] == null || typeof target[p] !== 'object') target[p] = {};
    target = target[p];
  }
  if (isFieldOp(value)) {
    applyFieldOp(target, last, value);
  } else {
    target[last] = value;
  }
}

function isFieldOp(v: any) {
  return v && typeof v === 'object' && v.__op;
}

function applyFieldOp(target: any, key: string, op: any) {
  switch (op.__op) {
    case 'delete':
      delete target[key];
      break;
    case 'increment':
      target[key] = (target[key] || 0) + op.n;
      break;
    case 'arrayUnion':
      target[key] = Array.isArray(target[key]) ? target[key].slice() : [];
      op.values.forEach((v: any) => {
        if (!target[key].includes(v)) target[key].push(v);
      });
      break;
    case 'arrayRemove':
      target[key] = Array.isArray(target[key]) ? target[key].slice() : [];
      target[key] = target[key].filter((v: any) => !op.values.includes(v));
      break;
    default:
      target[key] = op.value;
  }
}

function batch() {
  const ops: any[] = [];
  return {
    set: (ref: any, data: any) => ops.push({ type: 'set', ref, data }),
    delete: (ref: any) => ops.push({ type: 'delete', ref }),
    commit: async () => {
      for (const op of ops) {
        if (op.type === 'set') {
          await op.ref.set(op.data);
        } else {
          await op.ref.delete();
        }
      }
    },
  };
}

export function firestore() {
  return {
    collection: (name: string) => new Collection([name]),
    batch,
  } as any;
}

export const FieldValue = {
  delete: () => ({ __op: 'delete' }),
  increment: (n: number) => ({ __op: 'increment', n }),
  arrayUnion: (...values: any[]) => ({ __op: 'arrayUnion', values }),
  arrayRemove: (...values: any[]) => ({ __op: 'arrayRemove', values }),
};
(firestore as any).FieldValue = FieldValue;

export function auth() {
  return { currentUser };
}

export function __reset() {
  db.users = {};
}

export function __getDoc(path: string[]) {
  const data = getNested(path);
  return data ? JSON.parse(JSON.stringify(data)) : undefined;
}

export default { auth, firestore };