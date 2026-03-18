import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Search } from 'lucide-react';
import { executionsApi } from '../api/index.js';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.toUpperCase().replace('_', ' ')}</span>;
}

export default function AuditLog() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const resp = await executionsApi.list({ page, limit, status: statusFilter });
      setExecutions(resp.data.data);
      setTotal(resp.data.total);
    } catch {
      toast.error('Failed to fetch audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExecutions(); }, [page, statusFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">Complete history of all workflow executions</p>
      </div>

      <div className="toolbar">
        <select className="form-select" style={{ width: 180 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
        </select>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
          {total} executions total
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>
          ) : executions.length === 0 ? (
            <div className="empty-state" style={{ padding: '50px 20px' }}>
              <p>No executions found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Execution ID</th>
                  <th>Workflow</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Triggered By</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => {
                  const duration = ex.started_at && ex.ended_at
                    ? Math.round((new Date(ex.ended_at) - new Date(ex.started_at)) / 1000) + 's'
                    : '—';
                  return (
                    <tr key={ex._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                          {ex._id.substring(0, 12)}...
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ex.workflow_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {ex.workflow_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>v{ex.workflow_version}</td>
                      <td><StatusBadge status={ex.status} /></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{ex.triggered_by || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {ex.started_at ? new Date(ex.started_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {ex.ended_at ? new Date(ex.ended_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{duration}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/executions/${ex._id}`)}
                        >
                          <Eye size={13} /> View Logs
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">Page {page} of {totalPages}</span>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
            <button
              key={i + 1}
              className={`page-btn ${page === i + 1 ? 'active' : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
