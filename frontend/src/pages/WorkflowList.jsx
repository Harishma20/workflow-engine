import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Edit3, Play, Trash2, Workflow, CheckCircle, XCircle, Activity, ToggleLeft } from 'lucide-react';
import { workflowsApi } from '../api/index.js';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '22', color }}>
        {icon}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const resp = await workflowsApi.list({ page, limit, search, status: statusFilter });
      setWorkflows(resp.data.data);
      setTotal(resp.data.total);
    } catch (err) {
      toast.error('Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, [page, search, statusFilter]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return;
    try {
      await workflowsApi.delete(id);
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch (err) {
      toast.error('Failed to delete workflow');
    }
  };

  const totalPages = Math.ceil(total / limit);
  const activeCount = workflows.filter(w => w.is_active).length;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Workflows</h1>
            <p className="page-subtitle">Design and manage your automation workflows</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
            <Plus size={16} /> New Workflow
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<Workflow size={22} />} label="Total Workflows" value={total} color="#5e7ef7" />
        <StatCard icon={<CheckCircle size={22} />} label="Active" value={activeCount} color="#22d375" />
        <StatCard icon={<XCircle size={22} />} label="Inactive" value={total - activeCount} color="#f43f5e" />
        <StatCard icon={<Activity size={22} />} label="Page" value={`${page}/${totalPages || 1}`} color="#f59e0b" />
      </div>

      <div className="toolbar">
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input search-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search workflows..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: 150 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-center"><div className="spinner" /><span>Loading workflows...</span></div>
          ) : workflows.length === 0 ? (
            <div className="empty-state">
              <Workflow size={48} />
              <p>No workflows found. Create your first workflow to get started.</p>
              <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
                <Plus size={16} /> Create Workflow
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Steps</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{wf.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                        {wf._id.substring(0, 8)}...
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-task">{wf.step_count || 0} steps</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>v{wf.version}</span>
                    </td>
                    <td>
                      <span className={`badge ${wf.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {wf.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(wf.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/workflows/${wf._id}/edit`)}
                          title="Edit"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/workflows/${wf._id}/execute`)}
                          title="Execute"
                        >
                          <Play size={13} /> Execute
                        </button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDelete(wf._id, wf.name)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">Page {page} of {totalPages}</span>
          {Array.from({ length: totalPages }, (_, i) => (
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
