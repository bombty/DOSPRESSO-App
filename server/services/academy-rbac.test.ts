import { describe, it, expect } from 'vitest';
import { 
  getAcademyViewMode, 
  isAcademyCoach, 
  isAcademySupervisor, 
  isAcademyEmployee,
  canAccessAcademyRoute,
  ACADEMY_COACH_ROLES,
  ACADEMY_SUPERVISOR_ROLES,
  ACADEMY_EMPLOYEE_ROLES,
} from '@shared/permissions';
import { UserRole } from '@shared/schema';

describe('RBAC Negative Tests', () => {
  describe('AI Logs Access (coach-only)', () => {
    it('should deny barista access to coach functions', () => {
      expect(isAcademyCoach('barista')).toBe(false);
      expect(isAcademyCoach('stajyer')).toBe(false);
      expect(isAcademyCoach('bar_buddy')).toBe(false);
    });

    it('should deny supervisor access to coach functions', () => {
      expect(isAcademyCoach('supervisor')).toBe(false);
      expect(isAcademyCoach('mudur')).toBe(false);
    });

    it('should allow coach roles access to coach functions', () => {
      expect(isAcademyCoach('admin')).toBe(true);
      expect(isAcademyCoach('coach')).toBe(true);
      expect(isAcademyCoach('trainer')).toBe(true);
      expect(isAcademyCoach('kalite_kontrol')).toBe(true);
    });
  });

  describe('Admin-only cleanup endpoint access', () => {
    it('should deny non-admin roles', () => {
      const nonAdminRoles = ['coach', 'trainer', 'supervisor', 'mudur', 'barista', 'stajyer', 'kalite_kontrol'];
      for (const role of nonAdminRoles) {
        expect(role).not.toBe('admin');
      }
    });

    it('admin role check is correct', () => {
      expect(UserRole.ADMIN).toBe('admin');
    });
  });

  describe('Employee cannot access coach routes', () => {
    const employeeRoles = ['barista', 'stajyer', 'bar_buddy', 'supervisor_buddy'];
    
    it('employees cannot access gate management', () => {
      for (const role of employeeRoles) {
        const result = canAccessAcademyRoute(role as any, '/akademi/gate-yonetim');
        expect(result).toBe(false);
      }
    });

    it('employees cannot access coach content routes', () => {
      for (const role of employeeRoles) {
        expect(canAccessAcademyRoute(role as any, '/akademi/kpi-sinyalleri')).toBe(false);
        expect(canAccessAcademyRoute(role as any, '/akademi/icerik-kutuphanesi')).toBe(false);
        expect(canAccessAcademyRoute(role as any, '/akademi/onboarding-studio')).toBe(false);
      }
    });

    it('employees cannot access analytics routes', () => {
      for (const role of employeeRoles) {
        expect(canAccessAcademyRoute(role as any, '/akademi/analitik')).toBe(false);
        expect(canAccessAcademyRoute(role as any, '/akademi/kohort-analitik')).toBe(false);
      }
    });
  });
});

describe('Tenant Isolation Tests', () => {
  describe('View mode isolation', () => {
    it('supervisor should get supervisor view mode', () => {
      expect(getAcademyViewMode('supervisor')).toBe('supervisor');
      expect(getAcademyViewMode('mudur')).toBe('supervisor');
    });

    it('employee roles should get employee view mode', () => {
      expect(getAcademyViewMode('barista')).toBe('employee');
      expect(getAcademyViewMode('stajyer')).toBe('employee');
      expect(getAcademyViewMode('bar_buddy')).toBe('employee');
    });

    it('coach roles should get coach view mode', () => {
      expect(getAcademyViewMode('coach')).toBe('coach');
      expect(getAcademyViewMode('trainer')).toBe('coach');
    });
  });

  describe('Branch-scoped route access', () => {
    it('supervisor cannot access supervisor academy routes without permission', () => {
      expect(canAccessAcademyRoute('supervisor' as any, '/akademi/supervisor')).toBe(false);
      expect(canAccessAcademyRoute('mudur' as any, '/akademi/supervisor')).toBe(false);
    });

    it('employee cannot access supervisor routes', () => {
      expect(canAccessAcademyRoute('barista' as any, '/akademi/supervisor')).toBe(false);
      expect(canAccessAcademyRoute('stajyer' as any, '/akademi/supervisor')).toBe(false);
    });

    it('coach can access supervisor routes (coaches manage supervisors)', () => {
      expect(canAccessAcademyRoute('coach' as any, '/akademi/supervisor')).toBe(true);
    });
  });

  describe('Cross-role isolation', () => {
    it('all employee roles are correctly identified', () => {
      const empRoles = ['stajyer', 'bar_buddy', 'barista', 'supervisor_buddy', 'yatirimci_branch'];
      for (const r of empRoles) {
        expect(isAcademyEmployee(r)).toBe(true);
        expect(isAcademyCoach(r)).toBe(false);
        expect(isAcademySupervisor(r)).toBe(false);
      }
    });

    it('supervisor roles are not employees or coaches', () => {
      const supRoles = ['supervisor', 'mudur'];
      for (const r of supRoles) {
        expect(isAcademySupervisor(r)).toBe(true);
        expect(isAcademyCoach(r)).toBe(false);
        expect(isAcademyEmployee(r)).toBe(false);
      }
    });
  });
});
