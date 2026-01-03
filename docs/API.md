
## Overview

This document provides comprehensive documentation for all **19 API endpoints** in the SAAS-Project-Task-Application platform. Each endpoint includes:
- HTTP Method
- Endpoint URL
- Authentication requirements
- Request body (if applicable)
- Complete response format
- Practical examples

**API Version**: 1.0  
**Last Updated**: January 2026

---

## Authentication

The API uses **JWT (JSON Web Token)** authentication. After logging in, you'll receive a token that must be included in subsequent requests.

### How to Authenticate

Include the JWT token in the Authorization header:

```http
Authorization: Bearer 
```

### Token Information
- **Token Type**: JWT (JSON Web Token)
- **Expiration**: 86400 seconds (24 hours)
- **Required for**: All endpoints except Register Tenant and Login

---

## Base URL

```
Development: http://localhost:5000/api
```

---

## Response Format

### Success Response Structure
```json
{
  "success": true,
  "message": "Operation message",
  "data": {
    // Response data
  }
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": "Error message description",
  "statusCode": 400
}
```

---

## Error Handling

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## API Endpoints

## Authentication APIs

### API 1: Register Tenant

Register a new organization (tenant) with an admin user.

**Endpoint**: `POST /auth/register-tenant`  
**Authentication**: ❌ Not Required

**Request Body**:
```json
{
  "tenantName": "Test Company Alpha",
  "subdomain": "testalpha",
  "adminEmail": "admin@testalpha.com",
  "adminPassword": "TestPass@123",
  "adminFullName": "Alpha Admin"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Tenant registered successfully",
  "data": {
    "tenantId": "ace58fb5-085a-4868-87bf-e210ef8aa8bb",
    "subdomain": "testalpha",
    "adminUser": {
      "id": "663510c3-17e2-4740-84a1-0c4754fb9190",
      "email": "admin@testalpha.com",
      "full_name": "Alpha Admin",
      "role": "tenant_admin"
    }
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tenantName | string | ✅ Yes | Name of the organization |
| subdomain | string | ✅ Yes | Unique subdomain identifier |
| adminEmail | string | ✅ Yes | Admin email address |
| adminPassword | string | ✅ Yes | Admin password (min 8 chars) |
| adminFullName | string | ✅ Yes | Admin's full name |

---

### API 2: User Login

Authenticate user and receive JWT token.

**Endpoint**: `POST /auth/login`  
**Authentication**: ❌ Not Required

**Request Body**:
```json
{
  "email": "admin@demo.com",
  "password": "Demo@123",
  "tenantSubdomain": "demo"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "33333333-3333-3333-3333-333333333333",
      "email": "admin@demo.com",
      "fullName": "Demo Admin",
      "role": "tenant_admin",
      "tenantId": "11111111-1111-1111-1111-111111111111"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMzMzMzMzMy0zMzMzLTMzMzMtMzMzMy0zMzMzMzMzMzMzMzMiLCJ0ZW5hbnRJZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsInJvbGUiOiJ0ZW5hbnRfYWRtaW4iLCJpYXQiOjE3NjcyODY3MTgsImV4cCI6MTc2NzM3MzExOH0.SGhn8QB9Px7yb1fsej7xdtlt-wVhP6LxXw1Oz9xAZds",
    "expiresIn": 86400
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ Yes | User's email address |
| password | string | ✅ Yes | User's password |
| tenantSubdomain | string | ✅ Yes | Tenant's subdomain |

**Important**: Save the `token` from the response to use in subsequent API calls.

---

### API 3: Get Current User

Retrieve the authenticated user's profile information.

**Endpoint**: `GET /auth/me`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "email": "admin@demo.com",
    "fullName": "Demo Admin",
    "role": "tenant_admin",
    "isActive": true,
    "tenant": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Demo Company",
      "subdomain": "demo",
      "subscriptionPlan": "pro",
      "maxUsers": 25,
      "maxProjects": 15
    }
  }
}
```

---

### API 4: Logout

Logout the current user and invalidate the session.

**Endpoint**: `POST /auth/logout`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Tenant Management APIs

### API 5: Get Tenant by ID

Retrieve detailed information about a specific tenant.

**Endpoint**: `GET /tenants/:id`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin or Super Admin

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request**:
```http
GET /api/tenants/11111111-1111-1111-1111-111111111111
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Demo Company",
    "subdomain": "demo",
    "status": "active",
    "subscriptionPlan": "pro",
    "maxUsers": 25,
    "maxProjects": 15,
    "createdAt": "2026-01-01T16:40:07.875Z",
    "stats": {
      "totalUsers": 3,
      "totalProjects": 2,
      "totalTasks": 5
    }
  }
}
```

---

### API 6: Update Tenant

Update tenant information.

**Endpoint**: `PUT /tenants/:id`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin or Super Admin

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "name": "Updated Company Name"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Updated Company Name",
    "subscription_plan": "pro",
    "max_users": 25,
    "max_projects": 15,
    "updated_at": "2026-01-01T17:11:24.557Z"
  }
}
```

