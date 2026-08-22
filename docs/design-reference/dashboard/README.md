# Maqueta del panel — referencia visual del ciclo 4

**Esto no es la aplicación.** Es una maqueta estática con datos falsos guardados en
`localStorage` del navegador. Nada de lo que se escriba aquí llega a la base ni a ningún
servidor: al cerrar la pestaña puede desaparecer sin un solo error a la vista.

Se conserva porque es el diseño de referencia con el que se construyó el ciclo 4. Se abre
con doble clic sobre `Dashboard.html`.

## Por qué se movió aquí

Vivía en `public/`, así que Next la servía **sin sesión**: cualquiera con la dirección
`/dashboard/Dashboard.html` entraba, porque el proxy deja pasar toda ruta con extensión.
Y se parece a un panel que funciona. Si alguien abriera su vista de check-in el día de una
boda en vez de la de verdad, registraría invitados toda la recepción y al cerrar el
navegador no quedaría nada. A simple vista las dos pantallas solo se distinguen por la URL.

En `docs/` se sigue consultando igual y ya no la sirve nadie.

## Dónde vive cada vista de verdad

| En la maqueta | En el panel |
|---|---|
| Mesas y plano del salón | `/panel/eventos/[slug]/mesas` |
| Mesa de regalos y fondos | `/panel/eventos/[slug]/regalos` |
| Libro de firmas | `/panel/eventos/[slug]/mensajes` |
| Plan del evento y sus límites | `/panel/eventos/[slug]/plan` |
| Check-in de la puerta | `/panel/eventos/[slug]/puerta` |
| Invitados y enlace del cliente | `/panel/eventos/[slug]` |
