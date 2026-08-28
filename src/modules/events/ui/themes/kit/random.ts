/**
 * El generador con semilla de la maqueta, tal cual.
 *
 * No es un detalle estético: estas piezas colocan decenas de estrellas, pétalos y burbujas
 * en porcentajes calculados. Con `Math.random` el servidor pinta unas posiciones y el
 * navegador otras, React ve dos marcados distintos y descarta el del servidor —o lo canta
 * por consola en cada invitación abierta—. Con semilla, los dos calculan lo mismo.
 *
 * También hace que una captura del catálogo se pueda repetir: la misma semilla da el mismo
 * cielo estrellado, y una portada que cambia sola cada vez que se regenera no sirve de
 * portada.
 *
 * Es el congruente lineal de la maqueta —9301 / 49297 / 233280—, conservado a propósito:
 * cambiarlo por uno mejor movería cada estrella de sitio y estos diseños ya están
 * compuestos alrededor de dónde caen.
 */
export function sembrado(semilla: number): () => number {
  let estado = semilla
  return () => {
    estado = (estado * 9301 + 49297) % 233280
    return estado / 233280
  }
}
