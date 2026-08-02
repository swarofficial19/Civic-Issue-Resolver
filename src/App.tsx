import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { CitizenPortal } from './components/CitizenPortal';
import { AdminPortal } from './components/AdminPortal';
import { OfficerLogin } from './components/OfficerLogin';
import { CitizenLogin } from './components/CitizenLogin';
import { ResolutionModal } from './components/ResolutionModal';
import { ToastProvider, useToast } from './components/ToastContext';
import { CivicReport, ReportStatus, Officer, ProofOfResolution } from './types';
import { INITIAL_REPORTS } from './data/seedData';
import { getOfflineDrafts, removeOfflineDraft } from './utils/offlineStorage';
import { 
  testFirestoreConnection, 
  saveReportToFirestore, 
  subscribeToReports,
  auth
} from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'landing' | 'citizen' | 'admin'>('landing');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('nagarpalika_theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [reports, setReports] = useState<CivicReport[]>(INITIAL_REPORTS);
  const [offlineDrafts, setOfflineDrafts] = useState<CivicReport[]>(getOfflineDrafts());
  const [resolutionModalReport, setResolutionModalReport] = useState<CivicReport | null>(null);

  // Officer Authentication State
  const [isOfficerAuthenticated, setIsOfficerAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('civicsolve_officer_auth') === 'true';
  });

  const [officerInfo, setOfficerInfo] = useState<{ name: string; department: string; badgeId: string; email?: string } | null>(() => {
    const saved = sessionStorage.getItem('civicsolve_officer_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Firebase Citizen Authentication State
  const [firebaseCitizenUser, setFirebaseCitizenUser] = useState<FirebaseUser | null>(null);
  const [showCitizenLoginModal, setShowCitizenLoginModal] = useState<boolean>(false);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseCitizenUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleOfficerAuthenticate = (info: { name: string; department: string; badgeId: string; email?: string }) => {
    setIsOfficerAuthenticated(true);
    setOfficerInfo(info);
    sessionStorage.setItem('civicsolve_officer_auth', 'true');
    sessionStorage.setItem('civicsolve_officer_info', JSON.stringify(info));
  };

  const handleOfficerLogout = async () => {
    setIsOfficerAuthenticated(false);
    setOfficerInfo(null);
    sessionStorage.removeItem('civicsolve_officer_auth');
    sessionStorage.removeItem('civicsolve_officer_info');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setActiveTab('landing');
    toast.info('Session locked. Logged out from Officer Command Room.', 'Command Room Locked');
  };

  const handleCitizenLogout = async () => {
    try {
      await signOut(auth);
      toast.info('Signed out from Citizen Account.', 'Citizen Logged Out');
    } catch (err: any) {
      toast.error('Failed to sign out.', 'Error');
    }
  };

  // Sync Dark Mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nagarpalika_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nagarpalika_theme', 'light');
    }
  }, [darkMode]);

  // Network Status Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Network connection restored. Syncing online services.', 'Back Online');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are currently offline. New reports will save as drafts.', 'Offline Mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Initialize Firestore connection and real-time subscription
  useEffect(() => {
    testFirestoreConnection();

    // Seed initial reports to Firestore if Firestore is empty
    fetchReports();

    const unsubscribe = subscribeToReports(
      (firestoreReports) => {
        if (firestoreReports && firestoreReports.length > 0) {
          // Merge or replace with live Firestore data
          setReports(firestoreReports);
        }
      },
      (err) => {
        console.warn('Firestore real-time subscription fallback:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data: CivicReport[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setReports(data);
          // Seed to Firestore in background
          data.forEach(r => saveReportToFirestore(r).catch(() => {}));
        }
      }
    } catch (err) {
      console.warn('API fetch failed, utilizing local state:', err);
    }
  };

  // Submit New Report
  const handleSubmitReport = async (reportData: Partial<CivicReport>): Promise<CivicReport | null> => {
    let created: CivicReport | null = null;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (res.ok) {
        created = await res.json();
      }
    } catch (err) {
      console.error('Error submitting report to API:', err);
    }

    if (!created) {
      // Local fallback if API fails
      created = {
        id: `rpt-${Date.now()}`,
        ticketNo: `MCD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: reportData.title || 'Civic Complaint',
        category: reportData.category || 'Sanitation',
        description: reportData.description || '',
        priority: reportData.priority || 'MEDIUM',
        status: 'Submitted',
        location: reportData.location || {
          lat: 28.5672,
          lng: 77.2435,
          address: 'Ring Road, Lajpat Nagar, New Delhi',
          district: 'Delhi (MCD)'
        },
        imageUrl: reportData.imageUrl || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaHours: 24,
        slaDueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        isSlaOverdue: false,
        aiAnalysis: reportData.aiAnalysis,
        timeline: [{ status: 'Submitted', title: 'Report Filed by Citizen', timestamp: new Date().toISOString() }]
      };
    }

    setReports(prev => [created!, ...prev]);
    // Save to Firestore
    saveReportToFirestore(created).catch(e => console.warn('Firestore save error:', e));

    toast.success(`Ticket #${created.ticketNo} generated and auto-routed via Gemini AI.`, 'Report Submitted!');
    return created;
  };

  // Update Status
  const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
    let updatedReport: CivicReport | null = null;
    setReports(prev =>
      prev.map(r => {
        if (r.id === reportId) {
          const updatedTimeline = [
            ...r.timeline,
            { status, title: `Status updated to ${status}`, timestamp: new Date().toISOString() }
          ];
          updatedReport = { ...r, status, timeline: updatedTimeline, updatedAt: new Date().toISOString() };
          return updatedReport;
        }
        return r;
      })
    );

    if (updatedReport) {
      saveReportToFirestore(updatedReport).catch(e => console.warn('Firestore update error:', e));
    }

    toast.success(`Report status updated to "${status}".`, 'Status Changed');

    try {
      await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.warn('Status update error:', err);
    }
  };

  // Assign Officer
  const handleAssignOfficer = async (
    reportId: string,
    officer: Officer,
    fieldWorker?: { name: string; phone: string }
  ) => {
    let updatedReport: CivicReport | null = null;
    setReports(prev =>
      prev.map(r => {
        if (r.id === reportId) {
          const updatedTimeline = [
            ...r.timeline,
            {
              status: 'In Progress',
              title: `Assigned to ${officer.name} (${officer.designation})`,
              timestamp: new Date().toISOString(),
              actor: officer.name
            }
          ];
          updatedReport = {
            ...r,
            assignedOfficer: officer,
            fieldWorker,
            status: 'In Progress',
            timeline: updatedTimeline,
            updatedAt: new Date().toISOString()
          };
          return updatedReport;
        }
        return r;
      })
    );

    if (updatedReport) {
      saveReportToFirestore(updatedReport).catch(e => console.warn('Firestore officer update error:', e));
    }

    toast.success(`Assigned to ${officer.name} (${officer.designation}).`, 'Officer Dispatched');

    try {
      await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'In Progress',
          assignedOfficer: officer,
          fieldWorker
        })
      });
    } catch (err) {
      console.warn('Officer assignment sync error:', err);
    }
  };

  // Resolution Proof Upload
  const handleSubmitResolution = async (reportId: string, proof: ProofOfResolution) => {
    let updatedReport: CivicReport | null = null;
    setReports(prev =>
      prev.map(r => {
        if (r.id === reportId) {
          const updatedTimeline = [
            ...r.timeline,
            {
              status: 'Resolved',
              title: 'Resolution Verified with Proof Photo',
              timestamp: new Date().toISOString(),
              note: proof.notes,
              actor: proof.resolvedBy
            }
          ];
          updatedReport = {
            ...r,
            status: 'Resolved',
            proofOfResolution: proof,
            timeline: updatedTimeline,
            updatedAt: new Date().toISOString()
          };
          return updatedReport;
        }
        return r;
      })
    );

    if (updatedReport) {
      saveReportToFirestore(updatedReport).catch(e => console.warn('Firestore resolution error:', e));
    }

    toast.success('Resolution proof verified and published.', 'Ticket Resolved');

    try {
      await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Resolved',
          proofOfResolution: proof
        })
      });
    } catch (err) {
      console.warn('Resolution proof sync error:', err);
    }
  };

  // Sync Offline Drafts when online
  const handleSyncDrafts = async () => {
    if (offlineDrafts.length === 0) return;

    for (const draft of offlineDrafts) {
      await handleSubmitReport(draft);
      removeOfflineDraft(draft.id);
    }

    setOfflineDrafts(getOfflineDrafts());
    toast.success('All offline drafts synchronized successfully with Municipal servers!', 'Drafts Synchronized');
  };

  const handleSaveDraft = (draft: CivicReport) => {
    setOfflineDrafts(getOfflineDrafts());
    toast.success('Issue saved to offline drafts in your browser. Auto-syncs when reconnected.', 'Saved as Draft');
  };

  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const criticalOverdueCount = reports.filter(r => r.isSlaOverdue && r.status !== 'Resolved').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isOnline={isOnline}
        draftCount={offlineDrafts.length}
        totalReportsCount={reports.length}
        resolvedCount={resolvedCount}
        criticalOverdueCount={criticalOverdueCount}
        onSyncDrafts={handleSyncDrafts}
        isOfficerAuthenticated={isOfficerAuthenticated}
        officerInfo={officerInfo}
        onLogoutOfficer={handleOfficerLogout}
        firebaseCitizenUser={firebaseCitizenUser}
        onOpenCitizenLogin={() => setShowCitizenLoginModal(true)}
        onLogoutCitizen={handleCitizenLogout}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'landing' ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <LandingPage
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                }}
                reports={reports}
                totalReportsCount={reports.length}
                resolvedCount={resolvedCount}
                criticalOverdueCount={criticalOverdueCount}
              />
            </motion.div>
          ) : activeTab === 'citizen' ? (
            <motion.div
              key={firebaseCitizenUser ? "citizen-portal" : "citizen-login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {firebaseCitizenUser ? (
                <CitizenPortal
                  reports={reports}
                  onSubmitReport={handleSubmitReport}
                  isOnline={isOnline}
                  onSaveDraft={handleSaveDraft}
                  currentUser={firebaseCitizenUser}
                />
              ) : (
                <CitizenLogin
                  onSuccess={(user) => {
                    setFirebaseCitizenUser(user);
                  }}
                  onCancel={() => setActiveTab('landing')}
                />
              )}
            </motion.div>
          ) : activeTab === 'admin' ? (
            <motion.div
              key={isOfficerAuthenticated ? "admin-portal" : "officer-login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {isOfficerAuthenticated ? (
                <AdminPortal
                  reports={reports}
                  onUpdateStatus={handleUpdateStatus}
                  onAssignOfficer={handleAssignOfficer}
                  onOpenResolutionModal={setResolutionModalReport}
                  officerInfo={officerInfo}
                  onLogoutOfficer={handleOfficerLogout}
                />
              ) : (
                <OfficerLogin
                  onAuthenticate={handleOfficerAuthenticate}
                  onCancel={() => setActiveTab('landing')}
                />
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Citizen Login Modal */}
      {showCitizenLoginModal && (
        <CitizenLogin
          isModal
          onSuccess={(user) => {
            setFirebaseCitizenUser(user);
            setShowCitizenLoginModal(false);
          }}
          onCancel={() => setShowCitizenLoginModal(false)}
        />
      )}

      {/* Resolution Proof Modal */}
      {resolutionModalReport && (
        <ResolutionModal
          report={resolutionModalReport}
          onClose={() => setResolutionModalReport(null)}
          onSubmitResolution={handleSubmitResolution}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Digital Nagarpalika India • Ministry of Housing and Urban Affairs (MoHUA)
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Serving Municipal Corporations across India (MCD Delhi, BMC Mumbai, BBMP Bengaluru, KMC Kolkata, GCC Chennai, GHMC Hyderabad, RMC Ranchi & More). Powered by Gemini AI.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
