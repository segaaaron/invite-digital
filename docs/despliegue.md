# Despliegue en VPS

La pila son cuatro contenedores: `web` (Next en modo standalone), `db` (Postgres 17),
`caddy` (TLS automático y proxy inverso) y `backup` (volcado diario de la base).

## 1. Requisitos del servidor

- VPS con Docker Engine y el plugin `compose` (probado en Ubuntu 24.04).
- Puertos 80 y 443 abiertos hacia Internet. Caddy los necesita para emitir el certificado.
- Un registro DNS `A` del dominio apuntando a la IP del VPS. **Debe resolver antes de levantar la pila**:
  Let's Encrypt valida el dominio por HTTP y sin DNS el certificado no se emite.

## 2. Variables de entorno

Crear `docker/.env` en el servidor (no se versiona):

```bash
POSTGRES_USER=invite
POSTGRES_PASSWORD=<contraseña larga y aleatoria>
POSTGRES_DB=invite
SITE_URL=https://invitepremium.bo
SITE_DOMAIN=invitepremium.bo
```

`SITE_URL` con esquema y sin barra final: de ahí salen el canonical, los hreflang y el sitemap.
`SITE_DOMAIN` sin esquema: es el nombre que Caddy pide a Let's Encrypt.

Generar la contraseña con `openssl rand -base64 32`.

## 3. Levantar la pila

```bash
cd docker
docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
```

La imagen de `web` se compila con `DATABASE_URL` y `SITE_URL` como argumentos de build: la app
valida el entorno al importarse (`src/shared/config/env.ts`) y sin ellos la compilación falla.

## 4. Migraciones y datos iniciales

El contenedor de producción no lleva `drizzle-kit` ni `tsx`: la imagen de runtime solo tiene el
servidor autocontenido. Las migraciones y el seed corren desde el servicio `migrator`, que reutiliza
la etapa de build de la misma imagen (ahí sí están las herramientas) y vive tras un perfil para que
no arranque con la pila:

```bash
docker compose -f compose.yml --profile tools run --rm migrator
```

No montar el repositorio del host: sus `node_modules` están compilados para otra plataforma y el
usuario del contenedor no puede escribir en ellos.

`pnpm db:seed` es idempotente: se puede repetir sin duplicar planes, categorías ni plantillas.

## 5. Verificar

```bash
curl -sI https://invitepremium.bo/es | head -3       # 200 y HSTS
curl -s https://invitepremium.bo/robots.txt
curl -s https://invitepremium.bo/sitemap.xml | head
docker compose -f compose.yml logs caddy | tail -20  # emisión del certificado
```

La raíz `/` negocia idioma y redirige a `/es` o `/en` (307). No hay selector de idioma visible.

Verificado en local con `SITE_DOMAIN=localhost`: los cuatro servicios arriba, `/` redirige 307 a
`/en`, `/es` responde 200 con los precios leídos de Postgres, y las cabeceras `Strict-Transport-Security`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy` llegan al cliente.

## 6. Respaldos

El servicio `backup` vuelca la base cada 24 h en el volumen `backups` y borra los volcados de más
de 14 días.

```bash
docker compose -f compose.yml exec backup ls -lh /backups            # listar
docker compose -f compose.yml exec backup pg_dump --format=custom \
  --file=/backups/invite-manual.dump                                 # volcado a demanda
```

Restaurar:

```bash
docker compose -f compose.yml exec backup \
  pg_restore --clean --if-exists -d "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/$POSTGRES_DB" \
  /backups/invite-20260818-0300.dump
```

Copiar los volcados fuera del VPS periódicamente: un respaldo que vive en la misma máquina no
protege de la pérdida de la máquina.

```bash
docker compose -f compose.yml cp backup:/backups ./backups-locales
```

## 7. Actualizar

```bash
git pull
cd docker
docker compose -f compose.yml up -d --build web
```

Si el despliegue trae migraciones, aplicarlas con el comando del punto 4 antes de exponer el sitio.

## 8. Antes de la primera publicación

Sustituir los marcadores de `src/shared/config/brand.ts`: WhatsApp real, email real y dominio real.
El número de WhatsApp aparece en los CTA de precios y en la sección de contacto; el dominio define
canonical, hreflang, sitemap y el certificado TLS.
