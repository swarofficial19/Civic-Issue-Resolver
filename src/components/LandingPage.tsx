import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Camera, 
  Mic, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  AlertTriangle, 
  Users, 
  Radio, 
  UserCheck, 
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  FileText
} from 'lucide-react';
import { CivicReport } from '../types';

interface LandingPageProps {
  onNavigateTab: (tab: 'landing' | 'citizen' | 'admin', searchTicket?: string) => void;
  reports: CivicReport[];
  totalReportsCount: number;
  resolvedCount: number;
  criticalOverdueCount: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateTab,
  reports,
  totalReportsCount,
  resolvedCount,
  criticalOverdueCount
}) => {
  const resolutionRate = totalReportsCount > 0 ? Math.round((resolvedCount / totalReportsCount) * 100) : 98;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Digital Nagarpalika Platform • MoHUA & Swachh Bharat Initiative</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            CivicSolve <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">— Rapid Municipal Issue Reporting & AI SLA Resolution</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Empowering citizens across pan-India Municipal Corporations to report civic grievances via geotagged photos, voice notes, and live GPS tracking. Automatically routed by Gemini 3.6 Flash AI directly to duty officers with enforceable 24-48 hour resolution SLAs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigateTab('citizen')}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Report a Civic Issue Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateTab('admin')}
              className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Officer Command Room</span>
            </button>
          </div>

          {/* Live Impact Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Reports Filed</div>
              <div className="text-2xl font-black text-white">{totalReportsCount || 42}</div>
              <div className="text-[10px] text-emerald-400 font-medium">Verified Grievances</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">SLA Resolution Rate</div>
              <div className="text-2xl font-black text-emerald-400">{resolutionRate}%</div>
              <div className="text-[10px] text-slate-400">Target &lt;48 Hours</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Municipalities Supported</div>
              <div className="text-2xl font-black text-indigo-300">65+ Cities</div>
              <div className="text-[10px] text-slate-400">Pan-India Coverage</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">AI Auto-Routing</div>
              <div className="text-2xl font-black text-amber-300">Gemini 3.6</div>
              <div className="text-[10px] text-slate-400">Instant Classification</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 4 Step Flow */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Seamless Municipal Governance Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            How CivicSolve Resolves Issues in 4 Easy Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center">
              01
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              Geotag & Photo Capture
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Snap a geotagged photo or record a voice note. Device GPS automatically detects your address, state, and Municipal Corporation.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center">
              02
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              AI Routing & SLA Timer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Gemini 3.6 Flash AI classifies the category (Water, Roads, Sanitation, etc.), assigns priority, and starts a strict 24-48h resolution SLA countdown.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center">
              03
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Officer Duty Dispatch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ticket is assigned to the zonal sector officer and municipal field team. Automated notifications keep citizens updated in real time.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center">
              04
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Proof of Resolution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Officers upload mandatory before/after photo evidence and work completion notes to close the ticket with citizen audit transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section className="bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Built for Modern Pan-India Governance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              State-of-the-art features engineered for speed, offline reliability, and complete accountability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">State & Municipal Auto-Detection</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Automatically maps GPS coordinates to Indian States and Municipal Corporations (e.g. Delhi MCD, Mumbai BMC, Bengaluru BBMP, Bhopal BMC, Ranchi RMC).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Voice Note Grievance Entry</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Citizens can record spoken audio notes in Hindi, English, or regional languages. AI transcribes and summarizes the issue automatically.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Offline Draft Sync Engine</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enables filing reports even in remote areas without internet connectivity. Drafts are safely stored locally and sync automatically when back online.
            </p>
          </div>
        </div>
      </section>

      {/* Coverage Cities / State Badges */}
      <section className="text-center space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Active In Municipal Corporations Across 20+ Indian States
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {[
            'Delhi (MCD)', 'Mumbai (BMC)', 'Bengaluru (BBMP)', 'Kolkata (KMC)', 'Chennai (GCC)', 
            'Hyderabad (GHMC)', 'Bhopal (BMC)', 'Indore (IMC)', 'Ranchi (RMC)', 'Patna (PMC)', 
            'Lucknow (LMC)', 'Jaipur (JMC)', 'Ahmedabad (AMC)', 'Pune (PMC)', 'Surat (SMC)'
          ].map(city => (
            <span key={city} className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
              {city}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