**Updatable Fields**:
- `name`: Tenant/Company name
- `subscriptionPlan`: Subscription tier
- `maxUsers`: Maximum allowed users
- `maxProjects`: Maximum allowed projects

---

### API 7: Get All Tenants

List all tenants (Super Admin only).

**Endpoint**: `GET /tenants`  
**Authentication**: ✅ Required  
**Authorization**: Super Admin Only

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Updated Company Name",
        "subdomain": "demo",
        "status": "active",
        "subscriptionPlan": "pro",
        "maxUsers": 25,
        "maxProjects": 15,
        "createdAt": "2026-01-02T05:50:19.050Z",
        "totalUsers": 3,
        "totalProjects": 3
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalTenants": 1,
      "limit": 10
    }
  }
}
```

---

## User Management APIs

### API 8: Create User (Invite)

Add a new user to the tenant.

**Endpoint**: `POST /tenants/:id/users`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "email": "newuser@demo.com",
  "password": "NewUser@123",
  "fullName": "New User",
  "role": "user"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "ade4e1f0-556c-4f1a-96d5-df5c350dc3f5",
    "email": "newuser@demo.com",
    "fullName": "New User",
    "role": "user",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "isActive": true,
    "createdAt": "2026-01-02T10:31:16.692Z"
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ Yes | User's email address |
| password | string | ✅ Yes | Initial password |
| fullName | string | ✅ Yes | User's full name |
| role | string | ✅ Yes | Role: "user" or "tenant_admin" |

---

### API 9: Get All Users in Tenant

List all users belonging to a tenant.

**Endpoint**: `GET /tenants/:id/users`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin or Super Admin

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request**:
```http
GET /api/tenants/11111111-1111-1111-1111-111111111111/users
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "ade4e1f0-556c-4f1a-96d5-df5c350dc3f5",
        "email": "newuser@demo.com",
        "fullName": "New User",
        "role": "user",
        "isActive": true,
        "createdAt": "2026-01-02T10:31:16.692Z"
      },
      {
        "id": "44444444-4444-4444-4444-444444444444",
        "email": "user1@demo.com",
        "fullName": "User One",
        "role": "user",
        "isActive": true,
        "createdAt": "2026-01-02T05:50:19.055Z"
      },
      {
        "id": "55555555-5555-5555-5555-555555555555",
        "email": "user2@demo.com",
        "fullName": "User Two",
        "role": "user",
        "isActive": true,
        "createdAt": "2026-01-02T05:50:19.055Z"
      },
      {
        "id": "33333333-3333-3333-3333-333333333333",
        "email": "admin@demo.com",
        "fullName": "Demo Admin",
        "role": "tenant_admin",
        "isActive": true,
        "createdAt": "2026-01-02T05:50:19.054Z"
      }
    ],
    "total": 4,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    }
  }
}
```

---

### API 10: Update User

Update user information.

**Endpoint**: `PUT /users/:id`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin or Self (for own profile)

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "fullName": "New User zero"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "ade4e1f0-556c-4f1a-96d5-df5c350dc3f5",
    "fullName": "New User zero",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-01-02T10:31:16.692Z",
    "updatedAt": "2026-01-02T10:34:12.399Z"
  }
}
```

