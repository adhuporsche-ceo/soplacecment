import fs from 'fs';
import path from 'path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/index.ts';
import {
  User,
  Organization,
  Department,
  FinancialTransaction,
  Vendor,
  PurchaseOrder,
  Invoice,
  InventoryAsset,
  AuditFinding,
  AuditCase,
  EvidenceDocument,
  CorrectiveAction,
  GoodsReceipt,
  ThreeWayMatchResult,
  NotificationItem,
  AuditLog,
  SoxControl,
} from '../types/index.ts';

interface DatabaseSchema {
  organizations: Organization[];
  departments: Department[];
  users: User[];
  transactions: FinancialTransaction[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  goodsReceipts: GoodsReceipt[];
  inventoryAssets: InventoryAsset[];
  findings: AuditFinding[];
  cases: AuditCase[];
  evidenceDocuments: EvidenceDocument[];
  correctiveActions: CorrectiveAction[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  soxControls: SoxControl[];
}

interface MongoRecord {
  _id: string;
  [key: string]: unknown;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'auditmind360.json');

class DatabaseRepository {
  private initialized = false;

  private collection(name: string) {
    const collectionName = name === 'users' ? 'placement_users' : name;
    const collection = mongoose.connection.db?.collection<MongoRecord>(collectionName);
    if (!collection) throw new Error('MongoDB is not connected; repository access is unavailable.');
    return collection;
  }

  private async list<T extends { id: string }>(name: string, orgId?: string): Promise<T[]> {
    const filter = orgId ? { organizationId: orgId } : {};
    const documents = await this.collection(name).find(filter).toArray();
    return documents.map(({ _id: _ignored, ...record }) => record as T);
  }

  private async one<T extends { id: string }>(name: string, id: string): Promise<T | undefined> {
    const document = await this.collection(name).findOne({ _id: id });
    if (!document) return undefined;
    const { _id: _ignored, ...record } = document;
    return record as T;
  }

  private async insert<T extends { id: string }>(name: string, record: T): Promise<T> {
    await this.collection(name).insertOne({ ...record, _id: record.id });
    return record;
  }

  private async update<T extends { id: string }>(
    name: string,
    id: string,
    updates: Partial<T>,
  ): Promise<T | null> {
    const fields = { ...updates } as Record<string, unknown>;
    delete fields.id;
    const result = await this.collection(name).updateOne({ _id: id }, { $set: fields });
    return result.matchedCount ? (await this.one<T>(name, id)) || null : null;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB must be connected before initializing application data.');
    }

    const users = this.collection('users');
    await users.createIndex({ email: 1 }, { unique: true, name: 'unique_placement_user_email' });
    await users.createIndex(
      { studentId: 1 },
      { unique: true, sparse: true, name: 'unique_student_id' },
    );

    for (const account of config.loginAccounts) {
      if (await users.findOne({ _id: account.id })) continue;
      const user: User = {
        id: account.id,
        email: account.email,
        passwordHash: await bcrypt.hash(account.password, 12),
        name: account.name,
        role: account.role,
        organizationId: config.defaultOrgId,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      await users.insertOne({ ...user, _id: user.id });
    }

    this.initialized = true;
  }

  public async seedRecords<T extends { id: string }>(name: string, records: T[]): Promise<void> {
    const collection = this.collection(name);
    if (records.length) {
      await collection.bulkWrite(
        records.map(record => ({
          updateOne: {
            filter: { _id: record.id },
            update: { $setOnInsert: { ...record, _id: record.id } },
            upsert: true,
          },
        })),
        { ordered: true },
      );
    }
  }

  private generateInitialSeedData(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const seedPassword = randomBytes(32).toString('hex');
    const passwordHash = bcrypt.hashSync(seedPassword, salt);
    const now = new Date().toISOString();
    const orgId = 'org_apex_global';

    const organizations: Organization[] = [
      {
        id: orgId,
        name: 'Apex Global Corporation',
        code: 'AGC-HQ',
        fiscalYear: 'FY2026',
        currency: 'USD',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const departments: Department[] = [
      {
        id: 'dept_procurement',
        organizationId: orgId,
        name: 'Strategic Procurement',
        code: 'PROC-01',
        budgetAllocated: 4500000,
        budgetSpent: 3820000,
        headOfDepartment: 'Marcus Vance',
      },
      {
        id: 'dept_finance',
        organizationId: orgId,
        name: 'Finance & Treasury',
        code: 'FIN-02',
        budgetAllocated: 2800000,
        budgetSpent: 2150000,
        headOfDepartment: 'Claire Sterling',
      },
      {
        id: 'dept_it_infra',
        organizationId: orgId,
        name: 'Enterprise IT & Cloud',
        code: 'ENG-03',
        budgetAllocated: 6200000,
        budgetSpent: 5910000,
        headOfDepartment: 'David Chen',
      },
      {
        id: 'dept_operations',
        organizationId: orgId,
        name: 'Global Operations',
        code: 'OPS-04',
        budgetAllocated: 7500000,
        budgetSpent: 6450000,
        headOfDepartment: 'Elena Rostova',
      },
      {
        id: 'dept_logistics',
        organizationId: orgId,
        name: 'Supply Chain & Logistics',
        code: 'LOG-05',
        budgetAllocated: 3400000,
        budgetSpent: 3290000,
        headOfDepartment: 'Julian Moore',
      },
    ];

    const users: User[] = [
      {
        id: 'usr_super_admin',
        email: 'admin@auditmind360.io',
        passwordHash,
        name: 'Alexandra Wright',
        role: 'SUPER_ADMIN',
        organizationId: orgId,
        createdAt: now,
        isActive: true,
      },
      {
        id: 'usr_chief_auditor',
        email: 'chief.auditor@auditmind360.io',
        passwordHash,
        name: 'Robert Hastings (CIA, CISA)',
        role: 'CHIEF_AUDITOR',
        organizationId: orgId,
        createdAt: now,
        isActive: true,
      },
      {
        id: 'usr_fin_auditor',
        email: 'auditor.fin@auditmind360.io',
        passwordHash,
        name: 'Sarah Jenkins (CPA)',
        role: 'FINANCIAL_AUDITOR',
        organizationId: orgId,
        createdAt: now,
        isActive: true,
      },
      {
        id: 'usr_dept_manager',
        email: 'dept.manager@auditmind360.io',
        passwordHash,
        name: 'David Chen (IT Director)',
        role: 'DEPARTMENT_MANAGER',
        organizationId: orgId,
        departmentId: 'dept_it_infra',
        createdAt: now,
        isActive: true,
      },
      {
        id: 'usr_compliance',
        email: 'compliance.officer@auditmind360.io',
        passwordHash,
        name: 'Evelyn Brooks (JD)',
        role: 'COMPLIANCE_OFFICER',
        organizationId: orgId,
        createdAt: now,
        isActive: true,
      },
    ];

    const vendors: Vendor[] = [
      {
        id: 'vnd_titan_cloud',
        organizationId: orgId,
        name: 'Titan Cloud Systems LLC',
        taxId: 'US-94-2819034',
        category: 'Software & Infrastructure',
        riskRating: 'LOW',
        paymentTerms: 'NET 30',
        bankAccountLast4: '8831',
        totalSpendYTD: 1420000,
        activeDiscrepancies: 1,
      },
      {
        id: 'vnd_nordic_logistics',
        organizationId: orgId,
        name: 'Nordic Supply & Freight Logistics',
        taxId: 'US-36-8192044',
        category: 'Freight & Transportation',
        riskRating: 'HIGH',
        paymentTerms: 'NET 15',
        bankAccountLast4: '4192',
        totalSpendYTD: 890000,
        activeDiscrepancies: 2,
      },
      {
        id: 'vnd_kestrel_consulting',
        organizationId: orgId,
        name: 'Kestrel Advisory Partners',
        taxId: 'US-13-9921003',
        category: 'Professional Advisory',
        riskRating: 'MEDIUM',
        paymentTerms: 'NET 45',
        bankAccountLast4: '7720',
        totalSpendYTD: 640000,
        activeDiscrepancies: 1,
      },
      {
        id: 'vnd_apex_precision',
        organizationId: orgId,
        name: 'Apex Precision Equipment',
        taxId: 'US-82-4410982',
        category: 'Heavy Machinery & Parts',
        riskRating: 'LOW',
        paymentTerms: 'NET 30',
        bankAccountLast4: '1109',
        totalSpendYTD: 2100000,
        activeDiscrepancies: 0,
      },
      {
        id: 'vnd_vanguard_cyber',
        organizationId: orgId,
        name: 'Vanguard Cyber Defense AG',
        taxId: 'US-45-7761099',
        category: 'Cybersecurity & Auditing',
        riskRating: 'LOW',
        paymentTerms: 'NET 30',
        bankAccountLast4: '5562',
        totalSpendYTD: 420000,
        activeDiscrepancies: 0,
      },
    ];

    const purchaseOrders: PurchaseOrder[] = [
      {
        id: 'po_4901',
        organizationId: orgId,
        departmentId: 'dept_it_infra',
        poNumber: 'PO-2026-4901',
        vendorId: 'vnd_titan_cloud',
        vendorName: 'Titan Cloud Systems LLC',
        items: [
          { itemDescription: 'Cloud Cluster Compute Nodes Q1', quantity: 12, unitPrice: 8500, lineTotal: 102000 },
          { itemDescription: 'High-Throughput SAN Storage Tier 1', quantity: 2, unitPrice: 14000, lineTotal: 28000 },
        ],
        totalAmount: 130000,
        issueDate: '2026-01-12T09:00:00.000Z',
        status: 'FULFILLED',
        matchedInvoiceNumber: 'INV-TCS-8812',
      },
      {
        id: 'po_4902',
        organizationId: orgId,
        departmentId: 'dept_logistics',
        poNumber: 'PO-2026-4902',
        vendorId: 'vnd_nordic_logistics',
        vendorName: 'Nordic Supply & Freight Logistics',
        items: [
          { itemDescription: 'Intermodal Freight Drayage 24 Loads', quantity: 24, unitPrice: 2200, lineTotal: 52800 },
        ],
        totalAmount: 52800,
        issueDate: '2026-02-04T11:30:00.000Z',
        status: 'ISSUED',
        matchedInvoiceNumber: 'INV-NSF-9021', // Invoice has 64,200 ($11,400 mismatch!)
      },
      {
        id: 'po_4903',
        organizationId: orgId,
        departmentId: 'dept_procurement',
        poNumber: 'PO-2026-4903',
        vendorId: 'vnd_kestrel_consulting',
        vendorName: 'Kestrel Advisory Partners',
        items: [
          { itemDescription: 'Regulatory Tax Compliance Review', quantity: 1, unitPrice: 45000, lineTotal: 45000 },
        ],
        totalAmount: 45000,
        issueDate: '2026-02-18T14:15:00.000Z',
        status: 'ISSUED',
      },
    ];

    const invoices: Invoice[] = [
      {
        id: 'inv_8812',
        organizationId: orgId,
        invoiceNumber: 'INV-TCS-8812',
        vendorId: 'vnd_titan_cloud',
        vendorName: 'Titan Cloud Systems LLC',
        poNumber: 'PO-2026-4901',
        issueDate: '2026-01-20T10:00:00.000Z',
        dueDate: '2026-02-19T23:59:59.000Z',
        totalAmount: 130000,
        taxAmount: 9100,
        status: 'PAID',
        varianceAmount: 0,
      },
      {
        id: 'inv_9021',
        organizationId: orgId,
        invoiceNumber: 'INV-NSF-9021',
        vendorId: 'vnd_nordic_logistics',
        vendorName: 'Nordic Supply & Freight Logistics',
        poNumber: 'PO-2026-4902',
        issueDate: '2026-02-14T15:20:00.000Z',
        dueDate: '2026-03-01T23:59:59.000Z',
        totalAmount: 64200, // Discrepancy: PO was 52,800! (+$11,400 unapproved fuel surcharges)
        taxAmount: 4494,
        status: 'DISPUTED',
        varianceAmount: 11400,
      },
      {
        id: 'inv_7741_a',
        organizationId: orgId,
        invoiceNumber: 'INV-KAP-7741',
        vendorId: 'vnd_kestrel_consulting',
        vendorName: 'Kestrel Advisory Partners',
        poNumber: 'PO-2026-4903',
        issueDate: '2026-02-28T09:00:00.000Z',
        dueDate: '2026-04-14T23:59:59.000Z',
        totalAmount: 22500,
        taxAmount: 0,
        status: 'APPROVED',
        varianceAmount: 0,
      },
      {
        id: 'inv_7741_b',
        organizationId: orgId,
        invoiceNumber: 'INV-KAP-7741', // Exact duplicate invoice number!
        vendorId: 'vnd_kestrel_consulting',
        vendorName: 'Kestrel Advisory Partners',
        issueDate: '2026-03-04T12:00:00.000Z',
        dueDate: '2026-04-18T23:59:59.000Z',
        totalAmount: 22500,
        taxAmount: 0,
        status: 'DISPUTED',
        varianceAmount: 0,
      },
    ];

    const goodsReceipts: GoodsReceipt[] = [
      {
        id: 'grn_081',
        organizationId: orgId,
        receiptNumber: 'GRN-2026-081',
        poNumber: 'PO-2026-4901',
        vendorId: 'vnd_titan_cloud',
        receivedDate: '2026-01-18T14:00:00.000Z',
        receivedBy: 'Marcus Chen',
        carrier: 'Enterprise Freight Express',
        items: [
          { itemDescription: 'Cloud Cluster Compute Nodes Q1', quantityReceived: 12, condition: 'ACCEPTED' },
          { itemDescription: 'High-Throughput SAN Storage Tier 1', quantityReceived: 2, condition: 'ACCEPTED' },
        ],
      },
      {
        id: 'grn_084',
        organizationId: orgId,
        receiptNumber: 'GRN-2026-084',
        poNumber: 'PO-2026-4902',
        vendorId: 'vnd_nordic_logistics',
        receivedDate: '2026-02-10T11:00:00.000Z',
        receivedBy: 'Julian Moore',
        carrier: 'Nordic Fleet Direct',
        items: [
          { itemDescription: 'Intermodal Freight Drayage 24 Loads', quantityReceived: 24, condition: 'ACCEPTED' },
        ],
      },
      {
        id: 'grn_089',
        organizationId: orgId,
        receiptNumber: 'GRN-2026-089',
        poNumber: 'PO-2026-4903',
        vendorId: 'vnd_kestrel_consulting',
        receivedDate: '2026-02-26T16:30:00.000Z',
        receivedBy: 'Marcus Vance',
        carrier: 'Consulting Advisory Deliverable Slip',
        items: [
          { itemDescription: 'Regulatory Tax Compliance Review Phase 1', quantityReceived: 1, condition: 'ACCEPTED' },
        ],
      },
    ];

    const transactions: FinancialTransaction[] = [
      {
        id: 'tx_1001',
        organizationId: orgId,
        departmentId: 'dept_it_infra',
        transactionRef: 'TRX-2026-0891',
        date: '2026-01-25T14:30:00.000Z',
        vendorId: 'vnd_titan_cloud',
        vendorName: 'Titan Cloud Systems LLC',
        amount: 130000,
        currency: 'USD',
        category: 'SOFTWARE',
        glAccount: 'GL-6102-CLOUD',
        invoiceNumber: 'INV-TCS-8812',
        purchaseOrderNumber: 'PO-2026-4901',
        hasDocument: true,
        documentId: 'doc_evidence_01',
        status: 'RECONCILED',
        discrepancyType: 'NONE',
        description: 'Server cluster expansion and redundant SAN arrays',
        approvedBy: 'David Chen',
      },
      {
        id: 'tx_1002',
        organizationId: orgId,
        departmentId: 'dept_logistics',
        transactionRef: 'TRX-2026-0914',
        date: '2026-02-16T10:15:00.000Z',
        vendorId: 'vnd_nordic_logistics',
        vendorName: 'Nordic Supply & Freight Logistics',
        amount: 64200,
        currency: 'USD',
        category: 'LOGISTICS',
        glAccount: 'GL-5420-FREIGHT',
        invoiceNumber: 'INV-NSF-9021',
        purchaseOrderNumber: 'PO-2026-4902',
        hasDocument: true,
        documentId: 'doc_evidence_02',
        status: 'FLAGGED',
        discrepancyType: 'PO_MISMATCH',
        description: 'Intermodal freight transit + unapproved auxiliary detention surcharge ($11,400 over PO)',
      },
      {
        id: 'tx_1003',
        organizationId: orgId,
        departmentId: 'dept_procurement',
        transactionRef: 'TRX-2026-0945',
        date: '2026-03-01T16:00:00.000Z',
        vendorId: 'vnd_kestrel_consulting',
        vendorName: 'Kestrel Advisory Partners',
        amount: 22500,
        currency: 'USD',
        category: 'CONSULTING',
        glAccount: 'GL-6810-ADVISORY',
        invoiceNumber: 'INV-KAP-7741',
        purchaseOrderNumber: 'PO-2026-4903',
        hasDocument: true,
        documentId: 'doc_evidence_03',
        status: 'CLEARED',
        discrepancyType: 'NONE',
        description: 'Phase 1 Tax audit advisory milestone disbursement',
        approvedBy: 'Marcus Vance',
      },
      {
        id: 'tx_1004',
        organizationId: orgId,
        departmentId: 'dept_procurement',
        transactionRef: 'TRX-2026-0959',
        date: '2026-03-05T11:45:00.000Z',
        vendorId: 'vnd_kestrel_consulting',
        vendorName: 'Kestrel Advisory Partners',
        amount: 22500,
        currency: 'USD',
        category: 'CONSULTING',
        glAccount: 'GL-6810-ADVISORY',
        invoiceNumber: 'INV-KAP-7741', // DUPLICATE INVOICE & AMOUNT
        purchaseOrderNumber: 'PO-2026-4903',
        hasDocument: false, // Missing second original signed sheet
        status: 'FLAGGED',
        discrepancyType: 'DUPLICATE',
        description: 'Secondary voucher submitted under identical invoice # INV-KAP-7741',
      },
      {
        id: 'tx_1005',
        organizationId: orgId,
        departmentId: 'dept_finance',
        transactionRef: 'TRX-2026-0992',
        date: '2026-03-10T18:20:00.000Z',
        vendorId: 'vnd_vanguard_cyber',
        vendorName: 'Vanguard Cyber Defense AG',
        amount: 98000,
        currency: 'USD',
        category: 'OPEX',
        glAccount: 'GL-6150-SECURITY',
        invoiceNumber: 'INV-VCD-309',
        hasDocument: false, // MISSING SUPPORTING DOCUMENT
        status: 'FLAGGED',
        discrepancyType: 'MISSING_DOC',
        description: 'Annual penetration testing license and SIEM integration retainer',
      },
      {
        id: 'tx_1006',
        organizationId: orgId,
        departmentId: 'dept_operations',
        transactionRef: 'TRX-2026-1044',
        date: '2026-03-12T08:10:00.000Z',
        vendorId: 'vnd_apex_precision',
        vendorName: 'Apex Precision Equipment',
        amount: 475000, // STATISTICALLY UNUSUAL: 5.8x historical mean for single maintenance order
        currency: 'USD',
        category: 'CAPEX',
        glAccount: 'GL-1520-MACHINERY',
        invoiceNumber: 'INV-APE-1200',
        purchaseOrderNumber: 'PO-2026-5100',
        hasDocument: true,
        documentId: 'doc_evidence_04',
        status: 'FLAGGED',
        discrepancyType: 'UNUSUAL_AMOUNT',
        description: 'Emergency hydraulic spindle overhaul for Assembly Line 3',
        approvedBy: 'Elena Rostova',
      },
      {
        id: 'tx_1007',
        organizationId: orgId,
        departmentId: 'dept_it_infra',
        transactionRef: 'TRX-2026-1051',
        date: '2026-03-14T14:00:00.000Z',
        vendorId: 'vnd_titan_cloud',
        vendorName: 'Titan Cloud Systems LLC',
        amount: 45000,
        currency: 'USD',
        category: 'SOFTWARE',
        glAccount: 'GL-6102-CLOUD',
        invoiceNumber: 'INV-TCS-8900',
        purchaseOrderNumber: 'PO-2026-5120',
        hasDocument: true,
        documentId: 'doc_evidence_05',
        status: 'RECONCILED',
        discrepancyType: 'NONE',
        description: 'Quarterly CDN bandwidth and multi-region redundancy pool',
        approvedBy: 'David Chen',
      },
    ];

    const inventoryAssets: InventoryAsset[] = [
      {
        id: 'ast_101',
        organizationId: orgId,
        departmentId: 'dept_logistics',
        sku: 'SKU-LOG-RACK-400',
        name: 'Enterprise Server Blade Chassis (48U)',
        category: 'Data Center Hardware',
        ledgerQuantity: 40,
        physicalQuantity: 34,
        discrepancyUnits: -6,
        unitCost: 3200,
        varianceValue: -19200,
        location: 'Warehouse Chicago Central - Bay 4',
        lastAuditedDate: '2026-02-27T00:00:00.000Z',
      },
      {
        id: 'ast_102',
        organizationId: orgId,
        departmentId: 'dept_operations',
        sku: 'SKU-OPS-HYD-990',
        name: 'High-Pressure Servo Actuators',
        category: 'Industrial Components',
        ledgerQuantity: 150,
        physicalQuantity: 142,
        discrepancyUnits: -8,
        unitCost: 1450,
        varianceValue: -11600,
        location: 'Manufacturing Plant Detroit - Sec C',
        lastAuditedDate: '2026-03-01T00:00:00.000Z',
      },
      {
        id: 'ast_103',
        organizationId: orgId,
        departmentId: 'dept_it_infra',
        sku: 'SKU-IT-OPT-800',
        name: '100G QSFP28 Optical Transceivers',
        category: 'Networking',
        ledgerQuantity: 300,
        physicalQuantity: 300,
        discrepancyUnits: 0,
        unitCost: 280,
        varianceValue: 0,
        location: 'IT Storage Vault - Sec 1',
        lastAuditedDate: '2026-03-08T00:00:00.000Z',
      },
    ];

    const findings: AuditFinding[] = [
      {
        id: 'fnd_001',
        organizationId: orgId,
        title: 'Duplicate Invoice Submission: Kestrel Advisory ($22,500)',
        category: 'DUPLICATE_PAYMENT',
        severity: 'CRITICAL',
        affectedRecordIds: ['tx_1003', 'tx_1004'],
        departmentId: 'dept_procurement',
        amountAtRisk: 22500,
        explanation: 'Two identical disbursements matching invoice number INV-KAP-7741 were submitted within 4 business days. The second transaction (TRX-2026-0959) lacks original stamped voucher verification.',
        supportingEvidence: 'Voucher TRX-2026-0945 cleared on 2026-03-01; duplicate TRX-2026-0959 presented on 2026-03-05 with matched amount $22,500.00.',
        status: 'ASSIGNED_TO_CASE',
        detectedAt: '2026-03-06T09:15:00.000Z',
        caseId: 'case_2026_01',
        aiRiskScore: 94,
        aiAnalysis: 'High probability of duplicate billing attempt or administrative reprocessing error. Recommend immediate disbursement stop and vendor account reconciliation.',
      },
      {
        id: 'fnd_002',
        organizationId: orgId,
        title: 'PO vs Invoice Variance Exceeding 21% on Nordic Freight',
        category: 'PO_INVOICE_VARIANCE',
        severity: 'HIGH',
        affectedRecordIds: ['tx_1002', 'po_4902', 'inv_9021'],
        departmentId: 'dept_logistics',
        amountAtRisk: 11400,
        explanation: 'Purchase Order PO-2026-4902 authorized $52,800.00 for drayage. Invoice INV-NSF-9021 billed $64,200.00 with arbitrary detention surcharges not stipulated in master service level agreement.',
        supportingEvidence: 'PO-2026-4902 line items total $52,800.00 vs invoiced bill of lading $64,200.00 ($11,400 unapproved difference).',
        status: 'ASSIGNED_TO_CASE',
        detectedAt: '2026-02-17T11:00:00.000Z',
        caseId: 'case_2026_02',
        aiRiskScore: 82,
        aiAnalysis: 'Discrepancy stems from ancillary demurrage fees not authorized under MSA Section 4.2. Require logistics manager justification prior to accounts payable approval.',
      },
      {
        id: 'fnd_003',
        organizationId: orgId,
        title: 'Missing Supporting Documentation for $98,000 Disbursement',
        category: 'MISSING_DOCUMENTATION',
        severity: 'HIGH',
        affectedRecordIds: ['tx_1005'],
        departmentId: 'dept_finance',
        amountAtRisk: 98000,
        explanation: 'Transaction TRX-2026-0992 was routed to Vanguard Cyber Defense AG without an attached receipt, signed master statement of work, or managerial counter-signature.',
        supportingEvidence: 'GL Account GL-6150-SECURITY debited $98,000.00 with null attachment reference.',
        status: 'DETECTED',
        detectedAt: '2026-03-11T10:00:00.000Z',
        aiRiskScore: 78,
        aiAnalysis: 'Control failure in policy §8.1 requiring multi-party authorization for disbursements exceeding $50k. Hold settlement pending SOW submission.',
      },
      {
        id: 'fnd_004',
        organizationId: orgId,
        title: 'Physical Inventory Shortage: 6 Server Blade Chassis in Chicago',
        category: 'INVENTORY_DISCREPANCY',
        severity: 'MEDIUM',
        affectedRecordIds: ['ast_101'],
        departmentId: 'dept_logistics',
        amountAtRisk: 19200,
        explanation: 'Physical audit cycle count on Bay 4 identified 34 active units against ERP ledger balance of 40 units ($19,200 write-off exposure).',
        supportingEvidence: 'Cycle count sheet #LOG-AUD-2026-02 verified by Warehouse Lead.',
        status: 'DETECTED',
        detectedAt: '2026-03-01T15:00:00.000Z',
        aiRiskScore: 65,
        aiAnalysis: 'Potential unrecorded transfer to secondary data facility or intake scanning omission during Q1 hardware refresh.',
      },
    ];

    const cases: AuditCase[] = [
      {
        id: 'case_2026_01',
        organizationId: orgId,
        caseNumber: 'AUD-CASE-2026-001',
        title: 'Investigation into Duplicate Advisory Invoicing & Controls',
        findingIds: ['fnd_001'],
        departmentId: 'dept_procurement',
        leadInvestigatorId: 'usr_fin_auditor',
        leadInvestigatorName: 'Sarah Jenkins (CPA)',
        status: 'UNDER_REVIEW',
        priority: 'CRITICAL',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-08T14:30:00.000Z',
        dueDate: '2026-03-20T17:00:00.000Z',
        summary: 'Comprehensive review into repeated submission of Invoice INV-KAP-7741. Evaluating vendor ERP sync and internal automated duplicate checks.',
        notes: [
          {
            id: 'note_1',
            authorId: 'usr_fin_auditor',
            authorName: 'Sarah Jenkins (CPA)',
            role: 'FINANCIAL_AUDITOR',
            timestamp: '2026-03-06T10:30:00.000Z',
            text: 'Placed payment hold on voucher TRX-2026-0959 in ERP accounts payable queue. Reached out to Kestrel accounts department for billing clarification.',
          },
          {
            id: 'note_2',
            authorId: 'usr_chief_auditor',
            authorName: 'Robert Hastings (CIA, CISA)',
            role: 'CHIEF_AUDITOR',
            timestamp: '2026-03-08T14:30:00.000Z',
            text: 'Concur with hold. Requesting procurement officer interview regarding why automated pre-validation did not trap identical invoice numbering.',
          },
        ],
        transitions: [
          {
            from: 'DRAFT',
            to: 'SUBMITTED',
            changedBy: 'Sarah Jenkins (CPA)',
            timestamp: '2026-03-06T10:05:00.000Z',
            reason: 'Initial case opened following reconciliation scan anomaly.',
          },
          {
            from: 'SUBMITTED',
            to: 'UNDER_REVIEW',
            changedBy: 'Robert Hastings (CIA, CISA)',
            timestamp: '2026-03-07T09:00:00.000Z',
            reason: 'Approved for formal audit inquiry and vendor contact.',
          },
        ],
      },
      {
        id: 'case_2026_02',
        organizationId: orgId,
        caseNumber: 'AUD-CASE-2026-002',
        title: 'Freight Rate Escalation & Unauthorized Ancillary Fees',
        findingIds: ['fnd_002'],
        departmentId: 'dept_logistics',
        leadInvestigatorId: 'usr_chief_auditor',
        leadInvestigatorName: 'Robert Hastings (CIA, CISA)',
        status: 'EVIDENCE_REQUIRED',
        priority: 'HIGH',
        createdAt: '2026-02-18T09:00:00.000Z',
        updatedAt: '2026-02-25T16:15:00.000Z',
        dueDate: '2026-03-15T17:00:00.000Z',
        summary: 'Investigation into recurring demurrage charges from Nordic Supply exceeding agreed PO caps by $11,400.',
        notes: [
          {
            id: 'note_21',
            authorId: 'usr_chief_auditor',
            authorName: 'Robert Hastings (CIA, CISA)',
            role: 'CHIEF_AUDITOR',
            timestamp: '2026-02-18T09:40:00.000Z',
            text: 'Demanded port terminal waiting logs from carrier. Without signed driver gate passes, surcharge cannot be accepted.',
          },
        ],
        transitions: [
          {
            from: 'DRAFT',
            to: 'SUBMITTED',
            changedBy: 'Robert Hastings (CIA, CISA)',
            timestamp: '2026-02-18T09:10:00.000Z',
            reason: 'Submitted for freight audit review.',
          },
          {
            from: 'SUBMITTED',
            to: 'UNDER_REVIEW',
            changedBy: 'Robert Hastings (CIA, CISA)',
            timestamp: '2026-02-19T08:30:00.000Z',
            reason: 'Review initiated with supply chain lead.',
          },
          {
            from: 'UNDER_REVIEW',
            to: 'EVIDENCE_REQUIRED',
            changedBy: 'Robert Hastings (CIA, CISA)',
            timestamp: '2026-02-25T16:15:00.000Z',
            reason: 'Awaiting port EDI timestamp manifests to validate delay claims.',
          },
        ],
      },
    ];

    const evidenceDocuments: EvidenceDocument[] = [
      {
        id: 'doc_evidence_01',
        organizationId: orgId,
        transactionId: 'tx_1001',
        fileName: 'TitanCloud_Invoice_TCS8812_Signed.pdf',
        fileType: 'application/pdf',
        fileSize: 425100,
        uploadedAt: '2026-01-21T11:00:00.000Z',
        uploadedBy: 'David Chen',
        ocrExtractedText: 'TITAN CLOUD SYSTEMS LLC\nInvoice Number: INV-TCS-8812\nPO Number: PO-2026-4901\nTotal: $130,000.00\nPayment Terms: Net 30\nTax ID: US-94-2819034\nStatus: Paid in full by wire transfer.',
        aiVerification: {
          confidenceScore: 0.98,
          vendorMatched: 'Titan Cloud Systems LLC',
          amountDetected: 130000,
          dateDetected: '2026-01-20',
          discrepanciesNoted: [],
          isSuspicious: false,
        },
      },
      {
        id: 'doc_evidence_02',
        organizationId: orgId,
        caseId: 'case_2026_02',
        transactionId: 'tx_1002',
        fileName: 'Nordic_Freight_INV9021_BillOfLading.pdf',
        fileType: 'application/pdf',
        fileSize: 610800,
        uploadedAt: '2026-02-15T09:30:00.000Z',
        uploadedBy: 'Julian Moore',
        ocrExtractedText: 'NORDIC SUPPLY & FREIGHT LOGISTICS\nInvoice: INV-NSF-9021\nPO: PO-2026-4902\nBase Freight: $52,800.00\nFuel Surcharge & Port Detention: $11,400.00\nTotal Due: $64,200.00\nNOTICE: Unapproved charges subject to client audit.',
        aiVerification: {
          confidenceScore: 0.91,
          vendorMatched: 'Nordic Supply & Freight Logistics',
          amountDetected: 64200,
          dateDetected: '2026-02-14',
          discrepanciesNoted: ['Total amount ($64,200) exceeds PO-2026-4902 ($52,800) by $11,400', 'Detention item lacks gate time receipts'],
          isSuspicious: true,
        },
      },
      {
        id: 'doc_evidence_03',
        organizationId: orgId,
        caseId: 'case_2026_01',
        transactionId: 'tx_1003',
        fileName: 'Kestrel_Advisory_INV7741_Original.pdf',
        fileType: 'application/pdf',
        fileSize: 312000,
        uploadedAt: '2026-03-01T15:00:00.000Z',
        uploadedBy: 'Marcus Vance',
        ocrExtractedText: 'KESTREL ADVISORY PARTNERS\nInvoice: INV-KAP-7741\nDate: 2026-02-28\nDescription: Phase 1 Tax review\nTotal: $22,500.00\nAuthorized Signatory: M. Vance.',
        aiVerification: {
          confidenceScore: 0.97,
          vendorMatched: 'Kestrel Advisory Partners',
          amountDetected: 22500,
          dateDetected: '2026-02-28',
          discrepanciesNoted: [],
          isSuspicious: false,
        },
      },
    ];

    const correctiveActions: CorrectiveAction[] = [
      {
        id: 'act_001',
        organizationId: orgId,
        caseId: 'case_2026_01',
        title: 'Deploy Automated Pre-Disbursement Hash Matching in Accounts Payable',
        description: 'Configure automated rule preventing dual release of any payment where vendor ID, invoice string and amount match any cleared voucher within 180 days.',
        departmentId: 'dept_procurement',
        assignedTo: 'usr_fin_auditor',
        assignedToName: 'Sarah Jenkins (CPA)',
        dueDate: '2026-03-25T17:00:00.000Z',
        status: 'IN_PROGRESS',
        milestones: [
          { title: 'Define ERP AP validation rule specification', completed: true, completedAt: '2026-03-07T14:00:00.000Z' },
          { title: 'Implement duplicate blocking trigger in test staging', completed: true, completedAt: '2026-03-09T11:00:00.000Z' },
          { title: 'User acceptance testing with procurement staff', completed: false },
          { title: 'Deploy to live production ledger', completed: false },
        ],
        createdAt: '2026-03-07T08:00:00.000Z',
      },
      {
        id: 'act_002',
        organizationId: orgId,
        caseId: 'case_2026_02',
        title: 'Amend Carrier Master Service Agreement Surcharge Clauses',
        description: 'Issue formal legal addendum to Nordic Logistics explicitly capping detention rates and requiring prior written dispatch authorization.',
        departmentId: 'dept_logistics',
        assignedTo: 'usr_compliance',
        assignedToName: 'Evelyn Brooks (JD)',
        dueDate: '2026-03-30T17:00:00.000Z',
        status: 'PENDING',
        milestones: [
          { title: 'Draft revised MSA addendum with Logistics Counsel', completed: false },
          { title: 'Transmit terms to Nordic Executive Board', completed: false },
          { title: 'Execute counter-signed agreement', completed: false },
        ],
        createdAt: '2026-02-20T11:00:00.000Z',
      },
    ];

    const notifications: NotificationItem[] = [
      {
        id: 'notif_001',
        organizationId: orgId,
        targetRole: 'CHIEF_AUDITOR',
        type: 'FINDING',
        title: 'Critical Duplicate Finding Detected',
        message: 'Duplicate payment risk identified for Kestrel Advisory Partners ($22,500.00). Immediate payment stop recommended.',
        timestamp: '2026-03-06T09:15:00.000Z',
        isRead: false,
        referenceId: 'fnd_001',
      },
      {
        id: 'notif_002',
        organizationId: orgId,
        targetRole: 'FINANCIAL_AUDITOR',
        type: 'CASE',
        title: 'New Case Assigned: AUD-CASE-2026-001',
        message: 'You have been assigned as lead investigator on duplicate advisory invoicing inquiry.',
        timestamp: '2026-03-06T10:05:00.000Z',
        isRead: true,
        referenceId: 'case_2026_01',
      },
      {
        id: 'notif_003',
        organizationId: orgId,
        targetRole: 'COMPLIANCE_OFFICER',
        type: 'ACTION',
        title: 'Corrective Action Assigned',
        message: 'Action act_002 "Amend Carrier Master Service Agreement" due on March 30, 2026.',
        timestamp: '2026-02-20T11:00:00.000Z',
        isRead: false,
        referenceId: 'act_002',
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'log_001',
        organizationId: orgId,
        userId: 'usr_chief_auditor',
        userName: 'Robert Hastings (CIA, CISA)',
        userRole: 'CHIEF_AUDITOR',
        action: 'CASE_STATUS_UPDATED',
        entityType: 'AuditCase',
        entityId: 'case_2026_01',
        ipAddress: '10.0.4.12',
        timestamp: '2026-03-07T09:00:00.000Z',
        details: { from: 'SUBMITTED', to: 'UNDER_REVIEW', reason: 'Approved for formal audit inquiry' },
      },
      {
        id: 'log_002',
        organizationId: orgId,
        userId: 'usr_fin_auditor',
        userName: 'Sarah Jenkins (CPA)',
        userRole: 'FINANCIAL_AUDITOR',
        action: 'ACTION_MILESTONE_COMPLETED',
        entityType: 'CorrectiveAction',
        entityId: 'act_001',
        ipAddress: '10.0.4.19',
        timestamp: '2026-03-09T11:00:00.000Z',
        details: { milestone: 'Implement duplicate blocking trigger in test staging' },
      },
    ];

    return {
      organizations,
      departments,
      users,
      transactions,
      vendors,
      purchaseOrders,
      invoices,
      goodsReceipts,
      inventoryAssets,
      findings,
      cases,
      evidenceDocuments,
      correctiveActions,
      notifications,
      auditLogs,
      soxControls: [],
    };
  }

  // Repository Methods
  public getUsers() { return this.list<User>('users'); }
  public getUserById(id: string) { return this.one<User>('users', id); }
  public async getUserByEmail(email: string) {
    const user = await this.collection('users').findOne({ email: email.trim().toLowerCase() });
    if (!user) return undefined;
    const { _id: _ignored, ...record } = user;
    return record as unknown as User;
  }
  public createUser(user: User) { return this.insert('users', { ...user, email: user.email.toLowerCase() }); }
  public updateUser(id: string, updates: Partial<User>) { return this.update<User>('users', id, updates); }

  public getOrganizations() { return this.list<Organization>('organizations'); }
  public getDepartments(orgId?: string) { return this.list<Department>('departments', orgId); }
  public getTransactions(orgId?: string) { return this.list<FinancialTransaction>('transactions', orgId); }
  public getTransactionById(id: string) { return this.one<FinancialTransaction>('transactions', id); }
  public createTransaction(t: FinancialTransaction) { return this.insert('transactions', t); }
  public updateTransaction(id: string, updates: Partial<FinancialTransaction>) { return this.update('transactions', id, updates); }
  public getVendors(orgId?: string) { return this.list<Vendor>('vendors', orgId); }
  public getPurchaseOrders(orgId?: string) { return this.list<PurchaseOrder>('purchaseOrders', orgId); }
  public getInvoices(orgId?: string) { return this.list<Invoice>('invoices', orgId); }
  public getInventoryAssets(orgId?: string) { return this.list<InventoryAsset>('inventoryAssets', orgId); }
  public getFindings(orgId?: string) { return this.list<AuditFinding>('findings', orgId); }
  public getFindingById(id: string) { return this.one<AuditFinding>('findings', id); }
  public createFinding(f: AuditFinding) { return this.insert('findings', f); }
  public updateFinding(id: string, updates: Partial<AuditFinding>) { return this.update('findings', id, updates); }
  public getCases(orgId?: string) { return this.list<AuditCase>('cases', orgId); }
  public getCaseById(id: string) { return this.one<AuditCase>('cases', id); }
  public createCase(c: AuditCase) { return this.insert('cases', c); }
  public updateCase(id: string, updates: Partial<AuditCase>) { return this.update('cases', id, updates); }
  public getEvidenceDocuments(orgId?: string) { return this.list<EvidenceDocument>('evidenceDocuments', orgId); }
  public getEvidenceById(id: string) { return this.one<EvidenceDocument>('evidenceDocuments', id); }
  public createEvidence(d: EvidenceDocument) { return this.insert('evidenceDocuments', d); }
  public getCorrectiveActions(orgId?: string) { return this.list<CorrectiveAction>('correctiveActions', orgId); }
  public getActionById(id: string) { return this.one<CorrectiveAction>('correctiveActions', id); }
  public createAction(a: CorrectiveAction) { return this.insert('correctiveActions', a); }
  public updateAction(id: string, updates: Partial<CorrectiveAction>) { return this.update('correctiveActions', id, updates); }
  public getNotifications(orgId?: string) { return this.list<NotificationItem>('notifications', orgId); }
  public createNotification(n: NotificationItem) { return this.insert('notifications', n); }
  public async markNotificationAsRead(id: string) {
    const item = await this.one<NotificationItem>('notifications', id);
    if (!item) return undefined;
    return this.update<NotificationItem>('notifications', id, { isRead: true });
  }
  public getAuditLogs(orgId?: string) { return this.list<AuditLog>('auditLogs', orgId); }
  public logAudit(log: AuditLog) { return this.insert('auditLogs', log); }
  public getGoodsReceipts(orgId?: string) { return this.list<GoodsReceipt>('goodsReceipts', orgId); }
  public createGoodsReceipt(r: GoodsReceipt) { return this.insert('goodsReceipts', r); }
  public createVendor(v: Vendor) { return this.insert('vendors', v); }
  public updateVendor(id: string, updates: Partial<Vendor>) { return this.update('vendors', id, updates); }
  public getSoxControls() { return this.list<SoxControl>('soxControls'); }
  public getSoxControlById(id: string) { return this.one<SoxControl>('soxControls', id); }
  public createSoxControl(control: SoxControl) { return this.insert('soxControls', control); }
  public updateSoxControl(id: string, updates: Partial<SoxControl>) { return this.update('soxControls', id, updates); }

  public async getThreeWayMatches(orgId?: string): Promise<ThreeWayMatchResult[]> {
    const [invoices, purchaseOrders, receipts, findings] = await Promise.all([
      this.getInvoices(orgId),
      this.getPurchaseOrders(orgId),
      this.getGoodsReceipts(orgId),
      this.getFindings(orgId),
    ]);

    return invoices.map(inv => {
      const po = inv.poNumber ? purchaseOrders.find(p => p.poNumber === inv.poNumber) : null;
      const receipt = po ? receipts.find(r => r.poNumber === po.poNumber) : null;
      const poAmount = po ? po.totalAmount : 0;
      const invoicedAmount = inv.totalAmount;
      const varianceAmount = po ? invoicedAmount - poAmount : invoicedAmount;
      const variancePercent = po && poAmount > 0 ? (varianceAmount / poAmount) * 100 : 0;

      let status: ThreeWayMatchResult['status'] = 'PERFECT_MATCH';
      let details = 'Purchase order, goods receipt, and invoice totals match within standard variance tolerance (0.0%).';

      if (!po) {
        status = 'UNMATCHED_INVOICE';
        details = 'No authorized Purchase Order found on file for this invoice disbursement.';
      } else if (!receipt) {
        status = 'MISSING_RECEIPT';
        details = 'Purchase Order found, but warehouse receiving slip (GRN) has not been certified.';
      } else if (Math.abs(varianceAmount) > 100 && Math.abs(variancePercent) > 2) {
        status = 'PRICE_VARIANCE';
        details = `Invoiced amount exceeds authorized PO by $${varianceAmount.toLocaleString()} (${variancePercent.toFixed(1)}%). Surcharges require audit sign-off.`;
      }

      const matchingFinding = findings.find(f => f.affectedRecordIds.includes(inv.id));

      return {
        matchId: `match_${inv.id}`,
        poNumber: inv.poNumber || 'UNLINKED',
        invoiceNumber: inv.invoiceNumber,
        receiptNumber: receipt ? receipt.receiptNumber : undefined,
        vendorName: inv.vendorName,
        departmentId: po ? po.departmentId : 'dept_finance',
        poAmount,
        invoicedAmount,
        varianceAmount,
        variancePercent,
        status,
        details,
        reconciliationFindingId: matchingFinding ? matchingFinding.id : undefined,
      };
    });
  }

  public async getBudgetReconciliation(orgId?: string) {
    const [departments, transactions, pos, findings] = await Promise.all([
      this.getDepartments(orgId),
      this.getTransactions(orgId),
      this.getPurchaseOrders(orgId),
      this.getFindings(orgId),
    ]);

    return departments.map(dept => {
      const deptTx = transactions.filter(t => t.departmentId === dept.id && t.status !== 'VOIDED');
      const actualSpend = deptTx.reduce((sum, t) => sum + t.amount, 0);
      const deptPos = pos.filter(p => p.departmentId === dept.id && p.status === 'ISSUED');
      const committedAmount = deptPos.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalEncumbered = actualSpend + committedAmount;
      const variance = dept.budgetAllocated - totalEncumbered;
      const burnRate = (totalEncumbered / dept.budgetAllocated) * 100;
      const deptFindings = findings.filter(f => f.departmentId === dept.id && f.status !== 'RESOLVED');

      let alertStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL_OVERSPEND' = 'HEALTHY';
      if (burnRate > 95 || variance < 0) {
        alertStatus = 'CRITICAL_OVERSPEND';
      } else if (burnRate > 80) {
        alertStatus = 'WARNING';
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        code: dept.code,
        headOfDepartment: dept.headOfDepartment,
        budgetAllocated: dept.budgetAllocated,
        actualSpend,
        committedAmount,
        totalEncumbered,
        variance,
        burnRate: parseFloat(burnRate.toFixed(1)),
        alertStatus,
        activeFindingsCount: deptFindings.length,
      };
    });
  }
}

export const db = new DatabaseRepository();
