#!/usr/bin/env python3
"""
Prepara vosk-browser para la CSP del panel (8 de octubre):

    python3 scripts/vosk-separar-worker.py vosk.js public/vosk/vosk-0.0.8.js public/vosk/vosk-worker-0.0.8.js

vosk-browser trae su worker incrustado en base64 y lo arranca desde un `blob:`, y su motor (emscripten) usa
`new Function`. Con la CSP del panel (sin `unsafe-eval`) eso no corre. Aquí el worker sale a su propio archivo,
servido con **su propia CSP** (`next.config.ts`, `/vosk/vosk-worker-*`): el permiso de `eval` queda encerrado en
el worker del dictado y la página no lo necesita.
"""
import base64
import re
import sys

origen, destino, destino_worker = sys.argv[1:4]
nombre_worker = '/vosk/' + destino_worker.rsplit('/', 1)[-1]
codigo = open(origen, encoding='utf-8').read()

m = re.search(r"var WorkerFactory = createBase64WorkerFactory\('([A-Za-z0-9+/=]+)'(?:, [^)]*)?\);", codigo)
if m is None:
    sys.exit('No encontré el worker incrustado: ¿cambió la versión de vosk-browser?')
fuente = base64.b64decode(m.group(1)).decode('utf-8')
# Igual que createURL: se salta la primera línea (el comentario del cargador).
cuerpo = fuente[fuente.index('\n', 10) + 1 :]
open(destino_worker, 'w', encoding='utf-8').write(cuerpo)

parcheado = codigo[: m.start()] + f"var WorkerFactory = function (options) {{ return new Worker('{nombre_worker}', options); }};" + codigo[m.end() :]
open(destino, 'w', encoding='utf-8').write(parcheado)
print(f'worker: {destino_worker} ({len(cuerpo) // 1024} KB) · motor: {destino} ({len(parcheado) // 1024} KB)')
