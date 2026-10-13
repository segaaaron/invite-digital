/** Alguien con acceso al evento (cliente o puerta con cuenta). Se ven y se quitan en «Accesos» (`EventClients`). */
export type StaffMember = { readonly userId: string; readonly email: string }
