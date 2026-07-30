export type Department = 'Sanitation' | 'Electrical' | 'Roads' | 'Water' | 'Public Safety';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ReportStatus = 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved';

export type District = string;

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  district: District;
  state?: string;
  pincode?: string;
}

export interface Officer {
  id: string;
  name: string;
  designation: string;
  phone: string;
  department: Department;
  email?: string;
  state?: string;
  municipality?: string;
  sector?: string;
}

export interface ProofOfResolution {
  imageUrl: string;
  notes: string;
  resolvedAt: string;
  resolvedBy: string;
  workerPhone?: string;
}

export interface AIAnalysis {
  priority: Priority;
  category: Department;
  confidence: number;
  summary: string;
  suggestedDepartment: string;
  actionSteps: string[];
}

export interface TimelineEvent {
  status: ReportStatus;
  title: string;
  timestamp: string;
  note?: string;
  actor?: string;
}

export interface CivicReport {
  id: string;
  ticketNo: string;
  title: string;
  category: Department;
  description: string;
  priority: Priority;
  status: ReportStatus;
  location: LocationData;
  imageUrl: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
  assignedOfficer?: Officer;
  fieldWorker?: {
    name: string;
    phone: string;
  };
  slaHours: number;
  slaDueDate: string;
  isSlaOverdue: boolean;
  proofOfResolution?: ProofOfResolution;
  aiAnalysis?: AIAnalysis;
  timeline: TimelineEvent[];
  reporterName?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  isAnonymous?: boolean;
  isOfflineDraft?: boolean;
}

export interface FilterState {
  district: District | 'All';
  department: Department | 'All';
  status: ReportStatus | 'All';
  priority: Priority | 'All';
  searchQuery: string;
  slaOverdueOnly: boolean;
}
