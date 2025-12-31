# RBAC - Multi-Tenant Role-Based Access Control

> **Technical Screening Project** - Step-2 PFE Internship Assessment  
> A flexible, tenant-configurable authorization system for multi-tenant SaaS platforms

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Core Concepts](#core-concepts)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Authorization Flow](#authorization-flow)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Security Considerations](#security-considerations)
- [Project Structure](#project-structure)

---

## 🎯 Project Overview

This project implements **RBAC** (Role-Based Access Control) for a multi-tenant SaaS platform, replacing hard-coded roles with a flexible, tenant-configurable authorization system.

### Key Features

- ✅ **Multi-tenant isolation** - Each tenant has independent roles and users
- ✅ **Flexible permissions** - Global permissions assignable to any role
- ✅ **Backend-enforced security** - No client-side authorization
- ✅ **Tenant-scoped roles** - Roles belong to specific tenants
- ✅ **User multi-tenancy** - Users can have different roles in different tenants

### Assessment Objectives

This project evaluates:
- Multi-tenant authorization design
- Role and permission modeling
- Backend-enforced access control
- SQL and relational reasoning
- Code clarity and structure

---

## 🧩 Core Concepts

### Entities

| Entity | Description |
|--------|-------------|
| **User** | Authenticated person with email and auth_id |
| **Tenant** | Organization/workspace (e.g., "Acme Corp") |
| **Role** | Tenant-specific role (e.g., "Admin", "Manager") |
| **Permission** | Global capability (e.g., `user.read`, `role.create`) |
| **UserRole** | Assignment of a role to a user within a tenant |
| **RolePermission** | Mapping between roles and permissions |

### Key Principles

1. **Roles are tenant-scoped** - Each role belongs to exactly one tenant
2. **Permissions are global** - Same permissions across all tenants
3. **Users have roles per tenant** - A user can be Admin in Tenant A and Viewer in Tenant B
4. **Authorization is backend-enforced** - No RLS policies, all checks in API layer

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js >= 18 |
| **Language** | TypeScript |
| **Framework** | Next.js (API Routes) |
| **Database** | PostgreSQL 14+ |
| **Auth & DB** | Supabase |
| **Testing** | Jest |
| **Frontend** | React / Next.js |

---

## 🏗 Architecture

### Authorization Strategy: Backend-Enforced

This system **does NOT use Supabase Row Level Security (RLS)**. Instead, all authorization is enforced in the API layer.

#### Why Backend-Enforced?

1. **Complex Permission Logic** - Permissions require multi-table joins (user_roles → roles → role_permissions)
2. **Multiple Roles Per User** - Users can have multiple roles per tenant (requires aggregation)
3. **Tenant Context Switching** - Permissions are checked per-tenant, requiring dynamic context
4. **Better Error Handling** - Centralized permission checks with detailed error messages
5. **Performance Optimization** - Enables caching and query optimization opportunities

#### Authorization Flow

```
┌─────────────┐
│   Client    │
│  (JWT Token)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  requireAuth() Middleware           │
│  - Validates JWT token              │
│  - Extracts user_id from Supabase   │
│  - Attaches user to req object      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Route Handler                  │
│  - Extracts tenantId from params    │
│  - Calls userBelongsToTenant()      │
│  - Calls hasPermission()            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  hasPermission(userId, tenantId,    │
│                permissionKey)       │
│  - Queries user_roles               │
│  - Joins roles → role_permissions   │
│  - Returns true/false               │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Database Query (filtered by tenant)│
│  - Only returns tenant-scoped data  │
│  - Enforces tenant isolation        │
└─────────────────────────────────────┘
```

---

## 🗄 Database Schema

### Tables

```sql
users
  - id (BIGINT, PK)
  - auth_id (UUID, UNIQUE)
  - email (VARCHAR)

tenants
  - id (BIGINT, PK)
  - name (VARCHAR)

roles
  - id (BIGINT, PK)
  - tenant_id (BIGINT, FK → tenants)
  - name (VARCHAR)
  - description (TEXT)
  - UNIQUE(tenant_id, name)

permissions
  - id (BIGINT, PK)
  - key (VARCHAR, UNIQUE)
  - description (TEXT)

role_permissions
  - role_id (BIGINT, FK → roles)
  - permission_id (BIGINT, FK → permissions)
  - PRIMARY KEY (role_id, permission_id)

user_roles
  - user_id (BIGINT, FK → users)
  - role_id (BIGINT, FK → roles)
  - created_at (TIMESTAMP)
  - PRIMARY KEY (user_id, role_id)
```

### Relationships

```
users ─────< user_roles >───── roles ─────< role_permissions >───── permissions
                                  │
                                  └─────> tenants
```

### Sample Permissions

```
user.read           View users in the tenant
user.create         Create new users
user.update         Update user information
user.delete         Delete users
user.assign_role    Assign roles to users

role.read           View roles in the tenant
role.create         Create new roles
role.update         Update role information
role.delete         Delete roles

permission.read     View permissions
permission.assign   Assign permissions to roles
permission.remove   Remove permissions from roles

tenant.read         View tenant information
tenant.update       Update tenant settings

report.read         View reports
report.create       Create reports
report.export       Export reports
```

---

## 🔐 Authorization Flow

### Core Permission Check Function

```typescript
hasPermission(
  userId: number,
  tenantId: number,
  permissionKey: string
): Promise<boolean>
```

#### Logic Flow

1. Query `user_roles` for the given `userId`
2. Filter roles by `tenantId` (tenant isolation)
3. Join with `role_permissions` to get permissions
4. Check if any role has the requested `permissionKey`
5. Return `true` if found, otherwise `false`

### Helper Functions

```typescript
userBelongsToTenant(userId: number, tenantId: number): Promise<boolean>

verifyRoleTenant(roleId: number, tenantId: number): Promise<boolean>
```

### Middleware Stack

Every protected API route uses:

```typescript
export default requireAuth(handler);
```

Inside handler:
```typescript
const userId = req.user.dbUserId;
const tenantId = Number(req.query.tenantId);

const belongsToTenant = await userBelongsToTenant(userId, tenantId);
if (!belongsToTenant) {
  return res.status(403).json({ error: "Access denied" });
}

const allowed = await hasPermission(userId, tenantId, "role.create");
if (!allowed) {
  return res.status(403).json({ error: "Forbidden" });
}
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js >= 18
- PostgreSQL 14+
- Supabase account
- Git

### 1. Clone Repository

```bash
git clone 
cd rbac
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create `.env.local` from template:


Fill in Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

```

**Finding Supabase Keys:**
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy URL, anon key, and service_role key

### 4. Database Setup

#### Option A: Supabase Dashboard

1. Go to SQL Editor in Supabase
2. Run `database/schema.sql`
3. Run `database/seed.sql`

#### Option B: Command Line

```bash
supabase db push

psql <connection-string> < database/schema.sql
psql <connection-string> < database/seed.sql
```

### 5. Verify Setup

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Test API Endpoints

Use the provided Postman collection or test manually:

```bash
curl http://localhost:3000/api/tenants \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 📡 API Documentation

### Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <jwt-token>
```

### Endpoints

#### **Tenants**

```http
GET /api/tenants
```
Returns list of tenants the authenticated user belongs to.

**Response:**
```json
[
  { "id": 1, "name": "Acme Corporation" },
  { "id": 2, "name": "Tech Innovations Inc" }
]
```

---

#### **Roles**

```http
GET /api/roles?tenantId={id}
```
List all roles for a tenant (requires `role.read` permission).

**Response:**
```json
[
  {
    "id": 1,
    "name": "Admin",
    "description": "Full access to all features"
  }
]
```

---

```http
POST /api/roles?tenantId={id}
```
Create a new role (requires `role.create` permission).

**Request Body:**
```json
{
  "name": "Project Manager",
  "description": "Manages projects and team members"
}
```

**Response:**
```json
{
  "id": 12,
  "name": "Project Manager",
  "description": "Manages projects and team members"
}
```

---

```http
PUT /api/roles/{id}
```
Update a role (requires `role.update` permission).

**Request Body:**
```json
{
  "name": "Senior Manager"
}
```

---

```http
DELETE /api/roles/{id}
```
Delete a role (requires `role.delete` permission).

**Note:** Cannot delete roles with assigned users.

---

```http
GET /api/roles/{id}/permissions
```
Get all permissions assigned to a role (requires `role.read` permission).

**Response:**
```json
[
  {
    "id": 1,
    "key": "user.read",
    "description": "View users in the tenant"
  }
]
```

---

#### **Permissions**

```http
GET /api/permissions
```
List all available permissions (authenticated only).

**Response:**
```json
[
  {
    "id": 1,
    "key": "user.read",
    "description": "View users in the tenant"
  }
]
```

---

```http
POST /api/permissions/assign
```
Assign a permission to a role (requires `permission.assign` permission).

**Request Body:**
```json
{
  "tenantId": 1,
  "roleId": 5,
  "permissionId": 3
}
```

---

#### **Users**

```http
GET /api/users?tenantId={id}
```
List all users in a tenant (requires `user.read` permission).

**Response:**
```json
[
  {
    "id": 1,
    "email": "admin@acme.com"
  }
]
```

---

```http
POST /api/users/assign-role
```
Assign a role to a user (requires `user.assign_role` permission).

**Request Body:**
```json
{
  "tenantId": 1,
  "targetUserId": 5,
  "roleId": 2
}
```

---

### Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Forbidden: Missing role.create permission"
}
```

**HTTP Status Codes:**
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `405` - Method Not Allowed
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Test Coverage

Tests cover:
- ✅ Permission checks (allowed vs denied scenarios)
- ✅ Tenant isolation (users can't access other tenants)
- ✅ Role-permission mapping correctness
- ✅ User-role assignments
- ✅ Edge cases (invalid IDs, missing data)

### Manual Testing

Use the provided seed data:

**Test Credentials:**
- `admin@acme.com` - Admin in Acme Corp (Tenant 1)
- `developer@techinnovations.com` - Developer in Tech Innovations (Tenant 2)
- `viewer@techinnovations.com` - Guest in Tech Innovations (Tenant 2)

**Test Scenarios:**
1. Admin can create roles in their tenant
2. Guest cannot create roles (lacks permission)
3. Users cannot access roles from other tenants
4. Role deletion fails if users are assigned
5. Permission assignment requires correct tenant context

---

## 🔒 Security Considerations

### ✅ Implemented Security Measures

1. **JWT Authentication** - All routes protected by `requireAuth()` middleware
2. **Tenant Isolation** - Users can only access data from their tenants
3. **Permission-Based Authorization** - Every action checked via `hasPermission()`
4. **Foreign Key Constraints** - Database integrity enforced
5. **Cascading Deletes** - Cleanup on tenant/role/user deletion
6. **Input Validation** - All IDs validated, strings trimmed
7. **Service Role Key Protection** - Admin operations use server-side key
8. **No Hard-Coded Roles** - All roles configurable per tenant

### ⚠️ Known Limitations (By Design)

1. **No Rate Limiting** - Production would need API throttling
2. **No Audit Logging** - Who did what, when (future feature)
3. **No Permission Caching** - Each request queries database (future optimization)
4. **No Email Verification** - Assumes Supabase handles this
5. **No Frontend Validation** - Relies entirely on backend checks
6. **No RLS Policies** - Intentional design choice for this assessment

### 🚨 Security Warnings

- **Never expose SUPABASE_SERVICE_ROLE_KEY** to client
- **Always validate tenantId** in every request
- **Never trust client-side permission checks**
- **Always use parameterized queries** (Supabase handles this)


---

## 🎓 Learning Outcomes

This project demonstrates understanding of:

1. **Multi-tenant architecture** - Logical data isolation
2. **Authorization models** - RBAC with flexible permissions
3. **Security best practices** - Backend-enforced checks
4. **Database design** - Normalized schema with integrity constraints
5. **API design** - RESTful endpoints with proper error handling
6. **TypeScript** - Type-safe API contracts
7. **Next.js API Routes** - Server-side request handling

---

## 📝 Notes & Assumptions

### Design Decisions

- **Backend-Enforced Authorization**: Chosen over RLS for flexibility and clarity
- **Global Permissions**: Same permission keys across all tenants for consistency
- **Tenant-Scoped Roles**: Each tenant defines its own role hierarchy
- **No Role Hierarchy**: Flat role structure (no parent/child roles)
- **No Default Roles**: Roles must be explicitly assigned
- **Soft Delete Not Implemented**: Foreign key cascades handle cleanup

### Assumptions

- Supabase handles user authentication and JWT validation
- Users are created outside this system (e.g., via signup flow)
- Email verification is handled by Supabase Auth
- This is a **proof of concept**, not production-ready
- Single environment (local development only)
- No UI/UX requirements (minimal frontend)

### Future Enhancements

If this were production:
- Add permission caching (Redis)
- Implement audit logging
- Add role hierarchy (parent roles)
- Add permission groups/categories
- Implement rate limiting
- Add bulk operations
- Create admin dashboard
- Add webhook notifications
- Implement RBAC policy engine

---

## 📞 Support

For questions or issues, please refer to:
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

