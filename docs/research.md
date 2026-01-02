# Research & Requirements Analysis

## 1. Multi-Tenancy Analysis

### **1.1. Introduction to Multi-Tenancy Architecture**
Multi-tenancy is the architectural capability of a single software instance to serve multiple distinct customer organizations (tenants) simultaneously. Unlike single-tenant architectures, where every customer gets their own server and database, multi-tenancy shares infrastructure resources to maximize efficiency and reduce costs. However, this sharing introduces significant challenges regarding data isolation, security, and performance.

For this SaaS application, we evaluated three standard PostgreSQL multi-tenancy patterns. The goal was to balance development velocity, operational cost, and strict data security.

### **1.2. Comparison of Approaches**

#### **Approach A: Shared Database + Shared Schema (Discriminator Column)**
In this model, all tenants share a single database and a single set of tables. Every table that contains tenant-specific data must include a discriminator column, typically `tenant_id` (UUID). The application layer is responsible for ensuring that every SQL query includes a `WHERE tenant_id = ?` clause to filter data.

* **Technical Implementation:**
    * A `tenants` table stores the account details.
    * Foreign keys link `users`, `projects`, and `tasks` to the `tenants` table.
    * Indexes are created on `tenant_id` to optimize query performance.
* **Pros:**
    * **Lowest Infrastructure Cost:** We only pay for a single RDS instance or container. Resources (CPU/RAM) are pooled efficiently.
    * **Seamless Onboarding:** Creating a new tenant is as simple as inserting a row into the `tenants` table. No DDL (Data Definition Language) commands are needed.
    * **Simplified DevOps:** CI/CD pipelines are straightforward. Database migrations (schema changes) run once and apply to everyone instantly.
    * **Ecosystem Compatibility:** Most ORMs and third-party tools (analytics, backups) work out-of-the-box with standard schemas.
* **Cons:**
    * **Isolation Risk:** This is the biggest drawback. Isolation relies entirely on the correctness of the application code. If a developer forgets a `WHERE` clause, data leaks between tenants.
    * **"Noisy Neighbor" Effect:** If one large tenant runs a complex analytical query, it consumes the CPU/IO of the shared database, degrading performance for all other tenants.
    * **Backup & Restore Difficulty:** You cannot easily backup or restore a *single* tenant's data. If Tenant A deletes their data accidentally, restoring it without affecting Tenant B is technically complex (requires row-level extraction).

#### **Approach B: Shared Database + Separate Schemas (Schema-per-Tenant)**
In PostgreSQL, a "Schema" is a namespace within a database. In this approach, we use one database instance, but every tenant gets their own named schema (e.g., `schema_tenant_1`, `schema_tenant_2`).

* **Technical Implementation:**
    * A "public" schema holds shared data (e.g., system-wide configs).
    * When a request comes in, the application determines the tenant and switches the PostgreSQL `search_path` to that tenant's schema.
* **Pros:**
    * **Strong Logical Isolation:** Data is separated at the database namespace level. SQL injection risks are reduced because a query running in Schema A simply cannot see tables in Schema B.
    * **Customization Potential:** Theoretically, different tenants could have different table structures or custom columns, offering a premium "Enterprise" feature.
    * **Granular Restoration:** We can use `pg_dump` to backup specific schemas. Restoring one tenant doesn't require rolling back the whole database.
* **Cons:**
    * **Migration Complexity:** This is a major bottleneck. If you have 5,000 tenants, a schema migration (e.g., adding a column) must be run 5,000 times. If the script fails on the 3,000th tenant, your system enters an inconsistent state.
    * **Connection Pooling Issues:** Database connection pools (like PgBouncer) struggle when switching `search_path` constantly, often requiring more connections and overhead.
    * **Resource Overhead:** PostgreSQL is robust, but having 10,000+ separate schemas can bloat the internal catalog metadata, potentially slowing down query planning.

#### **Approach C: Separate Database (Database-per-Tenant)**
This is the "Premium" approach where every tenant gets a completely distinct database instance, potentially even on different servers.

* **Pros:**
    * **Ultimate Isolation:** Physical separation of data. Even a complete application compromise rarely leads to cross-tenant data leakage.
    * **Performance Stability:** Total immunity from "Noisy Neighbors." Resources can be scaled individually (e.g., give Tenant A a larger server than Tenant B).
    * **Security Compliance:** High-security industries (Health, Finance, Government) often mandate physical separation of data.
* **Cons:**
    * **Exorbitant Costs:** The infrastructure costs scale linearly. If a database instance costs $20/month, 1,000 free-tier users would cost $20,000/month.
    * **Operational Nightmare:** Managing thousands of database connections, backups, and monitoring endpoints requires a dedicated DevOps team.
    * **Slow Onboarding:** New users must wait for a database to be provisioned (seconds to minutes) rather than instant access.

### **1.3. Comparison Table**

