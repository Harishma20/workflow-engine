import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Play, Loader } from 'lucide-react';
import { workflowsApi } from '../api/index.js';

export default function ExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [formData, setFormData] = useState({});
  const [triggeredBy, setTriggeredBy] = useState('user');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    workflowsApi.get(id)
      .then(r => {
        setWorkflow(r.data);
        // Initialize form with defaults based on schema
        const defaults = {};
        for (const [key, def] of Object.entries(r.data.input_schema || {})) {
          defaults[key] = def.type === 'number' ? 0 : '';
        }
        setFormData(defaults);
      })
      .catch(() => { toast.error('Workflow not found'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFieldChange = (key, value, type) => {
    setFormData(prev => ({
      ...prev,
      [key]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const result = await workflowsApi.execute(id, { data: formData, triggered_by: triggeredBy });
      toast.success('Workflow executed!');
      navigate(`/executions/${result.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;

  const schemaFields = Object.entries(workflow.input_schema || {});

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">Execute: {workflow.name}</h1>
            <p className="page-subtitle">v{workflow.version} · Fill in the input data below to start execution</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 18 }}>Input Data</h2>
          {schemaFields.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>This workflow has no defined input schema fields.</div>
          ) : (
            schemaFields.map(([key, def]) => (
              <div className="form-group" key={key}>
                <label className="form-label">
                  {key}
                  {def.required && <span style={{ color: 'var(--color-error)', marginLeft: 4 }}>*</span>}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({def.type})</span>
                </label>
                {def.allowed_values ? (
                  <select className="form-select" value={formData[key] || ''} onChange={e => handleFieldChange(key, e.target.value, def.type)}>
                    <option value="">— Select —</option>
                    {def.allowed_values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : def.type === 'boolean' ? (
                  <select className="form-select" value={String(formData[key])} onChange={e => handleFieldChange(key, e.target.value === 'true', 'boolean')}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className="form-input"
                    type={def.type === 'number' ? 'number' : 'text'}
                    value={formData[key] ?? ''}
                    onChange={e => handleFieldChange(key, e.target.value, def.type)}
                    placeholder={`Enter ${key}...`}
                  />
                )}
              </div>
            ))
          )}
          <div className="form-group">
            <label className="form-label">Triggered By (User ID)</label>
            <input className="form-input" value={triggeredBy} onChange={e => setTriggeredBy(e.target.value)} placeholder="user123" />
          </div>
        </div>

        <div className="card" style={{ height: 'fit-content' }}>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Preview</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Input data that will be passed to the rule engine:</p>
          <pre className="code-block" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {JSON.stringify(formData, null, 2)}
          </pre>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Start Step</div>
            <div style={{ fontWeight: 600 }}>
              {workflow.steps?.find(s => s._id === workflow.start_step_id)?.name || workflow.start_step_id || '—'}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16, justifyContent: 'center', padding: '12px' }}
            onClick={handleExecute}
            disabled={executing}
          >
            {executing ? <><Loader size={15} className="spin" /> Executing...</> : <><Play size={15} /> Start Execution</>}
          </button>
        </div>
      </div>
    </div>
  );
}
