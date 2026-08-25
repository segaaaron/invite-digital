# Plan B — pedidos, comprobantes y administración

Fecha: 25 de agosto de 2026 · Estado: aprobado, en construcción

Desarrolla la sección 9 del spec del ciclo 1 con lo que se sabe hoy y no se sabía
entonces.

## Qué cambia respecto de la sección 9

- **No hay correo.** La sección 9 decía «el cliente recibe email» en dos pasos. No existe
  proveedor, ni dominio verificado, ni remitente. El cliente sigue su pedido por su
  **referencia pública**, que es una dirección que puede guardar; el atelier avisa por
  WhatsApp, que es el canal que este negocio usa de verdad.
- **No hay Auth.js.** El proyecto tiene su propia identidad desde el ciclo 1 —argon2id,
  cookie `httpOnly`, tokens de los que solo se guarda el SHA-256—. El «panel de
  administración» es una sección más del panel que ya existe, tras `requireSession()`.
- **Sin cobro en línea.** Transferencia y QR, como el resto del producto.

## El flujo

1. El cliente elige plan en la web pública y abre `/es/pedido/<plan>`.
2. Rellena nombre, contacto, fecha del evento y notas. Se crea el pedido en
   `pending_payment` con una **referencia pública** corta.
3. Se le enseñan los datos de transferencia y el QR, y su dirección de seguimiento:
   `/es/pedido/ref/<referencia>`. Se le dice, ahí mismo, que la guarde.
4. Sube el comprobante desde esa dirección. El pedido pasa a `proof_submitted`.
5. El atelier lo ve en `/panel/pedidos`, abre el comprobante y aprueba o rechaza con nota.
6. El cliente ve la decisión en su misma dirección de seguimiento.

## La referencia pública

Ocho caracteres de un alfabeto **sin `0`, `O`, `1`, `I` ni `L`**: se dicta por teléfono y
se copia a mano de una pantalla de celular. Aleatoria criptográficamente, no correlativa:
un `PED-000042` dice cuántos pedidos lleva el atelier y deja adivinar el del vecino.

Es un secreto de baja intensidad —quien la tenga ve el estado de ese pedido y puede subir
un comprobante—, así que la página de seguimiento **no enseña datos de contacto**: ni
teléfono ni correo del cliente, solo el plan, la fecha y el estado.

Una referencia desconocida responde **404, nunca 403**, como los tokens de invitado.

## La subida, tratada como entrada hostil

- **8 MB** como tope, y solo `image/jpeg`, `image/png`, `image/webp` y `application/pdf`.
- El tipo se decide por **magic bytes**, no por la extensión ni por el `Content-Type` que
  manda el cliente: las dos las escribe quien sube el fichero.
- El nombre de almacenamiento es un UUID. El nombre original se guarda **solo como texto
  que se muestra**, y nunca se usa para construir una ruta.
- Los ficheros viven **fuera de `public/`**, en `ORDERS_DIR`. Servirlos desde `public/`
  los publicaría en internet: el comprobante de una transferencia lleva nombre, banco y
  número de cuenta de una persona.
- Se sirven por un route handler que exige sesión del atelier, con
  `Content-Disposition: attachment` y `Content-Security-Policy: sandbox`. Un PDF servido
  en línea desde el mismo origen que el panel puede ejecutar guion.
- Límite de tasa por IP en crear pedido y en subir comprobante.
- El puerto `FileStorage` abstrae el almacenamiento: hoy disco, mañana S3 sin tocar el
  dominio.

## Los estados, y por qué son pocos

```
pending_payment ──subir comprobante──► proof_submitted ──┬─► approved
                                              ▲          └─► rejected
                                              └──subir otro comprobante──┘
```

`rejected` **no es terminal**: se rechaza con una nota —«la transferencia es de otro
importe»— y el cliente sube otro comprobante. Un rechazo terminal obligaría a abrir un
pedido nuevo y a perder el hilo. `approved` sí es terminal.

## Esquema

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  public_ref varchar(16) not null unique,
  plan_id uuid references plans(id) on delete set null,
  customer_name varchar(160) not null,
  contact varchar(160) not null,
  event_date date,
  notes text,
  status varchar(24) not null default 'pending_payment',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table order_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  storage_key uuid not null,
  original_name varchar(255) not null,
  mime varchar(64) not null,
  size_bytes integer not null,
  uploaded_at timestamptz not null default now()
);
```

`plan_id` es `set null`: retirar un plan del catálogo no puede llevarse por delante los
pedidos que lo compraron. Los comprobantes son **varios por pedido**, no uno: un rechazo
lleva a otra subida y el histórico de lo que se mandó es parte de la conversación.

## Datos del usuario que faltan

`BRAND.payment` nace con marcadores —banco, titular, cuenta y QR— y `pnpm preflight`
**corta** mientras sigan puestos. Un pedido que enseña un número de cuenta inventado
cobra a nadie y el cliente se entera cuando ya transfirió.

## Pruebas

- Dominio: el alfabeto de la referencia, las transiciones válidas e inválidas, los magic
  bytes de los cuatro tipos y el rechazo de un fichero que miente sobre su tipo.
- Aplicación: que un comprobante no se guarde si el pedido no existe, que aprobar dos
  veces no valga, que rechazar deje volver a subir.
- Repositorio contra Postgres real: la unicidad de la referencia y el `cascade` de los
  comprobantes.
- e2e: pedido de punta a punta —crear, subir un PNG de verdad, verlo en el panel,
  aprobarlo y verlo aprobado en la página de seguimiento—, y que el comprobante **no** se
  descargue sin sesión.
