export type { Credential } from './domain/credential'
export type { IdentityError, IdentityErrorKind } from './domain/errors'
export { SESSION_TTL_MS } from './domain/session'
// El núcleo de permisos y las reglas puras de acceso: los usan admin, events y orders en sus
// casos de uso, así que se exponen aquí y nadie entra en `identity/domain` desde fuera.
export {
  ROLES,
  canAccessEvent,
  canDeleteUser,
  canDemote,
  canManageStaff,
  gestionaElEvento,
  isAdmin,
  parseRole,
  rolEnEquipo,
  sectionForRole,
} from './domain/access'
export type { Actor, DeleteUserVerdict, EventSection, Membership, RolEnEquipo, Role } from './domain/access'
export { createCredential } from './domain/credential'
export { actorDeSesion, leerMotivo, MOTIVO_MAX, MOTIVO_MIN } from './domain/support'
