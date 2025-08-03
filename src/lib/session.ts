/**
 * Session management for Fumble PWA
 * 
 * Client-side (IndexedDB): Session private keys, delegation IDs, chain mapping
 * Server-side: Smart account addresses, delegation metadata, user hash, timestamps
 */

export interface SessionData {
  // Client-side data (IndexedDB)
  privateKey: string;
  sessionId: string;
  chainId: number;
  expiresAt: number;
  
  // Server-side references
  smartAccountAddress?: `0x${string}`;
  delegationHash?: string;
  userHash?: string;
}

export interface SessionMetadata {
  // Server-side only
  smartAccountAddress: `0x${string}`;
  delegationId: string;
  delegationHash: string;
  userHash: string; // hash of EOA address
  chainId: number;
  
  // Policy constraints
  maxPerTxUsd: number;
  maxPerDayUsd: number;
  maxSlippageBps: number;
  allowedContracts: `0x${string}`[];
  
  // Timestamps
  createdAt: number;
  expiresAt: number;
  lastUsedAt?: number;
}

// IndexedDB wrapper for client-side session storage
class SessionDB {
  private dbName = 'fumble-sessions';
  private version = 1;
  private storeName = 'sessions';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'sessionId' });
          store.createIndex('chainId', 'chainId', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  async saveSession(sessionData: SessionData): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(sessionData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(sessionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getSessionsByChain(chainId: number): Promise<SessionData[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('chainId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(chainId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(sessionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpiredSessions(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('expiresAt');
    
    const now = Math.floor(Date.now() / 1000);
    const range = IDBKeyRange.upperBound(now);
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      request.onerror = () => reject(request.error);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

// Client-side session management
export class SessionManager {
  private db: SessionDB;

  constructor() {
    this.db = new SessionDB();
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate session private key (for delegation)
  private async generateSessionKey(): Promise<string> {
    // Generate a random private key for the session
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Create new session
  async createSession(chainId: number, smartAccountAddress: `0x${string}`, expiresAt: number): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const privateKey = await this.generateSessionKey();
    
    const sessionData: SessionData = {
      privateKey,
      sessionId,
      chainId,
      expiresAt,
      smartAccountAddress,
    };

    await this.db.saveSession(sessionData);
    
    // Store metadata on server
    await this.storeSessionMetadata({
      smartAccountAddress,
      delegationId: sessionId,
      delegationHash: '', // Will be filled when delegation is created
      userHash: this.hashAddress(smartAccountAddress),
      chainId,
      maxPerTxUsd: 500,
      maxPerDayUsd: 2500,
      maxSlippageBps: 100,
      allowedContracts: [], // Will be filled based on chain config
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt,
    });

    return sessionData;
  }

  // Get active session for chain
  async getActiveSession(chainId: number): Promise<SessionData | null> {
    const sessions = await this.db.getSessionsByChain(chainId);
    const now = Math.floor(Date.now() / 1000);
    
    // Find first valid (non-expired) session
    const activeSession = sessions.find(session => session.expiresAt > now);
    
    if (activeSession) {
      // Update last used timestamp on server
      await this.updateLastUsed(activeSession.sessionId);
    }
    
    return activeSession || null;
  }

  // Clear expired sessions
  async cleanupSessions(): Promise<void> {
    await this.db.clearExpiredSessions();
  }

  // Revoke session
  async revokeSession(sessionId: string): Promise<void> {
    await this.db.deleteSession(sessionId);
    
    // Notify server to mark as revoked
    await fetch('/api/session/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  }

  // Hash address for server storage (privacy protection)
  private hashAddress(address: string): string {
    // Simple hash for user identification without storing actual address
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      const char = address.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  // Store session metadata on server
  private async storeSessionMetadata(metadata: SessionMetadata): Promise<void> {
    const response = await fetch('/api/session/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to store session metadata: ${error.error}`);
    }
  }

  // Update last used timestamp
  private async updateLastUsed(sessionId: string): Promise<void> {
    try {
      await fetch('/api/session/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, timestamp: Math.floor(Date.now() / 1000) }),
      });
    } catch (error) {
      // Non-critical error, log but don't throw
      console.warn('Failed to update session last used:', error);
    }
  }
}

// Optional: Encrypt session data with WebCrypto AES-GCM
export class EncryptedSessionManager extends SessionManager {
  private async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
  }

  private async encryptData(data: string, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    return { encrypted, iv };
  }

  private async decryptData(encrypted: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  }
  
  // Override to add encryption (implementation would store keys securely)
  // This is a simplified example - production would need secure key management
}

// Export singleton instance
export const sessionManager = new SessionManager();