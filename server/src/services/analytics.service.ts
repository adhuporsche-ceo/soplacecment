import { db } from '../repositories/database.ts';

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

export class AnalyticsService {
  public static async getMetrics(orgId: string): Promise<DashboardMetrics> {
    const [transactions, departments, findings, cases, actions, users] = await Promise.all([
      db.getTransactions(orgId),
      db.getDepartments(orgId),
      db.getFindings(orgId),
      db.getCases(orgId),
      db.getCorrectiveActions(orgId),
      db.getUsers(),
    ]);

    const totalSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
    const flaggedTx = transactions.filter(t => t.status === 'FLAGGED').length;
    const reconciledTx = transactions.filter(t => t.status === 'RECONCILED').length;
    const exposureAtRisk = findings
      .filter(f => f.status !== 'RESOLVED' && f.status !== 'FALSE_POSITIVE')
      .reduce((sum, f) => sum + f.amountAtRisk, 0);

    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length;
    const openCases = cases.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;

    const now = new Date();
    const overdueActions = actions.filter(
      a => a.status !== 'COMPLETED' && new Date(a.dueDate) < now
    ).length;

    // Department breakdown
    const departmentMetrics = departments.map(dept => {
      const deptFindings = findings.filter(f => f.departmentId === dept.id && f.status !== 'RESOLVED');
      const deptRiskScore = Math.min(100, Math.round(
        deptFindings.reduce((acc, f) => acc + (f.severity === 'CRITICAL' ? 35 : f.severity === 'HIGH' ? 20 : 10), 10)
      ));

      return {
        id: dept.id,
        name: dept.name,
        budget: dept.budgetAllocated,
        spent: dept.budgetSpent,
        findingsCount: deptFindings.length,
        riskScore: deptRiskScore,
      };
    });

    // Findings by category
    const categoryLabels: Record<string, string> = {
      DUPLICATE_PAYMENT: 'Duplicate Transactions',
      PO_INVOICE_VARIANCE: 'PO / Invoice Variance',
      MISSING_DOCUMENTATION: 'Missing Documentation',
      UNUSUAL_EXPENDITURE: 'Statistical Outliers',
      INVENTORY_DISCREPANCY: 'Inventory Discrepancy',
      POLICY_BREACH: 'Policy Breaches',
    };

    const categoryMap = new Map<string, { count: number; amount: number }>();
    findings.forEach(f => {
      const cur = categoryMap.get(f.category) || { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += f.amountAtRisk;
      categoryMap.set(f.category, cur);
    });

    const findingsByCategory = Array.from(categoryMap.entries()).map(([cat, data]) => ({
      category: cat,
      label: categoryLabels[cat] || cat,
      count: data.count,
      amount: data.amount,
    }));

    // Monthly expenditure trend
    const monthlyBudget = departments.reduce((sum, department) => sum + department.budgetAllocated, 0) / 12;
    const monthlySpend = new Map<string, number>();
    const monthlyAnomalies = new Map<string, number>();
    for (const transaction of transactions) {
      const month = transaction.date.slice(0, 7);
      monthlySpend.set(month, (monthlySpend.get(month) || 0) + transaction.amount);
      if (transaction.status === 'FLAGGED') {
        monthlyAnomalies.set(month, (monthlyAnomalies.get(month) || 0) + 1);
      }
    }

    const latestMonth = transactions.reduce(
      (latest, transaction) => transaction.date.slice(0, 7) > latest ? transaction.date.slice(0, 7) : latest,
      transactions[0]?.date.slice(0, 7) || new Date().toISOString().slice(0, 7),
    );
    const [latestYear, latestMonthNumber] = latestMonth.split('-').map(Number);
    const monthlyExpenditureTrend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(latestYear, latestMonthNumber - 6 + index, 1));
      const monthKey = date.toISOString().slice(0, 7);
      return {
        month: date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        actualSpend: monthlySpend.get(monthKey) || 0,
        budgetCap: Math.round(monthlyBudget),
        anomaliesDetected: monthlyAnomalies.get(monthKey) || 0,
      };
    });

    // Cases by Status
    const statusMap = new Map<string, number>();
    cases.forEach(c => {
      statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
    });

    const casesByStatus = ['SUBMITTED', 'UNDER_REVIEW', 'EVIDENCE_REQUIRED', 'APPROVED', 'RESOLVED', 'CLOSED'].map(st => ({
      status: st,
      count: statusMap.get(st) || 0,
    }));

    // Auditor Workload
    const auditors = users.filter(u => u.role === 'CHIEF_AUDITOR' || u.role === 'FINANCIAL_AUDITOR' || u.role === 'COMPLIANCE_OFFICER');
    const auditorWorkload = auditors.map(auditor => {
      const assignedCases = cases.filter(c => c.leadInvestigatorId === auditor.id);
      const active = assignedCases.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;
      const resolved = assignedCases.filter(c => c.status === 'CLOSED' || c.status === 'RESOLVED').length;

      return {
        auditorName: auditor.name,
        role: auditor.role.replace('_', ' '),
        activeCases: active,
        resolvedCases: resolved,
      };
    });

    return {
      totalTransactionsCount: transactions.length,
      flaggedTransactionsCount: flaggedTx,
      reconciledTransactionsCount: reconciledTx,
      totalSpendYTD: totalSpend,
      totalExposureAtRisk: exposureAtRisk,
      activeFindingsCount: findings.filter(f => f.status !== 'RESOLVED').length,
      criticalFindingsCount: criticalFindings,
      openCasesCount: openCases,
      overdueActionsCount: overdueActions,
      departmentMetrics,
      findingsByCategory,
      monthlyExpenditureTrend,
      casesByStatus,
      auditorWorkload,
    };
  }
}
