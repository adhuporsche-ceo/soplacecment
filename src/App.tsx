import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { NavModule } from './components/layout/Sidebar.tsx';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard.tsx';
import { TransactionManagement } from './components/transactions/TransactionManagement.tsx';
import { ReconciliationHub } from './components/reconciliation/ReconciliationHub.tsx';
import { InvestigationCases } from './components/investigations/InvestigationCases.tsx';
import { EvidenceIntelligence } from './components/evidence/EvidenceIntelligence.tsx';
import { CorrectiveActionsView } from './components/actions/CorrectiveActionsView.tsx';
import { InventoryAuditView } from './components/inventory/InventoryAuditView.tsx';
import { AuditLogsView } from './components/audit-logs/AuditLogsView.tsx';
import { ThreeWayMatchingView } from './components/matching/ThreeWayMatchingView.tsx';
import { BudgetReconciliationView } from './components/budget/BudgetReconciliationView.tsx';
import { VendorManagementView } from './components/vendors/VendorManagementView.tsx';
import { UserManagementView } from './components/users/UserManagementView.tsx';
import { BenfordsLawView } from './components/forensics/BenfordsLawView.tsx';
import { ConflictNetworkView } from './components/forensics/ConflictNetworkView.tsx';
import { SoxControlMatrixView } from './components/compliance/SoxControlMatrixView.tsx';
import { WorkpaperExportModal } from './components/compliance/WorkpaperExportModal.tsx';
import { AiRiskAnalysisModal } from './components/ai-risk/AiRiskAnalysisModal.tsx';
import { AuditReportModal } from './components/reports/AuditReportModal.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { api } from './services/api.ts';
import {
  AuditCase,
  AuditFinding,
  AuditLog,
  CaseStatus,
  CorrectiveAction,
  DashboardMetrics,
  Department,
  EvidenceDocument,
  FinancialTransaction,
  InventoryAsset,
  ThreeWayMatchResult,
  User,
  Vendor,
} from './types.ts';
import { Activity, ArrowRight, Bell, CheckCircle, ShieldCheck, X } from 'lucide-react';
import { UserRole } from './types.ts';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'FINDING' | 'CASE' | 'ACTION' | 'INFO';
}

const MODULE_ACCESS: Record<NavModule, UserRole[]> = {
  DASHBOARD: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  TRANSACTIONS: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  THREE_WAY_MATCHING: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  RECONCILIATION: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
  BENFORDS_LAW: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
  CONFLICT_NETWORK: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
  SOX_CONTROLS: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER', 'DEPARTMENT_MANAGER'],
  BUDGET_RECONCILIATION: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  CASES: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  EVIDENCE: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  ACTIONS: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  INVENTORY: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'DEPARTMENT_MANAGER', 'COMPLIANCE_OFFICER'],
  VENDORS: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
  REPORTS: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
  LOGS: ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR', 'COMPLIANCE_OFFICER'],
  USERS: ['SUPER_ADMIN'],
};

const PLATFORM_FEATURES: { title: string; description: string; module: NavModule }[] = [
  { title: 'Follow every transaction', description: 'Review financial activity with supporting evidence and audit context.', module: 'TRANSACTIONS' },
  { title: 'Reconcile with confidence', description: 'Compare records, surface discrepancies, and create investigations.', module: 'RECONCILIATION' },
  { title: 'Test controls continuously', description: 'Track SOX controls, budgets, corrective actions, and compliance.', module: 'SOX_CONTROLS' },
];

