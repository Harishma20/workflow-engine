import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Workflow, BarChart3, Clock, Zap } from 'lucide-react';

import WorkflowList from './pages/WorkflowList.jsx';
import WorkflowEditor from './pages/WorkflowEditor.jsx';
import ExecutionPage from './pages/ExecutionPage.jsx';
import ExecutionDetail from './pages/ExecutionDetail.jsx';
import AuditLog from './pages/AuditLog.jsx';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-title">⚡ FlowEngine</div>
        <div className="logo-sub">Workflow Automation Platform</div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-label-section">Workflows</div>
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <Workflow size={18} /> Workflows
        </NavLink>
        <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Clock size={18} /> Audit Log
        </NavLink>
      </nav>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<WorkflowList />} />
            <Route path="/workflows/new" element={<WorkflowEditor />} />
            <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
            <Route path="/workflows/:id/execute" element={<ExecutionPage />} />
            <Route path="/executions/:id" element={<ExecutionDetail />} />
            <Route path="/audit" element={<AuditLog />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2235',
              color: '#e8edf5',
              border: '1px solid #2a3a55',
              borderRadius: '10px',
              fontSize: '13.5px',
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}
