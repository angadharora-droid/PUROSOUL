export type Role = 'admin' | 'sales';

export type RegistrationStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export type PaymentMode = 'CASH' | 'CHEQUE' | 'UPI' | 'NEFT' | 'RTGS' | 'IMPS';

export const PAYMENT_MODES: PaymentMode[] = ['CASH', 'CHEQUE', 'UPI', 'NEFT', 'RTGS', 'IMPS'];
export const STATUSES: RegistrationStatus[] = ['ACTIVE', 'COMPLETED', 'EXPIRED'];

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Scheme {
  _id: string;
  name: string;
  advanceAmount: number;
  benefitPerCase: number;
  targetCases: number;
  validityDays: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeSnapshot {
  name: string;
  advanceAmount: number;
  benefitPerCase: number;
  targetCases: number;
  validityDays: number;
}

export interface Progress {
  targetCases: number;
  achievedCases: number;
  remainingCases: number;
  completionPercent: number;
  daysLeft: number | null;
  eligibleForBenefit: boolean;
  benefitAmount: number;
}

export interface UserRef {
  _id: string;
  name: string;
  email?: string;
  role?: Role;
}

export interface Registration {
  _id: string;
  partyName: string;
  scheme: { _id: string; name: string } | string;
  schemeSnapshot: SchemeSnapshot;
  registrationDate: string;
  advanceAmount: number;
  paymentMode: PaymentMode;
  utrNumber?: string;
  screenshotUrl?: string;
  remarks?: string;
  status: RegistrationStatus;
  activationDate?: string;
  expiryDate?: string;
  completedAt?: string;
  currentCases: number;
  benefitEarned: number;
  createdBy?: UserRef;
  createdAt: string;
  progress: Progress;
}

export interface Dispatch {
  _id: string;
  registration: string;
  dispatchDate: string;
  billNumber: string;
  vehicleNumber?: string;
  cases250ml: number;
  cases500ml: number;
  cases1l: number;
  totalCases: number;
  remarks?: string;
  createdBy?: UserRef;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  message?: string;
  user?: UserRef;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface ReportImport {
  _id: string;
  source: 'EMAIL' | 'FILE';
  emailDate?: string;
  emailSubject?: string;
  filename?: string;
  invoicesInFile: number;
  dispatchesCreated: number;
  casesAdded: number;
  duplicates: number;
  unmatchedParties: number;
  skipped: number;
  created: { party: string; cases: number; voucherNo: string; date: string; scheme: string }[];
  createdAt: string;
}

export interface DashboardData {
  cards: {
    active: number;
    completed: number;
    expired: number;
    expiringSoon: number;
    todayDispatchCases: number;
    todayDispatchTrips: number;
    totalBenefits: number;
  };
  completionAvg: number;
  monthly: { label: string; registrations: number; cases: number }[];
  recent: Registration[];
  latestReportImport: ReportImport | null;
}

export interface PrintPayload {
  registration: Registration;
  dispatches: Dispatch[];
  totals: { cases250ml: number; cases500ml: number; cases1l: number; totalCases: number; trips: number };
  timeline: AuditLog[];
}

export interface RegistrationFilters {
  q?: string;
  status?: string;
  scheme?: string;
  bill?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
