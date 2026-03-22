import { AuthUser } from "./auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}
