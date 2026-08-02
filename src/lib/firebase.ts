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
const OFFICERS_COLLECTION = 'officers';

export interface OfficerRecord {
  id?: string;
  email: string;
  name: string;
  department: string;
  badgeId: string;
  role?: string;
  createdAt?: string;
  addedBy?: string;
}

// Fetch officer record from Firestore by email
export async function getOfficerRecordByEmail(email: string): Promise<OfficerRecord | null> {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    // 1. Direct document lookup
    const officerDoc = await getDocFromServer(doc(db, OFFICERS_COLLECTION, docId));
    if (officerDoc.exists()) {
      return officerDoc.data() as OfficerRecord;
    }

    // 2. Query lookup by email field
    const q = query(collection(db, OFFICERS_COLLECTION));
    const snapshot = await getDocs(q);
    let match: OfficerRecord | null = null;
    snapshot.forEach((doc) => {
      const data = doc.data() as OfficerRecord;
      if (data.email && data.email.trim().toLowerCase() === cleanEmail) {
        match = data;
      }
    });

    return match;
  } catch (err) {
    console.warn('Failed to fetch officer record from Firestore:', err);
    return null;
  }
}

// Save or Update an Officer in Firestore
export async function saveOfficerToFirestore(officer: OfficerRecord): Promise<void> {
  const cleanEmail = officer.email.trim().toLowerCase();
  const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const path = `${OFFICERS_COLLECTION}/${docId}`;

  try {
    const docRef = doc(db, OFFICERS_COLLECTION, docId);
    await setDoc(docRef, {
      ...officer,
      email: cleanEmail,
      createdAt: officer.createdAt || new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all registered officers from Firestore
export async function fetchAllOfficersFromFirestore(): Promise<OfficerRecord[]> {
  try {
    const q = query(collection(db, OFFICERS_COLLECTION));
    const snapshot = await getDocs(q);
    const officers: OfficerRecord[] = [];
    snapshot.forEach((doc) => {
      officers.push(doc.data() as OfficerRecord);
    });
    return officers;
  } catch (err) {
    console.warn('Error listing officers from Firestore:', err);
    return [];
  }
}

// Delete / Revoke Officer from Firestore
export async function deleteOfficerFromFirestore(email: string): Promise<void> {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  try {
    // Delete directly by document ID
    const docRef = doc(db, OFFICERS_COLLECTION, docId);
    await deleteDoc(docRef);

    // Also search by email query in case document ID was created differently
    const q = query(collection(db, OFFICERS_COLLECTION));
    const snapshot = await getDocs(q);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as OfficerRecord;
      if (data.email && data.email.trim().toLowerCase() === cleanEmail) {
        deletePromises.push(deleteDoc(d.ref));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.error('Error deleting officer from Firestore:', err);
    throw err;
  }
}

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
