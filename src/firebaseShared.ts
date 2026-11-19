import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export { firebaseConfig };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function sanitizeFirestoreId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (cleaned) return cleaned;
  return `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function isTransientOfflineError(error: unknown): boolean {
  if (!error) return false;
  const code =
    typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : '';
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    msg.includes('the client is offline') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror')
  );
}

export async function waitMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
