# Runbook de despliegue

Cómo poner InvitePremium en producción y cómo sacarlo de un apuro. Escrito el 20 de
agosto de 2026, después de probar la pila entera —imagen de producción, migrador,
mantenimiento, respaldo y restauración— contra Docker en la máquina de desarrollo.

Lo que aquí se afirma se comprobó ejecutándolo. Lo que no se pudo comprobar en local
lleva su aviso: el certificado TLS real y el comportamiento bajo carga.

## 0. Antes de tocar el servidor

Estos cuatro puntos no son opcionales y ninguno se puede resolver desde el código.

| Qué | Dónde | Estado |
|---|---|---|
| Número real de WhatsApp | `src/shared/config/brand.ts` | falta |
| Correo real del atelier | `src/shared/config/brand.ts` | falta |
| Dominio real, con DNS ya apuntando al servidor | `.env.production` | falta |
| Contraseña de Postgres generada | `.env.production` | falta |

Hay una puerta automática para los cuatro:

```bash
set -a; . ./.env.production; set +a
pnpm preflight
```

Sale con código 1 y enumera lo que queda pendiente. **Si falla, no despliegues.** El
motivo de que exista: un marcador de relleno no rompe nada visible. El sitio compila,
arranca y se ve perfecto, y el botón de precios lleva a un número que no existe.

El DNS tiene que resolver **antes** de levantar Caddy. Caddy pide el certificado al
arrancar, y cada intento contra un dominio que no resuelve consume cuota del límite de
Let's Encrypt. Comprueba primero:

```bash
dig +short tu-dominio.bo    # debe devolver la IP del servidor
```

## 1. Preparar el entorno

En el servidor, dentro del repositorio:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
$EDITOR .env.production          # POSTGRES_PASSWORD, SITE_DOMAIN, SITE_URL
```

`POSTGRES_PASSWORD` se genera, no se inventa: `openssl rand -base64 24`. Y se decide
una sola vez: Postgres solo la lee al inicializar el volumen, así que cambiarla después
obliga a recrear la base.

`.env.production` está en `.gitignore`. Que siga estándolo.

## 2. Migrar

```bash
cd docker
docker compose --profile tools build migrator     # NO te saltes esta línea
docker compose --profile tools run --rm migrator
```

**El `build` es obligatorio.** `run --rm migrator` reutiliza la imagen cacheada sin
avisar: en una sesión anterior aplicó un juego de migraciones viejo y respondió
`migrations applied successfully` mientras dejaba la base incompleta. El fallo apareció
mucho después, en el contenedor de mantenimiento, contra una tabla que no existía.

El migrador corre `db:migrate` y después `db:seed`. El seed es idempotente: deja 7
categorías, 3 planes y 8 plantillas, y repetirlo no duplica nada.

## 3. Levantar

```bash
docker compose up -d --build
docker compose ps        # web debe llegar a (healthy) antes de que Caddy sirva
```

El orden lo impone el propio compose: Caddy espera a que `web` esté sano, para que el
primer minuto tras un despliegue no devuelva 502.

## 4. Crear el usuario del atelier

No hay registro público. Esta es la única puerta:

```bash
docker compose --profile tools run --rm --entrypoint sh migrator \
  -c 'pnpm user:create tu-correo@tu-dominio.bo'
