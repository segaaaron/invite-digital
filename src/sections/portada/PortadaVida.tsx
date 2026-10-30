'use client'

import { useEffect, useRef } from 'react'
import { consultaDelSobre } from '@/modules/leads'
import type { Locale } from '@/shared/i18n/locales'
import type { DisenoDePortada } from './Portada'

type Palabras = { readonly cat: string; readonly cat2: string; readonly tel: string; readonly tel2: string }

type Props = {
  readonly disenos: readonly DisenoDePortada[]
  readonly tiras: { readonly boda: readonly string[]; readonly xv: readonly string[] }
  readonly palabras: { readonly boda: Palabras; readonly xv: Palabras }
  readonly reserva: {
    readonly whatsapp: string
    readonly mensaje: string
    readonly planes: readonly { readonly nombre: string; readonly precio: number }[]
    readonly locale: Locale
  }
  /**
   * La Server Action que guarda la consulta del sobre. Llega como prop desde la página: las
   * secciones no importan acciones (lo corta `boundaries/dependencies`), y una acción sí viaja
   * del servidor a un componente de cliente.
   */
  readonly registrarConsulta: (
    previo: { readonly status: 'idle'; readonly message: '' },
    datos: FormData,
  ) => Promise<{ readonly status: 'idle' | 'success' | 'error'; readonly message: string }>
}

/**
 * Lo que el navegador no puede registrar solo. La acción del sobre se dispara sin esperarla —la
 * ventana de WhatsApp tiene que abrirse dentro del clic—, así que un rechazo o una caída se
 * perderían: esto los manda al mismo registro que lee el admin en Ajustes › Registro de fallos,
 * por la ruta pública que ya existe para los fallos del navegador.
 */
