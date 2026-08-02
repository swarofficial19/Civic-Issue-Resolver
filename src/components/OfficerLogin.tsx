import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  UserPlus,
  ShieldAlert,
  Database,
  Info,
  LogOut,
  KeyRound,
  Crown,
  Trash2,
  Users
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  auth, 
  getOfficerRecordByEmail, 
  saveOfficerToFirestore, 
  fetchAllOfficersFromFirestore,
  deleteOfficerFromFirestore,
  OfficerRecord 
} from '../lib/firebase';
import { useToast } from './ToastContext';

interface OfficerLoginProps {
  onAuthenticate: (officerData: { name: string; department: string; badgeId: string; email: string }) => void;
  onCancel: () => void;
}

const OWNER_EMAIL = 'swarrana2007@gmail.com';

export const OfficerLogin: React.FC<OfficerLoginProps> = ({ onAuthenticate, onCancel }) => {
  const { toast } = useToast();
  
  // Auth Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'owner_portal'>('signin');
  
  // States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);

  // Owner Mode State
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [ownerUser, setOwnerUser] = useState<FirebaseUser | null>(null);
  const [authorizedOfficers, setAuthorizedOfficers] = useState<OfficerRecord[]>([]);
  
  // New Officer Enrollment state (Owner Only)
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Sanitation');
  const [newBadge, setNewBadge] = useState('MUNI-OFF-2026');

  // Deletion Confirmation Modal State
  const [officerPendingDeletion, setOfficerPendingDeletion] = useState<OfficerRecord | null>(null);
  const [deletingOfficer, setDeletingOfficer] = useState(false);

  // Load authorized officers when in owner portal
  useEffect(() => {
    if (ownerVerified) {
      loadOfficersList();
    }
  }, [ownerVerified]);

  const loadOfficersList = async () => {
    try {
      const list = await fetchAllOfficersFromFirestore();
      setAuthorizedOfficers(list);
    } catch (err) {
      console.warn('Error loading officers:', err);
    }
  };

  // Pre-seed default authorized officers
  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      const defaultOfficers: OfficerRecord[] = [
        {
          email: OWNER_EMAIL,
          name: 'Chief Admin (Owner)',
          department: 'Executive Operations',
          badgeId: 'MUNI-OWNER-001',
          role: 'Owner'
        },
        {
          email: 'officer@janseva.gov.in',
          name: 'Rajesh Sharma',
          department: 'Sanitation',
          badgeId: 'MUNI-OFF-9082',
          role: 'Executive Officer'
        },
        {
          email: 'admin@janseva.gov.in',
          name: 'Priya Verma',
          department: 'Public Works',
          badgeId: 'MUNI-ENG-4021',
          role: 'Chief Engineer'
        }
      ];

      for (const off of defaultOfficers) {
        await saveOfficerToFirestore(off);
      }

      toast.success('Authorized officer records initialized in Firestore.', 'Officers Initialized');
      setErrorMsg('');
      setUnauthorizedEmail(null);
      if (ownerVerified) loadOfficersList();
    } catch (err: any) {
      toast.error('Failed to seed officer records: ' + err?.message, 'Database Error');
    } finally {
      setLoading(false);
    }
  };

  // Process authenticated Firebase User against Firestore Officer Registry
  const verifyAndLoginOfficer = async (user: FirebaseUser) => {
    const userEmail = (user.email || '').toLowerCase().trim();
    if (!userEmail) {
      setErrorMsg('Logged in user has no valid email address.');
      await signOut(auth);
      return;
    }

    // Lookup user in Firestore officers collection
    let officerRecord = await getOfficerRecordByEmail(userEmail);

    // Auto-authorize OWNER swarrana2007@gmail.com if not already in Firestore
    if (!officerRecord && userEmail === OWNER_EMAIL) {
      const ownerRecord: OfficerRecord = {
        email: OWNER_EMAIL,
        name: user.displayName || 'System Owner',
        department: 'Executive Operations',
        badgeId: 'MUNI-OWNER-001',
        role: 'Portal Owner'
      };
      await saveOfficerToFirestore(ownerRecord);
      officerRecord = ownerRecord;
    }

    if (officerRecord) {
      toast.success(
        `Welcome Officer ${officerRecord.name}. Verified via Firebase Officers Registry.`, 
        'Officer Access Granted'
      );
      onAuthenticate({
        name: officerRecord.name || user.displayName || 'Officer',
        department: officerRecord.department || 'Municipal Services',
        badgeId: officerRecord.badgeId || 'MUNI-OFF-2026',
        email: userEmail
      });
    } else {
      // DENIED: Email exists in Auth but NOT in Firestore officers database
      setUnauthorizedEmail(userEmail);
      setErrorMsg(
        `Access Denied: (${userEmail}) is NOT authorized in the Officers database. Only the portal owner (${OWNER_EMAIL}) can grant officer authorization.`
      );
      toast.error('Account not authorized. Only owner swarrana2007@gmail.com can authorize officers.', 'Access Denied');
      await signOut(auth);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setUnauthorizedEmail(null);
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await verifyAndLoginOfficer(result.user);
    } catch (err: any) {
      console.error('Google Officer Auth Error:', err);
      setErrorMsg(err?.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email/Password Sign-In Handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setErrorMsg('Please enter both official email and password.');
      return;
    }

    setErrorMsg('');
    setUnauthorizedEmail(null);
    setLoading(true);

    try {
      let firebaseUser: FirebaseUser | null = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = userCredential.user;
      } catch (signInErr: any) {
        if (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/invalid-credential') {
          try {
            const newUserCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            firebaseUser = newUserCred.user;
          } catch (createErr: any) {
            if (createErr?.code === 'auth/operation-not-allowed') {
              // Email/Password disabled in Firebase Auth - fallback to Firestore check
            } else {
              throw createErr;
            }
          }
        } else if (signInErr?.code === 'auth/operation-not-allowed') {
          // Email/Password disabled in Firebase Auth - fallback to Firestore check
        } else {
          throw signInErr;
        }
      }

      if (firebaseUser) {
        await verifyAndLoginOfficer(firebaseUser);
      } else {
        // Direct Firestore Officer Registry verification fallback
        let officerRecord = await getOfficerRecordByEmail(cleanEmail);

        if (!officerRecord && cleanEmail === OWNER_EMAIL) {
          const ownerRecord: OfficerRecord = {
            email: OWNER_EMAIL,
            name: 'System Owner',
            department: 'Executive Operations',
            badgeId: 'MUNI-OWNER-001',
            role: 'Portal Owner'
          };
          await saveOfficerToFirestore(ownerRecord);
          officerRecord = ownerRecord;
        }

        if (officerRecord) {
          toast.success(
            `Welcome Officer ${officerRecord.name}. Verified via Municipal Officers Database.`,
            'Officer Access Granted'
          );
          onAuthenticate({
            name: officerRecord.name || 'Officer',
            department: officerRecord.department || 'Municipal Services',
            badgeId: officerRecord.badgeId || 'MUNI-OFF-2026',
            email: cleanEmail
          });
        } else {
          setUnauthorizedEmail(cleanEmail);
          setErrorMsg(
            `Access Denied: (${cleanEmail}) is not authorized in the Officers database.`
          );
          toast.error('Account not authorized in municipal database.', 'Access Denied');
        }
      }
    } catch (err: any) {
      console.error('Officer Sign-In Error:', err);
      if (err?.code === 'auth/operation-not-allowed') {
        let officerRecord = await getOfficerRecordByEmail(cleanEmail);
        if (!officerRecord && cleanEmail === OWNER_EMAIL) {
          officerRecord = {
            email: OWNER_EMAIL,
            name: 'System Owner',
            department: 'Executive Operations',
            badgeId: 'MUNI-OWNER-001',
            role: 'Portal Owner'
          };
          await saveOfficerToFirestore(officerRecord);
        }

        if (officerRecord) {
          toast.success(
            `Welcome Officer ${officerRecord.name}. Verified via Municipal Officers Database.`,
            'Officer Access Granted'
          );
          onAuthenticate({
            name: officerRecord.name || 'Officer',
            department: officerRecord.department || 'Municipal Services',
            badgeId: officerRecord.badgeId || 'MUNI-OFF-2026',
            email: cleanEmail
          });
          setLoading(false);
          return;
        }
      }

      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid password for this officer account.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setErrorMsg('Email/Password provider disabled. Please use "Sign in with Google" above.');
      } else {
        setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
      }
      toast.error('Officer authentication failed.', 'Access Denied');
    } finally {
      setLoading(false);
    }
  };

  // Owner Portal Verification Handler
  const handleVerifyOwnerLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = (result.user.email || '').toLowerCase().trim();

      if (userEmail === OWNER_EMAIL) {
        setOwnerVerified(true);
        setOwnerUser(result.user);
        toast.success(`Owner identity verified as ${OWNER_EMAIL}. You may now authorize officers.`, 'Owner Access Verified');
        loadOfficersList();
      } else {
        await signOut(auth);
        setErrorMsg(`Unauthorized: Only ${OWNER_EMAIL} can access the Owner Control Panel.`);
        toast.error(`Only owner ${OWNER_EMAIL} is permitted to authorize new officer accounts.`, 'Access Denied');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Owner authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Authorize New Officer (OWNER ONLY)
  const handleAuthorizeNewOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerVerified || ownerUser?.email?.toLowerCase().trim() !== OWNER_EMAIL) {
      toast.error(`Only owner ${OWNER_EMAIL} can authorize new officers.`, 'Permission Denied');
      return;
    }

    if (!newEmail.trim() || !newName.trim()) {
      toast.error('Please fill in both officer email and name.', 'Invalid Data');
      return;
    }

    setLoading(true);
    try {
      const cleanTargetEmail = newEmail.trim().toLowerCase();
      await saveOfficerToFirestore({
        email: cleanTargetEmail,
        name: newName.trim(),
        department: newDept,
        badgeId: newBadge.trim() || 'MUNI-OFF-2026',
        role: 'Authorized Officer',
        createdAt: new Date().toISOString(),
        addedBy: OWNER_EMAIL
      });

      toast.success(
        `Officer email ${cleanTargetEmail} has been authorized into the Officers Registry!`,
        'Officer Authorized Successfully'
      );
      
      setNewEmail('');
      setNewName('');
      loadOfficersList();
    } catch (err: any) {
      toast.error('Failed to authorize officer: ' + err?.message, 'Authorization Failed');
    } finally {
      setLoading(false);
    }
  };

  // Revoke Officer Authorization (OWNER ONLY)
  const handleRevokeOfficer = (officer: OfficerRecord) => {
    if (officer.email?.toLowerCase().trim() === OWNER_EMAIL) {
      toast.error('Cannot revoke owner authorization.', 'Action Restricted');
      return;
    }
    setOfficerPendingDeletion(officer);
  };

  const confirmExecuteRevokeOfficer = async () => {
    if (!officerPendingDeletion) return;
    const targetEmail = officerPendingDeletion.email;
    setDeletingOfficer(true);
    try {
      await deleteOfficerFromFirestore(targetEmail);
      toast.info(`Officer authorization for ${targetEmail} has been revoked.`, 'Authorization Revoked');
      setOfficerPendingDeletion(null);
      await loadOfficersList();
    } catch (err: any) {
      toast.error('Failed to revoke officer: ' + err?.message, 'Error');
    } finally {
      setDeletingOfficer(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center shadow-lg ring-4 ring-emerald-500/20">
            {mode === 'owner_portal' ? <Crown className="w-9 h-9 text-amber-400" /> : <ShieldCheck className="w-9 h-9" />}
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Restricted Command Room Access</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {mode === 'owner_portal' ? 'Owner Authorization Portal' : 'Officer Portal Authentication'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {mode === 'owner_portal' 
                ? `Exclusive Owner Portal to manage and grant officer access.`
                : `Restricted portal. Users must be authenticated via Firebase Auth AND exist in the Firestore Officers Database.`}
            </p>
          </div>
        </div>

        {/* Unauthorized Alert Banner */}
        {unauthorizedEmail && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm">Account Not Authorized in Officers Database</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                  The account <strong className="font-mono bg-rose-200/50 dark:bg-rose-900/50 px-1 rounded">{unauthorizedEmail}</strong> is authenticated with Firebase, but has not been authorized as an officer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Error Message */}
        {errorMsg && !unauthorizedEmail && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODE 1: OFFICER SIGN IN */}
        {mode === 'signin' && (
          <div className="space-y-4">
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Sign in with Google Officer Account</span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold absolute">
                or official email credentials
              </span>
            </div>

            {/* Form: Email / Password */}
            <form onSubmit={handleEmailSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Officer Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="officer@janseva.gov.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    <span>Verify Credentials & Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>


          </div>
        )}

        {/* MODE 2: OWNER AUTHORIZATION PORTAL */}
        {mode === 'owner_portal' && (
          <div className="space-y-6">
            {!ownerVerified ? (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-center space-y-4">
                <Crown className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                    Owner Verification Required
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 max-w-sm mx-auto">
                    Please sign in with authorized owner Google credentials to unlock the Officer Authorization Panel.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOwnerLogin}
                  disabled={googleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      <span>Verify Owner Identity</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Verified Owner Header Badge */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Verified Owner: {OWNER_EMAIL}</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300">You hold sole authorization power for Officer Accounts.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setOwnerVerified(false);
                      setOwnerUser(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title="Sign Out Owner Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Form: Add / Authorize New Officer Email */}
                <form onSubmit={handleAuthorizeNewOfficer} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-500" />
                    <span>Authorize New Officer Email</span>
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Officer Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="e.g. officer.name@corporation.gov.in"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Officer Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Inspector Ramesh"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Badge / Employee ID
                      </label>
                      <input
                        type="text"
                        value={newBadge}
                        onChange={e => setNewBadge(e.target.value)}
                        placeholder="MUNI-OFF-2026"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Department
                    </label>
                    <select
                      value={newDept}
                      onChange={e => setNewDept(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Sanitation">Sanitation & Solid Waste Management</option>
                      <option value="Water">Water Supply & Drainage</option>
                      <option value="Electrical">Power, Streetlights & Electrical</option>
                      <option value="Roads">Road Maintenance & Infrastructure</option>
                      <option value="Public Safety">Public Safety & Disaster Cell</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize Officer Email into Database</span>
                      </>
                    )}
                  </button>
                </form>

                {/* List of Currently Authorized Officers */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>Currently Authorized Officers ({authorizedOfficers.length})</span>
                  </h4>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {authorizedOfficers.map((off, idx) => (
                      <div
                        key={off.email || idx}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{off.name}</span>
                            {off.email?.toLowerCase() === OWNER_EMAIL && (
                              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] uppercase font-black rounded">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{off.email} • {off.department}</div>
                        </div>

                        {off.email?.toLowerCase() !== OWNER_EMAIL && (
                          <button
                            type="button"
                            onClick={() => handleRevokeOfficer(off)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            title="Revoke Officer Authorization"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation & Mode Switcher */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {mode === 'owner_portal' ? (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
              }}
              className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Back to Officer Sign In
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            Cancel & Return Home
          </button>
        </div>

        {/* Security Note Footer */}
        <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Ministry of Housing and Urban Affairs • Municipal Command Portal</span>
        </div>
      </div>

      {/* OFFICER REMOVAL CONFIRMATION MODAL */}
      {officerPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Revoke Officer Access?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove this municipal officer? They will immediately lose access to the municipal command portal.
              </p>
            </div>

            {/* Target Officer Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                <span>{officerPendingDeletion.name}</span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono rounded">
                  {officerPendingDeletion.badgeId || 'MUNI-OFF-2026'}
                </span>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {officerPendingDeletion.email}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Department: {officerPendingDeletion.department}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOfficerPendingDeletion(null)}
                disabled={deletingOfficer}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExecuteRevokeOfficer}
                disabled={deletingOfficer}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingOfficer ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Remove Officer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
