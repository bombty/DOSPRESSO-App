import type { User } from "@shared/schema";

/**
 * Sanitize user data for API responses by removing sensitive fields
 * Always use this helper when sending user/employee data to clients
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
 * Sanitize multiple user records
 */
export function sanitizeUsers(users: User[]): Array<Omit<User, 'hashedPassword' | 'phoneNumber' | 'emergencyContactName' | 'emergencyContactPhone' | 'notes'>> {
  return users.map(sanitizeUser);
}
