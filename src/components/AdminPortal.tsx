import React, { useState, useEffect } from 'react';
import { CivicReport, Department, Priority, ReportStatus, District, FilterState, Officer } from '../types';
import { GisMap } from './GisMap';
import { INITIAL_OFFICERS, INDIAN_MUNICIPALITIES } from '../data/seedData';
import { INDIAN_STATES } from '../utils/geoUtils';
import { 
  BarChart3, 
  Map as MapIcon, 
  LayoutGrid, 
  Table as TableIcon, 
  Filter, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  UserPlus, 
  PhoneCall, 
  Upload, 
  Search, 
  Sparkles, 
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  LogOut,
  Crown,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { 
  auth, 
  fetchAllOfficersFromFirestore, 
  saveOfficerToFirestore, 
  deleteOfficerFromFirestore, 
  OfficerRecord 
} from '../lib/firebase';
import { useToast } from './ToastContext';

interface AdminPortalProps {
  reports: CivicReport[];
  onUpdateStatus: (reportId: string, status: ReportStatus) => void;
  onAssignOfficer: (reportId: string, officer: Officer, fieldWorker?: { name: string; phone: string }) => void;
  onOpenResolutionModal: (report: CivicReport) => void;
  officerInfo?: { name: string; department: string; badgeId: string; email?: string } | null;
  onLogoutOfficer?: () => void;
}

const OWNER_EMAIL = 'swarrana2007@gmail.com';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  reports,
  onUpdateStatus,
  onAssignOfficer,
  onOpenResolutionModal,
  officerInfo = null,
  onLogoutOfficer
}) => {
  const { toast } = useToast();

  // Check if active user is Owner swarrana2007@gmail.com
  const isOwner = (
    officerInfo?.email?.toLowerCase().trim() === OWNER_EMAIL ||
    auth.currentUser?.email?.toLowerCase().trim() === OWNER_EMAIL
  );

  // View mode tab: 'map' | 'kanban' | 'table' | 'officers' | 'analytics' | 'owner_manage'
  const [viewMode, setViewMode] = useState<'map' | 'kanban' | 'table' | 'officers' | 'analytics' | 'owner_manage'>('map');

  // Owner Officer Management State
  const [authorizedOfficers, setAuthorizedOfficers] = useState<OfficerRecord[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [addOfficerLoading, setAddOfficerLoading] = useState(false);
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerDept, setNewOfficerDept] = useState('Sanitation');
  const [newOfficerBadge, setNewOfficerBadge] = useState('MUNI-OFF-2026');

  // Officer Removal Confirmation Modal State
  const [officerPendingDeletion, setOfficerPendingDeletion] = useState<OfficerRecord | null>(null);
  const [deletingOfficer, setDeletingOfficer] = useState(false);

  // Load authorized officers when in owner_manage view
  useEffect(() => {
    if (viewMode === 'owner_manage' && isOwner) {
      loadOfficersList();
    }
  }, [viewMode, isOwner]);

  const loadOfficersList = async () => {
    setLoadingOfficers(true);
    try {
      const list = await fetchAllOfficersFromFirestore();
      setAuthorizedOfficers(list);
    } catch (err) {
      console.warn('Error loading officers in AdminPortal:', err);
    } finally {
      setLoadingOfficers(false);
    }
  };

  const handleAddOfficerByOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      toast.error(`Only owner ${OWNER_EMAIL} can add officers.`, 'Permission Denied');
      return;
    }
    if (!newOfficerEmail.trim() || !newOfficerName.trim()) {
      toast.error('Please enter officer email and full name.', 'Invalid Data');
      return;
    }

    setAddOfficerLoading(true);
    try {
      const cleanEmail = newOfficerEmail.trim().toLowerCase();
      await saveOfficerToFirestore({
        email: cleanEmail,
        name: newOfficerName.trim(),
        department: newOfficerDept,
        badgeId: newOfficerBadge.trim() || 'MUNI-OFF-2026',
        role: 'Authorized Officer',
        createdAt: new Date().toISOString(),
        addedBy: OWNER_EMAIL
      });

      toast.success(`Officer ${cleanEmail} authorized successfully!`, 'Officer Authorized');
      setNewOfficerEmail('');
      setNewOfficerName('');
      loadOfficersList();
    } catch (err: any) {
      toast.error('Failed to add officer: ' + err?.message, 'Error');
    } finally {
      setAddOfficerLoading(false);
    }
  };

  const handleRemoveOfficerByOwner = (officer: OfficerRecord) => {
    if (!isOwner) {
      toast.error(`Only owner ${OWNER_EMAIL} can remove officers.`, 'Permission Denied');
      return;
    }
    if (officer.email?.toLowerCase().trim() === OWNER_EMAIL) {
      toast.error('Cannot remove portal owner authorization.', 'Action Restricted');
      return;
    }
    setOfficerPendingDeletion(officer);
  };

  const confirmExecuteOfficerDeletion = async () => {
    if (!officerPendingDeletion || !isOwner) return;
    const targetEmail = officerPendingDeletion.email;
    setDeletingOfficer(true);
    try {
      await deleteOfficerFromFirestore(targetEmail);
      toast.info(`Officer access revoked for ${targetEmail}.`, 'Officer Removed');
      setOfficerPendingDeletion(null);
      await loadOfficersList();
    } catch (err: any) {
      toast.error('Failed to remove officer: ' + err?.message, 'Error');
    } finally {
      setDeletingOfficer(false);
    }
  };

  // Officer search state
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerDeptFilter, setOfficerDeptFilter] = useState('All');
  const [officerStateFilter, setOfficerStateFilter] = useState('All');

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    district: 'All',
    department: 'All',
    status: 'All',
    priority: 'All',
    searchQuery: '',
    slaOverdueOnly: false
  });

  // Selected report for detail drawer
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);

  // Assignment Modal state
  const [assigningReport, setAssigningReport] = useState<CivicReport | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(INITIAL_OFFICERS[0].id);
  const [workerName, setWorkerName] = useState('Manoj Munda');
  const [workerPhone, setWorkerPhone] = useState('+91 98012 33211');

  // Filter logic
  const filteredReports = reports.filter(r => {
    if (filters.district !== 'All' && r.location.district !== filters.district) return false;
    if (filters.department !== 'All' && r.category !== filters.department) return false;
    if (filters.status !== 'All' && r.status !== filters.status) return false;
    if (filters.priority !== 'All' && r.priority !== filters.priority) return false;
    if (filters.slaOverdueOnly && !r.isSlaOverdue) return false;
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      return (
        r.ticketNo.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Metrics
  const totalCount = reports.length;
  const criticalCount = reports.filter(r => r.priority === 'CRITICAL' && r.status !== 'Resolved').length;
  const slaOverdueCount = reports.filter(r => r.isSlaOverdue && r.status !== 'Resolved').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningReport) return;
    const officer = INITIAL_OFFICERS.find(o => o.id === selectedOfficerId) || INITIAL_OFFICERS[0];
    onAssignOfficer(assigningReport.id, officer, { name: workerName, phone: workerPhone });
    setAssigningReport(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Officer Control Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                National Municipal Control Room (Digital Nagarpalika)
              </span>
            </div>

            {officerInfo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Duty Officer: <strong>{officerInfo.name}</strong> ({officerInfo.badgeId})</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Officer Command & SLA Resolution Portal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-Time GIS Mapping • Gemini AI Auto-Routing • Field Duty Officer Assignment
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'map' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>GIS Map</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'kanban' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'table' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Tickets Table</span>
          </button>
          <button
            onClick={() => setViewMode('officers')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'officers' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Officers Directory</span>
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'analytics' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>SLA Metrics</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setViewMode('owner_manage')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'owner_manage'
                  ? 'bg-amber-500 text-slate-950 font-black shadow ring-2 ring-amber-300'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/60'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Manage Officers (Owner)</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Reports Filed</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Delhi, Mumbai, Bengaluru & Cities</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Critical Open
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{criticalCount}</div>
          <div className="text-[11px] text-rose-500 font-medium">Immediate emergency dispatch</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> SLA Breached (&gt;48h)
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{slaOverdueCount}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Overdue tickets highlighted</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolution Rate
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{resolutionRate}%</div>
          <div className="text-[11px] text-slate-500">{resolvedCount} verified resolutions</div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>District & Department Filter Controls</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilters({
                district: 'All',
                department: 'All',
                status: 'All',
                priority: 'All',
                searchQuery: '',
                slaOverdueOnly: false
              })}
              className="text-xs font-bold text-slate-500 hover:text-emerald-600 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Municipality Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Municipality</label>
            <select
              value={filters.district}
              onChange={e => setFilters(f => ({ ...f, district: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
            >
              <option value="All">All Municipalities</option>
              {INDIAN_MUNICIPALITIES.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
            <select
              value={filters.department}
              onChange={e => setFilters(f => ({ ...f, department: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Electrical">Electrical</option>
              <option value="Roads">Roads</option>
              <option value="Water">Water</option>
              <option value="Public Safety">Public Safety</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={e => setFilters(f => ({ ...f, priority: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={e => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                placeholder="Filter by ticket #, ward, landmark..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: GIS MAP DISPLAY */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-emerald-600" />
                Interactive Municipal GIS Map
              </h3>
              <span className="text-xs text-slate-500">
                Displaying {filteredReports.length} pins across Jharkhand
              </span>
            </div>
            <GisMap
              reports={filteredReports}
              selectedReportId={selectedReport?.id}
              onSelectReport={setSelectedReport}
            />
          </div>

          {/* Selected Report Details Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Ticket Inspection Panel</span>
              {selectedReport && (
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </h3>

            {selectedReport ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {selectedReport.ticketNo}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    selectedReport.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedReport.priority} Priority
                  </span>
                </div>

                <img
                  src={selectedReport.imageUrl}
                  alt="Issue thumbnail"
                  className="w-full h-40 object-cover rounded-2xl border border-slate-200"
                />

                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedReport.title}
                </h4>

                <p className="text-slate-600 dark:text-slate-300">
                  {selectedReport.description}
                </p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1 text-[11px]">
                  <div><strong>Location:</strong> {selectedReport.location.address}, {selectedReport.location.district}</div>
                  <div><strong>Department:</strong> {selectedReport.category}</div>
                  <div>
                    <strong>Reporter:</strong> {selectedReport.reporterName || 'Anonymous'}
                    {selectedReport.reporterPhone ? ` • Phone: ${selectedReport.reporterPhone}` : ''}
                    {selectedReport.reporterEmail ? ` • Email: ${selectedReport.reporterEmail}` : ''}
                  </div>
                  {selectedReport.isSlaOverdue && (
                    <div className="text-rose-600 font-bold flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached (&gt;48 hours pending)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setAssigningReport(selectedReport)}
                    className="w-full py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Assign Officer / Worker
                  </button>

                  {selectedReport.status !== 'Resolved' && (
                    <button
                      onClick={() => onOpenResolutionModal(selectedReport)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Resolution Proof & Resolve
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Click any marker pin on the GIS map to inspect details, assign officers, or upload resolution proof.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto">
          {(['Submitted', 'Acknowledged', 'In Progress', 'Resolved'] as ReportStatus[]).map(statusCol => {
            const colReports = filteredReports.filter(r => r.status === statusCol);
            return (
              <div key={statusCol} className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-3xl space-y-3 min-w-[260px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      statusCol === 'Resolved' ? 'bg-emerald-500' :
                      statusCol === 'In Progress' ? 'bg-indigo-500' :
                      statusCol === 'Acknowledged' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}></span>
                    {statusCol}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                    {colReports.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {colReports.map(report => (
                    <div
                      key={report.id}
                      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border ${
                        report.isSlaOverdue ? 'border-rose-400 ring-2 ring-rose-300/50' : 'border-slate-200 dark:border-slate-800'
                      } shadow-sm space-y-3 hover:border-emerald-500 transition`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                          {report.ticketNo}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          report.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {report.priority}
                        </span>
                      </div>

                      <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                        {report.title}
                      </h5>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {report.location.address}, {report.location.district}
                      </div>

                      {report.assignedOfficer && (
                        <div className="text-[10px] bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-slate-700 dark:text-slate-300">
                          Officer: <strong>{report.assignedOfficer.name}</strong>
                        </div>
                      )}

                      {/* Status move dropdown */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <select
                          value={report.status}
                          onChange={e => onUpdateStatus(report.id, e.target.value as ReportStatus)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Acknowledged">Acknowledged</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>

                        {report.status !== 'Resolved' && (
                          <button
                            onClick={() => onOpenResolutionModal(report)}
                            className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                          >
                            Resolve + Proof
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: TICKETS TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Ticket #</th>
                  <th className="px-4 py-3">Issue & Location</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">SLA Status</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Officer</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {report.ticketNo}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{report.title}</div>
                      <div className="text-[10px] text-slate-400">{report.location.address}, {report.location.district}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{report.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        report.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.isSlaOverdue ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">On Track ({report.slaHours}h SLA)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={report.status}
                        onChange={e => onUpdateStatus(report.id, e.target.value as ReportStatus)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold outline-none"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Acknowledged">Acknowledged</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {report.assignedOfficer ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">{report.assignedOfficer.name}</span>
                      ) : (
                        <button
                          onClick={() => setAssigningReport(report)}
                          className="text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          + Assign
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {report.status !== 'Resolved' && (
                        <button
                          onClick={() => onOpenResolutionModal(report)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: OFFICERS DIRECTORY */}
      {viewMode === 'officers' && (
        <div className="space-y-6">
          {/* Officers Search & Filter Toolbar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Pan-India Municipal Officers Directory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search & inspect sector officers assigned across state municipal corporations.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                {INITIAL_OFFICERS.length} Sector Officers On Duty
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={officerSearch}
                  onChange={e => setOfficerSearch(e.target.value)}
                  placeholder="Search officer name, designation, phone, or sector..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* State Filter */}
              <div>
                <select
                  value={officerStateFilter}
                  onChange={e => setOfficerStateFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="All">All States / UTs</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Dept Filter */}
              <div>
                <select
                  value={officerDeptFilter}
                  onChange={e => setOfficerDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="All">All Departments</option>
                  <option value="Sanitation">Sanitation</option>
                  <option value="Water">Water</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Roads">Roads</option>
                  <option value="Public Safety">Public Safety</option>
                </select>
              </div>
            </div>
          </div>

          {/* Officers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INITIAL_OFFICERS.filter(off => {
              if (officerDeptFilter !== 'All' && off.department !== officerDeptFilter) return false;
              if (officerStateFilter !== 'All' && off.state !== officerStateFilter) return false;
              if (officerSearch.trim()) {
                const q = officerSearch.toLowerCase();
                return (
                  off.name.toLowerCase().includes(q) ||
                  off.designation.toLowerCase().includes(q) ||
                  off.department.toLowerCase().includes(q) ||
                  (off.sector && off.sector.toLowerCase().includes(q)) ||
                  (off.municipality && off.municipality.toLowerCase().includes(q)) ||
                  (off.state && off.state.toLowerCase().includes(q)) ||
                  off.phone.includes(q)
                );
              }
              return true;
            }).map(officer => (
              <div key={officer.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-md">
                      {officer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{officer.name}</h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{officer.designation}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                    {officer.department}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sector / Zone:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{officer.sector || 'Central Zone'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Municipality:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{officer.municipality || 'MCD'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">State:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">{officer.state || 'Delhi'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <a href={`tel:${officer.phone}`} className="flex items-center gap-1 font-bold text-emerald-600 hover:underline">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{officer.phone}</span>
                  </a>
                  <span className="text-slate-400 text-[11px] truncate max-w-[140px]">{officer.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: SLA & ANALYTICS VIEW */}
      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Department SLA Performance Breakdown</h3>
            <div className="space-y-3 text-xs">
              {['Water', 'Sanitation', 'Electrical', 'Roads', 'Public Safety'].map(dept => {
                const deptReports = reports.filter(r => r.category === dept);
                const deptResolved = deptReports.filter(r => r.status === 'Resolved').length;
                const pct = deptReports.length > 0 ? Math.round((deptResolved / deptReports.length) * 100) : 0;
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>{dept} Department</span>
                      <span className="text-emerald-600">{pct}% Resolved ({deptResolved}/{deptReports.length})</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Municipal Officers Directory</h3>
            <div className="space-y-3 text-xs">
              {INITIAL_OFFICERS.map(officer => (
                <div key={officer.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{officer.name}</div>
                    <div className="text-slate-500">{officer.designation} • {officer.department}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                      {officer.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OWNER OFFICER MANAGEMENT PANEL (swarrana2007@gmail.com Only) */}
      {viewMode === 'owner_manage' && (
        <div className="space-y-6">
          {!isOwner ? (
            <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
              <h3 className="text-lg font-black text-rose-900 dark:text-rose-200">
                Access Restricted: Owner Authority Required
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
                Only the portal owner (<strong>{OWNER_EMAIL}</strong>) is authorized to add or remove municipal officers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 1 Col: Add New Officer Form */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Authorize New Officer
                    </h3>
                    <p className="text-[11px] text-slate-500">Owner portal control ({OWNER_EMAIL})</p>
                  </div>
                </div>

                <form onSubmit={handleAddOfficerByOwner} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Officer Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newOfficerEmail}
                      onChange={e => setNewOfficerEmail(e.target.value)}
                      placeholder="officer.name@corporation.gov.in"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOfficerName}
                      onChange={e => setNewOfficerName(e.target.value)}
                      placeholder="e.g. Inspector Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Badge / Employee ID
                    </label>
                    <input
                      type="text"
                      value={newOfficerBadge}
                      onChange={e => setNewOfficerBadge(e.target.value)}
                      placeholder="MUNI-OFF-2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Department
                    </label>
                    <select
                      value={newOfficerDept}
                      onChange={e => setNewOfficerDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
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
                    disabled={addOfficerLoading}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {addOfficerLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>Authorize Officer into Database</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right 2 Cols: List of Authorized Officers with Delete Button */}
              <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Authorized Officer Directory in Firestore ({authorizedOfficers.length})
                    </h3>
                  </div>
                  <button
                    onClick={loadOfficersList}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    title="Refresh Registry"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOfficers ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingOfficers ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading officer records...</div>
                ) : authorizedOfficers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No authorized officers in Firestore. Fill out the form to authorize new officers.</div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {authorizedOfficers.map((off, idx) => {
                      const isThisOwner = off.email?.toLowerCase().trim() === OWNER_EMAIL;
                      return (
                        <div
                          key={off.email || idx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{off.name}</span>
                              {isThisOwner && (
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] uppercase font-black rounded-full border border-amber-300 dark:border-amber-700">
                                  System Owner
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono rounded-md">
                                {off.badgeId || 'MUNI-OFF-2026'}
                              </span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{off.email}</span> • {off.department}
                            </div>
                          </div>

                          {!isThisOwner && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOfficerByOwner(off)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs transition border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="Revoke officer access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* OFFICER ASSIGNMENT MODAL */}
      {assigningReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Field Officer & Worker
            </h3>
            <p className="text-xs text-slate-500">Ticket: {assigningReport.ticketNo} — {assigningReport.title}</p>

            <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Duty Officer</label>
                <select
                  value={selectedOfficerId}
                  onChange={e => setSelectedOfficerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {INITIAL_OFFICERS.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.designation} - {o.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Field Contractor / Worker Name</label>
                <input
                  type="text"
                  value={workerName}
                  onChange={e => setWorkerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Worker Mobile Contact</label>
                <input
                  type="text"
                  value={workerPhone}
                  onChange={e => setWorkerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAssigningReport(null)}
                  className="px-3 py-1.5 rounded-xl text-slate-500 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold shadow cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER OFFICER REMOVAL CONFIRMATION MODAL */}
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
                onClick={confirmExecuteOfficerDeletion}
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
