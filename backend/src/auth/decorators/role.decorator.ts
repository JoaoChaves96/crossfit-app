import { SetMetadata } from '@nestjs/common';

export const ROLE_KEY = 'required_role';

export type AllowedRole = 'owner' | 'coach' | 'athlete';

/**
 * Decorator to specify required role(s) for an endpoint.
 * Pass a single role or an array of roles (user must satisfy at least one).
 * Roles: 'owner', 'coach', 'athlete'
 */
export const Role = (role: AllowedRole | AllowedRole[]) =>
  SetMetadata(ROLE_KEY, Array.isArray(role) ? role : [role]);