function avisarAlRegistro(mensaje: string): void {
  void fetch('/api/fallos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mensaje, ruta: window.location.pathname }),
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * **El movimiento de la portada.** No pinta nada: todo lo que se ve ya llegó del servidor.
 * Esto le da vida —el abanico que se abre, el anillo que gira, los iconos que se dibujan, las
 * postales que se apilan, el sobre de la reserva— y se retira limpiamente al salir.
 *
 * Nada de esto pide datos ni recarga la página: **ningún temporizador llama a la API**. Son
 * transformaciones y escuchas de scroll, y todo respeta `prefers-reduced-motion`.
 *
 * `gsap` y `lenis` se cargan dentro del efecto, no arriba: así no viajan en el JavaScript del
 * servidor ni bloquean la primera pintura.
 */
export function PortadaVida({ disenos, tiras, palabras, reserva, registrarConsulta }: Props) {
  // La acción llega del servidor en cada payload: en las dependencias del efecto, una referencia
  // nueva desmontaría y reconstruiría toda la portada. Aquí dentro se lee siempre la última.
  const registrarConsultaRef = useRef(registrarConsulta)
  useEffect(() => {
    registrarConsultaRef.current = registrarConsulta
  }, [registrarConsulta])
  useEffect(() => {
    let vivo = true
    const limpiar: (() => void)[] = []

    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')])
      if (!vivo) return
      gsap.registerPlugin(ScrollTrigger)

      // Los ScrollTrigger que crea esta portada, para retirarlos sin tocar los de nadie más.
      const anteriores = new Set(ScrollTrigger.getAll())
      const propios = () => ScrollTrigger.getAll().filter((t) => !anteriores.has(t))
      const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
      const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)
      const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)]
      const escuchar = (n: EventTarget, tipo: string, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions) => {
        n.addEventListener(tipo, fn, opts)
        limpiar.push(() => n.removeEventListener(tipo, fn, opts))
      }
      const ENTRA = 'sine.out'

      /* ---------- el telón de entrada ---------- */
      const pre = $('#pre')
      if (!RM && pre !== null) {
        const tl = gsap.timeline({ delay: 0.15 })
        tl.fromTo('#pre .s', { scale: 2.6, autoAlpha: 0, rotate: -25 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.45, ease: 'power4.in' })
          .to('#pre', { x: 4, yoyo: true, repeat: 5, duration: 0.04 })
          .fromTo('#pre .cap', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45 }, '<')
          .set('#pre', { x: 0 })
          .to('#pre .s, #pre .cap', { autoAlpha: 0, scale: 0.92, duration: 0.32 }, '+=.42')
          .to('#pre .half.l', { xPercent: -100, duration: 0.95, ease: 'expo.inOut' }, '-=.08')
          .to('#pre .half.r', { xPercent: 100, duration: 0.95, ease: 'expo.inOut', onComplete: () => (pre.style.display = 'none') }, '<')
          .fromTo('#estreno h2 .l > span', { yPercent: 115 }, { yPercent: 0, duration: 1.15, stagger: 0.1, ease: 'power3.out' }, '<.3')
          .fromTo('#estreno .eyebrow', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, '<')
          .fromTo('#estreno .lead', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, '<.5')
      } else if (pre !== null) {
        pre.style.display = 'none'
      }

      /* ---------- scroll suave ---------- */
      let lenis: InstanceType<typeof Lenis> | null = null
      if (!RM) {
        lenis = new Lenis({ lerp: 0.085, smoothWheel: true })
        const suave = lenis
        suave.on('scroll', ScrollTrigger.update)
        const tic = (t: number) => suave.raf(t * 1000)
        gsap.ticker.add(tic)
        gsap.ticker.lagSmoothing(0)
        limpiar.push(() => {
          gsap.ticker.remove(tic)
          suave.destroy()
        })
      }
      $$<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
        const destino = a.getAttribute('href')
        if (destino === null || !destino.includes('#')) return
        const ancla = destino.slice(destino.indexOf('#'))
        if (ancla.length < 2 || $(ancla) === null) return
        escuchar(a, 'click', (e) => {
          const t = $(ancla)
          if (t === null) return
          e.preventDefault()
          $('#movilmenu')?.classList.remove('open')
          if (lenis) lenis.scrollTo(t, { duration: 1.5 })
          else t.scrollIntoView({ behavior: 'smooth' })
        })
      })

      /* la cinta en marcha */
      if (!RM) gsap.to('#ribbon', { xPercent: -50, duration: 34, ease: 'none', repeat: -1 })

      /* ---------- el abanico del estreno ---------- */
      const abanico = $('#abanico')
      const tcards = abanico === null ? [] : $$('.tcard', abanico)
      const anchoP = () => tcards[4]?.offsetWidth ?? 160
      /** La `posicion` de la maqueta, sin tope de giro: al abrirse, las cartas de los extremos
       *  pasan de 90° y enseñan su dorso, como allí. */
      const posicion = (i: number, apertura = 1) => {
        const o = i - 4
        const w = anchoP()
        return {
          x: o * w * 0.62 * apertura,
          y: Math.abs(o) * w * 0.06,
          z: -Math.abs(o) * w * 0.55,
          rotationY: -o * 11 * apertura,
          rotationZ: o * 2.2,
          zIndex: 10 - Math.abs(o),
        }
      }
      const colocarAbanico = () => tcards.forEach((c, i) => gsap.set(c, posicion(i)))
      colocarAbanico()
      if (!RM && tcards.length > 0) {
        tcards.forEach((c, i) => {
          const foto = c.firstElementChild
          if (foto !== null) gsap.to(foto, { y: (i % 2 ? -1 : 1) * 12, duration: 2.6 + (i % 3) * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        })
        gsap.to(
          { a: 1 },
          {
            a: 2.4,
            ease: 'none',
            onUpdate() {
              const v = (this.targets() as { a: number }[])[0]?.a ?? 1
              tcards.forEach((c, i) => gsap.set(c, posicion(i, v)))
            },
            scrollTrigger: { trigger: '#estreno', start: 'center center', end: 'bottom top', scrub: 0.8 },
          },
        )
      }

      /* ---------- el anillo de diseños ---------- */
      const carousel = $('#carousel')
      const ring = $('#ring')
      const meta = $('#cfmeta')
      type Carta = { el: HTMLElement; clave: string; nombre: string; fiesta: string }
      const todas: Carta[] = carousel === null ? [] : $$<HTMLElement>('.rcard', carousel).map((el) => ({ el, clave: el.dataset.clave ?? '', nombre: el.dataset.nombre ?? '', fiesta: el.dataset.fiesta ?? 'boda' }))
      let items: Carta[] = []
      let paso = 18
      let R = 600
      let giro = 0
      let vel = 0
      let arrastrando = false
      let movido = false
      let ultimoToque = 0
      let frente = -1
      let tween: gsap.core.Tween | null = null
      let filtro = 'todos'
      const norm = (a: number) => (((a % 360) + 540) % 360) - 180

      function pintarAnillo() {
        if (carousel === null) return
        carousel.style.transform = `translateZ(${String(-R)}px) rotateX(-7deg) rotateY(${String(giro)}deg)`
        let mejor = 999
        let bi = 0
        items.forEach((it, i) => {
          const d = Math.abs(norm(i * paso + giro))
          if (d < mejor) {
            mejor = d
            bi = i
          }
          it.el.style.setProperty('--velo', Math.min(0.72, (d / 180) * 1.1).toFixed(3))
        })
        const delante = items[bi]
        if (bi !== frente && delante !== undefined) {
          items[frente]?.el.classList.remove('front')
          frente = bi
          delante.el.classList.add('front')
          const titulo = meta === null ? null : $('h3', meta)
          if (titulo !== null) titulo.textContent = delante.nombre
        }
      }

      /**
       * **Es `construirAnillo` de la maqueta, sin cambiarle nada.** Allí el carrusel se vacía y se
       * vuelve a llenar con los modelos del filtro; aquí las veinte portadas ya vienen pintadas del
       * servidor —hacen falta para Google—, así que en vez de crearlas se esconden las que no son
       * del filtro. El resto es idéntico: el paso, el radio, el giro a cero y la entrada escalonada.
       */
      function construirAnillo() {
        if (carousel === null) return
        items = todas.filter((c) => filtro === 'todos' || c.fiesta === filtro)
        todas.forEach((c) => {
          c.el.hidden = !items.includes(c)
          // Lo único que la maqueta no necesita: allí las cartas se crean de cero en cada filtro y
          // aquí son las mismas, así que la marca de «la de delante» hay que quitarla a mano.
          c.el.classList.remove('front')
        })
        if (items.length === 0) return
        paso = 360 / items.length
        const ancho = items[0]?.el.offsetWidth ?? 160
        R = Math.round((ancho * 1.2) / (2 * Math.tan(Math.PI / items.length)))
        // La posición es la cadena de la maqueta —`rotateY` y después `translateZ`, en ese orden:
        // gsap compone al revés y apilaría todas las cartas en el centro—. Lo que sí hace falta es
        // **borrarle a gsap lo que recuerda** de la vuelta anterior: allí las cartas se crean de
        // cero en cada filtro y aquí son siempre las mismas, así que su último giro sobrevivía y
        // pisaba al nuevo en la siguiente animación.
        items.forEach((it, i) => {
          gsap.set(it.el, { clearProps: 'all' })
          it.el.style.transform = `rotateY(${String(i * paso)}deg) translateZ(${String(R)}px)`
        })
        giro = 0
        frente = -1
        pintarAnillo()
        if (!RM) gsap.from(items.map((i) => i.el), { opacity: 0, y: 40, duration: 0.9, stagger: 0.025, ease: 'power3.out' })
      }

      function irA(i: number) {
        if (items.length === 0) return
        const destino = giro + norm(-i * paso - giro)
        vel = 0
        ultimoToque = performance.now()
        tween?.kill()
        tween = gsap.to(
          { v: giro },
          {
            v: destino,
            duration: RM ? 0 : 1.1,
            ease: 'power3.out',
            onUpdate() {
              giro = (this.targets() as { v: number }[])[0]?.v ?? giro
              pintarAnillo()
            },
          },
        )
      }

      /* ---------- la capa donde se abre el modelo ---------- */
      /**
       * La invitación se abre **encima de la portada**, no en otra página: el anillo se queda
       * detrás, girando donde estaba, y cerrar no recarga nada.
       *
       * El velo, el foco y la tecla Esc los pone `<dialog>`. Lo único a mano es la entrada del
       * historial, para que la flecha de atrás del navegador cierre la capa en vez de sacar de
       * la portada. Si falla algo —sin `<dialog>`, sin JavaScript—, las cartas siguen siendo
       * enlaces a su página y el modelo se abre como siempre.
       */
      const capa = $<HTMLDialogElement>('#vermodelo')
      const marco = $<HTMLIFrameElement>('.vm-marco')
      const cerrarLaCapa = () => {
        if (capa?.open === true) capa.close()
      }
      if (capa !== null && marco !== null) {
        escuchar(capa, 'close', () => {
          marco.removeAttribute('src')
          document.documentElement.classList.remove('vm-abierta')
          // La entrada que puso al abrirse se la lleva al cerrarse: el historial queda como estaba.
          if ((history.state as { vermodelo?: boolean } | null)?.vermodelo === true) history.back()
        })
        escuchar(window, 'popstate', cerrarLaCapa)
        const cruz = $('.vm-x', capa)
        if (cruz !== null) escuchar(cruz, 'click', cerrarLaCapa)
      }
      /** Abre el modelo en la capa. Devuelve `false` si no se pudo: entonces manda el enlace. */
      const abrirElModelo = (href: string) => {
        if (capa === null || marco === null || typeof capa.showModal !== 'function') return false
        const url = new URL(href, window.location.href)
        // La página del modelo se pinta sin su propia cruz: la de cerrar es la de la capa.
        url.searchParams.set('incrustado', '1')
        marco.src = `${url.pathname}${url.search}`
        // **Esc dentro del marco**: la tecla se la queda el documento de dentro, que no sabe nada
        // de la capa. Es nuestro y del mismo origen, así que se le escucha a él también.
        escuchar(
          marco,
          'load',
          () => {
            const dentro = marco.contentDocument
            if (dentro === null) return
            escuchar(dentro, 'keydown', (teclazo) => {
              if ((teclazo as KeyboardEvent).key === 'Escape') cerrarLaCapa()
            })
          },
          { once: true },
        )
        document.documentElement.classList.add('vm-abierta')
        capa.showModal()
        // La cruz se lleva el foco: quien entra con el teclado sale con una tecla.
        $<HTMLElement>('.vm-x', capa)?.focus()
        history.pushState({ vermodelo: true }, '')
        return true
      }

      /**
       * Cada carta es un enlace a su modelo: tocarla **abre esa invitación** en la capa. El enlace
       * es de verdad —se abre en otra pestaña, Google lo sigue y funciona sin JavaScript—, pero
       * aquí hay que echarle una mano por dos cosas:
       *
       * - **La captura del puntero** (la que deja seguir arrastrando fuera del anillo) hace que el
       *   clic se lo quede `#ring` y no llegue nunca a la carta. Por eso se busca la carta que hay
       *   bajo el cursor.
       * - **Un arrastre no es un clic**: soltar el giro encima de una carta sacaba de la portada.
       */
      if (ring !== null) {
        escuchar(ring, 'click', (ev) => {
          const e = ev as MouseEvent
          if (movido) {
            e.preventDefault()
            return
          }
          // Abrir en otra pestaña, con otro botón o con teclas de por medio: que mande el navegador.
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          const bajoElCursor = document.elementFromPoint(e.clientX, e.clientY)
          if (bajoElCursor === null) return
          // Las flechas se quedan sin su clic por lo mismo: se las gira desde aquí. Si el clic sí
          // llegó a la flecha (sin captura, o con el teclado), manda su propio oyente y no se toca.
          const flecha = bajoElCursor.closest<HTMLElement>('.cfnav')
          if (flecha !== null) {
            if (!flecha.contains(e.target as Node)) irA(flecha.classList.contains('prev') ? (frente - 1 + items.length) % items.length : (frente + 1) % items.length)
            return
          }
          const carta = bajoElCursor.closest<HTMLAnchorElement>('a.rcard')
          if (carta === null) return
          if (abrirElModelo(carta.href)) e.preventDefault()
        })
      }


      if (ring !== null) {
        let sx = 0
        let lx = 0
        escuchar(ring, 'pointerdown', (ev) => {
          const e = ev as PointerEvent
          arrastrando = true
          movido = false
          sx = lx = e.clientX
          tween?.kill()
          vel = 0
          ring.setPointerCapture?.(e.pointerId)
        })
        escuchar(ring, 'pointermove', (ev) => {
          if (!arrastrando) return
          const e = ev as PointerEvent
          const dx = e.clientX - lx
          lx = e.clientX
          if (Math.abs(e.clientX - sx) > 6) movido = true
          giro += dx * 0.22
          vel = dx * 0.22
          ultimoToque = performance.now()
          pintarAnillo()
        })
        const soltar = () => {
          arrastrando = false
          ultimoToque = performance.now()
        }
        escuchar(ring, 'pointerup', soltar)
        escuchar(ring, 'pointercancel', soltar)
      }

      const prev = $('.cfnav.prev')
      const next = $('.cfnav.next')
      if (prev !== null) escuchar(prev, 'click', () => irA((frente - 1 + items.length) % items.length))
      if (next !== null) escuchar(next, 'click', () => irA((frente + 1) % items.length))

      /* ---------- los dos mundos ---------- */
      const invCaja = $('#inv')
      let mundo: 'boda' | 'xv' | 'todos' | null = null
      let tlInv: gsap.core.Timeline | null = null

      const verPuerta = (m: string | null) => $$<HTMLImageElement>('.pfondo img').forEach((f) => f.classList.toggle('on', f.dataset.mundo === (m ?? 'neutro')))

      /**
       * **Hay que esperar a las tiras.** Sin ellas decodificadas, `#inv` no tiene alto, el recorrido
       * sale cero y la invitación se queda quieta para siempre: era lo que pasaba. Se vuelve a armar
       * cuando llegan, y también al cambiar de mundo.
       */
      async function conLasTiras(): Promise<void> {
        if (invCaja === null) return
        await Promise.all($$<HTMLImageElement>('img', invCaja).map((i) => (i.complete ? null : i.decode().catch(() => null))))
        if (!vivo) return
        tlInv?.kill()
        animarInvitacion()
        ScrollTrigger.refresh()
      }

      function animarInvitacion() {
        if (RM || invCaja === null || invCaja.parentElement === null) return
        const recorrido = invCaja.scrollHeight - invCaja.parentElement.clientHeight
        if (recorrido <= 0) return
        const paradas = $$<HTMLElement>('.ivs', invCaja).map((s) => Math.min(recorrido, s.offsetTop))
        const tl = (tlInv = gsap.timeline({ repeat: -1, repeatDelay: 1.8 }))
        paradas.forEach((y, i) => {
          tl.to(invCaja, { y: -y, duration: i === 0 ? 0 : 1.9, ease: 'sine.inOut' }).to({}, { duration: i === 0 ? 2.4 : 2.2 })
        })
        tl.to(invCaja, { y: 0, duration: 1.6, ease: 'sine.inOut' })
        ScrollTrigger.create({ trigger: '#movil', start: 'top 85%', end: 'bottom 15%', onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) })
        tl.pause()
      }

      /**
       * **El mundo lo decide esta función y nadie más**: la piel, el anillo, la invitación del
       * teléfono, el fondo de la puerta y cómo habla la página cambian juntos. «Todos» es un mundo
       * más —el neutro— y por eso pasa por aquí: antes lo resolvía el manejador del chip por su
       * cuenta, devolvía la paleta a neutro y **dejaba la invitación de XV en el teléfono**.
       */
      function elegirMundo(cual: 'boda' | 'xv' | 'todos', mover = true) {
        if (mundo === cual && filtro === cual) return
        mundo = cual
        if (cual === 'todos') delete document.documentElement.dataset.mundo
        else document.documentElement.dataset.mundo = cual

        filtro = cual
        $$('.chip').forEach((o) => o.classList.toggle('on', (o as HTMLElement).dataset.f === cual))
        construirAnillo()

        if (invCaja !== null) {
          // neutro y boda enseñan la misma invitación: la de boda es la de la maqueta
          const fuentes = cual === 'xv' ? tiras.xv : tiras.boda
          invCaja.replaceChildren(
            ...fuentes.map((src) => {
              const img = document.createElement('img')
              img.className = 'ivs'
              img.src = src
              img.alt = ''
              return img
            }),
          )
          gsap.set(invCaja, { y: 0 })
        }

        const w = cual === 'xv' ? palabras.xv : palabras.boda
        $$<HTMLElement>('[data-w]').forEach((n) => {
          const clave = n.dataset.w
          if (clave === 'cat') n.textContent = w.cat
          else if (clave === 'cat2') n.textContent = w.cat2
          else if (clave === 'tel') n.textContent = w.tel
          else if (clave === 'tel2') n.textContent = w.tel2
        })

        verPuerta(cual === 'todos' ? null : cual)
        ScrollTrigger.refresh()
        tlInv?.kill()
        void conLasTiras()
        if (mover && lenis) lenis.scrollTo('#disenos', { duration: 1.5 })
      }

      $$<HTMLElement>('.chip').forEach((ch) => {
        escuchar(ch, 'click', () => {
          const f = ch.dataset.f
          if (f === 'todos' || f === 'xv' || f === 'boda') elegirMundo(f, false)
        })
      })

      let anilloALaVista = false
      if (ring !== null) {
        const mirar = new IntersectionObserver(([en]) => {
          anilloALaVista = en?.isIntersecting ?? false
        })
        mirar.observe(ring)
        limpiar.push(() => mirar.disconnect())
      }
      const girarSolo = () => {
        if (!anilloALaVista || arrastrando || RM || tween?.isActive() === true) return
        if (Math.abs(vel) > 0.02) {
          giro += vel
          vel *= 0.94
          pintarAnillo()
        } else if (performance.now() - ultimoToque > 2500) {
          giro -= 0.06
          pintarAnillo()
        }
      }
      gsap.ticker.add(girarSolo)
      limpiar.push(() => gsap.ticker.remove(girarSolo))
      construirAnillo()

      /* ---------- las doce de la noche ---------- */
      if (!RM) {
        gsap.fromTo('.f12', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.07, ease: ENTRA, scrollTrigger: { trigger: '#noche', start: 'top 72%' } })
        $$('.f12').forEach((caja, i) => {
          const trazos = $$<SVGGeometryElement>('svg path, svg circle, svg rect', caja)
          trazos.forEach((t) => {
            const L = typeof t.getTotalLength === 'function' ? t.getTotalLength() : 0
            if (!L) return
            gsap.set(t, { strokeDasharray: L, strokeDashoffset: L })
          })
          gsap.to(trazos, { strokeDashoffset: 0, duration: 1.2, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: caja, start: 'top 86%' } })
          const icono = $('svg', caja)
          if (icono !== null) gsap.to(icono, { y: -5, duration: 2.8 + (i % 4) * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.12 })
        })
      }

      /* ---------- el teléfono ---------- */
      animarInvitacion()
      void conLasTiras()
      if (!RM) {
        gsap.fromTo('.phone', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: ENTRA, scrollTrigger: { trigger: '#movil', start: 'top 76%' } })
        gsap.fromTo('.bullets li', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, ease: ENTRA, scrollTrigger: { trigger: '.bullets', start: 'top 85%' } })
      }

      /* ---------- las postales se apilan ---------- */
      const cartas = $$('.postal')
      if (cartas.length > 0) {
        if (RM) gsap.set(cartas, { yPercent: 0, rotate: 0 })
        else {
          // Llegan **desordenadas**: cada una con su giro y su desvío, y ninguna se queda recta.
          // Unas casi derechas, otras bien torcidas: es una pila de fotos sobre la mesa, no un fichero.
          const giros = [-15, 10, -6, 14, -5, 12, -8]
          const reposo = [-4.6, 2.4, -0.8, 5.2, -2.9, 1.5, -3.7]
          const desvio = [-2.4, 1.8, -0.9, 2.8, -1.6, 1.1, -2.2]
          gsap.set(cartas, { yPercent: 132, rotate: (i: number) => giros[i] ?? 0, xPercent: (i: number) => desvio[i] ?? 0 })
          gsap.set(cartas[0] as Element, { yPercent: 0, rotate: reposo[0] ?? 0, xPercent: desvio[0] ?? 0 })
          const tl = gsap.timeline({ scrollTrigger: { trigger: '#pila', start: 'top top', end: `+=${String(cartas.length * 58)}%`, pin: true, scrub: 1 } })
          cartas.slice(1).forEach((c, i) => tl.to(c, { yPercent: 0, rotate: reposo[i + 1] ?? 0, xPercent: desvio[i + 1] ?? 0, ease: 'none' }))
        }
      }

      /* ---------- la puerta ---------- */
      verPuerta(null)
      ScrollTrigger.create({
        trigger: '#puerta',
        start: 'top 62%',
        once: true,
        onEnter() {
          const cifras = $$<HTMLElement>('[data-count]')
          if (RM) {
            cifras.forEach((e) => (e.textContent = e.dataset.count ?? ''))
            return
          }
          cifras.forEach((el) => {
            const fin = Number(el.dataset.count)
            gsap.fromTo(
              el,
              { textContent: 0 },
              {
                textContent: fin,
                duration: 1.5,
                ease: 'power2.out',
                snap: { textContent: 1 },
                onUpdate() {
                  el.textContent = Math.round(Number(el.textContent)).toLocaleString(reserva.locale === 'en' ? 'en-US' : 'es-BO')
                },
              },
            )
          })
          gsap.fromTo('.puerta-txt > *, .tarjeta-bien', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: ENTRA })
        },
      })

      /* ---------- el itinerario ---------- */
      if (!RM) {
        const tallo = $<SVGGeometryElement>('#stem')
        if (tallo !== null) {
          const L = tallo.getTotalLength()
          gsap.set(tallo, { strokeDasharray: L, strokeDashoffset: L })
          gsap.to(tallo, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#vine', start: 'top 70%', end: 'bottom 60%', scrub: 1 } })
        }
        $$('.st').forEach((s) => {
          const punto = $('.dot', s)
          const texto = $('.txt', s)
          if (punto !== null) gsap.from(punto, { scale: 0, rotation: -90, duration: 0.8, ease: 'back.out(2.5)', scrollTrigger: { trigger: s, start: 'top 72%' } })
          if (texto !== null) gsap.from(texto, { autoAlpha: 0, x: s.matches(':nth-child(odd)') ? -40 : 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 72%' } })
        })
      }

      /* ---------- los sobres de los planes ---------- */
      if (!RM) {
        const entraSobre = gsap.timeline({ paused: true })
        entraSobre
          .fromTo('.env .back, .env .front', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.85, stagger: { each: 0.12, from: 'start' }, ease: 'sine.out' })
          .fromTo('.env .lettr', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 1.25, stagger: 0.13, ease: 'power3.out' }, '-=.5')
          .fromTo('.env .seal2', { scale: 0.8, autoAlpha: 0, rotate: -8 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.9, stagger: 0.13, ease: 'back.out(1.6)' }, '-=.8')
        ScrollTrigger.create({ trigger: '#planes .envs', start: 'top 80%', once: true, onEnter: () => entraSobre.play() })
      }

      /* ---------- la comparativa, fila por fila ---------- */
      if (!RM) {
        gsap.fromTo('.allinc', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, ease: ENTRA, scrollTrigger: { trigger: '#comparativa', start: 'top 78%' } })
        gsap.fromTo('.tablewrap', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, ease: ENTRA, scrollTrigger: { trigger: '.tablewrap', start: 'top 86%' } })
        gsap.fromTo('thead th', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09, ease: 'power2.out', scrollTrigger: { trigger: '.tablewrap', start: 'top 82%' } })
        gsap.fromTo('.tablewrap', { '--hi': 0 }, { '--hi': 1, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: '.tablewrap', start: 'top 80%' } })
        gsap.fromTo('#tbody tr', { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.045, ease: 'power2.out', scrollTrigger: { trigger: '.tablewrap', start: 'top 76%' } })
      }

      /* ---------- las notas ---------- */
      $$('.q').forEach((el) => {
        const btn = $<HTMLButtonElement>('button', el)
        const ans = $('.ans', el)
        if (btn === null || ans === null) return
        escuchar(btn, 'click', () => {
          const abierta = el.classList.contains('open')
          $$('.q.open').forEach((o) => {
            o.classList.remove('open')
            $('button', o)?.setAttribute('aria-expanded', 'false')
            const otra = $('.ans', o)
            if (otra !== null) gsap.to(otra, { height: 0, duration: 0.4, ease: 'power2.inOut' })
          })
          if (!abierta) {
            el.classList.add('open')
            btn.setAttribute('aria-expanded', 'true')
            gsap.to(ans, { height: 'auto', duration: 0.45, ease: 'power2.inOut', onComplete: () => ScrollTrigger.refresh() })
          }
        })
      })

      /* ---------- el sobre de la reserva ---------- */
      const caja = $('#reserva')
      const form = $<HTMLFormElement>('#formReserva')
      let cerrarSobre = () => undefined as void
      if (caja !== null) {
        const abrir = () => {
          caja.hidden = false
          document.body.style.overflow = 'hidden'
          lenis?.stop()
          if (!RM) {
            gsap.fromTo('.sobre-form', { autoAlpha: 0, y: 26, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' })
            gsap.fromTo('.lacre-form', { scale: 0.7, autoAlpha: 0, rotate: -10 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.7, delay: 0.2, ease: 'back.out(1.8)' })
          }
          const foco = setTimeout(() => $<HTMLInputElement>('input[name="nombres"]', form ?? document)?.focus(), 420)
          limpiar.push(() => clearTimeout(foco))
        }
        const cerrar = () => {
          caja.hidden = true
          document.body.style.overflow = ''
          lenis?.start()
        }
        cerrarSobre = cerrar
        $$('#abrirReserva, [data-reserva]').forEach((b) => escuchar(b, 'click', abrir))
        $$('[data-cerrar]').forEach((b) => escuchar(b, 'click', cerrar))
        escuchar(window, 'keydown', (ev) => {
          if ((ev as KeyboardEvent).key === 'Escape' && !caja.hidden) cerrar()
        })
      }

      if (form !== null) {
        escuchar(form, 'submit', (e) => {
          // **Siempre** se corta el envío nativo. Sin número configurado, un `<form>` sin acción
          // hace un GET a la misma página con los nombres y el teléfono en la dirección: datos del
          // cliente en el historial y en los registros del proxy, y nadie los recibe.
          e.preventDefault()
          const sinNumero = reserva.whatsapp === ''
          const d = new FormData(form)
          const cruda = String(d.get('fecha') ?? '')
          const idioma = reserva.locale === 'en' ? 'en-US' : 'es-BO'
          const cuando = cruda === '' ? '' : new Date(`${cruda}T12:00:00`).toLocaleDateString(idioma, { day: 'numeric', month: 'long', year: 'numeric' })
          const texto = reserva.mensaje
            .replace('{nombres}', String(d.get('nombres') ?? ''))
            .replace('{fiesta}', String(d.get('fiesta') ?? '').toLowerCase())
            .replace('{fecha}', cuando)
            .replace('{plan}', String(d.get('plan') ?? ''))
            .replace('{telefono}', String(d.get('tel') ?? ''))
          // **La consulta se guarda siempre, y antes de abrir el chat.** El sobre solo abría
          // WhatsApp, así que desde la portada nueva ninguna consulta llegaba al panel y Ventas,
          // su contador y el embudo medían una fuente vacía. Va **delante** de la comprobación
          // del número: sin WhatsApp configurado es cuando más falta hace tener sus datos, porque
          // el cliente no tiene por dónde escribir.
          //
          // No se espera la respuesta: abrir la ventana tiene que seguir dentro del clic —si no,
          // el navegador la bloquea— y lo que el cliente vino a hacer es escribir. Lo que sí se
          // mira es **cómo acabó**: si se rechaza o no llega, va al registro de fallos por su
          // propia ruta pública, porque desde aquí no hay servidor que lo anote.
          const consulta = new FormData()
          // El mensaje de WhatsApp ya trae la fiesta, la fecha y el plan escritos: se guarda igual
          // que se manda, para que en Ventas se lea lo mismo que el cliente envió.
          const campos = consultaDelSobre({
            nombres: String(d.get('nombres') ?? ''),
            tel: String(d.get('tel') ?? ''),
            fecha: cruda,
            mensaje: texto,
            locale: reserva.locale,
          })
          Object.entries(campos).forEach(([clave, valor]) => consulta.set(clave, valor))
          void registrarConsultaRef
            .current({ status: 'idle', message: '' }, consulta)
            .then((fin) => {
              if (fin.status === 'error') avisarAlRegistro(`la consulta del sobre se rechazó: ${fin.message}`)
            })
            .catch((causa: unknown) => avisarAlRegistro(`la consulta del sobre no llegó: ${String(causa)}`))

          const aviso = $('.nota.aviso', form)
          if (sinNumero) {
            aviso?.removeAttribute('hidden')
            return
          }
          // Sin `noopener`: con él, `window.open` devuelve `null` **aunque la ventana se abra**
          // (así está escrito en la especificación), y entonces el aviso de «no pudimos abrir
          // WhatsApp» salía siempre, el sobre no se cerraba y el cliente volvía a enviar. El
          // aislamiento se consigue igual cortando el `opener` a mano.
          const ventana = window.open(`https://wa.me/${reserva.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank')
          // Si el navegador bloquea la ventana, el sobre se queda abierto y el aviso lo dice: antes
          // no pasaba nada y el cliente creía haber escrito.
          if (ventana === null) {
            aviso?.removeAttribute('hidden')
            return
          }
          ventana.opener = null
          aviso?.setAttribute('hidden', '')
          cerrarSobre()
          form.reset()
        })
      }

      /* ---------- el cierre ---------- */
      if (!RM) {
        gsap.fromTo('#cierre h2, #cierre .lead, #cierre .placa', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: ENTRA, scrollTrigger: { trigger: '#cierre', start: 'top 72%' } })
      }

      // Recolocar, nunca reiniciar: en iOS la barra de direcciones dispara `resize` al rodar, y
      // reconstruir el anillo lo mandaba a la primera carta en mitad del scroll.
      escuchar(window, 'resize', () => {
        colocarAbanico()
        if (items.length === 0) return
        const ancho = items[0]?.el.offsetWidth ?? 160
        R = Math.round((ancho * 1.2) / (2 * Math.tan(Math.PI / items.length)))
        items.forEach((it, i) => {
          it.el.style.transform = `rotateY(${String(i * paso)}deg) translateZ(${String(R)}px)`
        })
        pintarAnillo()
      })

      limpiar.push(() => {
        // Solo lo de esta portada: matar todos los ScrollTrigger se llevaría por delante los de
        // cualquier otro componente de la página.
        propios().forEach((t) => t.kill())
        document.body.style.overflow = ''
      })
    })()

    return () => {
      vivo = false
      limpiar.forEach((f) => f())
    }
  }, [disenos, tiras, palabras, reserva])

  return null
}
