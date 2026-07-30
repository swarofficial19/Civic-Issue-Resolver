import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CivicReport } from '../types';

// Initialize Firebase App safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must pass databaseId when initializing getFirestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on load
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connected successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or unreachable.');
    }
    return false;
  }
}

// Firestore Reports collection reference
const REPORTS_COLLECTION = 'reports';

// Save or Update a report in Firestore
export async function saveReportToFirestore(report: CivicReport): Promise<void> {
  const path = `${REPORTS_COLLECTION}/${report.id}`;
  try {
    const docRef = doc(db, REPORTS_COLLECTION, report.id);
    await setDoc(docRef, report, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all reports from Firestore
export async function fetchReportsFromFirestore(): Promise<CivicReport[]> {
  const path = REPORTS_COLLECTION;
  try {
    const q = query(collection(db, REPORTS_COLLECTION));
    const snapshot = await getDocs(q);
    const reports: CivicReport[] = [];
    snapshot.forEach((doc) => {
      reports.push(doc.data() as CivicReport);
    });
    return reports;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// Real-time listener for Firestore reports
export function subscribeToReports(
  onUpdate: (reports: CivicReport[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = REPORTS_COLLECTION;
  try {
    const q = query(collection(db, REPORTS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const reports: CivicReport[] = [];
        snapshot.forEach((doc) => {
          reports.push(doc.data() as CivicReport);
        });
        onUpdate(reports);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return () => {};
  }
}
