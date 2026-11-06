import { io, Socket } from 'socket.io-client';
import {
  AuditCase,
  AuditFinding,
  AuditLog,
  AuditWorkpaperPackage,
  BenfordAnalysisResult,
  ConflictRelationship,
  CorrectiveAction,
  DashboardMetrics,
  Department,
  EvidenceDocument,
  FinancialTransaction,
  InventoryAsset,
  SoxControl,
  ThreeWayMatchResult,
  User,
  Vendor,
} from '../types.ts';

const API_BASE = '/api/v1';

export interface PlacementProfile {
  userId: string;
  sections: Record<string, Record<string, unknown>>;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmittedStudent {
  user: User;
  profile: PlacementProfile;
}

export type JobApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'ASSESSMENT'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface StudentJobApplication {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  status: JobApplicationStatus;
  appliedOn?: string;
  applicationUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    email: string;
    studentId?: string;
  };
}

class ApiService {
  private token: string | null = null;
  private socket: Socket | null = null;

  constructor() {
    this.token = localStorage.getItem('studentinsight_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('studentinsight_token', token);
      this.reconnectSocket();
    } else {
      localStorage.removeItem('studentinsight_token');
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    }
  }

  public getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data.data;
  }

  // Auth
  public async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const result = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  public async registerStudent(input: {
    name: string;
    email: string;
    password: string;
    studentId: string;
  }): Promise<{ token: string; user: User }> {
    const result = await this.request<{ token: string; user: User }>('/placement/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setToken(result.token);
    return result;
  }

  public async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  public async getPlacementProfile(): Promise<PlacementProfile> {
    return this.request<PlacementProfile>('/placement/profile');
  }

  public async savePlacementSection(
    section: string,
    values: Record<string, unknown>,
  ): Promise<PlacementProfile> {
    return this.request<PlacementProfile>('/placement/profile', {
      method: 'PUT',
      body: JSON.stringify({ section, values }),
    });
  }

  public async submitPlacementProfile(): Promise<PlacementProfile> {
    return this.request<PlacementProfile>('/placement/profile/submit', { method: 'POST' });
  }

  public async getJobApplications(): Promise<StudentJobApplication[]> {
    return this.request<StudentJobApplication[]>('/placement/applications');
  }

  public async createJobApplication(
    input: Omit<StudentJobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'student'>,
  ): Promise<StudentJobApplication> {
    return this.request<StudentJobApplication>('/placement/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async updateJobApplication(
    id: string,
    input: Partial<Pick<StudentJobApplication, 'companyName' | 'roleTitle' | 'status' | 'appliedOn' | 'applicationUrl' | 'notes'>>,
  ): Promise<StudentJobApplication> {
    return this.request<StudentJobApplication>(`/placement/applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  public async deleteJobApplication(id: string): Promise<void> {
    await this.request<{ deleted: boolean }>(`/placement/applications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  public async getFacultyJobApplications(): Promise<StudentJobApplication[]> {
    return this.request<StudentJobApplication[]>('/placement/applications/faculty');
  }

  public async getSubmittedStudents(search = ''): Promise<SubmittedStudent[]> {
    const query = new URLSearchParams({ search });
    return this.request<SubmittedStudent[]>(`/placement/students?${query.toString()}`);
  }

  public async getSubmittedStudent(id: string): Promise<SubmittedStudent> {
    return this.request<SubmittedStudent>(`/placement/students/${encodeURIComponent(id)}`);
  }

  public async getPlacementActivity(): Promise<Array<{
    actorId: string;
    actorRole: string;
    studentId: string;
    action: string;
    timestamp: string;
  }>> {
    return this.request('/placement/activity');
  }

  // Analytics
  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/analytics/dashboard');
  }

  // Transactions
  public async getTransactions(params?: { status?: string; category?: string; search?: string; departmentId?: string }): Promise<FinancialTransaction[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.departmentId) query.append('departmentId', params.departmentId);
    return this.request<FinancialTransaction[]>(`/transactions?${query.toString()}`);
  }

  public async createTransaction(txData: Partial<FinancialTransaction>): Promise<FinancialTransaction> {
    return this.request<FinancialTransaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    });
  }

  // Reconciliation
  public async runReconciliationScan(): Promise<{
    summary: any;
    findings: AuditFinding[];
  }> {
    return this.request<{ summary: any; findings: AuditFinding[] }>('/reconciliation/scan', {
      method: 'POST',
    });
  }

  // Findings
  public async getFindings(params?: { severity?: string; category?: string; status?: string }): Promise<AuditFinding[]> {
    const query = new URLSearchParams();
    if (params?.severity) query.append('severity', params.severity);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    return this.request<AuditFinding[]>(`/findings?${query.toString()}`);
  }

  public async getFindingDetail(id: string): Promise<AuditFinding> {
    return this.request<AuditFinding>(`/findings/${id}`);
  }

  public async analyzeFindingWithAi(id: string): Promise<{ finding: AuditFinding; analysis: any }> {
    return this.request<{ finding: AuditFinding; analysis: any }>(`/findings/${id}/analyze`, {
      method: 'POST',
    });
  }

  // Cases
  public async getCases(params?: { status?: string; priority?: string }): Promise<AuditCase[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    return this.request<AuditCase[]>(`/cases?${query.toString()}`);
  }

  public async getCaseDetail(id: string): Promise<AuditCase> {
    return this.request<AuditCase>(`/cases/${id}`);
  }

  public async createCase(caseData: {
    title: string;
    findingIds: string[];
    departmentId: string;
    priority: string;
    summary: string;
    dueDate?: string;
  }): Promise<AuditCase> {
    return this.request<AuditCase>('/cases', {
      method: 'POST',
      body: JSON.stringify(caseData),
    });
  }

  public async transitionCase(caseId: string, targetStatus: string, reason: string): Promise<{ case: AuditCase }> {
    return this.request<{ case: AuditCase }>(`/cases/${caseId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, reason }),
    });
  }

  public async addCaseNote(caseId: string, text: string): Promise<{ case: AuditCase }> {
    return this.request<{ case: AuditCase }>(`/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Corrective Actions
  public async getActions(): Promise<CorrectiveAction[]> {
    return this.request<CorrectiveAction[]>('/actions');
  }

  public async updateAction(id: string, updates: {
    status?: string;
    verificationNotes?: string;
    milestoneIndex?: number;
    milestoneCompleted?: boolean;
  }): Promise<CorrectiveAction> {
    return this.request<CorrectiveAction>(`/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Documents
  public async getDocuments(): Promise<EvidenceDocument[]> {
    return this.request<EvidenceDocument[]>('/documents');
  }

  public async uploadDocument(docData: {
    fileName: string;
    ocrText: string;
    fileType?: string;
    fileSize?: number;
    transactionId?: string;
    caseId?: string;
  }): Promise<EvidenceDocument> {
    return this.request<EvidenceDocument>('/documents', {
      method: 'POST',
      body: JSON.stringify(docData),
    });
  }

  // Inventory & Master data
  public async getInventory(): Promise<InventoryAsset[]> {
    return this.request<InventoryAsset[]>('/inventory');
  }

  public async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/departments');
  }

  public async getVendors(): Promise<Vendor[]> {
    return this.request<Vendor[]>('/vendors');
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/logs');
  }

  // 3-Way Reconciliation
  public async getThreeWayMatches(): Promise<ThreeWayMatchResult[]> {
    return this.request<ThreeWayMatchResult[]>('/matching/three-way');
  }

  // Budget Reconciliation
  public async getBudgetReconciliation(): Promise<any[]> {
    return this.request<any[]>('/budget/reconciliation');
  }

  // Vendors
  public async createOrUpdateVendor(vendor: Partial<Vendor>): Promise<Vendor> {
    return this.request<Vendor>('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor),
    });
  }

  // Users (Super Admin)
  public async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  public async createUser(userData: { name: string; email: string; role: string; departmentId?: string; password: string }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  public async toggleUserStatus(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}/status`, {
      method: 'PATCH',
    });
  }

  // Notifications
  public async getNotifications(): Promise<any[]> {
    return this.request<any[]>('/notifications');
  }

  public async markNotificationRead(id: string): Promise<any> {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // Forensic Analytics
  public async getBenfordAnalysis(): Promise<BenfordAnalysisResult> {
    return this.request<BenfordAnalysisResult>('/analytics/benfords-law');
  }

  public async getConflictNetwork(): Promise<ConflictRelationship[]> {
    return this.request<ConflictRelationship[]>('/analytics/conflict-network');
  }

  // SOX 404 Controls
  public async getSoxControls(): Promise<SoxControl[]> {
    return this.request<SoxControl[]>('/compliance/sox-controls');
  }

  public async updateSoxControl(id: string, updates: Partial<SoxControl>): Promise<SoxControl> {
    return this.request<SoxControl>(`/compliance/sox-controls/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async testSoxControl(id: string): Promise<SoxControl> {
    return this.request<SoxControl>(`/compliance/sox-controls/${id}/test`, {
      method: 'POST',
    });
  }

  public async exportWorkpapers(): Promise<AuditWorkpaperPackage> {
    return this.request<AuditWorkpaperPackage>('/compliance/export-workpapers', {
      method: 'POST',
    });
  }

  // Socket.IO
  public initSocket(onEvent: (event: string, data: any) => void) {
    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      this.socket = io({
        auth: { token: this.token },
        transports: ['websocket', 'polling'],
      });

      const events = [
        'audit.finding.created',
        'audit.case.assigned',
        'audit.case.updated',
        'evidence.uploaded',
        'action.deadline.approaching',
        'action.completed',
        'notification.created',
      ];

      events.forEach(evt => {
        this.socket?.on(evt, (payload: any) => {
          onEvent(evt, payload);
        });
      });
    } catch (e) {
      console.warn('Socket connection error:', e);
    }
  }

  private reconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const api = new ApiService();
