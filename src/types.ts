export type UserRole =
  | 'SUPER_ADMIN'
  | 'CHIEF_AUDITOR'
  | 'FINANCIAL_AUDITOR'
  | 'DEPARTMENT_MANAGER'
  | 'COMPLIANCE_OFFICER'
  | 'FACULTY'
  | 'STUDENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  departmentId?: string;
  studentId?: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export type TransactionStatus = 'CLEARED' | 'PENDING' | 'FLAGGED' | 'RECONCILED' | 'VOIDED';

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  departmentId: string;
  transactionRef: string;
  date: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: string;
  category: 'CAPEX' | 'OPEX' | 'PAYROLL' | 'CONSULTING' | 'LOGISTICS' | 'SOFTWARE';
  glAccount: string;
  invoiceNumber?: string;
  purchaseOrderNumber?: string;
  hasDocument: boolean;
  documentId?: string;
  status: TransactionStatus;
  discrepancyType?: 'DUPLICATE' | 'PO_MISMATCH' | 'MISSING_DOC' | 'UNUSUAL_AMOUNT' | 'NONE';
  description: string;
  approvedBy?: string;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  departmentId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  issueDate: string;
  status: 'ISSUED' | 'FULFILLED' | 'CANCELLED';
  matchedInvoiceNumber?: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  poNumber?: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  taxAmount: number;
  status: 'PENDING' | 'APPROVED' | 'DISPUTED' | 'PAID';
  varianceAmount?: number;
}

export interface GoodsReceipt {
  id: string;
  organizationId: string;
  receiptNumber: string;
  poNumber: string;
  vendorId: string;
  receivedDate: string;
  receivedBy: string;
  items: Array<{
    itemDescription: string;
    quantityReceived: number;
    condition: 'ACCEPTED' | 'DAMAGED' | 'SHORT';
  }>;
  carrier: string;
  trackingNumber?: string;
}

export interface ThreeWayMatchResult {
  matchId: string;
  poNumber: string;
  invoiceNumber: string;
  receiptNumber?: string;
  vendorName: string;
  departmentId: string;
  poAmount: number;
  invoicedAmount: number;
  varianceAmount: number;
  variancePercent: number;
  status: 'PERFECT_MATCH' | 'PRICE_VARIANCE' | 'QUANTITY_VARIANCE' | 'MISSING_RECEIPT' | 'UNMATCHED_INVOICE';
  details: string;
  reconciliationFindingId?: string;
}

export interface InventoryAsset {
  id: string;
  organizationId: string;
  departmentId: string;
  sku: string;
  name: string;
  category: string;
  ledgerQuantity: number;
  physicalQuantity: number;
  discrepancyUnits: number;
  unitCost: number;
  varianceValue: number;
  location: string;
  lastAuditedDate: string;
}

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingCategory =
  | 'DUPLICATE_PAYMENT'
  | 'PO_INVOICE_VARIANCE'
  | 'MISSING_DOCUMENTATION'
  | 'UNUSUAL_EXPENDITURE'
  | 'INVENTORY_DISCREPANCY'
  | 'POLICY_BREACH';

export interface AuditFinding {
  id: string;
  organizationId: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  affectedRecordIds: string[];
  departmentId: string;
  amountAtRisk: number;
  explanation: string;
  supportingEvidence: string;
  status: 'DETECTED' | 'ASSIGNED_TO_CASE' | 'RESOLVED' | 'FALSE_POSITIVE';
  detectedAt: string;
  caseId?: string;
  aiRiskScore?: number;
  aiAnalysis?: string;
}

export type CaseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'EVIDENCE_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESOLVED'
  | 'CLOSED';

export interface AuditCase {
  id: string;
  organizationId: string;
  caseNumber: string;
  title: string;
  findingIds: string[];
  departmentId: string;
  leadInvestigatorId: string;
  leadInvestigatorName: string;
  status: CaseStatus;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  summary: string;
  notes: Array<{
    id: string;
    authorId: string;
    authorName: string;
    role: string;
    timestamp: string;
    text: string;
  }>;
  transitions: Array<{
    from: CaseStatus;
    to: CaseStatus;
    changedBy: string;
    timestamp: string;
    reason: string;
  }>;
  findings?: AuditFinding[];
  relatedActions?: CorrectiveAction[];
}

