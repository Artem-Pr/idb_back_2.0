# Authentication and Authorization Implementation Plan

This document outlines the steps required to implement authentication and authorization in the current Nest.js + MongoDB backend project with the specified user roles and permissions.

## Overview

The implementation will add authentication and authorization to the existing Nest.js + MongoDB backend, which currently uses TypeORM for database operations, REST API for HTTP endpoints, and WebSocket (ws) for real-time communication.

### User Types
- **Admin**: Has access to all operations and features
- **User**: Has restricted access (no WebSocket or test operations)

### Permission Structure
The following permissions will be implemented:

**File Operations**
- PERMISSION:FILE_UPLOAD
- PERMISSION:FILE_SAVE
- PERMISSION:FILE_DELETE
- PERMISSION:FILE_EDIT

**Folder Operations**
- PERMISSION:FOLDER_DELETE
- PERMISSION:FOLDER_CREATE

**Keyword Operations**
- PERMISSION:KEYWORD_CHECK_UNUSED
- PERMISSION:KEYWORD_CREATE
- PERMISSION:KEYWORD_DELETE

**WebSocket Operations** (Admin only)
- PERMISSION:WEBSOCKET_PREVIEWS_SYNC
- PERMISSION:WEBSOCKET_PREVIEWS_CREATE
- PERMISSION:WEBSOCKET_EXIF_GET

**Testing Operations** (Admin only)
- PERMISSION:TEST_MATCHING_NUMBER_OF_FILES

## Implementation Steps

### 1. Set Up Authentication Module

1. **Install Required Dependencies** - DONE
   - @nestjs/jwt: For JWT token handling
   - @nestjs/passport: For implementing Passport.js strategies
   - passport: Core Passport library
   - passport-jwt: JWT strategy for Passport
   - passport-local: Username/password strategy for Passport
   - bcrypt: For password hashing

2. **Create User Entity** - DONE
   - Define a User entity with TypeORM for MongoDB
   - Include fields: id, username, email, password (hashed), role (admin/user), createdAt, updatedAt
   - Add indexes for username and email fields

3. **Create Authentication Module Structure** - DONE
   - Create auth module, service, and controller
   - Implement local and JWT Passport strategies
   - Create DTOs for login, registration, and refresh token operations

4. **Implement Password Security** - DONE
   - Add password hashing with bcrypt
   - Add salt generation and secure password comparison

5. **Implement JWT Token Management** - DONE
   - Configure JWT module with appropriate settings (secret, expiration)
   - Implement access token generation
   - Implement refresh token mechanism to extend sessions
   - Store refresh tokens in the database with user association

6. **Create Authentication APIs** - DONE
   - Implement login endpoint
   - Implement registration endpoint (admin-only for creating new users)
   - Implement logout endpoint (invalidate refresh tokens)
   - Implement refresh token endpoint

### 2. Set Up Authorization Module

1. **Create Permission System**
   - Define permission enum with all permissions
   - Create a permissions guard to protect routes

2. **Implement Role-Based Access Control (RBAC)**
   - Define roles (admin, user)
   - Map roles to permissions
   - Create role entity/schema if roles need to be dynamic

3. **Create Role and Permission Guards**
   - Implement RolesGuard for role-based protection
   - Implement PermissionsGuard for fine-grained permission checks

4. **Create Custom Decorators**
   - Create @Roles() decorator for role-based protection
   - Create @RequirePermissions() decorator for permission-based protection

### 3. Integrate Authentication with Existing Controllers

1. **Update Main Application** - DONE
   - Configure global authentication in app module
   - Set up global guards for JWT validation

2. **Secure REST API Endpoints** - DONE
   - Apply guards to FilesController
   - Apply guards to KeywordsController
   - Apply guards to PathsController
   - Apply guards to SystemTestsController (admin-only)

3. **Implement Controller-Level Protection**
   - Add @UseGuards() to controller classes for base protection
   - Add specific permission requirements to individual endpoints

### 4. Secure WebSocket Communication

1. **Implement WebSocket Authentication**
   - Create a custom WebSocket adapter to handle JWT authentication
   - Validate tokens on WebSocket connection
   - Implement connection rejection for invalid tokens

2. **Add Authorization to WebSocket Gateway**
   - Modify the FilesDataWSGateway to check permissions
   - Implement permission validation for each WebSocket action
   - Add error handling for unauthorized access attempts

3. **Restrict WebSocket Services**
   - Update SyncPreviewsWSService to check for admin permissions
   - Update CreatePreviewsWSService to check for admin permissions
   - Update UpdateExifWSService to check for admin permissions

### 5. Update Configuration

1. **Update Environment Configuration**
   - Add JWT secret and expiration time to configuration
   - Add security-related settings

2. **Create Initial Admin User**
   - Implement a script or endpoint to create the first admin user
   - Ensure the process is secure and can only be run once

### 6. Add Testing and Validation

1. **Add Unit Tests**
   - Create tests for auth service
   - Create tests for permission guards
   - Create tests for role-based access

2. **Add Integration Tests**
   - Test authentication flow (login, token refresh, logout)
   - Test permission-based access to endpoints
   - Test WebSocket authentication

### 7. Security Enhancements

1. **Add Rate Limiting**
   - Implement rate limiting for authentication endpoints to prevent brute force attacks
   - Configure appropriate limits for API endpoints

2. **Add Request Validation**
   - Ensure proper validation of all input data
   - Implement request sanitization

3. **Implement Secure Headers**
   - Add Helmet middleware for secure HTTP headers
   - Configure CORS appropriately

4. **Add Audit Logging**
   - Extend the existing logging system to track authentication events
   - Log important security events (login attempts, permission changes)

### 8. Documentation and Maintenance

1. **Update API Documentation**
   - Document authentication requirements for each endpoint
   - Document permission requirements for each operation

2. **Create User Management Interface**
   - Define endpoints for user management (create, update, delete)
   - Implement role assignment functionality

## Implementation Timeline

1. **Phase 1: Basic Authentication (Week 1)**
   - Set up user entity and auth module
   - Implement JWT authentication
   - Create login/registration endpoints

2. **Phase 2: Authorization Framework (Week 1-2)**
   - Implement permission system
   - Create role-based access control
   - Develop custom guards and decorators

3. **Phase 3: API Integration (Week 2)**
   - Secure REST API endpoints
   - Implement WebSocket authentication
   - Update services to check permissions

4. **Phase 4: Testing and Refinement (Week 3)**
   - Add comprehensive tests
   - Implement security enhancements
   - Finalize documentation

## Technical Considerations

1. **Database Impact**
   - New collections: users, refresh_tokens (potentially roles if dynamic)
   - Indexes on user fields for performance

2. **Performance**
   - JWT validation overhead on each request
   - Permission checking overhead
   - Consider caching frequently used permissions

3. **Backward Compatibility**
   - Existing client applications will need to be updated to include authentication
   - Consider a grace period with both authenticated and unauthenticated access

4. **Security Best Practices**
   - Store only hashed passwords
   - Use strong JWT secrets
   - Implement proper token expiration
   - Consider implementing IP-based suspicious activity detection
