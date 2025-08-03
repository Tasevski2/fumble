/**
 * Simple session key storage using IndexedDB (no encryption for MVP)
 */

interface StoredSessionKey {
  chainId: number;
  privateKey: string;
  expiresAt: number;
  sessionKeyAddress?: string;
  delegationInstalled?: boolean;
  smartAccountAddress?: string;
  delegationHash?: string;
}

const DB_NAME = 'fumble-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'session-keys';

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'chainId' });
        store.createIndex('chainId', 'chainId', { unique: true });
      }
    };
  });
}

// Store session key with optional metadata
export async function storeSessionKey(
  chainId: number, 
  privateKey: `0x${string}`,
  metadata?: {
    sessionKeyAddress?: string;
    delegationInstalled?: boolean;
    smartAccountAddress?: string;
    delegationHash?: string;
  }
): Promise<void> {
  try {
    console.log(`💾 Storing session key for chain ${chainId}`, metadata);
    
    const db = await initDB();
    
    const sessionData: StoredSessionKey = {
      chainId,
      privateKey,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
      ...metadata,
    };
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.put(sessionData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`✅ Session key stored for chain ${chainId}`);
  } catch (error) {
    console.error(`❌ Failed to store session key for chain ${chainId}:`, error);
    throw error;
  }
}

// Retrieve session key
export async function getSessionKey(chainId: number): Promise<`0x${string}` | null> {
  try {
    console.log(`🔍 Retrieving session key for chain ${chainId}`);
    
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const stored = await new Promise<StoredSessionKey | null>((resolve, reject) => {
      const request = store.get(chainId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!stored) {
      console.log(`❌ No session key found for chain ${chainId}`);
      return null;
    }

    // Check if expired
    if (stored.expiresAt && stored.expiresAt < Math.floor(Date.now() / 1000)) {
      console.log(`⏰ Session key expired for chain ${chainId}, removing`);
      await removeSessionKey(chainId);
      return null;
    }

    console.log(`✅ Session key retrieved for chain ${chainId}`);
    return stored.privateKey as `0x${string}`;
  } catch (error) {
    console.error(`❌ Failed to retrieve session key for chain ${chainId}:`, error);
    return null;
  }
}

// Remove session key
export async function removeSessionKey(chainId: number): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(chainId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`🗑️ Session key removed for chain ${chainId}`);
  } catch (error) {
    console.error(`❌ Failed to remove session key for chain ${chainId}:`, error);
  }
}

// List all stored session keys
export async function listSessionKeys(): Promise<number[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const chainIds = await new Promise<number[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as number[]);
      request.onerror = () => reject(request.error);
    });

    return chainIds;
  } catch (error) {
    console.error('❌ Failed to list session keys:', error);
    return [];
  }
}

// Get full session metadata
export async function getSessionMetadata(chainId: number): Promise<StoredSessionKey | null> {
  try {
    console.log(`🔍 Retrieving session metadata for chain ${chainId}`);
    
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const stored = await new Promise<StoredSessionKey | null>((resolve, reject) => {
      const request = store.get(chainId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!stored) {
      console.log(`❌ No session metadata found for chain ${chainId}`);
      return null;
    }

    // Check if expired
    if (stored.expiresAt && stored.expiresAt < Math.floor(Date.now() / 1000)) {
      console.log(`⏰ Session expired for chain ${chainId}, removing`);
      await removeSessionKey(chainId);
      return null;
    }

    console.log(`✅ Session metadata retrieved for chain ${chainId}`, {
      sessionKeyAddress: stored.sessionKeyAddress,
      delegationInstalled: stored.delegationInstalled,
      smartAccountAddress: stored.smartAccountAddress,
    });
    
    return stored;
  } catch (error) {
    console.error(`❌ Failed to retrieve session metadata for chain ${chainId}:`, error);
    return null;
  }
}

// Update delegation status
export async function updateDelegationStatus(
  chainId: number, 
  delegationInstalled: boolean,
  delegationHash?: string
): Promise<void> {
  try {
    console.log(`📝 Updating delegation status for chain ${chainId}:`, {
      delegationInstalled,
      delegationHash,
    });
    
    const existing = await getSessionMetadata(chainId);
    if (!existing) {
      console.error(`❌ No existing session for chain ${chainId}`);
      return;
    }

    await storeSessionKey(chainId, existing.privateKey as `0x${string}`, {
      sessionKeyAddress: existing.sessionKeyAddress,
      smartAccountAddress: existing.smartAccountAddress,
      delegationInstalled,
      delegationHash,
    });

    console.log(`✅ Delegation status updated for chain ${chainId}`);
  } catch (error) {
    console.error(`❌ Failed to update delegation status for chain ${chainId}:`, error);
  }
}

// Clear all session keys (for logout/reset)
export async function clearAllSessionKeys(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('🧹 All session keys cleared');
  } catch (error) {
    console.error('❌ Failed to clear session keys:', error);
  }
}