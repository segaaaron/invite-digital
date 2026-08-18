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

Generar la contraseña con `openssl rand -hex 32`. **No usar `base64`**: la contraseña viaja dentro de
`DATABASE_URL`, y los caracteres `/`, `+` y `=` que produce base64 rompen la URL de conexión.

Compose exige las cinco variables: si falta alguna, `docker compose` falla al arrancar en vez de
levantar la pila a medias.

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

## 5.b Endurecer el servidor

La pila no protege el sistema operativo que la aloja. En un VPS recién creado:

```bash
ufw default deny incoming && ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
apt install -y unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades
```

Docker publica puertos saltándose `ufw`, así que ningún servicio debe declarar `ports:` salvo Caddy.
Postgres queda accesible solo dentro de la red de compose.

Los registros de los contenedores están limitados a 10 MB × 3 por servicio en `compose.yml`; sin ese
límite, `json-file` llena el disco y Postgres deja de escribir.

Actualizar las imágenes base con cierta regularidad — `--build` no las refresca:

```bash
docker compose -f compose.yml pull && docker compose -f compose.yml up -d
```

Conviene además una comprobación externa de disponibilidad (cualquier servicio gratuito de uptime),
porque `restart: unless-stopped` reinicia procesos muertos pero no avisa de nada.

## 5.c HSTS

`Caddyfile` envía `Strict-Transport-Security: max-age=86400`, un día. Es deliberado: subir a un año
solo cuando el dominio definitivo lleve semanas estable, y añadir `includeSubDomains; preload` solo si
se decide enviar el dominio a hstspreload.org — salir de esa lista tarda meses y obliga a servir HTTPS
válido en todos los subdominios.

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

**Sacar los volcados del VPS.** Un respaldo que vive en la misma máquina no protege de la pérdida de
la máquina, y un `cp` manual no lo hace nadie. Programarlo desde una máquina de confianza:

```bash
# En el cron de la máquina local o de otro servidor:
rsync -az --delete usuario@invitepremium.bo:/var/lib/docker/volumes/invitepremium_backups/_data/ ./respaldos-invite/
```

**Verificar que un respaldo restaura.** Un respaldo sin probar no es un respaldo. Una vez al trimestre:

```bash
docker compose -f compose.yml exec db createdb -U "$POSTGRES_USER" prueba_restauracion
docker compose -f compose.yml exec backup pg_restore -d "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/prueba_restauracion" /backups/<volcado>.dump
docker compose -f compose.yml exec db psql -U "$POSTGRES_USER" -d prueba_restauracion -c 'select count(*) from consultation_requests;'
docker compose -f compose.yml exec db dropdb -U "$POSTGRES_USER" prueba_restauracion
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
