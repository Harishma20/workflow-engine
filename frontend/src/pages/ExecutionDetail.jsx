import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, XCircle, CheckCircle, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { executionsApi } from '../api/index.js';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

function RuleEvalItem({ rule }) {
  return (
    <li className={`exec-rule-item ${rule.result ? 'matched' : 'failed'}`}>
      <div className={`rule-result ${rule.result ? 'pass' : 'fail'}`}>{rule.result ? '✓' : '✗'}</div>
      <div style={{ flex: 1 }}>
        <span style={{ color: 'var(--text-secondary)' }}>#{rule.priority}</span>{' '}
        <span>{rule.condition}</span>
        {rule.error && <div style={{ color: 'var(--color-error)', fontSize: 11 }}>Error: {rule.error}</div>}
      </div>
    </li>
  );
}

function ApproveModal({ executionId, onClose, onApproved }) {
  const [approverId, setApproverId] = useState('user');
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (approved) => {
    setSubmitting(true);
    try {
      await executionsApi.approve(executionId, { approved, approver_id: approverId });
      toast.success(approved ? 'Step approved!' : 'Step rejected');
      onApproved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Approval Required</h3>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>This step requires approval to continue the workflow.</p>
        <div className="form-group">
          <label className="form-label">Your User ID</label>
          <input className="form-input" value={approverId} onChange={e => setApproverId(e.target.value)} placeholder="user123" />
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={() => handleAction(false)} disabled={submitting}>
            <ThumbsDown size={14} /> Reject
          </button>
          <button className="btn btn-success" onClick={() => handleAction(true)} disabled={submitting}>
            <ThumbsUp size={14} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApprove, setShowApprove] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExecution = useCallback(async () => {
    try {
      const resp = await executionsApi.get(id);
      setExecution(resp.data);
    } catch {
      toast.error('Execution not found');
      navigate('/audit');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchExecution(); }, [fetchExecution]);

  // Auto-refresh when in_progress
  useEffect(() => {
    if (execution?.status === 'in_progress') {
      const t = setTimeout(fetchExecution, 4000);
      return () => clearTimeout(t);
    }
  }, [execution, fetchExecution]);

  const handleCancel = async () => {
    if (!confirm('Cancel this execution?')) return;
    setActionLoading(true);
    try {
      await executionsApi.cancel(id);
      toast.success('Execution cancelled');
      fetchExecution();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to cancel'); }
    finally { setActionLoading(false); }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const resp = await executionsApi.retry(id);
      toast.success('Retried!');
      setExecution(resp.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to retry'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;
  if (!execution) return null;

  const duration = execution.started_at && execution.ended_at
    ? Math.round((new Date(execution.ended_at) - new Date(execution.started_at)) / 1000)
    : null;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn btn-secondary btn-icon" onClick={() => navigate('/audit')}><ArrowLeft size={16} /></button>
            <div>
              <h1 className="page-title">Execution Details</h1>
              <p className="page-subtitle" style={{ fontFamily: 'monospace', fontSize: 12 }}>{execution._id}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchExecution}><RefreshCw size={13} /> Refresh</button>
            {execution.status === 'in_progress' && (
              <>
                {execution.logs.some(l => l.step_type === 'approval' && l.status === 'in_progress') && (
                  <button className="btn btn-success btn-sm" onClick={() => setShowApprove(true)}>
                    <CheckCircle size={13} /> Approve / Reject
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={actionLoading}>
                  <XCircle size={13} /> Cancel
                </button>
              </>
            )}
            {execution.status === 'failed' && (
              <button className="btn btn-warning btn-sm" onClick={handleRetry} disabled={actionLoading}>
                <RefreshCw size={13} /> Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Status', value: <StatusBadge status={execution.status} /> },
          { label: 'Version', value: `v${execution.workflow_version}` },
          { label: 'Duration', value: duration != null ? `${duration}s` : '—' },
          { label: 'Triggered By', value: execution.triggered_by || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Execution Log */}
        <div>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Step Execution Log</h2>
          {execution.logs.length === 0 ? (
            <div className="empty-state"><p>No steps executed yet.</p></div>
          ) : (
            execution.logs.map((log, i) => (
              <div key={i} className="exec-log-item">
                <div className="exec-log-header">
                  <div className="exec-log-title">[Step {i + 1}] {log.step_name}</div>
                  <span className={`badge badge-${log.step_type}`}>{log.step_type}</span>
                  <StatusBadge status={log.status} />
                  {log.iteration > 1 && (
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>Loop #{log.iteration}</span>
                  )}
                </div>

                {log.evaluated_rules?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Rules Evaluated</div>
                    <ul className="exec-rules-list">
                      {log.evaluated_rules.map((rule, j) => <RuleEvalItem key={j} rule={rule} />)}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
                  {log.selected_next_step && (
                    <div><span style={{ color: 'var(--text-muted)' }}>Next Step: </span><span style={{ color: 'var(--color-success)' }}>{log.selected_next_step}</span></div>
                  )}
                  {log.approver_id && (
                    <div><span style={{ color: 'var(--text-muted)' }}>Approver: </span>{log.approver_id}</div>
                  )}
                  {log.error_message && (
                    <div><span style={{ color: 'var(--color-error)' }}>Error: {log.error_message}</span></div>
                  )}
                  {log.started_at && (
                    <div><span style={{ color: 'var(--text-muted)' }}>Duration: </span>
                      {log.ended_at
                        ? `${Math.round((new Date(log.ended_at) - new Date(log.started_at)) / 1000)}s`
                        : 'In progress...'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Data */}
        <div>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Input Data</h2>
          <div className="card" style={{ padding: 16 }}>
            <pre className="code-block">{JSON.stringify(execution.data, null, 2)}</pre>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Timeline</div>
            <div style={{ fontSize: 12 }}>
              <div>Started: {execution.started_at ? new Date(execution.started_at).toLocaleString() : '—'}</div>
              <div style={{ marginTop: 4 }}>Ended: {execution.ended_at ? new Date(execution.ended_at).toLocaleString() : '—'}</div>
              <div style={{ marginTop: 4 }}>Retries: {execution.retries}</div>
            </div>
          </div>
        </div>
      </div>

      {showApprove && (
        <ApproveModal
          executionId={id}
          onClose={() => setShowApprove(false)}
          onApproved={fetchExecution}
        />
      )}
    </div>
  );
}