**Updatable Fields**:
- `fullName`: User's full name
- `email`: Email address (admin only)
- `role`: User role (admin only)
- `isActive`: Active status (admin only)

---

### API 11: Delete User

Remove a user from the tenant.

**Endpoint**: `DELETE /users/:id`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request**:
```http
DELETE /api/users/44444444-4444-4444-4444-444444444444
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Note**: Cannot delete tenant admin users. At least one admin must remain in the tenant.

---

## Project Management APIs

### API 12: Create Project

Create a new project in the tenant.

**Endpoint**: `POST /projects`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "name": "Website Redesign Project",
  "description": "Complete redesign of company website"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "b2b0ceb4-8aa3-4087-9fb2-3a2a5bc60258",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "name": "Website Redesign Project",
    "description": "Complete redesign of company website",
    "status": "active",
    "createdBy": "33333333-3333-3333-3333-333333333333",
    "createdAt": "2026-01-01T17:23:21.488Z"
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ Yes | Project name |
| description | string | ❌ No | Project description |
| status | string | ❌ No | Default: "active" |

---

### API 13: Get All Projects

List all projects in the tenant.

**Endpoint**: `GET /projects`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "b2b0ceb4-8aa3-4087-9fb2-3a2a5bc60258",
        "name": "Website Redesign Project",
        "description": "Complete redesign of company website",
        "status": "active",
        "createdAt": "2026-01-01T17:23:21.488Z",
        "tenantName": "Updated Company Name",
        "createdBy": {
          "id": "33333333-3333-3333-3333-333333333333",
          "fullName": "Demo Admin"
        },
        "taskCount": 0,
        "completedTaskCount": 0
      },
      {
        "id": "66666666-6666-6666-6666-666666666666",
        "name": "Project Alpha",
        "description": "First demo project",
        "status": "active",
        "createdAt": "2026-01-01T16:40:07.952Z",
        "tenantName": "Updated Company Name",
        "createdBy": {
          "id": "33333333-3333-3333-3333-333333333333",
          "fullName": "Demo Admin"
        },
        "taskCount": 2,
        "completedTaskCount": 0
      },
      {
        "id": "77777777-7777-7777-7777-777777777777",
        "name": "Project Beta",
        "description": "Second demo project",
        "status": "active",
        "createdAt": "2026-01-01T16:40:07.952Z",
        "tenantName": "Updated Company Name",
        "createdBy": {
          "id": "33333333-3333-3333-3333-333333333333",
          "fullName": "Demo Admin"
        },
        "taskCount": 3,
        "completedTaskCount": 1
      }
    ],
    "total": 3,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 20
    }
  }
}
```

---

### API 14: Update Project

Update project information.

**Endpoint**: `PUT /projects/:id`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin or Project Creator

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "archived"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "b2b0ceb4-8aa3-4087-9fb2-3a2a5bc60258",
    "name": "Updated Project Name",
    "description": "Updated description",
    "status": "archived",
    "updatedAt": "2026-01-01T17:27:26.970Z"
  }
}
```

**Valid Status Values**:
- `active`: Project is ongoing
- `completed`: Project is finished
- `archived`: Project is archived

---

### API 15: Delete Project

Delete a project and all its associated tasks.

**Endpoint**: `DELETE /projects/:id`  
**Authentication**: ✅ Required  
**Authorization**: Tenant Admin or Project Creator

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request**:
```http
DELETE /api/projects/b2b0ceb4-8aa3-4087-9fb2-3a2a5bc60258
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Warning**: This action is irreversible and will delete all tasks associated with the project.

---

## Task Management APIs

### API 16: Create Task

Create a new task in a project.

