// Express User augmentation for Passport
import type { UserRole } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
      branchId: number | null;
      claims?: any;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

export {};
