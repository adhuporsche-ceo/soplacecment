import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { AuthService } from '../services/auth.service.ts';
import { ReconciliationEngineService } from '../services/reconciliation.service.ts';
import { InvestigationService } from '../services/investigation.service.ts';
import { AnalyticsService } from '../services/analytics.service.ts';
import { GeminiAuditService } from '../services/gemini.service.ts';
import { ForensicService } from '../services/forensic.service.ts';
import { SocketManager } from '../sockets/socket.manager.ts';
import { db } from '../repositories/database.ts';
import bcrypt from 'bcryptjs';
import { AuditCase, AuditFinding, CaseStatus, CorrectiveAction, EvidenceDocument, FinancialTransaction, User, Vendor, SoxControl } from '../types/index.ts';

export class ApiController {
  // Auth
  public static async login(req: AuthenticatedRequest, res: Response) {
    const { email, password } = req.body;
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 320 ||
      password.length > 1024 ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const authResult = await AuthService.authenticate(email.trim(), password);
    if (!authResult) {
      return res.status(401).json({ success: false, error: 'Invalid email or credentials.' });
    }

    // Log login event
    await db.logAudit({
      id: `log_${Date.now()}`,
      organizationId: authResult.user.organizationId,
      userId: authResult.user.id,
      userName: authResult.user.name,
      userRole: authResult.user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: authResult.user.id,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { email: authResult.user.email },
    });

    return res.json({ success: true, data: authResult });
  }

