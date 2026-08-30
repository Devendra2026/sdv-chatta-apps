-- Rename legacy ADMIN role to DEPARTMENT_ADMIN (staff RBAC alignment).
UPDATE "role"
SET
  code = 'DEPARTMENT_ADMIN',
  name = 'Department Admin',
  description = 'Department administrator — operational access; cannot manage users',
  "updatedAt" = NOW()
WHERE code = 'ADMIN';
