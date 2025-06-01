import { Injectable } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

@Injectable()
export class PermissionsService {
  private readonly rolePermissions: Map<Role, Set<Permission>> = new Map();

  constructor() {
    // Initialize permissions for each role
    this.initializePermissions();
  }

  private initializePermissions(): void {
    // User permissions
    const userPermissions = new Set<Permission>([
      // File Operations
      Permission.FILE_UPLOAD,
      Permission.FILE_SAVE,
      Permission.FILE_DELETE,
      Permission.FILE_EDIT,

      // Folder Operations
      Permission.FOLDER_DELETE,
      Permission.FOLDER_CREATE,

      // Keyword Operations
      Permission.KEYWORD_CHECK_UNUSED,
      Permission.KEYWORD_CREATE,
      Permission.KEYWORD_DELETE,
    ]);

    // Admin permissions (all permissions)
    const adminPermissions = new Set<Permission>([
      ...userPermissions,
      // WebSocket Operations (Admin only)
      Permission.WEBSOCKET_PREVIEWS_SYNC,
      Permission.WEBSOCKET_PREVIEWS_CREATE,
      Permission.WEBSOCKET_EXIF_GET,

      // Testing Operations (Admin only)
      Permission.TEST_MATCHING_NUMBER_OF_FILES,
    ]);

    // Set permissions for each role
    this.rolePermissions.set(Role.USER, userPermissions);
    this.rolePermissions.set(Role.ADMIN, adminPermissions);
  }

  /**
   * Get all permissions for a specific role
   */
  getPermissionsByRole(role: Role): Permission[] {
    const permissions = this.rolePermissions.get(role);
    return permissions ? Array.from(permissions) : [];
  }

  /**
   * Check if a role has specific permissions
   */
  roleHasPermissions(role: Role, requiredPermissions: Permission[]): boolean {
    const rolePermissions = this.rolePermissions.get(role);

    if (!rolePermissions) {
      return false;
    }

    return requiredPermissions.every((permission) =>
      rolePermissions.has(permission),
    );
  }
}
