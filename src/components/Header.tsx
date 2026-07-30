import React from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  FileText, 
  UserCheck, 
  Radio,
  Lock,
  LogOut,
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'landing' | 'citizen' | 'admin';
  setActiveTab: (tab: 'landing' | 'citizen' | 'admin') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  isOnline: boolean;
  draftCount: number;
  totalReportsCount: number;
  resolvedCount: number;
  criticalOverdueCount: number;
  onSyncDrafts?: () => void;
  isOfficerAuthenticated?: boolean;
  officerInfo?: { name: string; department: string; badgeId: string } | null;
  onLogoutOfficer?: () => void;
  firebaseCitizenUser?: FirebaseUser | null;
  onOpenCitizenLogin?: () => void;
  onLogoutCitizen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  isOnline,
  draftCount,
  totalReportsCount,
  resolvedCount,
  criticalOverdueCount,
  onSyncDrafts,
  isOfficerAuthenticated = false,
  officerInfo = null,
  onLogoutOfficer,
  firebaseCitizenUser = null,
  onOpenCitizenLogin,
  onLogoutCitizen
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Top Govt Bar */}
      <div className="bg-emerald-800 dark:bg-emerald-950 text-emerald-50 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-emerald-700/50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>भारत सरकार | Govt of India</span>
          </div>
          <span className="hidden sm:inline text-emerald-300">|</span>
          <span className="hidden sm:inline text-emerald-200">Ministry of Housing and Urban Affairs (MoHUA) • Swachh Bharat Mission (Urban)</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-700 text-emerald-100">
                <Wifi className="w-3 h-3 mr-1 text-emerald-300" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-600 text-amber-50">
                <WifiOff className="w-3 h-3 mr-1 text-amber-200" /> Offline Mode
              </span>
            )}
          </div>
          {draftCount > 0 && (
            <button
              onClick={onSyncDrafts}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
            >
              <FileText className="w-3 h-3 mr-1" />
              {draftCount} Drafts {isOnline ? '(Click to Sync)' : '(Pending Sync)'}
            </button>
          )}
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title */}
          <div 
            onClick={() => setActiveTab('landing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  CivicSolve
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Swachh Nagarpalika
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                National Crowdsourced Civic Issue & SLA Resolution System • Pan-India Municipal Corporations
              </p>
            </div>
          </div>

          {/* Controls: Portal View Tabs & Theme Toggle */}
          <div className="flex items-center justify-between md:justify-end space-x-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            {/* Nav Mode Buttons - Hidden on Home Page */}
            {activeTab !== 'landing' && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  id="btn-landing-tab"
                  onClick={() => setActiveTab('landing')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'landing'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Home</span>
                </button>

                <button
                  id="btn-citizen-portal-tab"
                  onClick={() => setActiveTab('citizen')}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'citizen'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Citizen Portal</span>
                </button>

                <button
                  id="btn-admin-portal-tab"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Officer Portal</span>
                  {criticalOverdueCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
                      {criticalOverdueCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* User Login Indicators & Lock Controls */}
            <div className="flex items-center space-x-2">
              {/* Officer Auth Info / Logout */}
              {isOfficerAuthenticated && officerInfo ? (
                <button
                  onClick={onLogoutOfficer}
                  title="Lock & Logout from Officer Command Room"
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-emerald-300 border border-slate-700 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline font-mono">{officerInfo.badgeId}</span>
                  <LogOut className="w-3 h-3 text-rose-400 ml-1" />
                </button>
              ) : null}

              {/* Citizen Auth Info / Login */}
              {firebaseCitizenUser ? (
                <button
                  onClick={onLogoutCitizen}
                  title={`Signed in as ${firebaseCitizenUser.displayName || firebaseCitizenUser.email}. Click to sign out.`}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {firebaseCitizenUser.displayName || firebaseCitizenUser.email?.split('@')[0]}
                  </span>
                  {firebaseCitizenUser.emailVerified ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" title="Email Verified" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-500" title="Email Unverified" />
                  )}
                  <LogOut className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
              ) : onOpenCitizenLogin ? (
                <button
                  onClick={onOpenCitizenLogin}
                  className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-sm transition cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Citizen Login</span>
                </button>
              ) : null}
            </div>

            {/* Dark/Light Mode Toggle */}
            <button
              id="btn-theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer text-xs font-semibold"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 overflow-x-auto gap-4">
          <div className="flex items-center space-x-4 min-w-max">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Total Reports: <strong className="text-slate-900 dark:text-slate-100 font-bold">{totalReportsCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Resolved: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{resolvedCount} ({Math.round((resolvedCount / (totalReportsCount || 1)) * 100)}%)</strong>
            </span>
            {criticalOverdueCount > 0 && (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                SLA Breached: <strong>{criticalOverdueCount} issues</strong>
              </span>
            )}
          </div>
          <div className="hidden lg:flex items-center space-x-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Auto-Routing Active • Gemini 3.6 Flash Powered</span>
          </div>
        </div>
      </div>
    </header>
  );
};
