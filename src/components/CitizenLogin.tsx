import React, { useState } from 'react';
import { 
  UserCheck, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  LogOut,
  Send
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithPopup, 
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useToast } from './ToastContext';

interface CitizenLoginProps {
  onSuccess?: (user: FirebaseUser) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const CitizenLogin: React.FC<CitizenLoginProps> = ({ 
  onSuccess, 
  onCancel,
  isModal = false 
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Helper to map Firebase error codes to user-friendly messages
  const getErrorMessage = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This citizen account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials or create a new account.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again or reset your password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by browser. Please allow popups for this site.';
      default:
        return error?.message || 'Authentication failed. Please try again.';
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      toast.success(`Welcome, ${result.user.displayName || result.user.email}!`, 'Google Sign-In Successful');
      if (onSuccess) onSuccess(result.user);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      toast.error(msg, 'Google Sign-In Failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email/Password Sign-In Handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      toast.success(`Signed in as ${user.displayName || user.email}`, 'Authentication Successful');
      
      if (!user.emailVerified) {
        toast.info('Your email is not verified yet. Check your inbox for the verification link.', 'Email Verification Pending');
      }

      if (onSuccess) onSuccess(user);
    } catch (err: any) {
      console.error('Sign-in Error:', err);
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      toast.error(msg, 'Sign-In Failed');
    } finally {
      setLoading(false);
    }
  };

  // Registration Handler with Email Verification
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Update Display Name
      await updateProfile(user, {
        displayName: name.trim()
      });

      // 3. Send Email Verification
      try {
        await sendEmailVerification(user);
        toast.success(`Verification email sent to ${email.trim()}. Please verify your account.`, 'Email Verification Sent');
      } catch (verifyErr) {
        console.warn('Email verification dispatch error:', verifyErr);
      }

      toast.success(`Citizen account created for ${name.trim()}!`, 'Registration Successful');
      if (onSuccess) onSuccess(user);
    } catch (err: any) {
      console.error('Registration Error:', err);
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      toast.error(msg, 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address to receive reset instructions.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      toast.success(`Password reset email dispatched to ${email.trim()}`, 'Reset Email Sent');
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      toast.error(msg, 'Reset Request Failed');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Header Icon & Mode Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Firebase Auth Protected</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {mode === 'signin' && 'Citizen Portal Sign In'}
              {mode === 'signup' && 'Create Citizen Account'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
              {mode === 'signin' && 'Sign in with your verified email or Google account to access grievance tracking.'}
              {mode === 'signup' && 'Register your citizen profile with email verification for official portal access.'}
              {mode === 'forgot' && 'Enter your registered email address to receive a secure password reset link.'}
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Google Sign-In Button (Available for Signin / Signup) */}
        {mode !== 'forgot' && (
          <div className="space-y-3">
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
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google Account</span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold absolute">
                or email
              </span>
            </div>
          </div>
        )}

        {/* Form: SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('forgot');
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
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
              className="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Citizen Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: SIGN UP / REGISTER */}
        {mode === 'signup' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="priya@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password (min 6 chars) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Register & Send Verification Link</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {resetSent ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <Send className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Reset Link Sent</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Please check <strong className="text-emerald-700 dark:text-emerald-300">{email}</strong> inbox to set your new password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResetSent(false);
                    setMode('signin');
                  }}
                  className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setMode('signin');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Send Password Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Toggle Mode Switcher */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          {mode === 'signin' && (
            <span>
              Don't have a citizen account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('signup');
                }}
                className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Register Now
              </button>
            </span>
          )}

          {mode === 'signup' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('signin');
                }}
                className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          )}

          {mode === 'forgot' && !resetSent && (
            <span>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('signin');
                }}
                className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          )}
        </div>

        {onCancel && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Cancel & Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
        {content}
      </div>
    );
  }

  return content;
};
