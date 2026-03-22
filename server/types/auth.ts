export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId?: number;
  isActive: boolean;
  profileImageUrl?: string;
  dashboardLayout?: string;
  accountStatus?: string;
  language?: string;
}