**Endpoint**: `POST /projects/:id/tasks`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "title": "Design homepage mockup",
  "description": "Create high-fidelity design",
  "assignedTo": "44444444-4444-4444-4444-444444444444",
  "priority": "high",
  "dueDate": "2024-07-15"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "71fa3ac6-1f44-4bf4-be44-9da6fee18fd4",
    "projectId": "66666666-6666-6666-6666-666666666666",
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "title": "Design homepage mockup",
    "description": "Create high-fidelity design",
    "status": "todo",
    "priority": "high",
    "assignedTo": "55555555-5555-5555-5555-555555555555",
    "dueDate": "2024-07-15T00:00:00.000Z",
    "createdAt": "2026-01-02T10:46:26.418Z"
  }
}
```

**Field Descriptions**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | ✅ Yes | Task title |
| description | string | ❌ No | Task description |
| assignedTo | string (UUID) | ❌ No | User ID to assign task to |
| priority | string | ❌ No | "low", "medium", or "high" |
| dueDate | string (Date) | ❌ No | Due date (YYYY-MM-DD) |

**Default Values**:
- `status`: "todo"
- `priority`: "medium"

---

### API 17: Get Tasks for Project

List all tasks for a specific project.

**Endpoint**: `GET /projects/:id/tasks`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request**:
```http
GET /api/projects/66666666-6666-6666-6666-666666666666/tasks
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "01bb4f5f-c604-4c38-adb5-981f44ce1b59",
        "title": "Design homepage mockup",
        "description": "Create high-fidelity design",
        "status": "todo",
        "priority": "high",
        "dueDate": "2024-07-15T00:00:00.000Z",
        "assignedTo": {
          "id": "55555555-5555-5555-5555-555555555555",
          "fullName": "User Two",
          "email": "user2@demo.com"
        },
        "createdAt": "2026-01-02T10:43:41.962Z"
      },
      {
        "id": "afa1414f-42ef-4aec-a87c-5c3e501bcba5",
        "title": "Design homepage mockup",
        "description": "Create high-fidelity design",
        "status": "todo",
        "priority": "high",
        "dueDate": "2024-07-15T00:00:00.000Z",
        "assignedTo": {
          "id": "ade4e1f0-556c-4f1a-96d5-df5c350dc3f5",
          "fullName": "New User zero",
          "email": "newuser@demo.com"
        },
        "createdAt": "2026-01-02T10:45:00.134Z"
      },
      {
        "id": "71fa3ac6-1f44-4bf4-be44-9da6fee18fd4",
        "title": "Design homepage mockup",
        "description": "Create high-fidelity design",
        "status": "todo",
        "priority": "high",
        "dueDate": "2024-07-15T00:00:00.000Z",
        "assignedTo": {
          "id": "55555555-5555-5555-5555-555555555555",
          "fullName": "User Two",
          "email": "user2@demo.com"
        },
        "createdAt": "2026-01-02T10:46:26.418Z"
      },
      {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "title": "Design homepage mockup sample ",
        "description": "Create high-fidelity design",
        "status": "completed",
        "priority": "high",
        "dueDate": "2024-07-15T00:00:00.000Z",
        "assignedTo": {
          "id": "55555555-5555-5555-5555-555555555555",
          "fullName": "User Two",
          "email": "user2@demo.com"
        },
        "createdAt": "2026-01-02T05:50:19.058Z"
      },
      {
        "id": "88888888-8888-8888-8888-888888888888",
        "title": "Initial Task Alpha",
        "description": null,
        "status": "todo",
        "priority": "high",
        "dueDate": null,
        "assignedTo": null,
        "createdAt": "2026-01-02T05:50:19.058Z"
      },
      {
        "id": "41a32534-fbd2-4c11-ba39-4a8c6982f370",
        "title": "New Task",
        "description": "",
        "status": "todo",
        "priority": "low",
        "dueDate": "2026-01-31T00:00:00.000Z",
        "assignedTo": {
          "id": "33333333-3333-3333-3333-333333333333",
          "fullName": "Demo Admin",
          "email": "admin@demo.com"
        },
        "createdAt": "2026-01-02T10:22:01.412Z"
      }
    ],
    "total": 6,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    }
  }
}
```

---

### API 18: Update Task Status

Update only the status of a task (quick action).

**Endpoint**: `PATCH /tasks/:id/status`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "status": "completed"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "status": "completed",
    "updatedAt": "2026-01-02T05:50:19.058Z"
  }
}
```

**Valid Status Values**:
- `todo`: Task not started
- `in_progress`: Task being worked on
- `completed`: Task finished

---

### API 19: Update Task

Update complete task information.

