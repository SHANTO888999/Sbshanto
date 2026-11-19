import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  app,
  firebaseConfig,
  isTransientOfflineError,
  OperationType,
  sanitizeFirestoreId,
  waitMs,
  type FirestoreErrorInfo,
} from './firebaseShared';

export {
  app,
  isTransientOfflineError,
  OperationType,
  sanitizeFirestoreId,
  waitMs,
  type FirestoreErrorInfo,
};

export const db: Firestore = (() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();

async function testConnection() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
