/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AUDITMIND 360 - Comprehensive Automated Test Suite
 * Validates: Auth & JWT, RBAC, Reconciliation Engine, Three-Way Matching, and Case State Machine
 */

import { AuthService } from '../services/auth.service.ts';
import { db } from '../repositories/database.ts';
import { ReconciliationEngineService } from '../services/reconciliation.service.ts';
import { InvestigationService } from '../services/investigation.service.ts';
import { connectDatabase, disconnectDatabase } from '../config/database.ts';
import { config } from '../config/index.ts';
import { ForensicService } from '../services/forensic.service.ts';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name} (${Date.now() - start}ms)`);
    console.error(`    Error: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('AUDITMIND 360 — ENTERPRISE VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // Group 1: Authentication & Cryptographic Verification
  console.log('\x1b[36m[MODULE 1: Authentication & Cryptographic Verification]\x1b[0m');
  
  await runTest('Rejects retired demo credentials', async () => {
    const res = await AuthService.authenticate('chief.auditor@auditmind360.io', 'Audit360!Secure');
    assert(res === null, 'Retired built-in demo accounts must not authenticate');
  });

  await runTest('Rejects incorrect credentials with null auth result', async () => {
    const res = await AuthService.authenticate('chief.auditor@auditmind360.io', 'WrongPassword123!');
    assert(res === null, 'Should return null for invalid credentials');
  });

  await runTest('Rejects unknown user email', async () => {
    const res = await AuthService.authenticate('ghost.auditor@unknown.com', 'Audit360!Secure');
    assert(res === null, 'Should return null for nonexistent user');
  });

  await runTest('Verifies valid JWT token and extracts TokenPayload', async () => {
    const admin = await db.getUserByEmail('admin@auditmind360.io');
    assert(!!admin, 'Seed admin should be available to create a test token');
    const token = AuthService.generateToken(admin!);
    const payload = AuthService.verifyToken(token);
    assert(!!payload, 'Token should verify successfully');
    assert(payload!.email === 'admin@auditmind360.io', 'Payload email should match');
    assert(payload!.role === 'SUPER_ADMIN', 'Payload role should be SUPER_ADMIN');
  });

  await runTest('Bootstraps configured accounts into MongoDB with bcrypt hashes', async () => {
    const account = config.loginAccounts[0];
    const stored = await db.getUserByEmail(account.email);
    assert(!!stored, 'Configured account should be stored in MongoDB');
    assert(stored!.passwordHash.startsWith('$2'), 'MongoDB should store a bcrypt hash, not the plain-text password');
    const result = await AuthService.authenticate(account.email, account.password);
    assert(!!result, 'Configured credentials should authenticate using the MongoDB account');
  });

  // Group 2: RBAC Matrix
  console.log('\n\x1b[36m[MODULE 2: Role-Based Access Control (RBAC) Matrix]\x1b[0m');

  await runTest('Super Admin possesses all administrative and audit permissions', async () => {
    const admin = await db.getUserByEmail('admin@auditmind360.io');
    assert(!!admin, 'Admin must exist in repository');
    assert(AuthService.hasPermission(admin!.role, 'users:manage'), 'Admin can manage users');
    assert(AuthService.hasPermission(admin!.role, 'audit:approve'), 'Admin can approve audits');
    assert(AuthService.hasPermission(admin!.role, 'reconcile:execute'), 'Admin can run scan');
  });

  await runTest('Department Manager is restricted from cross-audit scanning & approval', async () => {
    const manager = await db.getUserByEmail('dept.manager@auditmind360.io');
    assert(!!manager, 'Department Manager must exist');
    assert(AuthService.hasPermission(manager!.role, 'audit:read_department'), 'Manager can view department audit');
    assert(!AuthService.hasPermission(manager!.role, 'reconcile:execute'), 'Manager CANNOT execute reconciliation scans');
    assert(!AuthService.hasPermission(manager!.role, 'audit:approve'), 'Manager CANNOT approve audit cases');
    assert(!AuthService.hasPermission(manager!.role, 'users:manage'), 'Manager CANNOT manage users');
  });

  // Group 3: Deterministic Reconciliation Engine
  console.log('\n\x1b[36m[MODULE 3: Deterministic Reconciliation & Discrepancy Engine]\x1b[0m');

  await runTest('Reconciliation scan detects duplicate payment risk on invoice INV-KAP-7741', async () => {
    const org = (await db.getOrganizations())[0];
    const scan = await ReconciliationEngineService.executeFullReconciliation(org.id);
    assert(scan.findings.length > 0, 'Scan must return discrepancy findings');

    const duplicateFinding = scan.findings.find(f => 
      f.category === 'DUPLICATE_PAYMENT' && (f.title.includes('INV-KAP-7741') || f.explanation.includes('INV-KAP-7741'))
    );
    assert(!!duplicateFinding, 'Must identify duplicate invoice INV-KAP-7741');
    assert(duplicateFinding!.severity === 'CRITICAL', 'Duplicate invoice must be flagged as CRITICAL severity');
    assert(duplicateFinding!.amountAtRisk === 22500, 'Exposure amount must be exactly $22,500.00');
  });

  await runTest('Reconciliation scan detects PO vs Invoice price variance ($52.8k PO vs $64.2k Invoice)', async () => {
    const org = (await db.getOrganizations())[0];
    const scan = await ReconciliationEngineService.executeFullReconciliation(org.id);
    const poVarianceFinding = scan.findings.find(f => 
      f.category === 'PO_INVOICE_VARIANCE' && f.amountAtRisk === 11400
    );
    assert(!!poVarianceFinding, 'Must flag PO vs Invoice variance of $11,400.00');
    assert(poVarianceFinding!.amountAtRisk === 11400, 'Price variance exposure must be exactly $11,400.00');
  });

  await runTest('Reconciliation scan detects physical vs ledger inventory shortages', async () => {
    const org = (await db.getOrganizations())[0];
    const scan = await ReconciliationEngineService.executeFullReconciliation(org.id);
    const inventoryFinding = scan.findings.find(f => 
      f.category === 'INVENTORY_DISCREPANCY' && f.amountAtRisk === 19200
    );
    assert(!!inventoryFinding, 'Must detect physical inventory shortages');
    assert(inventoryFinding!.title.includes('Server Blade') || inventoryFinding!.explanation.includes('Chassis'), 'Must reference inventory asset');
    assert(inventoryFinding!.amountAtRisk === 19200, 'Inventory shortage exposure must be $19,200.00');
  });

  // Group 4: Three-Way Matching Service
  console.log('\n\x1b[36m[MODULE 4: Three-Way Matching (PO ↔ Goods Receipt ↔ Invoice)]\x1b[0m');

  await runTest('Generates 3-way match comparator records with status flags', async () => {
    const matches = await db.getThreeWayMatches();
    assert(matches.length >= 2, 'Should have multiple 3-way match records');

    const perfectMatch = matches.find(m => m.status === 'PERFECT_MATCH');
    assert(!!perfectMatch, 'Must identify matching PO, GR, and Invoice');
    assert(perfectMatch!.varianceAmount === 0, 'Perfect match variance must be zero');

    const priceVariance = matches.find(m => m.status === 'PRICE_VARIANCE');
    assert(!!priceVariance, 'Must identify price variance between PO and Invoice');
    assert(priceVariance!.varianceAmount === 11400, 'Variance amount must be $11,400.00');
  });

  // Group 5: Investigation Case Workflow & State Machine
  console.log('\n\x1b[36m[MODULE 5: Audit Investigation State Machine & SOX Trail]\x1b[0m');

  await runTest('Validates sequential state machine transitions', () => {
    // DRAFT -> SUBMITTED is valid
    assert(InvestigationService.canTransition('DRAFT', 'SUBMITTED'), 'DRAFT can transition to SUBMITTED');
    // SUBMITTED -> UNDER_REVIEW is valid
    assert(InvestigationService.canTransition('SUBMITTED', 'UNDER_REVIEW'), 'SUBMITTED can transition to UNDER_REVIEW');
    // UNDER_REVIEW -> EVIDENCE_REQUIRED is valid
    assert(InvestigationService.canTransition('UNDER_REVIEW', 'EVIDENCE_REQUIRED'), 'UNDER_REVIEW can transition to EVIDENCE_REQUIRED');
    // UNDER_REVIEW -> APPROVED is valid
    assert(InvestigationService.canTransition('UNDER_REVIEW', 'APPROVED'), 'UNDER_REVIEW can transition to APPROVED');
    // APPROVED -> RESOLVED is valid
    assert(InvestigationService.canTransition('APPROVED', 'RESOLVED'), 'APPROVED can transition to RESOLVED');
    // RESOLVED -> CLOSED is valid
    assert(InvestigationService.canTransition('RESOLVED', 'CLOSED'), 'RESOLVED can transition to CLOSED');
  });

  await runTest('Prohibits illegal state jumps (e.g. SUBMITTED cannot jump directly to RESOLVED)', () => {
    assert(!InvestigationService.canTransition('SUBMITTED', 'RESOLVED'), 'SUBMITTED cannot jump to RESOLVED');
    assert(!InvestigationService.canTransition('SUBMITTED', 'CLOSED'), 'SUBMITTED cannot jump to CLOSED');
    assert(!InvestigationService.canTransition('DRAFT', 'APPROVED'), 'DRAFT cannot jump to APPROVED');
  });

  await runTest('Applies transition and logs history in InvestigationService', async () => {
    const allCases = await db.getCases();
    assert(allCases.length > 0, 'Should have at least one audit case');
    const testCase = allCases[0];
    const user = { id: 'usr_chief', name: 'Robert Hastings', role: 'CHIEF_AUDITOR' };

    // From UNDER_REVIEW to EVIDENCE_REQUIRED is an allowed transition
    if (testCase.status === 'UNDER_REVIEW') {
      const res = await InvestigationService.transitionCase(testCase.id, 'EVIDENCE_REQUIRED', user, 'Requesting signed vendor receiving voucher');
      assert(res.success, 'Transition should succeed');
      assert(res.case!.status === 'EVIDENCE_REQUIRED', 'Status should now be EVIDENCE_REQUIRED');
    } else if (testCase.status === 'SUBMITTED') {
      const res = await InvestigationService.transitionCase(testCase.id, 'UNDER_REVIEW', user, 'Commencing formal investigation');
      assert(res.success, 'Transition should succeed');
      assert(res.case!.status === 'UNDER_REVIEW', 'Status should now be UNDER_REVIEW');
    }
  });

  // Group 6: System Audit Logs
  console.log('\n\x1b[36m[MODULE 6: Immutable Audit Trail Logging]\x1b[0m');

  await runTest('Logs all security actions and state changes with client IP and timestamps', async () => {
    // Log an automated verification event
    await db.logAudit({
      id: `log_test_${Date.now()}`,
      organizationId: 'org_apex_global',
      userId: 'usr_chief',
      userName: 'Robert Hastings (CIA, CISA)',
      userRole: 'CHIEF_AUDITOR',
      action: 'SYSTEM_VERIFICATION_RUN',
      entityType: 'AuditCase',
      entityId: 'case_2026_01',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { automatedSuite: true, version: '1.0' },
    });

    const logs = await db.getAuditLogs();
    assert(logs.length > 0, 'Audit logs must be populated');
    const testLog = logs.find(l => l.action === 'SYSTEM_VERIFICATION_RUN');
    assert(!!testLog, 'Test verification event must be logged');
    assert(!!testLog!.timestamp, 'Log must include timestamp');
    assert(testLog!.ipAddress === '127.0.0.1', 'IP address must match');
  });

  // Group 7: Benford's Law Forensic Digit Analysis
  console.log('\n\x1b[36m[MODULE 7: Benford\'s Law Forensic Digit Analysis]\x1b[0m');

  await runTest('Calculates first-digit distribution against logarithmic standard', async () => {
    const org = (await db.getOrganizations())[0];
    const benford = await ForensicService.calculateBenfordAnalysis(org.id);

    assert(benford.totalSampleCount > 0, 'Sample count must be greater than zero');
    assert(benford.digitStats.length === 9, 'Must evaluate 9 leading digits (1 through 9)');
    assert(benford.digitStats[0].digit === 1, 'First digit must be 1');
    assert(Math.abs(benford.digitStats[0].theoreticalFrequency - 30.1) < 0.2, 'Theoretical digit 1 freq must be ~30.1%');
    assert(benford.chiSquareStatistic > 0, 'Chi-square statistic must be computed');
    assert(typeof benford.conformityRating === 'string', 'Conformity rating must be provided');
  });

  // Group 8: Conflict of Interest & Related-Party Detection
  console.log('\n\x1b[36m[MODULE 8: Conflict of Interest & Related-Party Detection]\x1b[0m');

  await runTest('Detects vendor and manager banking/address cross-network conflicts', async () => {
    const org = (await db.getOrganizations())[0];
    const conflicts = await ForensicService.detectConflictsOfInterest(org.id);

    assert(conflicts.length > 0, 'Must detect simulated conflict relationships');
    const bankingConflict = conflicts.find(c => c.conflictType === 'SHARED_BANK_ROUTING');
    assert(!!bankingConflict, 'Must detect shared bank routing conflict');
    assert(bankingConflict!.riskLevel === 'CRITICAL', 'Banking conflict must be CRITICAL');
    assert(bankingConflict!.matchedAttribute.includes('021000089'), 'Must identify routing number 021000089');
  });

  // Group 9: SOX 404 Control Matrix & Testing
  console.log('\n\x1b[36m[MODULE 9: SOX 404 Internal Control Testing Matrix]\x1b[0m');

  await runTest('Retrieves SOX controls and executes auditor sample verification', async () => {
    const controls = await ForensicService.getSoxControls();
    assert(controls.length >= 5, 'Must provide full set of internal controls');

    const control101 = controls.find(c => c.controlCode === 'FIN-CTL-101');
    assert(!!control101, 'Must contain FIN-CTL-101');

    const tested = await ForensicService.runSoxControlTest('sox_ctl_101', 'Lead Auditor');
    assert(!!tested, 'Test execution must return updated control');
    assert(tested!.sampleSizeTested > control101!.sampleSizeTested, 'Sample size must increment');
  });

  // Group 10: Cryptographic Workpaper Bundle Export
  console.log('\n\x1b[36m[MODULE 10: Cryptographic Audit Workpaper Bundle]\x1b[0m');

  await runTest('Generates signed workpaper package with SHA-256 seal', async () => {
    const org = (await db.getOrganizations())[0];
    const pkg = await ForensicService.generateWorkpaperPackage(org.id, 'Robert Hastings', 'CHIEF_AUDITOR');

    assert(!!pkg.exportId, 'Must have export ID');
    assert(pkg.sha256Checksum.length === 64, 'SHA-256 checksum must be 64 hex characters');
    assert(pkg.tamperProofSeal.startsWith('SIG_SOX404_'), 'Must generate valid tamper-proof seal');
    assert(pkg.summary.totalSpendYTD > 0, 'Summary must reflect organization spend');
  });


  // Summary
  console.log('\n======================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | \x1b[32mPASSED: ${passedCount}\x1b[0m | \x1b[31mFAILED: ${failedCount}\x1b[0m`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  await connectDatabase(`${config.mongoDbName}_test`);
  try {
    await db.initialize();
    await ForensicService.initialize();
    await runTestSuite();
  } finally {
    await disconnectDatabase();
  }
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exitCode = 1;
});
