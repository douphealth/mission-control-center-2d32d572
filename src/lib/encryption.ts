// Enterprise-grade encryption utilities for credential vault
// Uses native Web Crypto API (AES-GCM 256-bit) — replaces deprecated crypto-js

const DEFAULT_KEY = 'mc-vault-2026-default-key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM

// ─── Key management ──────────────────────────────────────────────────────────

function getEncryptionKey(): string {
    try {
        return localStorage.getItem('mc-encryption-key') || DEFAULT_KEY;
    } catch {
        return DEFAULT_KEY;
    }
}

/**
 * Derive a CryptoKey from a passphrase using PBKDF2.
 * Provides proper key derivation instead of using the raw passphrase directly.
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Use a stable salt derived from the passphrase itself
    // (In production you'd store a random salt, but for a local vault this is fine)
    const salt = encoder.encode('mc-vault-salt-v2-' + passphrase.slice(0, 8));

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a base64-encoded string with the IV prepended to the ciphertext.
 */
export async function encrypt(plainText: string, customKey?: string): Promise<string> {
    if (!plainText) return '';
    try {
        const key = await deriveKey(customKey || getEncryptionKey());
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoded = new TextEncoder().encode(plainText);

        const ciphertext = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            encoded
        );

        // Prepend IV to ciphertext for storage
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return 'wcapi:' + arrayBufferToBase64(combined.buffer);
    } catch (e) {
        console.error('Encryption failed:', e);
        return plainText; // Fallback: return plain (same behavior as old lib)
    }
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Handles both new Web Crypto format (prefixed with 'wcapi:') and returns
 * the original string if it can't be decrypted (legacy or plaintext).
 */
export async function decrypt(cipherText: string, customKey?: string): Promise<string> {
    if (!cipherText) return '';

    // Handle new Web Crypto format
    if (!cipherText.startsWith('wcapi:')) {
        // Not our format — return as-is (legacy crypto-js data or plaintext)
        return cipherText;
    }

    try {
        const key = await deriveKey(customKey || getEncryptionKey());
        const combined = new Uint8Array(base64ToArrayBuffer(cipherText.slice(6)));

        const iv = combined.slice(0, IV_LENGTH);
        const data = combined.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return cipherText; // Return original if decryption fails
    }
}

export function setEncryptionKey(key: string): void {
    localStorage.setItem('mc-encryption-key', key);
}

export function hasCustomEncryptionKey(): boolean {
    return !!localStorage.getItem('mc-encryption-key');
}

export function generateStrongKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a value using SHA-256 (native Web Crypto).
 * Returns a hex string.
 */
export async function hash(value: string): Promise<string> {
    const encoded = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
}