**Endpoint**: `PUT /tasks/:id`  
**Authentication**: ✅ Required

**Request Headers**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body**:
```json
{
  "title": "Design homepage mockup sample ",
  "description": "Create high-fidelity design",
  "assignedTo": "55555555-5555-5555-5555-555555555555",
  "priority": "high",
  "dueDate": "2024-07-15"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "title": "Design homepage mockup sample ",
    "description": "Create high-fidelity design",
    "status": "completed",
    "priority": "high",
    "dueDate": "2024-07-15T00:00:00.000Z",
    "assignedTo": {
      "id": "55555555-5555-5555-5555-555555555555",
      "fullName": "User Two",
      "email": "user2@demo.com"
    },
    "createdAt": "2026-01-02T05:50:19.058Z",
    "updatedAt": "2026-01-02T05:50:19.058Z"
  }
}
```

**Updatable Fields**:
- `title`: Task title
- `description`: Task description
- `assignedTo`: User ID to assign task to
- `priority`: Task priority (low, medium, high)
- `status`: Task status (todo, in_progress, completed)
- `dueDate`: Task due date

---

## API Quick Reference

| # | Method | Endpoint | Auth Required | Description |
|---|--------|----------|---------------|-------------|
| 1 | POST | `/auth/register-tenant` | ❌ No | Register new tenant |
| 2 | POST | `/auth/login` | ❌ No | User login |
| 3 | GET | `/auth/me` | ✅ Yes | Get current user |
| 4 | POST | `/auth/logout` | ✅ Yes | Logout user |
| 5 | GET | `/tenants/:id` | ✅ Yes | Get tenant by ID |
| 6 | PUT | `/tenants/:id` | ✅ Yes | Update tenant |
| 7 | GET | `/tenants` | ✅ Yes | Get all tenants (Super Admin) |
| 8 | POST | `/tenants/:id/users` | ✅ Yes | Create user |
| 9 | GET | `/tenants/:id/users` | ✅ Yes | Get all users |
| 10 | PUT | `/users/:id` | ✅ Yes | Update user |
| 11 | DELETE | `/users/:id` | ✅ Yes | Delete user |
| 12 | POST | `/projects` | ✅ Yes | Create project |
| 13 | GET | `/projects` | ✅ Yes | Get all projects |
| 14 | PUT | `/projects/:id` | ✅ Yes | Update project |
| 15 | DELETE | `/projects/:id` | ✅ Yes | Delete project |
| 16 | POST | `/projects/:id/tasks` | ✅ Yes | Create task |
| 17 | GET | `/projects/:id/tasks` | ✅ Yes | Get project tasks |
| 18 | PATCH | `/tasks/:id/status` | ✅ Yes | Update task status |
| 19 | PUT | `/tasks/:id` | ✅ Yes | Update task |

---

---

## Testing the APIs

### Using cURL

**Example 1: Register Tenant**
```bash
curl -X POST http://localhost:5000/api/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Test Company",
    "subdomain": "testco",
    "adminEmail": "admin@testco.com",
    "adminPassword": "Test@123",
    "adminFullName": "Test Admin"
  }'
```

**Example 2: Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "Demo@123",
    "tenantSubdomain": "demo"
  }'
```

**Example 3: Get Projects (with Auth)**
```bash
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Example 4: Create Task**
```bash
curl -X POST http://localhost:5000/api/projects/PROJECT_ID/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task",
    "description": "Task description",
    "priority": "high",
    "dueDate": "2024-12-31"
  }'
```

---
### Using Postman

1. Download the Postman.
2. Open Postman.
3. Add variables:
   - `base_url`: `http://localhost:5000/api`
   - `token`: (will be set automatically after login)
4. Run "Register Tenant" and "Login" request.
5. Token will be automatically saved to environment.
6. All subsequent requests will use this token.

Follow this recommended sequence:
1. ✅ Register Tenant (API 1)
2. ✅ Login (API 2)
3. ✅ Get Current User (API 3)
4. ✅ Create Project (API 12)
5. ✅ Create Task (API 16)
6. ✅ Get All Projects (API 13)
7. ✅ Update Task Status (API 18)