| Feature | Shared Schema (Discriminator) | Separate Schema (Namespace) | Separate Database (Isolated) |
| :--- | :--- | :--- | :--- |
| **Data Isolation** | **Low** (Logic-based) | **Medium** (Namespace-based) | **High** (Physical/Process) |
| **Implementation Cost** | **Low** ($) | **Medium** ($$) | **Very High** ($$$$) |
| **DevOps Complexity** | **Low** (Single pipeline) | **High** (Script orchestration) | **Very High** (Fleet management) |
| **Scalability (Tenants)** | **High** (100k+ easily) | **Medium** (<5k recommended) | **Low** (<500 manageable) |
| **Performance Impact** | Noisy Neighbor Risk | Moderate Overhead | Complete Isolation |
| **Schema Migration** | Instant (1 run) | Slow (N runs) | Very Slow (N runs) |
| **Compliance Readiness** | Low | Medium | High |

### **1.4. Justification for Chosen Approach**

**Selected Strategy: Shared Database + Shared Schema (Discriminator Column)**

We have chosen the **Discriminator Column** approach. This decision is driven by the specific requirements of a modern, scalable SaaS startup:

1.  **Agility & Time-to-Market:** The primary goal is to launch quickly. The Shared Schema approach requires the least amount of infrastructure code. We do not need to write complex "tenant provisioners" or "schema migrators." We simply write standard SQL.
2.  **Freemium Economics:** We intend to offer a Free Tier. The "Separate Database" model makes free tiers financially impossible due to the fixed cost per tenant. The Shared Schema model allows us to host thousands of free users on a single $10/month Postgres instance.
3.  **Technical Stack Alignment:** We are using Node.js and raw SQL (via `pg`). This stack gives us granular control over our queries. By implementing a strict **Controller-Service pattern** (as seen in our `authController` and `taskController`), we enforce the `WHERE tenant_id = ?` check centrally. We can further enhance security in the future using PostgreSQL **Row Level Security (RLS)** policies if needed, which provides "Separate Schema" levels of security within a "Shared Schema" architecture.
4.  **Scalability:** While "Noisy Neighbor" is a risk, it is a problem we only face if we become very successful. It is a "good problem to have." We can solve it later by sharding the database or moving specific high-value enterprise tenants to their own database instance (a Hybrid approach) without refactoring the core application logic.

---

## 2. Technology Stack Justification

### **2.1. Backend Framework: Node.js + Express**
* **Selection:** Node.js (Runtime) with Express (Framework).
* **Justification:**
    * **Event-Driven Architecture:** SaaS applications are heavily I/O bound. They spend most of their time waiting for database queries or network requests. Node.js's non-blocking, event-driven architecture handles thousands of concurrent connections on a single thread better than traditional blocking languages (like older PHP or Java).
    * **Unified Language (JavaScript/TypeScript):** Using the same language on the frontend and backend allows for code reuse (e.g., sharing validation schemas or type definitions) and allows developers to work across the full stack without context switching.
    * **Rich Ecosystem (NPM):** The availability of battle-tested packages like `bcryptjs` (security), `jsonwebtoken` (auth), `pg` (database), and `cors` accelerates development significantly.
* **Alternatives Considered:**
    * *Python (Django/Flask):* Python is excellent, but its synchronous nature can be a bottleneck for real-time dashboards unless using FastAPI/Asyncio, which has a steeper learning curve than Express.
    * *Go (Golang):* Offers superior raw performance but lacks the rapid prototyping speed and vast library ecosystem of Node.js.

### **2.2. Frontend Framework: React + Vite + Tailwind CSS**
* **Selection:** React 18 built with Vite, styled with Tailwind CSS.
* **Justification:**
    * **Component-Based UI:** The dashboard UI is complex, with repeating elements (User Cards, Task Lists, Modals). React’s component model allows us to build these once and reuse them everywhere, ensuring consistency.
    * **Virtual DOM:** React’s efficient reconciliation algorithm ensures that updating a single task status in a list of 100 items is instantaneous, providing a snappy "native app" feel.
    * **Vite:** We chose Vite over Create-React-App (CRA) because Vite uses native ES modules in the browser. This results in near-instant server start times and Hot Module Replacement (HMR), drastically improving developer productivity.
    * **Tailwind CSS:** Utility-first CSS allows us to style components directly in the JSX. This avoids the "append-only CSS" problem where stylesheets grow uncontrollably. It also enforces a consistent design system (spacing, colors) automatically.
* **Alternatives Considered:**
    * *Angular:* Provides a robust full solution but introduces significant boilerplate and a steep learning curve (RxJS, Dependency Injection) that would slow down the initial MVP phase.

### **2.3. Database: PostgreSQL 15**
* **Selection:** PostgreSQL.
* **Justification:**
    * **Relational Integrity:** Our data is inherently relational. Users belong to Tenants, Tasks belong to Projects. PostgreSQL enforces foreign key constraints (`ON DELETE CASCADE`), ensuring that when a Tenant is deleted, we don't end up with orphaned data cluttering the system.
    * **JSONB Support:** PostgreSQL offers best-in-class support for unstructured data via JSONB columns. This allows us to add flexible features (like custom user settings or dynamic task metadata) without needing a separate NoSQL database like MongoDB.
    * **Reliability:** Postgres is ACID compliant, meaning transactions are guaranteed. This is non-negotiable for user registration (where we must create a Tenant and a User atomically).