```

Pide la contraseña por entrada estándar, para que no quede en el historial del
intérprete. Mínimo 12 caracteres. Se guarda con Argon2id; el binario nativo está
verificado dentro de la imagen de runtime, no solo en la de compilación.

## 5. Comprobar que sirve de verdad

Sustituye el dominio y ejecútalo entero. Los valores esperados están al lado.

```bash
curl -sI  https://tu-dominio.bo/es              # 200
curl -s   https://tu-dominio.bo/robots.txt      # Sitemap: https://tu-dominio.bo/...
curl -s   https://tu-dominio.bo/sitemap.xml     # URLs con tu dominio, no localhost
curl -so/dev/null -w '%{http_code}\n' https://tu-dominio.bo/i/noexiste     # 404
curl -so/dev/null -w '%{http_code}\n' https://tu-dominio.bo/panel          # 307 a /panel/entrar
```

Mira el `robots.txt` con atención. Se prerrenderizaba al compilar y se quedaba con el
`SITE_URL` de relleno que el Dockerfile pasa como `ARG`, así que la imagen anunciaba un
sitemap en `localhost` cualquiera que fuese el dominio. Está corregido con
`force-dynamic` y hay una prueba e2e que lo vigila, pero es el sitio exacto donde un
descuido futuro volvería a colarse sin hacer ruido.

Después, a mano en el navegador: entra al panel, crea un evento de prueba, crea un grupo
con cupos, abre el enlace del invitado en una ventana privada, confirma, y comprueba que
el contador del panel se mueve. Borra el evento de prueba al terminar.

## 6. Respaldos

El servicio `backup` arranca solo con la pila y hace un volcado diario en formato
`custom`, con dos semanas de retención, sobre el volumen `backups`. Escribe a `.tmp` y
renombra al terminar, para que un volcado a medias nunca parezca válido.

Verificado de punta a punta: volcado, restauración en una base vacía y comparación tabla
por tabla — las 13 con el mismo número de filas que el original.

Un respaldo que nunca se ha restaurado no es un respaldo. Repite esta prueba en el
servidor real, al menos una vez:

```bash
docker compose exec db psql -U "$POSTGRES_USER" -d postgres -c 'create database restore_test;'
docker compose exec backup sh -c \
  'f=$(ls -t /backups/*.dump | head -1); pg_restore --clean --if-exists \
   -d "postgres://'"$POSTGRES_USER"':'"$POSTGRES_PASSWORD"'@db:5432/restore_test" "$f"'
docker compose exec db psql -U "$POSTGRES_USER" -d restore_test -c '\dt'
docker compose exec db psql -U "$POSTGRES_USER" -d postgres -c 'drop database restore_test;'
```

Y saca los volcados del servidor. Un respaldo que vive en la misma máquina que la base
no protege del único caso que importa: perder la máquina.

## 7. Mantenimiento

El servicio `maintenance` corre un pase al día: anonimiza los eventos cuya retención
venció y borra las sesiones caducadas. Un fallo no mata el bucle —registra y reintenta
en 24 horas— porque con `restart: unless-stopped` un error transitorio se convertiría en
un ciclo de reinicios que nadie mira.

Para forzar un pase:

```bash
docker compose --profile tools run --rm --entrypoint sh migrator -c 'pnpm maintenance'
```

## 8. Actualizar una versión

```bash
git pull
docker compose --profile tools build migrator
docker compose --profile tools run --rm migrator
docker compose up -d --build
```

Siempre en ese orden: migrar antes de sustituir la aplicación. Al revés, la versión
nueva arranca contra un esquema viejo.

## 9. Volver atrás

```bash
git checkout <commit-anterior>
docker compose up -d --build
```

Sobre las migraciones, la parte incómoda y honesta: **no hay marcha atrás automática.**
No existen migraciones de reversión. Si una migración rompió algo, la salida es
restaurar el último volcado, y se pierde lo escrito desde entonces. Por eso, antes de
cada despliegue que traiga migraciones:

```bash
docker compose exec backup sh -c 'pg_dump --format=custom --file=/backups/pre-deploy-$(date -u +%Y%m%d-%H%M).dump'
```

## Lo que no está verificado

Dicho sin rodeos, para que nadie lo dé por hecho:

- **El certificado TLS de Caddy.** Necesita un dominio público y no se puede probar en
  local. Es el paso con más probabilidad de fallar el primer día. Si algo va mal:
  `docker compose logs caddy`.
- **Carga y concurrencia.** No hay ninguna medida. No se sabe cuántas confirmaciones
  simultáneas aguanta.
- **HSTS** está en `max-age=86400` a propósito, para poder retroceder. Subirlo a un año
  —y solo entonces considerar `includeSubDomains; preload`— tras semanas estables:
  el preload es un compromiso de meses para deshacerlo.

## Un límite de arquitectura que conviene recordar

Los limitadores de intentos viven **en memoria**: 5 por minuto y por IP, 3 por minuto y
por cuenta. Correcto con una sola instancia web, que es como está montado hoy. El día
que alguien añada una segunda réplica, dejan de proteger —cada una cuenta por su lado— y
hay que moverlos a Postgres. Está anotado en el código.

Efecto secundario visible en desarrollo: correr la suite e2e dos veces en menos de un
minuto contra un servidor de larga vida agota el límite por cuenta y falla el inicio de
sesión. No es un defecto del producto. Reinicia el contenedor `web` o espera un minuto.
