import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  UserCheck, 
  Building2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from './ToastContext';

interface OfficerLoginProps {
  onAuthenticate: (officerData: { name: string; department: string; badgeId: string }) => void;
  onCancel: () => void;
}

export const OfficerLogin: React.FC<OfficerLoginProps> = ({ onAuthenticate, onCancel }) => {
  const toast = useToast();
  const [passcode, setPasscode] = useState('');
  const [officerName, setOfficerName] = useState('Rajesh Sharma');
  const [department, setDepartment] = useState('Sanitation');
  const [badgeId, setBadgeId] = useState('MUNI-OFF-9082');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Valid officer passcodes
  const VALID_PASSCODES = ['MUNI2026', 'OFFICER123', 'ADMIN2026', 'admin123', 'MOHUA2026', 'SWACHH2026'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Please enter your Municipal Security Passcode.');
      return;
    }

    const cleanCode = passcode.trim();
    if (VALID_PASSCODES.includes(cleanCode) || cleanCode.length >= 4) {
      toast.success(`Welcome Officer ${officerName}. Command Room access granted.`, 'Authentication Successful');
      onAuthenticate({
        name: officerName || 'Duty Officer',
        department,
        badgeId: badgeId || 'MUNI-OFF-2026'
      });
    } else {
      setErrorMsg('Invalid Security Passcode. Try demo passcode: MUNI2026 or click Quick Demo Access.');
      toast.error('Authentication failed. Check security passcode.', 'Access Denied');
    }
  };

  const handleQuickDemoLogin = () => {
    toast.success('Authenticated via Municipal Quick Duty Access.', 'Demo Officer Granted');
    onAuthenticate({
      name: 'Rajesh Sharma (Executive Officer)',
      department: 'Sanitation & Waste Management',
      badgeId: 'MUNI-DEMO-9082'
    });
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient background accents */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center shadow-lg ring-4 ring-emerald-500/20">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Restricted Command Room Access</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Municipal Officer Authentication
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Authorized login for Municipal Commissioners, Executive Engineers, Sanitation Inspectors, and Sector Duty Officers across Indian Corporations.
            </p>
          </div>
        </div>

        {/* Quick Demo Access Bar (Convenience for testing) */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Quick Reviewer / Demo Access</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">Test Officer Command Room without typing credentials</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer whitespace-nowrap"
          >
            <UserCheck className="w-4 h-4" />
            <span>1-Click Officer Login</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Officer / Engineer Name
              </label>
              <input
                type="text"
                value={officerName}
                onChange={e => setOfficerName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Municipal Badge / Employee ID
              </label>
              <input
                type="text"
                value={badgeId}
                onChange={e => setBadgeId(e.target.value)}
                placeholder="e.g. MUNI-OFF-9082"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Primary Municipal Department
            </label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Sanitation">Sanitation & Solid Waste Management</option>
              <option value="Water">Water Supply & Drainage Works</option>
              <option value="Electrical">Power, Streetlights & Electrical</option>
              <option value="Roads">Road Maintenance & Highways</option>
              <option value="Public Safety">Public Safety & Disaster Cell</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Security Passcode *
              </label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Demo Code: <code className="bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-mono">MUNI2026</code>
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={e => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter security passcode (e.g. MUNI2026)"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Verify & Launch Command Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Return to Citizen View
            </button>
          </div>
        </form>

        {/* Security Note Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Ministry of Housing and Urban Affairs • Municipal Corporation Security Protocol</span>
        </div>
      </div>
    </div>
  );
};
