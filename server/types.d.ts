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

// Replit object storage integration types
declare module '@replit/object-storage' {
  export class Client {
    constructor();
    uploadFromBytes(path: string, buffer: Buffer): Promise<{ ok: boolean; error?: any }>;
    downloadAsBytes(path: string): Promise<{ ok: boolean; value?: Uint8Array; error?: any }>;
  }
}

export {};
