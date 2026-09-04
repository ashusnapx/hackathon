"use client";

/**
 * Actual evidence bytes live in IndexedDB; only a small, serialisable manifest
 * is kept in the CaseFile/localStorage record. This avoids both pretending that
 * metadata is a stored file and putting multi-megabyte blobs in localStorage.
 */
const DB_NAME = "kavach-evidence-v1";
const DB_VERSION = 1;
const STORE_NAME = "blobs";
const CASE_INDEX = "caseId";

export interface StoredEvidenceFile {
  key: string;
  caseId: string;
  evidenceId: string;
  name: string;
  type: string;
  size: number;
  sha256: string;
  storedAt: string;
  blob: Blob;
}

export interface StoredEvidenceManifest {
  storageKey: string;
  name: string;
  type: string;
  size: number;
  sha256: string;
  storedAt: string;
  storedLocally: true;
}

export function evidenceStorageKey(caseId: string, evidenceId: string, version: string): string {
  return `${caseId}:${evidenceId}:${version}`;
}

export function evidenceCaseLockName(caseId: string): string {
  return `kavach:evidence:${caseId}`;
}

/**
 * Serialise a case's IndexedDB + localStorage evidence mutation across tabs.
 * Those stores cannot share one transaction, so browsers without Web Locks
 * fail closed instead of accepting a last-writer-wins operation that can leave
 * an untracked copy behind.
 */
export async function withEvidenceCaseLock<T>(
  caseId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const locks = globalThis.navigator?.locks;
  if (!locks) {
    throw new Error(
      "This browser cannot safely coordinate evidence changes across tabs. Close other Kavach tabs and use a current browser, or mark the item as held elsewhere.",
    );
  }
  return locks.request(evidenceCaseLockName(caseId), { mode: "exclusive" }, operation);
}

export async function sha256Hex(data: Blob | ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser cannot create an evidence fingerprint.");
  }
  const bytes = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function openEvidenceDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Local evidence storage is unavailable in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open local evidence storage."));
    request.onblocked = () => reject(new Error("Local evidence storage is blocked by another open tab."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex(CASE_INDEX, "caseId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>, fallback: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(fallback));
  });
}

function transactionDone(transaction: IDBTransaction, fallback: string): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error(fallback));
    transaction.onabort = () => reject(transaction.error ?? new Error(fallback));
  });
}

export async function storeEvidenceFile(
  caseId: string,
  evidenceId: string,
  file: File,
): Promise<StoredEvidenceManifest> {
  const sha256 = await sha256Hex(file);
  const db = await openEvidenceDb();
  const version = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = evidenceStorageKey(caseId, evidenceId, version);
  const storedAt = new Date().toISOString();
  const record: StoredEvidenceFile = {
    key,
    caseId,
    evidenceId,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    sha256,
    storedAt,
    blob: file,
  };

  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await transactionDone(transaction, "Could not save the evidence file locally.");
  } finally {
    db.close();
  }

  return {
    storageKey: key,
    name: record.name,
    type: record.type,
    size: record.size,
    sha256,
    storedAt,
    storedLocally: true,
  };
}

export async function getStoredEvidenceFile(storageKey: string): Promise<StoredEvidenceFile | null> {
  const db = await openEvidenceDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const result = await requestResult(
      transaction.objectStore(STORE_NAME).get(storageKey) as IDBRequest<StoredEvidenceFile | undefined>,
      "Could not read the evidence file.",
    );
    return result ?? null;
  } finally {
    db.close();
  }
}

export async function removeStoredEvidenceFile(storageKey: string): Promise<void> {
  const db = await openEvidenceDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(storageKey);
    await transactionDone(transaction, "Could not remove the evidence file.");
  } finally {
    db.close();
  }
}

/** Remove orphaned blobs when the citizen deletes a case. */
export async function deleteEvidenceForCase(caseId: string): Promise<void> {
  const db = await openEvidenceDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const index = transaction.objectStore(STORE_NAME).index(CASE_INDEX);
    const cursorRequest = index.openKeyCursor(IDBKeyRange.only(caseId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      transaction.objectStore(STORE_NAME).delete(cursor.primaryKey);
      cursor.continue();
    };
    await transactionDone(transaction, "Could not remove this case's evidence files.");
  } finally {
    db.close();
  }
}
