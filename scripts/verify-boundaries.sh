#!/bin/sh
# Comprueba que la política de fronteras corta de verdad, no solo que esté escrita.
#
# Una configuración de ESLint puede quedarse sin efecto sin avisar: un tipo de elemento
# que ya no casa con ningún fichero, una regla renombrada en una versión nueva, un
# `plugins` mal puesto. El lint sigue en verde y las fronteras han dejado de existir.
#
# Esto escribe importaciones prohibidas a propósito y exige que ESLint las señale.
#
#   pnpm verify:boundaries
set -eu

cd "$(dirname "$0")/.."

TEMPORALES='src/modules/events/application/__boundary-check.ts
src/shared/__boundary-check.ts
src/modules/events/domain/__boundary-check.ts'

limpiar() { for f in $TEMPORALES; do rm -f "$f"; done; }
trap limpiar EXIT INT TERM
limpiar

fallos=0

espera_bloqueo() {
  ruta="$1"
  descripcion="$2"
  if npx eslint "$ruta" 2>/dev/null | grep -q 'boundaries/dependencies'; then
    echo "  ✓ $descripcion"
  else
    echo "  ✗ $descripcion — ESLint NO lo bloqueó"
    fallos=$((fallos + 1))
  fi
}

espera_permiso() {
  ruta="$1"
  descripcion="$2"
  if npx eslint "$ruta" 2>/dev/null | grep -q 'boundaries/dependencies'; then
    echo "  ✗ $descripcion — ESLint lo bloqueó y no debería"
    fallos=$((fallos + 1))
  else
    echo "  ✓ $descripcion"
  fi
}

echo 'Comprobando que las fronteras entre módulos siguen siendo efectivas:'

cat > src/modules/events/application/__boundary-check.ts <<'TS'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
export const bloqueado = drizzleUserRepository
TS
espera_bloqueo src/modules/events/application/__boundary-check.ts 'application no puede importar infrastructure'

cat > src/shared/__boundary-check.ts <<'TS'
import { nextExpiry } from '@/modules/identity/domain/session'
export const bloqueado = nextExpiry
TS
espera_bloqueo src/shared/__boundary-check.ts 'shared no puede importar un módulo'

cat > src/modules/events/domain/__boundary-check.ts <<'TS'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
export const bloqueado = drizzleUserRepository
TS
espera_bloqueo src/modules/events/domain/__boundary-check.ts 'domain no puede importar infrastructure'

# El contrapeso: si todo diera error, la prueba pasaría por el motivo equivocado.
cat > src/modules/events/domain/__boundary-check.ts <<'TS'
import { ok } from '@/shared/result'
export const permitido = ok
TS
espera_permiso src/modules/events/domain/__boundary-check.ts 'domain sí puede importar shared'

if [ "$fallos" -gt 0 ]; then
  echo "Fronteras SIN efecto: $fallos comprobación(es) fallida(s)."
  exit 1
fi

echo 'Fronteras efectivas.'
