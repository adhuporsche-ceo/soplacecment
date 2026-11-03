import { db } from '../repositories/database.ts';
import { AuditFinding, FindingCategory, FindingSeverity, FinancialTransaction } from '../types/index.ts';
import { GeminiAuditService } from './gemini.service.ts';

export interface ReconciliationSummary {
  scannedTransactionsCount: number;
  newFindingsGenerated: number;
  totalActiveFindings: number;
  duplicateTransactionsDetected: number;
  invoicePoVariancesDetected: number;
  missingDocumentationDetected: number;
  unusualAmountsDetected: number;
  inventoryDiscrepanciesDetected: number;
  totalExposureAmount: number;
  timestamp: string;
}

export class ReconciliationEngineService {
  /**
   * Run full comprehensive deterministic reconciliation sweep across transactions, invoices, and inventory
   */
  public static async executeFullReconciliation(orgId: string): Promise<{
    summary: ReconciliationSummary;
    findings: AuditFinding[];
  }> {
    const [transactions, purchaseOrders, invoices, inventory, existingFindings] = await Promise.all([
      db.getTransactions(orgId),
      db.getPurchaseOrders(orgId),
      db.getInvoices(orgId),
      db.getInventoryAssets(orgId),
      db.getFindings(orgId),
    ]);

    const generatedFindings: AuditFinding[] = [];
    let duplicateCount = 0;
    let poVarianceCount = 0;
    let missingDocCount = 0;
    let unusualCount = 0;
    let inventoryCount = 0;

    // A. Detect Duplicate Transactions & Duplicate Invoices
    // 1. Group by vendor + amount + invoiceNumber
    const txMap = new Map<string, FinancialTransaction[]>();
    for (const tx of transactions) {
      if (tx.invoiceNumber && tx.amount > 0) {
        const key = `${tx.vendorId}_${tx.invoiceNumber}_${tx.amount}`;
        const group = txMap.get(key) || [];
        group.push(tx);
        txMap.set(key, group);
      }
    }

    for (const [key, group] of txMap.entries()) {
      if (group.length > 1) {
        const primary = group[0];
        const duplicates = group.slice(1);
        const affectedIds = group.map(t => t.id);

        // Check if already logged
        const alreadyExists = existingFindings.some(
          f => f.category === 'DUPLICATE_PAYMENT' &&
          affectedIds.some(id => f.affectedRecordIds.includes(id))
        );

        if (!alreadyExists) {
          duplicateCount++;
          const findingId = `fnd_dup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const title = `Duplicate Payment Risk: ${primary.vendorName} (Invoice ${primary.invoiceNumber})`;
          const explanation = `${group.length} separate transactions share identical Vendor, Invoice # (${primary.invoiceNumber}), and Amount ($${primary.amount.toLocaleString()}). Transactions: ${group.map(g => g.transactionRef).join(', ')}.`;
          const evidence = `Identical invoice string "${primary.invoiceNumber}" matched on dates ${group.map(g => g.date.split('T')[0]).join(', ')}. Total duplicated exposure: $${(primary.amount * (group.length - 1)).toLocaleString()}.`;

          // Mark transactions as FLAGGED
          for (const t of group) {
            if (t.status !== 'RECONCILED') {
              await db.updateTransaction(t.id, { status: 'FLAGGED', discrepancyType: 'DUPLICATE' });
            }
          }

          const aiAnalysis = {
            riskScore: primary.amount > 50000 ? 94 : 88,
            reasoning: `High probability of duplicate voucher disbursement. Dual release of identical invoice #${primary.invoiceNumber} for $${primary.amount.toLocaleString()} identified across separate payment cycles. Recommend stop-payment hold.`,
          };

          const newFinding: AuditFinding = {
            id: findingId,
            organizationId: orgId,
            title,
            category: 'DUPLICATE_PAYMENT',
            severity: primary.amount > 50000 ? 'CRITICAL' : 'HIGH',
            affectedRecordIds: affectedIds,
            departmentId: primary.departmentId,
            amountAtRisk: primary.amount * (group.length - 1),
            explanation,
            supportingEvidence: evidence,
            status: 'DETECTED',
            detectedAt: new Date().toISOString(),
            aiRiskScore: aiAnalysis.riskScore,
            aiAnalysis: aiAnalysis.reasoning,
          };

          await db.createFinding(newFinding);
          generatedFindings.push(newFinding);
        }
      }
    }

    // B. Detect PO vs Invoice Discrepancies
    for (const inv of invoices) {
      if (inv.poNumber) {
        const po = purchaseOrders.find(p => p.poNumber === inv.poNumber);
        if (po) {
          const variance = Math.abs(inv.totalAmount - po.totalAmount);
          const percentDiff = (variance / po.totalAmount) * 100;

          if (variance > 100 && percentDiff > 5) {
            // Check if finding already logged
            const alreadyExists = existingFindings.some(
              f => f.category === 'PO_INVOICE_VARIANCE' &&
              f.affectedRecordIds.includes(inv.id)
            );

            if (!alreadyExists) {
              poVarianceCount++;
              const findingId = `fnd_pov_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
              const title = `PO Variance (${percentDiff.toFixed(1)}%): Invoice ${inv.invoiceNumber} vs ${po.poNumber}`;
              const explanation = `Invoice total ($${inv.totalAmount.toLocaleString()}) deviates from approved Purchase Order ($${po.totalAmount.toLocaleString()}) by $${variance.toLocaleString()} (${percentDiff.toFixed(1)}% excess).`;
              const evidence = `Authorized PO ${po.poNumber} value: $${po.totalAmount.toLocaleString()} dated ${po.issueDate.split('T')[0]}. Invoiced value: $${inv.totalAmount.toLocaleString()}.`;

              const aiAnalysis = {
                riskScore: variance > 25000 ? 88 : 78,
                reasoning: `Purchase order variance of $${variance.toLocaleString()} (${percentDiff.toFixed(1)}% excess) exceeds standard tolerance threshold (5%). Surcharges require procurement sign-off.`,
              };

              const newFinding: AuditFinding = {
                id: findingId,
                organizationId: orgId,
                title,
                category: 'PO_INVOICE_VARIANCE',
                severity: variance > 25000 ? 'CRITICAL' : variance > 5000 ? 'HIGH' : 'MEDIUM',
                affectedRecordIds: [inv.id, po.id],
                departmentId: po.departmentId,
                amountAtRisk: variance,
                explanation,
                supportingEvidence: evidence,
                status: 'DETECTED',
                detectedAt: new Date().toISOString(),
                aiRiskScore: aiAnalysis.riskScore,
                aiAnalysis: aiAnalysis.reasoning,
              };

              await db.createFinding(newFinding);
              generatedFindings.push(newFinding);
            }
          }
        }
      }
    }

    // C. Detect Missing Documentation on Material Transactions
    for (const tx of transactions) {
      if (!tx.hasDocument && tx.amount >= 20000 && tx.status !== 'RECONCILED') {
        const alreadyExists = existingFindings.some(
          f => f.category === 'MISSING_DOCUMENTATION' &&
          f.affectedRecordIds.includes(tx.id)
        );

        if (!alreadyExists) {
          missingDocCount++;
          const findingId = `fnd_doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const title = `Missing Documentation: ${tx.vendorName} ($${tx.amount.toLocaleString()})`;
          const explanation = `Disbursement ${tx.transactionRef} for $${tx.amount.toLocaleString()} was posted to General Ledger (${tx.glAccount}) without any attached supporting invoice, receipt, or signed SOW.`;
          const evidence = `GL Account ${tx.glAccount} debited on ${tx.date.split('T')[0]} without digital document attachment. Policy requires mandatory proof for disbursements >= $20,000.`;

          await db.updateTransaction(tx.id, { status: 'FLAGGED', discrepancyType: 'MISSING_DOC' });

          const aiAnalysis = {
            riskScore: tx.amount > 75000 ? 85 : 72,
            reasoning: `Control deficiency under internal disbursement policy §8.1. Disbursements above $20,000 require digitally signed documentation before wire release.`,
          };

          const newFinding: AuditFinding = {
            id: findingId,
            organizationId: orgId,
            title,
            category: 'MISSING_DOCUMENTATION',
            severity: tx.amount > 75000 ? 'HIGH' : 'MEDIUM',
            affectedRecordIds: [tx.id],
            departmentId: tx.departmentId,
            amountAtRisk: tx.amount,
            explanation,
            supportingEvidence: evidence,
            status: 'DETECTED',
            detectedAt: new Date().toISOString(),
            aiRiskScore: aiAnalysis.riskScore,
            aiAnalysis: aiAnalysis.reasoning,
          };

          await db.createFinding(newFinding);
          generatedFindings.push(newFinding);
        }
      }
    }

    // D. Detect Statistically Unusual Expenditure Amounts
    const categoryAvgMap = new Map<string, { total: number; count: number }>();
    for (const tx of transactions) {
      const current = categoryAvgMap.get(tx.category) || { total: 0, count: 0 };
      current.total += tx.amount;
      current.count += 1;
      categoryAvgMap.set(tx.category, current);
    }

    for (const tx of transactions) {
      const catStats = categoryAvgMap.get(tx.category);
      if (catStats && catStats.count >= 2) {
        const mean = catStats.total / catStats.count;
        if (tx.amount > mean * 3.5 && tx.amount > 100000 && tx.status !== 'RECONCILED') {
          const alreadyExists = existingFindings.some(
            f => f.category === 'UNUSUAL_EXPENDITURE' &&
            f.affectedRecordIds.includes(tx.id)
          );

          if (!alreadyExists) {
            unusualCount++;
            const findingId = `fnd_unusual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const title = `Unusual Expenditure Outlier: ${tx.vendorName} ($${tx.amount.toLocaleString()})`;
            const explanation = `Transaction ${tx.transactionRef} of $${tx.amount.toLocaleString()} is ${(tx.amount / mean).toFixed(1)}x higher than category average ($${Math.round(mean).toLocaleString()}) for ${tx.category}.`;
            const evidence = `Statistical anomaly deviation: Amount $${tx.amount.toLocaleString()} vs category mean $${Math.round(mean).toLocaleString()}.`;

            await db.updateTransaction(tx.id, { status: 'FLAGGED', discrepancyType: 'UNUSUAL_AMOUNT' });

            const aiAnalysis = {
              riskScore: 78,
              reasoning: `Statistical outlier of ${(tx.amount / mean).toFixed(1)}x over category mean. Requires verification of emergency procurement authorization.`,
            };

            const newFinding: AuditFinding = {
              id: findingId,
              organizationId: orgId,
              title,
              category: 'UNUSUAL_EXPENDITURE',
              severity: 'HIGH',
              affectedRecordIds: [tx.id],
              departmentId: tx.departmentId,
              amountAtRisk: tx.amount,
              explanation,
              supportingEvidence: evidence,
              status: 'DETECTED',
              detectedAt: new Date().toISOString(),
              aiRiskScore: aiAnalysis.riskScore,
              aiAnalysis: aiAnalysis.reasoning,
            };

            await db.createFinding(newFinding);
            generatedFindings.push(newFinding);
          }
        }
      }
    }

    // E. Detect Inventory Ledger vs Physical Inconsistencies
    for (const item of inventory) {
      if (item.discrepancyUnits !== 0) {
        const alreadyExists = existingFindings.some(
          f => f.category === 'INVENTORY_DISCREPANCY' &&
          f.affectedRecordIds.includes(item.id)
        );

        if (!alreadyExists) {
          inventoryCount++;
          const absExposure = Math.abs(item.varianceValue);
          const findingId = `fnd_inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const title = `Inventory Discrepancy: ${item.name} (${Math.abs(item.discrepancyUnits)} units)`;
          const explanation = `Physical audit cycle count recorded ${item.physicalQuantity} units versus ERP ledger of ${item.ledgerQuantity} units at ${item.location}. Exposure: $${absExposure.toLocaleString()}.`;
          const evidence = `SKU ${item.sku}: Discrepancy of ${item.discrepancyUnits} units @ $${item.unitCost} unit cost. Audited on ${item.lastAuditedDate.split('T')[0]}.`;

          const aiAnalysis = {
            riskScore: absExposure > 20000 ? 80 : 65,
            reasoning: `Inventory shortage of ${Math.abs(item.discrepancyUnits)} units identified at ${item.location}. Recommend warehouse supervisor reconciliation and cycle count recheck.`,
          };

          const newFinding: AuditFinding = {
            id: findingId,
            organizationId: orgId,
            title,
            category: 'INVENTORY_DISCREPANCY',
            severity: absExposure > 20000 ? 'HIGH' : 'MEDIUM',
            affectedRecordIds: [item.id],
            departmentId: item.departmentId,
            amountAtRisk: absExposure,
            explanation,
            supportingEvidence: evidence,
            status: 'DETECTED',
            detectedAt: new Date().toISOString(),
            aiRiskScore: aiAnalysis.riskScore,
            aiAnalysis: aiAnalysis.reasoning,
          };

          await db.createFinding(newFinding);
          generatedFindings.push(newFinding);
        }
      }
    }

    const allFindings = await db.getFindings(orgId);
    const totalExposure = allFindings.reduce((sum, f) => sum + f.amountAtRisk, 0);

    const summary: ReconciliationSummary = {
      scannedTransactionsCount: transactions.length,
      newFindingsGenerated: generatedFindings.length,
      totalActiveFindings: allFindings.length,
      duplicateTransactionsDetected: duplicateCount,
      invoicePoVariancesDetected: poVarianceCount,
      missingDocumentationDetected: missingDocCount,
      unusualAmountsDetected: unusualCount,
      inventoryDiscrepanciesDetected: inventoryCount,
      totalExposureAmount: totalExposure,
      timestamp: new Date().toISOString(),
    };

    return { summary, findings: allFindings };
  }
}
