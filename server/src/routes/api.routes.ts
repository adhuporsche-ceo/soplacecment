import { RequestHandler, Response, Router } from 'express';
import { ApiController } from '../controllers/api.controller.ts';
import { AuthenticatedRequest, requireAuth, requireRole, requirePermission } from '../middleware/auth.middleware.ts';
import { HealthController } from '../controllers/health.controller.ts';

const router = Router();

const asyncHandler = (
  handler: (req: AuthenticatedRequest, res: Response) => Promise<unknown>,
): RequestHandler => (req, res, next) => {
  void handler(req as AuthenticatedRequest, res).catch(next);
};

router.get('/health', HealthController.getHealth);
router.post('/dev/mongo-connection-test', HealthController.runDatabaseConnectionTest);

// Public Auth Endpoints
router.post('/auth/login', asyncHandler(ApiController.login));

// Protected Auth Endpoints
router.get('/auth/me', requireAuth, asyncHandler(ApiController.getCurrentUser));

// Dashboard Analytics (All authenticated roles can view aggregated dashboard, Department Managers see their scope)
router.get('/analytics/dashboard', requireAuth, asyncHandler(ApiController.getDashboardMetrics));

// Financial Transactions
router.get('/transactions', requireAuth, asyncHandler(ApiController.getTransactions));
router.post('/transactions', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR'), asyncHandler(ApiController.createTransaction));

// Reconciliation Engine
router.post('/reconciliation/scan', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR'), asyncHandler(ApiController.executeReconciliation));

// Audit Findings
router.get('/findings', requireAuth, asyncHandler(ApiController.getFindings));
router.get('/findings/:id', requireAuth, asyncHandler(ApiController.getFindingDetail));
router.post('/findings/:id/analyze', requireAuth, asyncHandler(ApiController.analyzeFindingWithAi));

// Audit Cases & Investigation Lifecycle
router.get('/cases', requireAuth, asyncHandler(ApiController.getCases));
router.get('/cases/:id', requireAuth, asyncHandler(ApiController.getCaseById));
router.post('/cases', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR'), asyncHandler(ApiController.createCase));
router.post('/cases/:id/transition', requireAuth, asyncHandler(ApiController.transitionCaseStatus));
router.post('/cases/:id/notes', requireAuth, asyncHandler(ApiController.addCaseNote));

// Corrective Actions
router.get('/actions', requireAuth, asyncHandler(ApiController.getActions));
router.patch('/actions/:id', requireAuth, asyncHandler(ApiController.updateActionStatus));

// Documents & Evidence OCR
router.get('/documents', requireAuth, asyncHandler(ApiController.getDocuments));
router.post('/documents', requireAuth, asyncHandler(ApiController.uploadDocument));

// Audit Logs & Security Trails
router.get('/logs', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'), asyncHandler(ApiController.getAuditLogs));

// Inventory & Master Data
router.get('/inventory', requireAuth, asyncHandler(ApiController.getInventory));
router.get('/departments', requireAuth, asyncHandler(ApiController.getDepartments));
router.get('/vendors', requireAuth, asyncHandler(ApiController.getVendors));
router.post('/vendors', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR'), asyncHandler(ApiController.createOrUpdateVendor));

// 3-Way Reconciliation Matching
router.get('/matching/three-way', requireAuth, asyncHandler(ApiController.getThreeWayMatches));

// Budget & Expenditure Reconciliation
router.get('/budget/reconciliation', requireAuth, asyncHandler(ApiController.getBudgetReconciliation));

// User Management & RBAC Administration (Super Admin only)
router.get('/users', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(ApiController.getAllUsers));
router.post('/users', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(ApiController.createUser));
router.patch('/users/:id/status', requireAuth, requireRole('SUPER_ADMIN'), asyncHandler(ApiController.toggleUserStatus));

// Notifications
router.get('/notifications', requireAuth, asyncHandler(ApiController.getNotifications));
router.patch('/notifications/:id/read', requireAuth, asyncHandler(ApiController.markNotificationRead));

// Forensic Analytics: Benford's Law & Digit Distribution
router.get('/analytics/benfords-law', requireAuth, asyncHandler(ApiController.getBenfordAnalysis));

// Related-Party & Conflict of Interest Network
router.get('/analytics/conflict-network', requireAuth, asyncHandler(ApiController.getConflictNetwork));

// SOX 404 Control Matrix & Compliance Testing
router.get('/compliance/sox-controls', requireAuth, asyncHandler(ApiController.getSoxControls));
router.patch('/compliance/sox-controls/:id', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'), asyncHandler(ApiController.updateSoxControl));
router.post('/compliance/sox-controls/:id/test', requireAuth, requireRole('SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'), asyncHandler(ApiController.testSoxControl));

// Workpaper Bundle Generation & Attestation
router.post('/compliance/export-workpapers', requireAuth, asyncHandler(ApiController.exportWorkpapers));

export default router;