* **Alternatives Considered:**
    * *MongoDB:* While popular for "speed," MongoDB lacks the strict transactional integrity and relational enforcement that a multi-tenant security model requires. Managing "joins" in application code is error-prone.

### **2.4. Authentication: JWT (JSON Web Tokens)**
* **Selection:** Stateless JWTs.
* **Justification:**
    * **Scalability:** Since tokens are stored on the client, the server remains stateless. We can scale the backend to 10 instances behind a load balancer without needing "sticky sessions" or a shared Redis session store.
    * **Performance:** The backend can validate a user simply by verifying the cryptographic signature of the token. It does not need to query the database for every single API call to check if a session is valid.
    * **Multi-Tenancy Context:** We can embed the `tenantId` and `role` directly into the token payload. This allows the backend to know *exactly* which tenant data to scope the request to immediately upon receiving the request header.

### **2.5. Deployment: Docker & Docker Compose**
* **Selection:** Containerization.
* **Justification:**
    * **Environment Parity:** Docker guarantees that the application runs exactly the same way on a developer's laptop as it does in production. This eliminates "it works on my machine" bugs.
    * **Service Isolation:** We define strict networking rules. The Database container is not exposed to the host machine's public network; only the Backend container can talk to it. This provides a layer of network-level security by default.

---

## 3. Security Considerations

### **3.1. Data Isolation Strategy**
In a shared-schema architecture, data isolation is the primary security concern. If our SQL queries are flawed, Tenant A could see Tenant B's data.
* **Logical Separation:** We enforce a strict coding standard where **every** database query targeting a tenant-scoped table (Tasks, Projects, Users) must include `WHERE tenant_id = $1`.
* **Controller Validation:** In `taskController.js`, we do not simply rely on the user input. Even if a user sends a valid `taskId` for a task that belongs to another tenant, our update logic performs a lookup: `SELECT tenant_id FROM tasks WHERE id = $1`. We explicitly check `if (task.tenant_id !== requester.tenantId)`. This prevents IDOR (Insecure Direct Object Reference) attacks.
* **Foreign Key Integrity:** We use composite unique keys (e.g., `UNIQUE(email, tenant_id)`) to ensure logic consistency, preventing data collisions between tenants.

### **3.2. Authentication & Authorization (RBAC)**
* **Role-Based Access Control (RBAC):** We implemented a hierarchical permission system:
    * **Super Admin:** Has god-mode access (can see all tenants). Used for system maintenance.
    * **Tenant Admin:** Restricted to their specific `tenantId`. Can create/delete users and projects within their scope.
    * **User:** Restricted to their `tenantId`. Further restricted to only view/edit tasks they are assigned to or projects they are part of.
* **Token Verification:** The `authMiddleware` acts as the gatekeeper. It intercepts every request, validates the JWT signature using the `JWT_SECRET`, checks the expiration, and rejects malformed tokens immediately before any business logic executes.

### **3.3. Password Hashing Strategy**
* **No Plaintext:** Storing passwords in plaintext is negligent. We assume the database *could* be leaked, so the data must remain secure even then.
* **Bcrypt Algorithm:** We use `bcrypt` (via `bcryptjs`).
    * **Salting:** Bcrypt automatically generates a unique "salt" for every password. This defeats "Rainbow Table" attacks (pre-computed lists of common password hashes).
    * **Work Factor:** We use a salt round of 10. This makes the hashing process computationally expensive (slow). This slowness is a feature: it prevents attackers from brute-forcing millions of passwords per second.

### **3.4. API Security Measures**
* **Input Sanitization:** We strictly use **Parameterized Queries** (e.g., `$1, $2` syntax in `pg`). We never concatenate strings into SQL queries (`"SELECT * FROM users WHERE name = '" + input + "'"`). This effectively neutralizes SQL Injection attacks.
* **UUIDs vs Integers:** We use UUIDs (Universally Unique Identifiers) for all Primary Keys. Unlike auto-incrementing integers (`user/1`, `user/2`), UUIDs (`user/550e8400...`) are unguessable. An attacker cannot simply iterate through IDs to scrape data.
* **CORS (Cross-Origin Resource Sharing):** We configured the backend to only accept requests from our specific frontend domain (or `localhost` in dev). This prevents malicious websites from making API calls on behalf of a logged-in user.

### **3.5. Audit Logging**
* **Immutability:** We designed an `audit_logs` table that is insert-only. The application logic does not expose an API to update or delete logs.
* **Comprehensive Tracking:** Every critical mutation (CREATE, UPDATE, DELETE) triggers a log entry.
    * **Who:** User ID.
    * **What:** The specific action (e.g., `DELETE_PROJECT`).
    * **Where:** The Tenant ID affected.
    * **When:** Precise server timestamp.
* **Forensic Value:** In the event of a security breach or a rogue employee deleting data, these logs allow administrators to reconstruct the timeline and identify the responsible account.