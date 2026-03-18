# FlowEngine — MERN Workflow Automation Platform

A full-stack workflow automation system built with **MongoDB + Express + React + Node.js**. Users can design workflows, define dynamic rules, execute processes, and track every step.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB Atlas account (already configured)

### 1. Backend Setup

```bash
cd workflow-engine/backend
npm install
# .env is already configured with the MongoDB Atlas URI
npm run dev     # starts on http://localhost:5000
```

### 2. Seed Sample Data (Optional but recommended)

```bash
cd workflow-engine/backend
node scripts/seed.js
```

This creates two sample workflows:
- **Expense Approval** — 5 steps, multi-level approval with complex routing rules
- **Employee Onboarding** — 5 steps, remote/on-site branching

### 3. Frontend Setup

```bash
cd workflow-engine/frontend
npm install
npm run dev     # starts on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
workflow-engine/
├── backend/
│   ├── src/
│   │   ├── models/          # Mongoose schemas (Workflow, Step, Rule, Execution)
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # Express routers
│   │   ├── services/
│   │   │   ├── ruleEngine.js      # Safe AST-based expression evaluator (jsep)
│   │   │   └── executionService.js # Step execution orchestration
│   │   └── index.js         # Express app entry point
│   ├── scripts/
│   │   └── seed.js          # Sample workflow seeder
│   └── .env                 # MongoDB URI and config
└── frontend/
    ├── src/
    │   ├── api/index.js      # Axios API client
    │   ├── pages/
    │   │   ├── WorkflowList.jsx    # Dashboard with stats and search
    │   │   ├── WorkflowEditor.jsx  # Create/edit workflow + steps + rules
    │   │   ├── ExecutionPage.jsx   # Dynamic execution form
    │   │   ├── ExecutionDetail.jsx # Step-by-step log viewer
    │   │   └── AuditLog.jsx        # All executions history
    │   ├── App.jsx           # Router + sidebar layout
    │   └── index.css         # Global design system
    └── vite.config.js        # Vite + proxy config
```

---

## 🔌 API Reference

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List workflows (search, filter, pagination) |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow with steps & rules |
| PUT | `/api/workflows/:id` | Update workflow (increments version) |
| DELETE | `/api/workflows/:id` | Delete workflow (cascades steps/rules) |

### Steps
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows/:id/steps` | List steps |
| POST | `/api/workflows/:id/steps` | Add step |
| PUT | `/api/steps/:id` | Update step |
| DELETE | `/api/steps/:id` | Delete step + its rules |

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/steps/:id/rules` | List rules for step |
| POST | `/api/steps/:id/rules` | Add rule |
| PUT | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |

### Executions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflows/:id/execute` | Start execution |
| GET | `/api/executions` | Audit log (paginated) |
| GET | `/api/executions/:id` | Execution details + logs |
| POST | `/api/executions/:id/cancel` | Cancel execution |
| POST | `/api/executions/:id/retry` | Retry failed step |
| POST | `/api/executions/:id/approve` | Approve/reject approval step |

---

## ⚙️ Rule Engine Design

Rules are evaluated using **jsep** (JavaScript Expression Parser) which parses conditions into an Abstract Syntax Tree (AST), then evaluates them safely against input data — **no `eval()` usage**.

### Supported Syntax
```
amount > 100 && country == 'US'
priority == 'High' || department == 'Finance'
contains(department, 'Eng')
startsWith(country, 'U')
DEFAULT  ← always matches (fallback)
```

### Evaluation Flow
1. Rules sorted by priority (ascending — lower = higher priority)
2. First matching rule selects the next step
3. Invalid rules are skipped and logged (execution continues to `DEFAULT`)
4. If no rule matches (and no `DEFAULT` exists), the step fails
5. **Loop protection**: steps visited >10 times abort with `failed` status

---

## 🧪 Sample Execution

**Input for Expense Approval:**
```json
{
  "amount": 250,
  "country": "US",
  "department": "Finance",
  "priority": "High"
}
```

**Expected path:** Manager Approval → Finance Notification → Task Completion

**Execution Log:**
```json
[
  {
    "step_name": "Manager Approval",
    "step_type": "approval",
    "evaluated_rules": [
      {"condition": "amount > 100 && country == 'US' && priority == 'High'", "result": true}
    ],
    "selected_next_step": "Finance Notification",
    "status": "in_progress"
  }
]
```
*(Approval steps pause for user action via the UI or POST /executions/:id/approve)*

---

## 🔑 Database Configuration

MongoDB Atlas (already configured in `.env`):
```
MONGO_URI=mongodb+srv://harishma082_db_user:<password>@cluster0.nxwgfli.mongodb.net/workflow_engine
```

---

## 🎨 Features

- **Dynamic Workflow Designer** — create/edit workflows with schema, steps, rules inline
- **Safe Rule Engine** — AST-based evaluation with loop protection (max 10 iterations)
- **Approval Flows** — pause execution until manual approve/reject
- **Execution Tracking** — real-time step logs with rule evaluation details
- **Audit Log** — complete history with duration, status, and filters
- **Cascade Delete** — deleting workflow removes all steps, rules, and executions
- **Versioning** — workflow version increments on every update