interface PageSectionProps {
  id: string;
  module?: NavModule;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const PageSection: React.FC<PageSectionProps> = ({
  id,
  module,
  eyebrow,
  title,
  description,
  children,
  className = '',
}) => (
  <section
    id={id}
    data-module={module}
    className={`page-section reveal-on-scroll ${className}`}
  >
    <div className="page-section-heading">
      <p className="page-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="page-section-description">{description}</p>}
    </div>
    {children}
  </section>
);

function MainApp() {
  const { user, isLoading: authLoading } = useAuth();
  const [currentModule, setCurrentModule] = useState<NavModule>('DASHBOARD');

  // Core Data State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [cases, setCases] = useState<AuditCase[]>([]);
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [inventory, setInventory] = useState<InventoryAsset[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [threeWayMatches, setThreeWayMatches] = useState<ThreeWayMatchResult[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [liveSocketConnected, setLiveSocketConnected] = useState(true);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  // Modals
  const [selectedFindingForAi, setSelectedFindingForAi] = useState<AuditFinding | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [workpaperModalOpen, setWorkpaperModalOpen] = useState(false);

  const moduleTitles: Record<NavModule, string> = {
    DASHBOARD: 'Executive Overview',
    TRANSACTIONS: 'Financial Ledger',
    THREE_WAY_MATCHING: 'Three-Way Matching',
    RECONCILIATION: 'Reconciliation Engine',
    BENFORDS_LAW: "Benford's Law Forensic",
    CONFLICT_NETWORK: 'Conflict of Interest Graph',
    SOX_CONTROLS: 'SOX 404 Control Matrix',
    BUDGET_RECONCILIATION: 'Budget & Actuals',
    CASES: 'Audit Investigations',
    EVIDENCE: 'Document Intelligence',
    ACTIONS: 'Corrective Actions (CAPA)',
    INVENTORY: 'Inventory Audits',
    VENDORS: 'Vendor Risk Directory',
    REPORTS: 'Board & SOX Reports',
    LOGS: 'System Audit Logs',
    USERS: 'User Administration',
  };

  const canViewModule = (module: NavModule) =>
    Boolean(user && MODULE_ACCESS[module].includes(user.role));

  const navigateToModule = (module: NavModule) => {
    if (!canViewModule(module)) return;

    setCurrentModule(module);
    const section = document.getElementById(`module-${module}`);
    if (section) {
      section.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  // Load all initial data from REST API
  const loadData = async () => {
    try {
      const [m, tx, f, c, d, a, inv, l, twm, bgt, vds, depts] = await Promise.all([
        api.getDashboardMetrics(),
        api.getTransactions(),
        api.getFindings(),
        api.getCases(),
        api.getDocuments(),
        api.getActions(),
        api.getInventory(),
        api.getAuditLogs().catch(() => []),
        api.getThreeWayMatches().catch(() => []),
        api.getBudgetReconciliation().catch(() => []),
        api.getVendors().catch(() => []),
        api.getDepartments().catch(() => []),
      ]);
      setMetrics(m);
      setTransactions(tx);
      setFindings(f);
      setCases(c);
      setDocuments(d);
      setActions(a);
      setInventory(inv);
      setLogs(l);
      setThreeWayMatches(twm);
      setBudgetData(bgt);
      setVendors(vds);
      setDepartments(depts);

      if (user?.role === 'SUPER_ADMIN') {
        try {
          const u = await api.getAllUsers();
          setUsersList(u);
        } catch (e) {
          console.warn('Could not load user directory:', e);
        }
      }
    } catch (err) {
      console.warn('Error loading initial data from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Connect Socket.IO
  useEffect(() => {
    if (!user) return;

    api.initSocket((event, data) => {
      setLiveSocketConnected(true);

      const toastId = `toast_${Date.now()}`;
      if (event === 'audit.finding.created') {
        setToasts(prev => [
          ...prev,
          {
            id: toastId,
            title: 'New Discrepancies Flagged',
            message: `Reconciliation scan detected ${data.summary?.newFindingsGenerated || 'new'} anomaly findings.`,
            type: 'FINDING',
          },
        ]);
        loadData();
      } else if (event === 'audit.case.updated' || event === 'audit.case.assigned') {
        setToasts(prev => [
          ...prev,
          {
            id: toastId,
            title: 'Investigation Case Updated',
            message: data.case?.title || 'Case state transitioned.',
            type: 'CASE',
          },
        ]);
        loadData();
      } else if (event === 'evidence.uploaded') {
        setToasts(prev => [
          ...prev,
          {
            id: toastId,
            title: 'Evidence Document Verified',
            message: `${data.document?.fileName} uploaded to intelligence vault.`,
            type: 'INFO',
          },
        ]);
        loadData();
      } else if (event === 'action.completed') {
        setToasts(prev => [
          ...prev,
          {
            id: toastId,
            title: 'Remediation Milestone Updated',
            message: `Corrective action updated.`,
            type: 'ACTION',
          },
        ]);
        loadData();
      }

      // Auto dismiss toast after 5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 5000);
    });
  }, [user]);

  useEffect(() => {
    if (!user || typeof IntersectionObserver === 'undefined') return;

    const sections = document.querySelectorAll<HTMLElement>('.reveal-on-scroll');
    const observer = new IntersectionObserver(
      entries => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        visibleEntries.forEach(entry => entry.target.classList.add('is-visible'));

        const activeSection = visibleEntries
          .filter(entry => entry.target.hasAttribute('data-module'))
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const module = activeSection?.target.getAttribute('data-module') as NavModule | null;
        if (module) setCurrentModule(module);
      },
      { rootMargin: '-10% 0px -8% 0px', threshold: 0 },
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [user]);

  const handleRunReconciliation = async () => {
    setIsScanning(true);
    try {
      const res = await api.runReconciliationScan();
      setFindings(res.findings);
      await loadData();
      navigateToModule('RECONCILIATION');
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateTransaction = async (tx: Partial<FinancialTransaction>) => {
    await api.createTransaction(tx);
    await loadData();
  };

  const handleCreateCaseFromFinding = async (finding: AuditFinding) => {
    try {
      await api.createCase({
        title: `Investigation: ${finding.title}`,
        findingIds: [finding.id],
        departmentId: finding.departmentId,
        priority: finding.severity,
        summary: finding.explanation,
      });
      await loadData();
      navigateToModule('CASES');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTransitionCaseStatus = async (caseId: string, targetStatus: CaseStatus, reason: string) => {
    await api.transitionCase(caseId, targetStatus, reason);
    await loadData();
  };

  const handleAddCaseNote = async (caseId: string, text: string) => {
    await api.addCaseNote(caseId, text);
    await loadData();
  };

  const handleUpdateMilestone = async (actionId: string, milestoneIndex: number, completed: boolean) => {
    await api.updateAction(actionId, { milestoneIndex, milestoneCompleted: completed });
    await loadData();
  };

  const handleUpdateActionStatus = async (actionId: string, status: string, notes?: string) => {
    await api.updateAction(actionId, { status, verificationNotes: notes });
    await loadData();
  };

  const handleUploadDocument = async (doc: any) => {
    await api.uploadDocument(doc);
    await loadData();
  };

  if (authLoading) {
    return (
      <main className="auth-loading" aria-live="polite">
        <span className="login-brand-mark"><ShieldCheck size={20} /></span>
        <p>Verifying your secure session…</p>
      </main>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="app-shell audit-light-theme bg-[#F8F9FA] text-[#1E293B] font-sans selection:bg-sky-500/20 selection:text-sky-900">
      <Header
        currentModule={moduleTitles[currentModule]}
        onNavigateToModule={navigateToModule}
        onOpenReport={() => setReportModalOpen(true)}
        onTriggerReconciliation={handleRunReconciliation}
        isScanning={isScanning}
        liveSocketConnected={liveSocketConnected}
      />

      <main>
        <section id="top" className="hero-section">
          <div className="hero-copy">
            <p className="page-eyebrow"><span className="hero-live-dot" /> CONTINUOUS AUDIT INTELLIGENCE</p>
            <h1>Clarity for every transaction.<br /><span>Confidence in every control.</span></h1>
            <p className="hero-description">
              One connected workspace for financial reconciliation, forensic review, evidence, and internal controls.
              Explore the live AuditMind 360 workspace below.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => navigateToModule('DASHBOARD')}>
                Explore the workspace <ArrowRight size={16} />
              </button>
              <button className="secondary-button" onClick={() => navigateToModule('TRANSACTIONS')}>
                View audit modules
              </button>
            </div>
            <p className="hero-note">
              <ShieldCheck size={15} /> Built for clear, reviewable audit workflows
            </p>
          </div>
          <div className="hero-visual" aria-label="Audit workflow overview">
            <div className="hero-visual-top">
              <div>
                <span className="hero-visual-label">AUDIT WORKSPACE</span>
                <h2>One view. Connected evidence.</h2>
              </div>
              <span className="hero-status"><span className="hero-live-dot" /> Live</span>
            </div>
            <div className="workflow-visual">
              <div className="workflow-line" />
              {[
                ['01', 'Review', 'Financial activity'],
                ['02', 'Reconcile', 'Records and evidence'],
                ['03', 'Resolve', 'Controls and actions'],
              ].map(([number, label, detail]) => (
                <div className="workflow-step" key={number}>
                  <span className="workflow-number">{number}</span>
                  <div><strong>{label}</strong><span>{detail}</span></div>
                  <CheckCircle size={17} className="workflow-check" />
                </div>
              ))}
            </div>
            <div className="hero-visual-foot">
              <span><span className="hero-live-dot" /> Connected audit workflow</span>
              <span>FY2026 · Q1</span>
            </div>
          </div>
        </section>

        <PageSection
          id="about"
          eyebrow="ABOUT THE PROJECT"
          title="A complete picture of financial integrity."
          description="AuditMind 360 brings day-to-day audit work into one clear, connected workspace—from the first transaction review to the final control follow-up."
          className="about-section"
        >
          <div className="about-grid">
            <p>
              Instead of switching between disconnected views, auditors can review the ledger, compare supporting records,
              investigate anomalies, manage evidence, and track remediation alongside the executive overview.
            </p>
            <div className="about-facts">
              <div><strong>One workspace</strong><span>Financial and operational audit views</span></div>
              <div><strong>Connected workflow</strong><span>Findings, cases, evidence, and actions</span></div>
              <div><strong>Human review</strong><span>Analysis supports—not replaces—auditor judgment</span></div>
            </div>
          </div>
        </PageSection>

        <PageSection
          id="features"
          eyebrow="MAIN FEATURES"
          title="The tools auditors need, in one place."
          description="Move naturally from reviewing activity to understanding risk and strengthening controls."
          className="features-section"
        >
          <div className="feature-grid">
            {PLATFORM_FEATURES.map((feature, index) => (
              <button
                className="feature-card"
                key={feature.title}
                onClick={() => navigateToModule(feature.module)}
                disabled={!canViewModule(feature.module)}
              >
                <span className="feature-index">0{index + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-link">Explore module <ArrowRight size={15} /></span>
              </button>
            ))}
          </div>
        </PageSection>

        <PageSection
          id="how-it-works"
          eyebrow="HOW IT WORKS"
          title="From records to resolution."
          description="A practical audit path that keeps each stage understandable and connected."
          className="how-section"
        >
          <div className="how-grid">
            {[
              ['01', 'Review the activity', 'Start with transactions, budgets, inventory, and vendor records.'],
              ['02', 'Compare and investigate', 'Use matching, reconciliation, and forensic views to examine exceptions.'],
              ['03', 'Document the work', 'Organize evidence, investigation notes, and audit-ready reports.'],
              ['04', 'Strengthen controls', 'Assign corrective actions and follow control status through resolution.'],
            ].map(([number, title, detail]) => (
              <article className="how-card" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{detail}</p>
              </article>
            ))}
          </div>
        </PageSection>

        <PageSection
          id="module-DASHBOARD"
          module="DASHBOARD"
          eyebrow="PRODUCT DEMONSTRATION · LIVE DATA"
          title="Start with the executive view."
          description="Explore current audit metrics and trends, then continue down the page through the full set of available modules."
          className="dashboard-section"
        >
          {canViewModule('DASHBOARD') && (
            <ExecutiveDashboard
              metrics={metrics}
              isLoading={isLoading}
              onNavigateToReconcile={() => navigateToModule('RECONCILIATION')}
              onNavigateToCases={() => navigateToModule('CASES')}
              onSelectFindingForAi={fId => {
                const found = findings.find(f => f.id === fId);
                if (found) setSelectedFindingForAi(found);
              }}
            />
          )}
        </PageSection>

        <PageSection id="technology" eyebrow="TECHNOLOGY STACK" title="Built for real audit work." description="A modern web application architecture powers the interactive workspace, API-backed workflows, and live updates." className="technology-section">
          <div className="technology-list">
            {['React', 'TypeScript', 'Vite', 'Express', 'Socket.IO', 'Google Gemini integration'].map((technology, index) => (
              <span key={technology}><span>0{index + 1}</span>{technology}</span>
            ))}
          </div>
        </PageSection>

        <PageSection id="benefits" eyebrow="BENEFITS & USE CASES" title="More context. Less fragmentation." description="Designed for teams that need to see what happened, understand why it matters, and keep the follow-through visible." className="benefits-section">
          <div className="benefit-grid">
            <article><Activity size={20} /><h3>Continuous visibility</h3><p>Bring audit status, exposure, and workload into a shared overview.</p></article>
            <article><ShieldCheck size={20} /><h3>Traceable review</h3><p>Connect findings to investigations, supporting evidence, and remediation.</p></article>
            <article><ArrowRight size={20} /><h3>Actionable follow-through</h3><p>Move from a flagged exception to an assigned, trackable next step.</p></article>
          </div>
        </PageSection>

        <div id="modules" className="modules-intro">
          <p className="page-eyebrow">THE AUDIT WORKSPACE</p>
          <h2>Explore every module.</h2>
          <p>Each working view is presented below in sequence. Scroll naturally, or use the top links to jump to a section.</p>
        </div>

        {canViewModule('TRANSACTIONS') && <PageSection id="module-TRANSACTIONS" module="TRANSACTIONS" eyebrow="FINANCIAL REVIEW · 01" title="Financial ledger" description="Review transactions and supporting context." className="module-page-section">
            <TransactionManagement
              transactions={transactions}
              isLoading={isLoading}
              onRefresh={loadData}
              onCreateTransaction={handleCreateTransaction}
              onSelectDocument={() => navigateToModule('EVIDENCE')}
            />
        </PageSection>}

        {canViewModule('THREE_WAY_MATCHING') && <PageSection id="module-THREE_WAY_MATCHING" module="THREE_WAY_MATCHING" eyebrow="FINANCIAL REVIEW · 02" title="Three-way matching" description="Compare purchase orders, invoices, and receiving records." className="module-page-section">
            <ThreeWayMatchingView
              matches={threeWayMatches}
              isLoading={isLoading}
              onSelectFinding={fId => {
                const found = findings.find(f => f.id === fId);
                if (found) setSelectedFindingForAi(found);
              }}
              onOpenReport={() => setReportModalOpen(true)}
            />
        </PageSection>}

        {canViewModule('RECONCILIATION') && <PageSection id="module-RECONCILIATION" module="RECONCILIATION" eyebrow="FINANCIAL REVIEW · 03" title="Reconciliation engine" description="Review flagged discrepancies and launch investigation or AI-assisted analysis." className="module-page-section">
            <ReconciliationHub
              findings={findings}
              isScanning={isScanning}
              onRunScan={handleRunReconciliation}
              onOpenAiAnalysis={setSelectedFindingForAi}
                onCreateCaseFromFinding={handleCreateCaseFromFinding}
              />
        </PageSection>}

        {canViewModule('BENFORDS_LAW') && <PageSection id="module-BENFORDS_LAW" module="BENFORDS_LAW" eyebrow="FORENSIC ANALYSIS · 01" title="Benford’s law analysis" description="Inspect digit distributions as one signal in a broader audit review." className="module-page-section">
                <BenfordsLawView />
        </PageSection>}

        {canViewModule('CONFLICT_NETWORK') && <PageSection id="module-CONFLICT_NETWORK" module="CONFLICT_NETWORK" eyebrow="FORENSIC ANALYSIS · 02" title="Conflict of interest network" description="Explore related-party and conflict-of-interest relationships." className="module-page-section">
                <ConflictNetworkView />
        </PageSection>}

        {canViewModule('CASES') && <PageSection id="module-CASES" module="CASES" eyebrow="INVESTIGATION · 01" title="Audit investigations" description="Manage case status, notes, and ownership through the investigation lifecycle." className="module-page-section">
              <InvestigationCases
                cases={cases}
                isLoading={isLoading}
                onRefresh={loadData}
                onTransitionStatus={handleTransitionCaseStatus}
                onAddNote={handleAddCaseNote}
              />
        </PageSection>}

        {canViewModule('EVIDENCE') && <PageSection id="module-EVIDENCE" module="EVIDENCE" eyebrow="INVESTIGATION · 02" title="Document intelligence" description="Keep uploaded evidence and transaction context together." className="module-page-section">
              <EvidenceIntelligence
                documents={documents}
                transactions={transactions}
                isLoading={isLoading}
                onUploadDocument={handleUploadDocument}
              />
        </PageSection>}

        {canViewModule('ACTIONS') && <PageSection id="module-ACTIONS" module="ACTIONS" eyebrow="INVESTIGATION · 03" title="Corrective actions" description="Track remediation ownership, milestones, and status." className="module-page-section">
              <CorrectiveActionsView
                actions={actions}
                isLoading={isLoading}
                onUpdateMilestone={handleUpdateMilestone}
                onUpdateStatus={handleUpdateActionStatus}
              />
        </PageSection>}

        {canViewModule('INVENTORY') && <PageSection id="module-INVENTORY" module="INVENTORY" eyebrow="OPERATIONAL REVIEW · 01" title="Inventory audits" description="Review recorded inventory and audit status." className="module-page-section">
              <InventoryAuditView inventory={inventory} isLoading={isLoading} />
        </PageSection>}

        {canViewModule('VENDORS') && <PageSection id="module-VENDORS" module="VENDORS" eyebrow="OPERATIONAL REVIEW · 02" title="Vendor risk directory" description="Review vendor records and manage directory details." className="module-page-section">
              <VendorManagementView
                vendors={vendors}
                isLoading={isLoading}
                onRefresh={loadData}
                onSaveVendor={async (vendor) => {
                  await api.createOrUpdateVendor(vendor);
                  await loadData();
                }}
              />
        </PageSection>}

        {canViewModule('BUDGET_RECONCILIATION') && <PageSection id="module-BUDGET_RECONCILIATION" module="BUDGET_RECONCILIATION" eyebrow="OPERATIONAL REVIEW · 03" title="Budget and actuals" description="Compare budget allocations with actual activity." className="module-page-section">
              <BudgetReconciliationView
                reconciliationData={budgetData}
                isLoading={isLoading}
              />
        </PageSection>}

        {canViewModule('SOX_CONTROLS') && <PageSection id="module-SOX_CONTROLS" module="SOX_CONTROLS" eyebrow="COMPLIANCE · 01" title="SOX 404 control matrix" description="Review control coverage and testing status." className="module-page-section">
              <SoxControlMatrixView onOpenWorkpapers={() => setWorkpaperModalOpen(true)} />
        </PageSection>}

        {canViewModule('REPORTS') && <PageSection id="module-REPORTS" module="REPORTS" eyebrow="COMPLIANCE · 02" title="Board and SOX reports" description="Prepare an executive audit brief for review." className="module-page-section">
          <div className="report-callout">
              <div><span className="page-eyebrow">AUDIT COMMITTEE</span><h3>Turn audit activity into a clear brief.</h3><p>Generate the current executive report with findings, exposure, and corrective-action context.</p></div>
              <button className="primary-button" onClick={() => setReportModalOpen(true)}>Generate audit dossier <ArrowRight size={16} /></button>
          </div>
        </PageSection>}

        {canViewModule('LOGS') && <PageSection id="module-LOGS" module="LOGS" eyebrow="COMPLIANCE · 03" title="System audit logs" description="Review recorded audit activity and system events." className="module-page-section">
              <AuditLogsView logs={logs} isLoading={isLoading} />
        </PageSection>}

        {canViewModule('USERS') && <PageSection id="module-USERS" module="USERS" eyebrow="ADMINISTRATION" title="User administration" description="Manage user access and department assignments." className="module-page-section">
              <UserManagementView
                users={usersList}
              departments={departments}
              isLoading={isLoading}
              onCreateUser={async (userData) => {
                await api.createUser(userData);
                await loadData();
              }}
              onToggleStatus={async (userId) => {
                await api.toggleUserStatus(userId);
                await loadData();
              }}
            />
        </PageSection>}

        <section id="get-started" className="final-cta">
          <div>
            <p className="page-eyebrow">AUDITMIND 360</p>
            <h2>Bring your next audit into focus.</h2>
            <p>Continue exploring the workspace or create an executive audit dossier from the current review.</p>
          </div>
          <div className="final-cta-actions">
            <button className="primary-button" onClick={() => setReportModalOpen(true)}>Open audit dossier <ArrowRight size={16} /></button>
            {user && ['SUPER_ADMIN', 'CHIEF_AUDITOR', 'FINANCIAL_AUDITOR'].includes(user.role) && (
              <button className="cta-light-button" onClick={handleRunReconciliation} disabled={isScanning}>
                {isScanning ? 'Scanning…' : 'Run audit scan'}
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a href="#top" className="footer-brand"><span><ShieldCheck size={17} /></span> AuditMind 360</a>
        <p>Internal audit intelligence · Apex Global Holdings</p>
        <a href="#top" className="back-to-top">Back to top ↑</a>
      </footer>

      {/* Real-Time Toast Banners */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto p-3.5 rounded-md bg-white border border-[#E2E8F0] shadow-lg text-xs text-[#1E293B] flex items-start gap-3"
          >
            <Bell className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#1E293B] truncate">{toast.title}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{toast.message}</div>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* AI Deep Dive Modal */}
      {selectedFindingForAi && (
        <AiRiskAnalysisModal
          finding={selectedFindingForAi}
          onClose={() => setSelectedFindingForAi(null)}
        />
      )}

      {/* Board Audit Report Modal */}
      <AuditReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        metrics={metrics}
        findings={findings}
        actions={actions}
      />

      {/* Cryptographic Workpaper Export Modal */}
      <WorkpaperExportModal
        isOpen={workpaperModalOpen}
        onClose={() => setWorkpaperModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
