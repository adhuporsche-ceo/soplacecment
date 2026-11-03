import { db } from '../repositories/database.ts';
import { AuditCase, CaseStatus, User } from '../types/index.ts';

const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['EVIDENCE_REQUIRED', 'APPROVED', 'REJECTED'],
  EVIDENCE_REQUIRED: ['UNDER_REVIEW', 'REJECTED'],
  APPROVED: ['RESOLVED'],
  REJECTED: ['CLOSED', 'DRAFT'],
  RESOLVED: ['CLOSED', 'UNDER_REVIEW'],
  CLOSED: ['UNDER_REVIEW'], // Can reopen if new evidence arises
};

export class InvestigationService {
  public static canTransition(currentStatus: CaseStatus, targetStatus: CaseStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  public static async transitionCase(
    caseId: string,
    targetStatus: CaseStatus,
    user: { id: string; name: string; role: string },
    reason: string
  ): Promise<{ success: boolean; case?: AuditCase; error?: string }> {
    const existing = await db.getCaseById(caseId);
    if (!existing) {
      return { success: false, error: 'Audit case not found' };
    }

    if (!this.canTransition(existing.status, targetStatus)) {
      return {
        success: false,
        error: `Invalid workflow transition from ${existing.status} to ${targetStatus}. Allowed next states: ${VALID_TRANSITIONS[existing.status].join(', ')}`,
      };
    }

    const previousStatus = existing.status;
    const now = new Date().toISOString();

    const transitionRecord = {
      from: previousStatus,
      to: targetStatus,
      changedBy: `${user.name} (${user.role})`,
      timestamp: now,
      reason: reason || `Transitioned to ${targetStatus}`,
    };

    const updatedTransitions = [...(existing.transitions || []), transitionRecord];
    const updatedCase = await db.updateCase(caseId, {
      status: targetStatus,
      updatedAt: now,
      transitions: updatedTransitions,
    });

    // If case is resolved or closed, also update finding status
    if (targetStatus === 'RESOLVED' || targetStatus === 'CLOSED') {
      await Promise.all(existing.findingIds.map(fId => db.updateFinding(fId, { status: 'RESOLVED' })));
    }

    // Log to system audit logs
    await db.logAudit({
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      organizationId: existing.organizationId,
      userId: user.id,
      userName: user.name,
      userRole: user.role as any,
      action: 'CASE_WORKFLOW_TRANSITION',
      entityType: 'AuditCase',
      entityId: caseId,
      ipAddress: '127.0.0.1',
      timestamp: now,
      details: { from: previousStatus, to: targetStatus, reason },
    });

    return { success: true, case: updatedCase || undefined };
  }

  public static async addNote(
    caseId: string,
    user: { id: string; name: string; role: string },
    text: string
  ): Promise<{ success: boolean; case?: AuditCase; error?: string }> {
    const existing = await db.getCaseById(caseId);
    if (!existing) {
      return { success: false, error: 'Audit case not found' };
    }

    const newNote = {
      id: `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      authorId: user.id,
      authorName: user.name,
      role: user.role,
      timestamp: new Date().toISOString(),
      text,
    };

    const updatedCase = await db.updateCase(caseId, {
      notes: [...(existing.notes || []), newNote],
      updatedAt: new Date().toISOString(),
    });

    return { success: true, case: updatedCase || undefined };
  }
}
