import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Edit3, Save, ChevronDown, ChevronUp,
  GripVertical, Settings, List, X, Check
} from 'lucide-react';
import { workflowsApi, stepsApi, rulesApi } from '../api/index.js';

// ---- Step Type Badge ----
const STEP_COLORS = { task: 'badge-task', approval: 'badge-approval', notification: 'badge-notification' };

// ---- Rule Modal ----
function RuleModal({ stepId, steps, rule, onClose, onSaved }) {
  const [condition, setCondition] = useState(rule?.condition || '');
  const [nextStepId, setNextStepId] = useState(rule?.next_step_id || '');
  const [priority, setPriority] = useState(rule?.priority ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!condition.trim()) return toast.error('Condition is required');
    setSaving(true);
    try {
      const payload = {
        condition: condition.trim(),
        next_step_id: nextStepId || null,
        priority: priority !== '' ? Number(priority) : undefined,
      };
      if (rule?._id) {
        await rulesApi.update(rule._id, payload);
        toast.success('Rule updated');
      } else {
        await rulesApi.create(stepId, payload);
        toast.success('Rule created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{rule ? 'Edit Rule' : 'Add Rule'}</h3>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <input className="form-input" type="number" min={1} value={priority} onChange={e => setPriority(e.target.value)} placeholder="e.g. 1 (lower = higher priority)" />
        </div>
        <div className="form-group">
          <label className="form-label">Condition</label>
          <textarea
            className="form-textarea"
            value={condition}
            onChange={e => setCondition(e.target.value)}
            placeholder="e.g. amount > 100 && country == 'US'   OR   DEFAULT"
            style={{ fontFamily: 'monospace' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            Supports: ==, !=, &lt;, &gt;, &lt;=, &gt;=, &amp;&amp;, ||, contains(), startsWith(), endsWith(). Use DEFAULT to match all.
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Next Step (leave empty to end workflow)</label>
          <select className="form-select" value={nextStepId} onChange={e => setNextStepId(e.target.value)}>
            <option value="">— End Workflow —</option>
            {steps.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><Check size={14} /> Save Rule</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Step Panel ----
function StepPanel({ step, steps, onUpdate, onDelete }) {
  const [rules, setRules] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [addingRule, setAddingRule] = useState(false);
  const [editingStep, setEditingStep] = useState(false);
  const [stepName, setStepName] = useState(step.name);
  const [stepType, setStepType] = useState(step.step_type);
  const [stepMeta, setStepMeta] = useState(JSON.stringify(step.metadata || {}, null, 2));

  const fetchRules = useCallback(async () => {
    try {
      const resp = await rulesApi.list(step._id);
      setRules(resp.data);
    } catch { }
  }, [step._id]);

  useEffect(() => { if (showRules) fetchRules(); }, [showRules, fetchRules]);

  const handleSaveStep = async () => {
    try {
      let metadata = {};
      try { metadata = JSON.parse(stepMeta); } catch { toast.error('Invalid JSON in metadata'); return; }
      await stepsApi.update(step._id, { name: stepName, step_type: stepType, metadata });
      toast.success('Step updated');
      setEditingStep(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update step');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await rulesApi.delete(ruleId);
      toast.success('Rule deleted');
      fetchRules();
    } catch { toast.error('Failed to delete rule'); }
  };

  return (
    <div className="step-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="step-order-badge">{step.order}</div>
        <div className="step-info">
          {editingStep ? (
            <input className="form-input" value={stepName} onChange={e => setStepName(e.target.value)} style={{ marginBottom: 6 }} />
          ) : (
            <div className="step-name">{step.name}</div>
          )}
          <span className={`badge ${STEP_COLORS[step.step_type]}`}>{step.step_type}</span>
        </div>
        <div className="step-actions">
          {editingStep ? (
            <>
              <button className="btn btn-success btn-sm" onClick={handleSaveStep}><Check size={12} /></button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingStep(false)}><X size={12} /></button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setEditingStep(true)} title="Edit Step"><Edit3 size={14} /></button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowRules(p => !p)}
            style={{ gap: 5 }}
          >
            <List size={13} /> Rules {showRules ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(step._id)} title="Delete Step"><Trash2 size={14} /></button>
        </div>
      </div>

      {editingStep && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={stepType} onChange={e => setStepType(e.target.value)}>
              <option value="task">Task</option>
              <option value="approval">Approval</option>
              <option value="notification">Notification</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Metadata (JSON)</label>
            <textarea className="form-textarea" value={stepMeta} onChange={e => setStepMeta(e.target.value)} style={{ fontFamily: 'monospace', minHeight: 60 }} />
          </div>
        </div>
      )}

      {showRules && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <div className="section-header">
            <div className="section-title" style={{ fontSize: 13 }}>Rules <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({rules.length})</span></div>
            <button className="btn btn-primary btn-sm" onClick={() => setAddingRule(true)}><Plus size={13} /> Add Rule</button>
          </div>
          {rules.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>No rules yet.</div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 160px 70px', gap: 8, padding: '5px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                <div>Priority</div><div>Condition</div><div>Next Step</div><div>Actions</div>
              </div>
              {rules.map(rule => {
                const nextStep = steps.find(s => s._id === rule.next_step_id);
                return (
                  <div key={rule._id} className="rule-row">
                    <div style={{ fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 700 }}>#{rule.priority}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{rule.condition}</div>
                    <div style={{ fontSize: 12, color: nextStep ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {nextStep ? nextStep.name : <span style={{ fontStyle: 'italic' }}>End</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setEditingRule(rule)}><Edit3 size={12} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteRule(rule._id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(addingRule || editingRule) && (
        <RuleModal
          stepId={step._id}
          steps={steps}
          rule={editingRule}
          onClose={() => { setAddingRule(false); setEditingRule(null); }}
          onSaved={fetchRules}
        />
      )}
    </div>
  );
}

// ---- Add Step Modal ----
function AddStepModal({ workflowId, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [stepType, setStepType] = useState('task');
  const [assignee, setAssignee] = useState('');
  const [channel, setChannel] = useState('email');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Step name is required');
    setSaving(true);
    try {
      const metadata = {};
      if (stepType === 'approval') metadata.assignee_email = assignee;
      if (stepType === 'notification') { metadata.assignee_email = assignee; metadata.channel = channel; }
      await stepsApi.create(workflowId, { name: name.trim(), step_type: stepType, metadata });
      toast.success('Step added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add step');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Step</h3>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Step Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Manager Approval" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Step Type</label>
          <select className="form-select" value={stepType} onChange={e => setStepType(e.target.value)}>
            <option value="task">Task — automated action</option>
            <option value="approval">Approval — requires user approval</option>
            <option value="notification">Notification — sends alert/email</option>
          </select>
        </div>
        {(stepType === 'approval' || stepType === 'notification') && (
          <div className="form-group">
            <label className="form-label">Assignee Email</label>
            <input className="form-input" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="manager@example.com" />
          </div>
        )}
        {stepType === 'notification' && (
          <div className="form-group">
            <label className="form-label">Channel</label>
            <select className="form-select" value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="ui">UI Message</option>
            </select>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Adding...' : <><Plus size={14} /> Add Step</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Schema Editor ----
function SchemaEditor({ schema, onChange }) {
  const fields = Object.entries(schema || {});

  const addField = () => {
    const key = `field_${Date.now()}`;
    onChange({ ...schema, [key]: { type: 'string', required: false } });
  };
  const removeField = (key) => {
    const { [key]: _, ...rest } = schema;
    onChange(rest);
  };
  const updateField = (oldKey, newKey, val) => {
    const updated = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === oldKey) {
        updated[newKey] = val;
      } else {
        updated[k] = v;
      }
    }
    onChange(updated);
  };

  return (
    <div>
      {fields.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>No fields defined. Add fields to define the input schema.</div>
      )}
      {fields.map(([key, def]) => (
        <div key={key} className="schema-field">
          <input
            className="form-input"
            value={key}
            onChange={e => updateField(key, e.target.value, def)}
            placeholder="field name"
            style={{ fontSize: 12 }}
          />
          <select
            className="form-select"
            value={def.type || 'string'}
            onChange={e => updateField(key, key, { ...def, type: e.target.value })}
            style={{ fontSize: 12 }}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={!!def.required} onChange={e => updateField(key, key, { ...def, required: e.target.checked })} />
              Required
            </label>
          </div>
          <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeField(key)}><Trash2 size={12} /></button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addField}><Plus size={13} /> Add Field</button>
    </div>
  );
}

// ---- Main WorkflowEditor ----
export default function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [workflow, setWorkflow] = useState({ name: '', description: '', is_active: true, input_schema: {} });
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [startStepId, setStartStepId] = useState('');

  const fetchWorkflow = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const resp = await workflowsApi.get(id);
      const { steps: wfSteps, ...wf } = resp.data;
      setWorkflow(wf);
      setStartStepId(wf.start_step_id || '');
      setSteps(wfSteps || []);
    } catch {
      toast.error('Failed to load workflow');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, isNew, navigate]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  const fetchSteps = async () => {
    if (isNew || !id) return;
    try {
      const resp = await stepsApi.list(id);
      setSteps(resp.data);
    } catch { }
  };

  const handleSave = async () => {
    if (!workflow.name.trim()) return toast.error('Workflow name is required');
    setSaving(true);
    try {
      const payload = {
        name: workflow.name.trim(),
        description: workflow.description,
        is_active: workflow.is_active,
        input_schema: workflow.input_schema,
        start_step_id: startStepId || null,
      };
      if (isNew) {
        const resp = await workflowsApi.create(payload);
        toast.success('Workflow created!');
        navigate(`/workflows/${resp.data._id}/edit`);
      } else {
        await workflowsApi.update(id, payload);
        toast.success('Workflow saved!');
        fetchWorkflow();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!confirm('Delete this step and all its rules?')) return;
    try {
      await stepsApi.delete(stepId);
      toast.success('Step deleted');
      fetchSteps();
      fetchWorkflow();
    } catch { toast.error('Failed to delete step'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading workflow...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn btn-secondary btn-icon" onClick={() => navigate('/')}><ArrowLeft size={16} /></button>
            <div>
              <h1 className="page-title">{isNew ? 'New Workflow' : `Edit: ${workflow.name}`}</h1>
              {!isNew && <p className="page-subtitle">v{workflow.version} · {workflow.is_active ? '● Active' : '○ Inactive'}</p>}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left: Steps */}
        <div>
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">Workflow Details</h2>
            </div>
            <div className="form-group">
              <label className="form-label">Workflow Name *</label>
              <input className="form-input" value={workflow.name} onChange={e => setWorkflow(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Expense Approval" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={workflow.description} onChange={e => setWorkflow(p => ({ ...p, description: e.target.value }))} placeholder="What does this workflow do?" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                <input type="checkbox" checked={workflow.is_active} onChange={e => setWorkflow(p => ({ ...p, is_active: e.target.checked }))} />
                <span>Active</span>
              </label>
            </div>
          </div>

          {!isNew && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="section-header">
                <h2 className="section-title">Steps <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({steps.length})</span></h2>
                <div style={{ display: 'flex', gap: 10 }}>
                  {steps.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="form-label" style={{ margin: 0, fontSize: 12 }}>Start Step:</label>
                      <select className="form-select" style={{ width: 200, fontSize: 12 }} value={startStepId} onChange={e => setStartStepId(e.target.value)}>
                        <option value="">— Select —</option>
                        {steps.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => setAddingStep(true)}><Plus size={14} /> Add Step</button>
                </div>
              </div>

              {steps.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <p>No steps yet. Add your first step to build the workflow.</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAddingStep(true)}><Plus size={13} /> Add First Step</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {steps.map(step => (
                    <StepPanel key={step._id} step={step} steps={steps} onUpdate={fetchSteps} onDelete={handleDeleteStep} />
                  ))}
                </div>
              )}
            </div>
          )}

          {isNew && (
            <div className="card" style={{ marginTop: 16, background: 'var(--color-primary-dim)', borderColor: 'rgba(94,126,247,0.3)' }}>
              <p style={{ fontSize: 13.5, color: 'var(--color-primary)' }}>
                💡 Save the workflow first, then you can add steps and define rules.
              </p>
            </div>
          )}
        </div>

        {/* Right: Input Schema */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="section-header">
              <h2 className="section-title">Input Schema</h2>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Define the fields required when executing this workflow. These values are used by rule conditions.
            </p>
            <SchemaEditor
              schema={workflow.input_schema}
              onChange={s => setWorkflow(p => ({ ...p, input_schema: s }))}
            />
          </div>
        </div>
      </div>

      {addingStep && (
        <AddStepModal
          workflowId={id}
          onClose={() => setAddingStep(false)}
          onSaved={fetchSteps}
        />
      )}
    </div>
  );
}