export interface EvidenceDocument {
  id: string;
  organizationId: string;
  caseId?: string;
  transactionId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  ocrExtractedText?: string;
  aiVerification?: {
    confidenceScore: number;
    vendorMatched: string;
    amountDetected: number;
    dateDetected: string;
    discrepanciesNoted: string[];
    isSuspicious: boolean;
  };
}

export interface CorrectiveAction {
  id: string;
  organizationId: string;
  caseId: string;
  title: string;
  description: string;
  departmentId: string;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'OVERDUE';
  milestones: Array<{
    title: string;
    completed: boolean;
    completedAt?: string;
  }>;
  verificationNotes?: string;
  completionDate?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface DashboardMetrics {
  totalTransactionsCount: number;
  flaggedTransactionsCount: number;
  reconciledTransactionsCount: number;
  totalSpendYTD: number;
  totalExposureAtRisk: number;
  activeFindingsCount: number;
  criticalFindingsCount: number;
  openCasesCount: number;
  overdueActionsCount: number;
  departmentMetrics: Array<{
    id: string;
    name: string;
    budget: number;
    spent: number;
    findingsCount: number;
    riskScore: number;
  }>;
  findingsByCategory: Array<{
    category: string;
    label: string;
    count: number;
    amount: number;
  }>;
  monthlyExpenditureTrend: Array<{
    month: string;
    actualSpend: number;
    budgetCap: number;
    anomaliesDetected: number;
  }>;
  casesByStatus: Array<{
    status: string;
    count: number;
  }>;
  auditorWorkload: Array<{
    auditorName: string;
    role: string;
    activeCases: number;
    resolvedCases: number;
  }>;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  budgetAllocated: number;
  budgetSpent: number;
  headOfDepartment: string;
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  taxId: string;
  category: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  paymentTerms: string;
  bankAccountLast4: string;
  totalSpendYTD: number;
  activeDiscrepancies: number;
}

export interface BenfordDigitStat {
  digit: number;
  observedCount: number;
  observedFrequency: number;
  theoreticalFrequency: number;
  difference: number;
  isAnomalous: boolean;
}

export interface BenfordAnalysisResult {
  totalSampleCount: number;
  chiSquareStatistic: number;
  criticalThreshold95: number;
  conformityRating: 'CONFORMING' | 'ACCEPTABLE' | 'NON_CONFORMING_ANOMALY';
  digitStats: BenfordDigitStat[];
  highRiskTransactions: Array<{
    id: string;
    transactionRef: string;
    amount: number;
    vendorName: string;
    firstDigit: number;
    category: string;
    deviationReason: string;
  }>;
}

export interface ConflictRelationship {
  id: string;
  vendorId: string;
  vendorName: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  departmentName: string;
  conflictType: 'SHARED_BANK_ROUTING' | 'SHARED_ADDRESS' | 'SHARED_PHONE' | 'SHARED_TAX_ID';
  matchedAttribute: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  details: string;
  recommendedAction: string;
  flaggedDate: string;
}

export interface SoxControl {
  id: string;
  controlCode: string;
  name: string;
  framework: 'SOX_404' | 'COSO_2013' | 'PCAOB';
  category: 'FINANCIAL_REPORTING' | 'IT_GENERAL_CONTROLS' | 'PROCUREMENT' | 'INVENTORY';
  frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'CONTINUOUS';
  testingType: 'TEST_OF_OPERATING_EFFECTIVENESS' | 'TEST_OF_DESIGN';
  controlOwner: string;
  controlOwnerTitle: string;
  sampleSizeTested: number;
  sampleExceptionsFound: number;
  status: 'EFFECTIVE' | 'DEFICIENCY' | 'SIGNIFICANT_DEFICIENCY' | 'MATERIAL_WEAKNESS' | 'PENDING_TESTING';
  lastTestedDate: string;
  walkthroughNotes: string;
  mitigationPlan?: string;
}

export interface AuditWorkpaperPackage {
  exportId: string;
  generatedAt: string;
  generatedBy: string;
  auditorRole: string;
  organizationName: string;
  fiscalYear: string;
  sha256Checksum: string;
  summary: {
    totalSpendYTD: number;
    totalFindings: number;
    activeCases: number;
    soxDeficiencies: number;
    benfordConformity: string;
    exposureAtRisk: number;
  };
  attestationStatement: string;
  signOffLeadAuditor: string;
  tamperProofSeal: string;
}