  public static async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const user = await AuthService.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const { passwordHash: _, ...safeUser } = user;
    return res.json({ success: true, data: safeUser });
  }

  // Dashboard Analytics
  public static async getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const metrics = await AnalyticsService.getMetrics(orgId);
    return res.json({ success: true, data: metrics });
  }

  // Transactions
  public static async getTransactions(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    let transactions = await db.getTransactions(orgId);

    // If Department Manager, enforce department isolation
    if (req.user?.role === 'DEPARTMENT_MANAGER' && req.user.departmentId) {
      transactions = transactions.filter(t => t.departmentId === req.user?.departmentId);
    }

    const { status, category, search, departmentId } = req.query;
    if (status && typeof status === 'string' && status !== 'ALL') {
      transactions = transactions.filter(t => t.status === status);
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      transactions = transactions.filter(t => t.category === category);
    }
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'ALL') {
      transactions = transactions.filter(t => t.departmentId === departmentId);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      transactions = transactions.filter(
        t => t.transactionRef.toLowerCase().includes(q) ||
             t.vendorName.toLowerCase().includes(q) ||
             (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q)) ||
             (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, data: transactions, total: transactions.length });
  }

  public static async createTransaction(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const { vendorId, vendorName, amount, category, glAccount, description, invoiceNumber, purchaseOrderNumber, departmentId } = req.body;

    if (!vendorName || !amount || !category) {
      return res.status(400).json({ success: false, error: 'Missing required transaction fields' });
    }

    const newTx: FinancialTransaction = {
      id: `tx_${Date.now()}`,
      organizationId: orgId,
      departmentId: departmentId || req.user?.departmentId || 'dept_operations',
      transactionRef: `TRX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      vendorId: vendorId || `vnd_${Date.now()}`,
      vendorName,
      amount: parseFloat(amount),
      currency: 'USD',
      category,
      glAccount: glAccount || 'GL-6000-GENERAL',
      invoiceNumber,
      purchaseOrderNumber,
      hasDocument: false,
      status: 'PENDING',
      discrepancyType: 'NONE',
      description: description || 'Direct entry transaction voucher',
      approvedBy: req.user?.name,
    };

    await db.createTransaction(newTx);

    // Socket notification
    SocketManager.broadcast(orgId, 'audit.case.updated', {
      type: 'TRANSACTION_CREATED',
      transaction: newTx,
    });

    return res.status(201).json({ success: true, data: newTx });
  }

  // Reconciliation Scan
  public static async executeReconciliation(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const result = await ReconciliationEngineService.executeFullReconciliation(orgId);

    // Real-time broadcast
    SocketManager.broadcast(orgId, 'audit.finding.created', {
      summary: result.summary,
      timestamp: new Date().toISOString(),
    });

    // Log to system audit trail
    if (req.user) {
      await db.logAudit({
        id: `log_${Date.now()}`,
        organizationId: orgId,
        userId: req.user.userId,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'EXECUTE_RECONCILIATION_SCAN',
        entityType: 'Reconciliation',
        entityId: 'full_reconcile',
        ipAddress: req.ip || '127.0.0.1',
        timestamp: new Date().toISOString(),
        details: { findingsCount: result.summary.newFindingsGenerated, exposure: result.summary.totalExposureAmount },
      });
    }

    return res.json({ success: true, data: result });
  }

  // Findings
  public static async getFindings(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    let findings = await db.getFindings(orgId);

    if (req.user?.role === 'DEPARTMENT_MANAGER' && req.user.departmentId) {
      findings = findings.filter(f => f.departmentId === req.user?.departmentId);
    }

    const { severity, category, status } = req.query;
    if (severity && severity !== 'ALL') {
      findings = findings.filter(f => f.severity === severity);
    }
    if (category && category !== 'ALL') {
      findings = findings.filter(f => f.category === category);
    }
    if (status && status !== 'ALL') {
      findings = findings.filter(f => f.status === status);
    }

    return res.json({ success: true, data: findings });
  }

  public static async getFindingDetail(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const finding = await db.getFindingById(id);
    if (!finding) return res.status(404).json({ success: false, error: 'Finding not found' });
    return res.json({ success: true, data: finding });
  }

  public static async analyzeFindingWithAi(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const finding = await db.getFindingById(id);
    if (!finding) return res.status(404).json({ success: false, error: 'Finding not found' });

    const analysis = await GeminiAuditService.analyzeFinding(
      finding.title,
      finding.category,
      finding.amountAtRisk,
      finding.supportingEvidence,
      { affectedRecords: finding.affectedRecordIds }
    );

    const updated = await db.updateFinding(id, {
      aiRiskScore: analysis.riskScore,
      aiAnalysis: analysis.reasoning,
    });

    return res.json({ success: true, data: { finding: updated, analysis } });
  }

  // Cases
  public static async getCases(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    let cases = await db.getCases(orgId);

    if (req.user?.role === 'DEPARTMENT_MANAGER' && req.user.departmentId) {
      cases = cases.filter(c => c.departmentId === req.user?.departmentId);
    }

    const { status, priority } = req.query;
    if (status && status !== 'ALL') {
      cases = cases.filter(c => c.status === status);
    }
    if (priority && priority !== 'ALL') {
      cases = cases.filter(c => c.priority === priority);
    }

    return res.json({ success: true, data: cases });
  }

  public static async getCaseById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const auditCase = await db.getCaseById(id);
    if (!auditCase) return res.status(404).json({ success: false, error: 'Case not found' });

    // Populate finding details
    const [findings, actions] = await Promise.all([
      Promise.all(auditCase.findingIds.map(fId => db.getFindingById(fId))),
      db.getCorrectiveActions(auditCase.organizationId),
    ]);
    const relatedActions = actions.filter(a => a.caseId === id);

    return res.json({ success: true, data: { ...auditCase, findings, relatedActions } });
  }

  public static async createCase(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const { title, findingIds, departmentId, leadInvestigatorId, priority, summary, dueDate } = req.body;

    if (!title || !findingIds || !findingIds.length) {
      return res.status(400).json({ success: false, error: 'Title and at least one finding ID are required' });
    }

    const targetUser = leadInvestigatorId ? await db.getUserById(leadInvestigatorId) : null;
    const leadId = targetUser?.id || req.user?.userId || '';
    const leadName = targetUser?.name || req.user?.name || 'Assigned Auditor';

    const newCase: AuditCase = {
      id: `case_${Date.now()}`,
      organizationId: orgId,
      caseNumber: `AUD-CASE-2026-${Math.floor(100 + Math.random() * 900)}`,
      title,
      findingIds,
      departmentId: departmentId || 'dept_procurement',
      leadInvestigatorId: leadId,
      leadInvestigatorName: leadName,
      status: 'SUBMITTED',
      priority: priority || 'HIGH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      summary: summary || 'Formal audit investigation opened.',
      notes: [
        {
          id: `note_${Date.now()}`,
          authorId: req.user?.userId || '',
          authorName: req.user?.name || '',
          role: req.user?.role || '',
          timestamp: new Date().toISOString(),
          text: `Case opened by ${req.user?.name}. Associated findings: ${findingIds.join(', ')}.`,
        },
      ],
      transitions: [
        {
          from: 'DRAFT',
          to: 'SUBMITTED',
          changedBy: req.user?.name || 'Auditor',
          timestamp: new Date().toISOString(),
          reason: 'Initial case submission.',
        },
      ],
    };

    await db.createCase(newCase);

    // Update findings to ASSIGNED_TO_CASE
    await Promise.all(findingIds.map((fId: string) =>
      db.updateFinding(fId, { status: 'ASSIGNED_TO_CASE', caseId: newCase.id })));

    // Real-time broadcast
    SocketManager.broadcast(orgId, 'audit.case.assigned', { case: newCase });

    return res.status(201).json({ success: true, data: newCase });
  }

  public static async transitionCaseStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { targetStatus, reason } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ success: false, error: 'targetStatus is required' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await InvestigationService.transitionCase(
      id,
      targetStatus as CaseStatus,
      { id: req.user.userId, name: req.user.name, role: req.user.role },
      reason
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    SocketManager.broadcast(result.case!.organizationId, 'audit.case.updated', { case: result.case });

    return res.json(result);
  }

  public static async addCaseNote(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Note text cannot be empty' });
    }

    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const result = await InvestigationService.addNote(
      id,
      { id: req.user.userId, name: req.user.name, role: req.user.role },
      text
    );

    return res.json(result);
  }

  // Corrective Actions
  public static async getActions(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    let actions = await db.getCorrectiveActions(orgId);

    if (req.user?.role === 'DEPARTMENT_MANAGER' && req.user.departmentId) {
      actions = actions.filter(a => a.departmentId === req.user?.departmentId);
    }

    return res.json({ success: true, data: actions });
  }

  public static async updateActionStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { status, verificationNotes, milestoneIndex, milestoneCompleted } = req.body;

    const action = await db.getActionById(id);
    if (!action) return res.status(404).json({ success: false, error: 'Action not found' });

    let updatedMilestones = [...action.milestones];
    if (typeof milestoneIndex === 'number' && updatedMilestones[milestoneIndex]) {
      updatedMilestones[milestoneIndex] = {
        ...updatedMilestones[milestoneIndex],
        completed: Boolean(milestoneCompleted),
        completedAt: milestoneCompleted ? new Date().toISOString() : undefined,
      };
    }

    const updates: Partial<CorrectiveAction> = {
      milestones: updatedMilestones,
    };
    if (status) updates.status = status;
    if (verificationNotes) updates.verificationNotes = verificationNotes;
    if (status === 'COMPLETED') updates.completionDate = new Date().toISOString();

    const updated = await db.updateAction(id, updates);

    // Audit log
    if (req.user) {
      await db.logAudit({
        id: `log_${Date.now()}`,
        organizationId: action.organizationId,
        userId: req.user.userId,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CORRECTIVE_ACTION_UPDATED',
        entityType: 'CorrectiveAction',
        entityId: id,
        ipAddress: req.ip || '127.0.0.1',
        timestamp: new Date().toISOString(),
        details: { status, milestoneIndex, milestoneCompleted },
      });
    }

    SocketManager.broadcast(action.organizationId, 'action.completed', { action: updated });

    return res.json({ success: true, data: updated });
  }

  // Documents & OCR
  public static async getDocuments(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const docs = await db.getEvidenceDocuments(orgId);
    return res.json({ success: true, data: docs });
  }

  public static async uploadDocument(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const { fileName, fileType, fileSize, ocrText, transactionId, caseId } = req.body;

    if (!fileName || !ocrText) {
      return res.status(400).json({ success: false, error: 'File name and OCR text content are required' });
    }

    const tx = transactionId ? await db.getTransactionById(transactionId) : undefined;
    const verification = await GeminiAuditService.verifyDocument(
      fileName,
      ocrText,
      tx ? { vendorName: tx.vendorName, amount: tx.amount, invoiceNumber: tx.invoiceNumber } : undefined
    );

    const newDoc: EvidenceDocument = {
      id: `doc_${Date.now()}`,
      organizationId: orgId,
      caseId,
      transactionId,
      fileName,
      fileType: fileType || 'application/pdf',
      fileSize: fileSize || 250000,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user?.name || 'Auditor',
      ocrExtractedText: ocrText,
      aiVerification: {
        confidenceScore: verification.confidenceScore,
        vendorMatched: verification.vendorMatched,
        amountDetected: verification.amountDetected,
        dateDetected: verification.dateDetected,
        discrepanciesNoted: verification.discrepanciesNoted,
        isSuspicious: verification.isSuspicious,
      },
    };

    await db.createEvidence(newDoc);

    if (transactionId) {
      await db.updateTransaction(transactionId, {
        hasDocument: true,
        documentId: newDoc.id,
      });
    }

    SocketManager.broadcast(orgId, 'evidence.uploaded', { document: newDoc });

    return res.status(201).json({ success: true, data: newDoc });
  }

  // Audit Logs
  public static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const logs = await db.getAuditLogs(orgId);
    return res.json({ success: true, data: logs });
  }

  // Inventory
  public static async getInventory(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const items = await db.getInventoryAssets(orgId);
    return res.json({ success: true, data: items });
  }

  // Departments & Vendors
  public static async getDepartments(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const departments = await db.getDepartments(orgId);
    return res.json({ success: true, data: departments });
  }

  public static async getVendors(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const vendors = await db.getVendors(orgId);
    return res.json({ success: true, data: vendors });
  }

  public static async createOrUpdateVendor(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const { id, name, taxId, category, riskRating, paymentTerms, bankAccountLast4 } = req.body;

    if (!name || !taxId) {
      return res.status(400).json({ success: false, error: 'Vendor name and Tax ID are required' });
    }

    if (id) {
      const updated = await db.updateVendor(id, { name, taxId, category, riskRating, paymentTerms, bankAccountLast4 });
      return res.json({ success: true, data: updated });
    }

    const newVendor: Vendor = {
      id: `vnd_${Date.now()}`,
      organizationId: orgId,
      name,
      taxId,
      category: category || 'General Supplies',
      riskRating: riskRating || 'LOW',
      paymentTerms: paymentTerms || 'NET 30',
      bankAccountLast4: bankAccountLast4 || '1234',
      totalSpendYTD: 0,
      activeDiscrepancies: 0,
    };

    await db.createVendor(newVendor);
    return res.status(201).json({ success: true, data: newVendor });
  }

  // 3-Way Reconciliation
  public static async getThreeWayMatches(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const matches = await db.getThreeWayMatches(orgId);
    return res.json({ success: true, data: matches });
  }

  // Budget Reconciliation
  public static async getBudgetReconciliation(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const reconciliation = await db.getBudgetReconciliation(orgId);
    return res.json({ success: true, data: reconciliation });
  }

  // User Management (Super Admin)
  public static async getAllUsers(req: AuthenticatedRequest, res: Response) {
    const allUsers = await db.getUsers();
    const users = allUsers.map(({ passwordHash: _, ...safeUser }) => safeUser);
    return res.json({ success: true, data: users });
  }

  public static async createUser(req: AuthenticatedRequest, res: Response) {
    const { name, email, role, departmentId, password } = req.body;
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !role.trim()
    ) {
      return res.status(400).json({ success: false, error: 'Name, email, role, and password are required' });
    }
    const userRole = (['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'] as const)
      .find(allowedRole => allowedRole === role);
    if (!userRole) {
      return res.status(400).json({ success: false, error: 'A valid user role is required' });
    }
    if (password.length < 12 || password.length > 1024) {
      return res.status(400).json({ success: false, error: 'Password must be between 12 and 1024 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'User with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const orgId = req.user?.organizationId || 'org_apex_global';

    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: normalizedEmail,
      name: name.trim(),
      role: userRole,
      organizationId: orgId,
      departmentId,
      passwordHash,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    await db.createUser(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({ success: true, data: safeUser });
  }

  public static async toggleUserStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const user = await db.getUserById(id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const updated = await db.updateUser(id, { isActive: !user.isActive });
    const { passwordHash: _, ...safeUser } = updated!;
    return res.json({ success: true, data: safeUser });
  }

  // Notifications
  public static async getNotifications(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const notifications = await db.getNotifications(orgId);
    return res.json({ success: true, data: notifications });
  }

  public static async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const item = await db.markNotificationAsRead(id);
    if (!item) return res.status(404).json({ success: false, error: 'Notification not found' });
    return res.json({ success: true, data: item });
  }

  // Forensic Analytics & Benford's Law
  public static async getBenfordAnalysis(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const analysis = await ForensicService.calculateBenfordAnalysis(orgId);
    return res.json({ success: true, data: analysis });
  }

  // Related-Party & Conflict Network
  public static async getConflictNetwork(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const conflicts = await ForensicService.detectConflictsOfInterest(orgId);
    return res.json({ success: true, data: conflicts });
  }

  // SOX 404 Control Testing Matrix
  public static async getSoxControls(req: AuthenticatedRequest, res: Response) {
    const controls = await ForensicService.getSoxControls();
    return res.json({ success: true, data: controls });
  }

  public static async updateSoxControl(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const updates = req.body;
    const updated = await ForensicService.updateSoxControl(id, updates);
    if (!updated) return res.status(404).json({ success: false, error: 'SOX Control not found' });

    await db.logAudit({
      id: `log_${Date.now()}`,
      organizationId: req.user?.organizationId || 'org_apex_global',
      userId: req.user?.userId || 'usr_auditor',
      userName: req.user?.email || 'Auditor',
      userRole: req.user?.role || 'FINANCIAL_AUDITOR',
      action: 'SOX_CONTROL_UPDATED',
      entityType: 'SoxControl',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { updates },
    });

    return res.json({ success: true, data: updated });
  }

  public static async testSoxControl(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const auditorName = req.user?.email || 'Lead Auditor';
    const tested = await ForensicService.runSoxControlTest(id, auditorName);
    if (!tested) return res.status(404).json({ success: false, error: 'SOX Control not found' });

    await db.logAudit({
      id: `log_${Date.now()}`,
      organizationId: req.user?.organizationId || 'org_apex_global',
      userId: req.user?.userId || 'usr_auditor',
      userName: auditorName,
      userRole: req.user?.role || 'FINANCIAL_AUDITOR',
      action: 'SOX_CONTROL_TESTED',
      entityType: 'SoxControl',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { newStatus: tested.status, sampleSize: tested.sampleSizeTested },
    });

    return res.json({ success: true, data: tested });
  }

  // Cryptographic Workpapers Export
  public static async exportWorkpapers(req: AuthenticatedRequest, res: Response) {
    const orgId = req.user?.organizationId || 'org_apex_global';
    const auditorName = req.user?.email?.split('@')[0] || 'Chief Auditor';
    const auditorRole = req.user?.role || 'CHIEF_AUDITOR';
    const packageData = await ForensicService.generateWorkpaperPackage(orgId, auditorName, auditorRole);

    await db.logAudit({
      id: `log_${Date.now()}`,
      organizationId: orgId,
      userId: req.user?.userId || 'usr_auditor',
      userName: auditorName,
      userRole: auditorRole,
      action: 'WORKPAPERS_PACKAGE_GENERATED',
      entityType: 'WorkpaperPackage',
      entityId: packageData.exportId,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { sha256: packageData.sha256Checksum, seal: packageData.tamperProofSeal },
    });

    return res.json({ success: true, data: packageData });
  }
}
