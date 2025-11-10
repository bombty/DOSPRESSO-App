import type { User, UserRoleType } from "@shared/schema";
import { isHQRole } from "@shared/schema";

/**
 * Sanitize user data for API responses by removing sensitive fields
 * Branch users get minimal fields, HQ users get more details
 * hashedPassword is NEVER sent to clients
 */
export function sanitizeUserForRole(
  user: User, 
  viewerRole: UserRoleType
): Omit<User, 'hashedPassword'> | Omit<User, 'hashedPassword' | 'phoneNumber' | 'emergencyContactName' | 'emergencyContactPhone' | 'notes'> {
  const { hashedPassword, ...withoutPassword } = user;
  
  if (isHQRole(viewerRole)) {
    return withoutPassword;
  }
  
  const { 
    phoneNumber, 
    emergencyContactName, 
    emergencyContactPhone, 
    notes, 
    ...sanitized 
  } = withoutPassword;
  return sanitized;
}

/**
 * Sanitize multiple user records based on viewer role
 */
export function sanitizeUsersForRole(
  users: User[], 
  viewerRole: UserRoleType
): Array<Omit<User, 'hashedPassword'> | Omit<User, 'hashedPassword' | 'phoneNumber' | 'emergencyContactName' | 'emergencyContactPhone' | 'notes'>> {
  return users.map(user => sanitizeUserForRole(user, viewerRole));
}

/**
 * Legacy: Sanitize user data for API responses (branch-level access)
 * Use sanitizeUserForRole instead for role-aware filtering
 */
export function sanitizeUser(user: User): Omit<User, 'hashedPassword' | 'phoneNumber' | 'emergencyContactName' | 'emergencyContactPhone' | 'notes'> {
  const { 
    hashedPassword, 
    phoneNumber, 
    emergencyContactName, 
    emergencyContactPhone, 
    notes, 
    ...sanitized 
  } = user;
  return sanitized;
}

/**
 * Legacy: Sanitize multiple user records (branch-level access)
 */
export function sanitizeUsers(users: User[]): Array<Omit<User, 'hashedPassword' | 'phoneNumber' | 'emergencyContactName' | 'emergencyContactPhone' | 'notes'>> {
  return users.map(sanitizeUser);
}
