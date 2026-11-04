import type { WorkoutSnapshot } from '../../api/client.ts';
import type { PendingDraft } from '../../api/outbox.ts';
import type { ConnectedRecord } from './connectedStorage.ts';
import { prepareWorkoutDraft, type DraftPreparation } from './draftMapping.ts';

export type RecoveryState = 'synced' | 'edited' | 'blocked-input' | 'pending' | 'conflict' |
  'cleanup' | 'closing' | 'closed' | 'remote-changed' | 'remote-closed' | 'unavailable';
export type RecoveryAction = 'none' | 'queue' | 'fix-input' | 'flush' | 'recover' | 'review' | 'resume-close';
export type RecoveryItem = {
  record: ConnectedRecord;
  pending: PendingDraft | null;
  state: RecoveryState;
  canEdit: boolean;
  hasUnconfirmedChanges: boolean;
  nextAction: RecoveryAction;
  issues: Extract<DraftPreparation, {kind: 'blocked'}>['issues'];
};
export type RecoveryCheck = RecoveryItem & {
  remote: {kind: 'current' | 'advanced' | 'closed'; workout: WorkoutSnapshot} | {kind: 'unavailable'};
};

/** Describes a validated snapshot only; it never edits, retries, or discards a record. */
export function describeRecovery(record: ConnectedRecord, pending: PendingDraft | null): RecoveryItem {
  const result: RecoveryItem = {record, pending, state:'synced', canEdit:true,
    hasUnconfirmedChanges:record.revision > record.confirmedRevision, nextAction:'none', issues:[]};
  if (record.closed) return {...result, state:'closed', canEdit:false};
  if (record.resolution) return {...result, state:'cleanup', canEdit:false, nextAction:'recover'};
  if (record.closing) return {...result, state:'closing', canEdit:false, nextAction:'resume-close'};
  if (pending?.status === 'conflict') return {...result, state:'conflict', canEdit:false, nextAction:'review'};
  if (record.pending?.acknowledgedVersion != null) return {...result, state:'cleanup', canEdit:false, nextAction:pending ? 'flush' : 'recover'};
  if (record.pending) return {...result, state:'pending', nextAction:pending ? 'flush' : 'recover'};
  if (!result.hasUnconfirmedChanges) return result;
  const prepared = prepareWorkoutDraft(record.form.workout, {operationId:'00000000-0000-4000-8000-000000000000',
    version:record.version, note:record.form.note, rest:record.form.rest});
  return prepared.kind === 'blocked'
    ? {...result, state:'blocked-input', nextAction:'fix-input', issues:prepared.issues}
    : {...result, state:'edited', nextAction:'queue'};
}

export function describeRemoteRecovery(local: RecoveryItem, snapshot: WorkoutSnapshot): RecoveryCheck {
  const closed = snapshot.finishedAt !== null || snapshot.cancelledAt !== null;
  const advanced = snapshot.version > local.record.version;
  const remote: RecoveryCheck['remote'] = {kind:closed ? 'closed' : advanced ? 'advanced' : 'current', workout:snapshot};
  const result: RecoveryCheck = {...local, remote};
  if (local.record.closed || local.record.resolution) return result;
  if (local.record.closing) return !closed && advanced
    ? {...result, state:'conflict', canEdit:false, nextAction:'review'} : result;
  // A newer GET cannot prove whether our immutable request was applied or another device wrote.
  // Preserve the request and obtain its receipt through the existing idempotent flush path.
  if (local.record.pending) return result;
  if (closed) return {...result, state:'remote-closed', canEdit:false, nextAction:'review'};
  if (advanced) return {...result, state:'remote-changed', canEdit:false, nextAction:'review'};
  return result;
}
