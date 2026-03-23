# Workflow Engine

A full-stack workflow management system built with **Next.js 16**, **PostgreSQL**, and **Prisma ORM**. Design workflows, define conditional rules, execute processes, and audit every step.

---
## Live Link
https://adorable-biscuit-4d4107.netlify.app/
## Demo Link
https://github.com/Subhasri2505/workflow/blob/main/Workflow.mp4
## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, React, shadcn/ui, Tailwind CSS v4 |
| Backend | Next.js API Routes (REST) |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| State | React `useState` + API fetching |

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ running locally (or a remote connection string)
- `npm` or `pnpm`

---

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd workflow-engine
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/workflow_engine?schema=public"
```

Replace `USER`, `PASSWORD`, and `workflow_engine` with your PostgreSQL credentials.

### 3. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables: `workflows`, `steps`, `rules`, `executions`, `execution_logs`.

### 4. (Optional) Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000**

### 6. Seed Sample Data

After the dev server is running:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or open **http://localhost:3000/api/seed** in your browser (GET shows seed status).

This creates:
- **Expense Approval** workflow (4 steps, priority-based rules)
- **Employee Onboarding** workflow (3 steps)

---

## API Reference

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows?search=&page=&limit=` | List workflows (paginated, searchable) |
| `POST` | `/api/workflows` | Create workflow |
| `GET` | `/api/workflows/:id` | Get workflow with steps & rules |
| `PATCH` | `/api/workflows/:id` | Update workflow (version increments) |
| `DELETE` | `/api/workflows/:id` | Delete workflow |

### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows/:id/steps` | List steps for workflow |
| `POST` | `/api/workflows/:id/steps` | Add step to workflow |
| `GET` | `/api/steps/:id` | Get step details |
| `PUT` | `/api/steps/:id` | Update step |
| `DELETE` | `/api/steps/:id` | Delete step |

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/steps/:id/rules` | List rules for step |
| `POST` | `/api/steps/:id/rules` | Add rule to step |
| `PUT` | `/api/rules/:id` | Update rule |
| `DELETE` | `/api/rules/:id` | Delete rule |

### Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/executions` | List all executions |
| `POST` | `/api/workflows/:id/execute` | Start workflow execution |
| `GET` | `/api/executions/:id` | Get execution with logs |
| `POST` | `/api/executions/:id/approve` | Approve pending step |
| `POST` | `/api/executions/:id/reject` | Reject pending step |
| `POST` | `/api/executions/:id/cancel` | Cancel in-progress execution |
| `POST` | `/api/executions/:id/retry` | Retry last failed step |

---

## Rule Engine

The rule engine evaluates conditions dynamically at runtime:

- Rules are sorted by **priority** (lowest = highest priority)
- **First matching rule** wins — its `nextStepId` determines the next step
- If no rule matches and a `DEFAULT` rule exists, it is used
- If no rule matches and no DEFAULT exists, the step fails and execution stops
- **Loop detection**: Max 50 step iterations per execution (configurable in `workflowEngine.ts`)

### Supported Operators

```
== != < > <= >=        (comparison)
&& ||                  (logical)
contains(field, "val") (string contains)
startsWith(field, "x") (string prefix)
endsWith(field, "x")   (string suffix)
DEFAULT                (always matches, use as fallback)
```

### Example Rule Conditions

```
amount > 100 && country == 'US' && priority == 'High'
amount <= 100 || department == 'HR'
contains(department, 'Finance')
DEFAULT
```

---

## Sample Workflows

### 1. Expense Approval

**Input Schema:**
```json
{
  "amount": { "type": "number", "required": true },
  "country": { "type": "string", "required": true },
  "department": { "type": "string", "required": false },
  "priority": { "type": "string", "required": true, "allowed_values": ["High", "Medium", "Low"] }
}
```

**Steps & Rules:**
```
Step 1: Manager Approval (approval)
  Priority 1: amount > 100 && country == 'US' && priority == 'High'  → Finance Notification
  Priority 2: amount <= 100 || department == 'HR'                     → CEO Approval
  Priority 3: priority == 'Low' && country != 'US'                    → Task Rejection
  Priority 4: DEFAULT                                                  → Task Rejection

Step 2: Finance Notification (notification)
  Priority 1: DEFAULT → CEO Approval

Step 3: CEO Approval (approval)
  [End workflow on approval]

Step 4: Task Rejection (task)
  [End workflow]
```

**Sample Execution:**
```bash
curl -X POST http://localhost:3000/api/workflows/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{"data":{"amount":250,"country":"US","department":"Finance","priority":"High"},"triggeredBy":"user-001"}'
```
Expected: Pauses at **Manager Approval** (rules match → Finance Notification path)

---

### 2. Employee Onboarding

**Steps:** IT Setup → HR Orientation → Manager Introduction

Proceeds sequentially through DEFAULT rules.

---

## Execution Example

```json
{
  "id": "abc12345",
  "workflowName": "Expense Approval",
  "workflowVersion": 1,
  "status": "pending",
  "triggeredBy": "user-001",
  "logs": [
    {
      "stepName": "Manager Approval",
      "stepType": "approval",
      "evaluatedRules": [
        { "rule": "amount > 100 && country == 'US' && priority == 'High'", "result": true },
        { "rule": "amount <= 100 || department == 'HR'", "result": false }
      ],
      "selectedNextStep": "Finance Notification",
      "status": "pending",
      "approverId": null,
      "startedAt": "2026-03-18T10:00:00Z"
    }
  ]
}
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── workflows/        # Workflow CRUD + steps
│   │   ├── steps/            # Step CRUD + rules
│   │   ├── rules/            # Rule CRUD
│   │   ├── executions/       # Execution status, approve, reject, cancel, retry
│   │   └── seed/             # Sample data seeder
│   ├── (pages)/              # Next.js App Router pages
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── AppLayout.tsx
│   ├── AppSidebar.tsx
│   └── StatusBadge.tsx
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   └── workflowEngine.ts     # Rule engine + execution logic
└── types/
    └── workflow.ts
prisma/
└── schema.prisma             # Database schema
```
