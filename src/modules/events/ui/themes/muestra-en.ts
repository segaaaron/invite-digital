import type { InvitationContent } from '../../domain/invitation-content'

/**
 * **El contenido de muestra en inglés** (14 oct, pedido del usuario: las invitaciones en los dos idiomas). Cada
 * diseño trae su muestra en español (`*.content.ts`, copiada de la maqueta); aquí está cada texto dicho en inglés.
 * Nombres, lugares y canciones no se traducen: no están en la tabla y salen tal cual. Lo vigila
 * `muestra-en.test.ts`: ningún texto de muestra queda en español en `/en/designs/*`.
 */
const EN: Readonly<Record<string, string>> = {
  // Portadas, sellos y rótulos
  'Ricardo Montalvo y Sra.': 'Mr. & Mrs. Ricardo Montalvo',
  '17.39°S · 66.15°O': '17.39°S · 66.15°W',
  'NOS CASAMOS': 'WE’RE GETTING MARRIED',
  'NUESTRA BODA': 'OUR WEDDING',
  'Nuestra Boda': 'Our Wedding',
  'Celebramos nuestra boda': 'We celebrate our wedding',
  'SAVE THE DATE': 'SAVE THE DATE',
  'ELLA DIJO QUE SÍ': 'SHE SAID YES',
  'SE COMPROMETEN': 'ARE GETTING ENGAGED',
  'PARA LA FIESTA DE COMPROMISO': 'FOR THE ENGAGEMENT PARTY',
  'LA PROPUESTA': 'THE PROPOSAL',
  Propuesta: 'Proposal',
  'Dijimos que sí': 'We said yes',
  Dijo: 'Said',
  'el sí': 'the yes',
  sí: 'yes',
  'FELICES PARA SIEMPRE': 'HAPPILY EVER AFTER',
  'Felices para Siempre': 'Happily Ever After',
  '· BODAS DE ORO ·': '· GOLDEN ANNIVERSARY ·',
  '· MIS QUINCE ·': '· MY QUINCEAÑERA ·',
  '· NOS CASAMOS · 12.12.2026 ·': '· WE’RE GETTING MARRIED · 12.12.2026 ·',
  '· NOS CASAMOS · 20.09.2026 ·': '· WE’RE GETTING MARRIED · 20.09.2026 ·',
  '· UNIÓN CIVIL · ACTA 2026 ·': '· CIVIL UNION · RECORD 2026 ·',
  'FIRMAN EL ACTA · 18.05.2026': 'SIGN THE RECORD · 18.05.2026',
  'DESTINATION · TULUM': 'DESTINATION · TULUM',
  'TULUM · MÉXICO': 'TULUM · MEXICO',
  'PAREJA · BEACH': 'COUPLE · BEACH',
  'FIESTA DE DISFRACES': 'COSTUME PARTY',
  'GALA ELEGANTE': 'ELEGANT GALA',
  'Gala elegante': 'Elegant gala',
  'Gala bohemia': 'Bohemian gala',
  'Solo chicas': 'Girls only',
  INVITADAS: 'GUESTS',
  Quinceañera: 'Quinceañera',
  XV: 'XV',
  '¡NOS VEMOS!': 'SEE YOU THERE!',
  'Te esperamos': 'We look forward to seeing you',
  'Te esperamos.': 'We look forward to seeing you.',
  'Será un honor tenerte con nosotros': 'It will be an honour to have you with us',
  'HONRAMOS A': 'WE HONOUR',
  'TESTIGOS DE LEY': 'LEGAL WITNESSES',
  FIRMA: 'SIGNATURE',
  'medio siglo, juntos': 'half a century, together',
  'primer beso': 'first kiss',
  '1ª cita': '1st date',
  Nosotros: 'Us',
  'Nos conocimos': 'We met',
  'Nuestro primer viaje juntos': 'Our first trip together',
  'Nuestra historia (2019 — 2026)': 'Our story (2019 — 2026)',
  'Nuestra canción': 'Our song',
  'FOTO ORIGINAL · 1976': 'ORIGINAL PHOTO · 1976',
  Retrato: 'Portrait',
  'MOMENTO ESPECIAL': 'SPECIAL MOMENT',
  ANILLOS: 'RINGS',
  FLORES: 'FLOWERS',
  PASTEL: 'CAKE',
  'Tres amigas disfrazadas': 'Three friends in costume',
  'LA VIBRA DE LA NOCHE': 'THE VIBE OF THE NIGHT',
  'Una noche sin niños': 'A night without kids',
  Hoy: 'Today',
  'Con la bendición de Dios y de nuestros padres': 'With the blessing of God and our parents',
  'AGRADECIDA POR EL AMOR Y CUIDADO DE MIS PADRES': 'GRATEFUL FOR THE LOVE AND CARE OF MY PARENTS',
  'Agradecida por el amor de mis padres': 'Grateful for the love of my parents',
  'Agradecida por el amor y cuidado de mis padres': 'Grateful for the love and care of my parents',
  'Doña Carmen': 'Mrs. Carmen',
  'Don Eduardo': 'Mr. Eduardo',
  'Doña Carmen & Don Eduardo': 'Mrs. Carmen & Mr. Eduardo',

  // Ceremonia, recepción y momentos
  Ceremonia: 'Ceremony',
  CEREMONIA: 'CEREMONY',
  'Ceremonia Religiosa': 'Religious Ceremony',
  'Ceremonia religiosa': 'Religious ceremony',
  'CEREMONIA RELIGIOSA': 'RELIGIOUS CEREMONY',
  Religiosa: 'Religious',
  'Ceremonia 16:00 · playa': 'Ceremony 16:00 · beach',
  'Registro Civil': 'Civil Ceremony',
  'REGISTRO CIVIL': 'CIVIL CEREMONY',
  Recepción: 'Reception',
  RECEPCIÓN: 'RECEPTION',
  'Recepción Social': 'Reception',
  'RECEPCIÓN SOCIAL': 'RECEPTION',
  'Recepción y coctel': 'Reception and cocktails',
  'Cóctel de bienvenida': 'Welcome cocktail',
  'Welcome cocktail · cenote': 'Welcome cocktail · cenote',
  Celebración: 'Celebration',
  'Acto Central': 'Main Event',
  'Acto Principal': 'Main Event',
  Brindis: 'Toast',
  BRINDIS: 'TOAST',
  'Brindis & DJ': 'Toast & DJ',
  'Brindis entre amigas': 'A toast among friends',
  Cena: 'Dinner',
  CENA: 'DINNER',
  'Cena de gala': 'Gala dinner',
  'Una Deliciosa Cena': 'A Delicious Dinner',
  'UNA DELICIOSA CENA': 'A DELICIOUS DINNER',
  Vals: 'Waltz',
  'Tiempo de Vals': 'Waltz Time',
  'Vals y Brindis': 'Waltz and Toast',
  'Vals de los Novios': 'The Couple’s Waltz',
  'VALS DE LOS NOVIOS': 'THE COUPLE’S WALTZ',
  'Primer baile': 'First dance',
  'Baile Sorpresa': 'Surprise Dance',
  'BAILE SORPRESA': 'SURPRISE DANCE',
  Torta: 'Cake',
  TORTA: 'CAKE',
  'Partimos la Torta': 'Cake Cutting',
  'PARTIMOS LA TORTA': 'CAKE CUTTING',
  'Lanzamiento de bouquet': 'Bouquet toss',
  'HORA LOCA': 'CRAZY HOUR',
  Fiesta: 'Party',
  'Fiesta libre': 'Open party',
  'Comienza la fiesta': 'The party begins',
  'A bailar': 'Let’s dance',
  'Fin de la fiesta': 'End of the party',
  Cierre: 'Closing',
  CIERRE: 'CLOSING',
  Despedida: 'Farewell',
  'Despedida · DJ sunset': 'Farewell · DJ sunset',
  'Brunch · día libre': 'Brunch · free day',
  'La barra': 'The bar',
  'Karaoke & Música': 'Karaoke & Music',
  'Karaoke de la casa': 'House karaoke',
  'Terraza · Centro': 'Terrace · Downtown',
  'Casa Aurora · Roof Garden': 'Casa Aurora · Roof Garden',

  // Vestimenta
  'Código de Vestimenta': 'Dress Code',
  'Código de vestimenta': 'Dress code',
  'CÓDIGO DE VESTIMENTA': 'DRESS CODE',
  'DRESS CODE': 'DRESS CODE',
  Formal: 'Formal',
  'FORMAL — DE GALA': 'FORMAL — BLACK TIE',
  'FORMAL — ELEGANTE': 'FORMAL — ELEGANT',
  'Black Tie': 'Black Tie',
  'Etiqueta rigurosa · No blanco': 'Strict black tie · No white',
  'de etiqueta · paleta neutra · evita blanco': 'black tie · neutral palette · avoid white',
  'Evitar color blanco, por favor': 'Please avoid white',
  'Evitar el color dorado, queda reservado para la quinceañera': 'Avoid gold, it is reserved for the quinceañera',
  'El azul y el dorado quedan reservados para la quinceañera': 'Blue and gold are reserved for the quinceañera',
  'El color morado queda reservado para la quinceañera': 'Purple is reserved for the quinceañera',
  'El dorado queda reservado para la quinceañera': 'Gold is reserved for the quinceañera',
  'El dorado y el morado quedan reservados para la quinceañera': 'Gold and purple are reserved for the quinceañera',
  'El dorado y el negro quedan reservados para la quinceañera': 'Gold and black are reserved for the quinceañera',
  'El dorado y el verde quedan reservados para la quinceañera': 'Gold and green are reserved for the quinceañera',
  'Formal · negro y dorado · sin blanco · sin colores pastel · sin neón.': 'Formal · black and gold · no white · no pastels · no neon.',
  'Formal · paleta fría · sin blanco · sin nude · sin neón.': 'Formal · cool palette · no white · no nude · no neon.',
  'Formal · paleta tierra · tejidos naturales · sin blanco · sin nude · sin neón.': 'Formal · earth palette · natural fabrics · no white · no nude · no neon.',
  'Formal · tonos tierra y dorado · sin blanco': 'Formal · earth tones and gold · no white',
  'Lino · pies descalzos · paleta tierra/arena · evita pesado': 'Linen · bare feet · earth/sand palette · avoid heavy fabrics',
  'Disfraz sexy y elegante': 'Sexy and elegant costume',
  'Ven disfrazada · Ven con ganas · Ven a brillar': 'Come in costume · Come ready · Come to shine',

  // Avisos
  'Nuestro gran día': 'Our big day',
  'Nuestro gran día se aproxima y nos encantaría que formaras parte de él.': 'Our big day is coming and we would love for you to be part of it.',
  'CELEBRACIÓN SOLO PARA ADULTOS': 'ADULTS-ONLY CELEBRATION',
  'Celebración solo para adultos': 'Adults-only celebration',
  'Evento solo para adultos': 'Adults-only event',
  'Los niños son alegría, pero esta noche queremos que ustedes también descansen.': 'Children are a joy, but tonight we want you to rest too.',
  'Sabemos lo especiales que son tus pequeños, y por eso queremos que esta noche la disfrutes sin preocupaciones. La celebración es para invitados a partir de los 12 años.':
    'We know how special your little ones are, so we want you to enjoy this night worry-free. The celebration is for guests aged 12 and over.',
  'Comparte tus fotos': 'Share your photos',
  'Sube aquí las fotos que tomes durante el día. Nos encantará ver la boda desde tus ojos.': 'Upload the photos you take during the day here. We would love to see the wedding through your eyes.',
  'HOSPEDAJE RECOMENDADO': 'RECOMMENDED LODGING',
  'Aeropuerto Cancún (CUN) → traslado disponible. Escríbenos y te pasamos la guía completa de viaje.': 'Cancún Airport (CUN) → transfer available. Write to us and we will send you the full travel guide.',
  'Cupones exclusivos para invitados con el código BODA-TULUM26': 'Exclusive guest discounts with the code BODA-TULUM26',
  'Mesa de regalos': 'Gift registry',
  'Lluvia de Sobres': 'Envelope Gifts',
  'NUESTRO MEJOR REGALO': 'OUR BEST GIFT',
  'Tu presencia es nuestro mejor regalo': 'Your presence is our best gift',
  'Su presencia es nuestro mejor regalo.': 'Your presence is our best gift.',
  'Su presencia es nuestro mejor regalo. Si además desean tener un detalle con nosotros, les dejamos algunas ideas.': 'Your presence is our best gift. If you would also like to give us something, here are a few ideas.',
  'Tu presencia es nuestro mejor regalo.\nSi deseas obsequiar algo, abrimos un fondo para nuestra luna de miel.': 'Your presence is our best gift.\nIf you would like to give something, we opened a honeymoon fund.',
  'Tu presencia es el mejor regalo, pero si deseas tener un detalle conmigo, será muy bien recibido.': 'Your presence is the best gift, but if you would like to give me something, it will be warmly received.',
  'Tu presencia. Si deseas algo más, escanea para fondo de aniversario:': 'Your presence. If you wish to give more, scan for the anniversary fund:',
  'Que estés ahí, celebrando conmigo, ya lo es todo. Si tu cariño quiere expresarse de otra forma, aquí tienes una opción.\n\nEl día del evento habrá un buzón esperando tus sobres.':
    'Having you there, celebrating with me, is everything. If your love wants to show itself another way, here is an option.\n\nOn the day there will be a box waiting for your envelopes.',
  'Y un brindis especial por nuestras cumpleañeras del mes': 'And a special toast to this month’s birthday girls',
  'Brindamos por la diversión y la alegría de compartir juntas': 'We toast to the fun and joy of being together',
  'Lo que pasa entre amigas... se queda entre amigas.': 'What happens among friends... stays among friends.',
  'Ponte tu mejor disfraz, trae tu mejor sonrisa y prepárate para una noche de risas, brindis y glamour.': 'Put on your best costume, bring your best smile and get ready for a night of laughter, toasts and glamour.',
  'Te espero para festejar\nUNA NOCHE SEXY Y SENSUAL\nentre amigas': 'Join me to celebrate\nA SEXY AND SENSUAL NIGHT\namong friends',
  '#EntreAmigas #Reencuentro #Disfraces #Glamour #Brindis #Risas #Tentación': '#AmongFriends #Reunion #Costumes #Glamour #Toasts #Laughter #Temptation',
  'Otro año más y lo celebramos como se debe: con amigos de verdad, cervezas bien frías y el micrófono encendido toda la noche.': 'Another year and we celebrate it properly: with real friends, ice-cold beers and the mic on all night.',
  'Porque los mejores momentos\nse viven entre amigos,\ncervezas y buena música.': 'Because the best moments\nare lived among friends,\nbeers and good music.',
  'Ven preparado: habrá cerveza para el valor y micrófono para la locura.': 'Come ready: there will be beer for courage and a mic for the madness.',
  'Tu cerveza ya tiene nombre. No faltes.': 'Your beer already has your name on it. Don’t miss it.',
  'Antes de la boda, queremos brindar contigo. Acompáñanos a celebrar nuestro sí.': 'Before the wedding, we want to toast with you. Join us to celebrate our yes.',
  'Nos casamos entre los que nos quieren.': 'We marry among those who love us.',
  'Nos vemos con los pies en la arena.': 'See you with our feet in the sand.',
  '50 años, 3 hijos, 7 nietos, 1 amor.\nAcompáñanos a celebrar la vida que han construido.': '50 years, 3 children, 7 grandchildren, 1 love.\nJoin us to celebrate the life they have built.',
  'La vida se mide en buenos momentos.\nEste será uno de ellos.': 'Life is measured in good moments.\nThis will be one of them.',

  // Frases y despedidas
  'Con cariño,': 'With love,',
  'con cariño,': 'with love,',
  '"Un amor que florece cada día."': '"A love that blooms every day."',
  '"y vivieron felices\npara siempre"': '"and they lived\nhappily ever after"',
  '"Te ví y supe\nque era todo\nlo que iba a querer."': '"I saw you and knew\nyou were everything\nI would ever want."',
  '"Hemos esperado este momento con todo el corazón. Queremos compartir nuestra felicidad contigo, porque sin ti, esta historia no estaría completa."':
    '"We have waited for this moment with all our hearts. We want to share our happiness with you, because without you this story would not be complete."',
  '"and they lived\nhappily ever after"\n\n2019 — 2026\n\nNos conocimos un domingo de café. Él pidió un americano, ella un capuccino con dos cucharadas de azúcar. Siete años después, todo lo que queremos es seguir despertando juntos cada domingo.':
    '"and they lived\nhappily ever after"\n\n2019 — 2026\n\nWe met over coffee one Sunday. He ordered an americano, she a cappuccino with two spoons of sugar. Seven years later, all we want is to keep waking up together every Sunday.',
  'Nos conocimos un domingo de café. Él pidió un americano, ella un capuccino con dos cucharadas de azúcar. Siete años después, todo lo que queremos es seguir despertando juntos cada domingo.':
    'We met over coffee one Sunday. He ordered an americano, she a cappuccino with two spoons of sugar. Seven years later, all we want is to keep waking up together every Sunday.',
  '"Supe que eras tú\nla primera vez\nque me miraste."\n\n— DIEGO\n\nNos conocimos en una noche cualquiera que terminó no siendo cualquiera. Desde entonces, cada día ha sido la confirmación de que encontramos a nuestra persona. Hoy, con el corazón lleno de gratitud, queremos compartir con quienes amamos el inicio de nuestra historia como esposos.':
    '"I knew it was you\nthe first time\nyou looked at me."\n\n— DIEGO\n\nWe met on an ordinary night that turned out to be anything but. Since then, every day has confirmed that we found our person. Today, with hearts full of gratitude, we want to share with those we love the beginning of our story as husband and wife.',
  '"Te ví y supe\nque era todo\nlo que iba a querer."\n\n— ALEX, 28\n\nFue en una librería de viejo, una tarde de septiembre. María buscaba a Borges. Alex tropezó con su pila de libros. Se cayeron tres tomos y un cuaderno de notas con dibujos. Lo demás, como suele decirse, es historia. Siete años más tarde, María escribe poemas. Alex sigue dibujando. Y ambos firman la suya, en septiembre, igual que la primera vez.':
    '"I saw you and knew\nyou were everything\nI would ever want."\n\n— ALEX, 28\n\nIt was in a second-hand bookshop, one September afternoon. María was looking for Borges. Alex bumped into her pile of books. Three volumes and a sketchbook fell. The rest, as they say, is history. Seven years later, María writes poems. Alex still draws. And both sign their own story, in September, just like the first time.',
  'Nos conocimos en el lugar menos esperado y desde entonces no hemos dejado de escribir nuestra historia. Hoy queremos compartir con ustedes el capítulo más importante.':
    'We met in the least expected place and since then we have never stopped writing our story. Today we want to share its most important chapter with you.',
  'Bajo la luz de la luna y las estrellas, gracias por acompañarme en esta noche tan especial.': 'Under the light of the moon and the stars, thank you for joining me on this very special night.',
  'Al caer las máscaras, quedan los recuerdos. Gracias por hacer mágica esta noche.': 'When the masks fall, the memories remain. Thank you for making this night magical.',
  'Como mariposas que danzan al viento, hoy abro mis alas hacia un nuevo comienzo.': 'Like butterflies dancing in the wind, today I spread my wings toward a new beginning.',
  'Como una diosa entre columnas,\nhoy florece mi historia\nbajo cielos de mármol y oro.': 'Like a goddess among columns,\ntoday my story blooms\nunder skies of marble and gold.',
  'Como una perla que el mar guardó durante quince años, hoy salgo a la superficie para celebrar mi vida.': 'Like a pearl the sea kept for fifteen years, today I rise to the surface to celebrate my life.',
  'Detrás de cada máscara hay un sueño. El mío se hace realidad la noche de mis quince años.': 'Behind every mask there is a dream. Mine comes true on the night of my fifteenth birthday.',
  'En un bosque\ndonde los sueños florecen,\nmis quince años están listos\npara despertar.': 'In a forest\nwhere dreams bloom,\nmy fifteen years are ready\nto awaken.',
  'Gracias por ser parte de la melodía de mi vida. Que la música de esta noche nunca deje de sonar.': 'Thank you for being part of the melody of my life. May tonight’s music never stop playing.',
  'Mi vida es una canción y hoy suena su nota más especial: mis quince años.': 'My life is a song and today its most special note plays: my fifteenth birthday.',
  'Que la magia de esta noche florezca siempre en tu corazón. Gracias por acompañarme.': 'May the magic of this night always bloom in your heart. Thank you for being with me.',
  'Que la marea de la vida siempre te lleve a puertos felices. Gracias por navegar a mi lado.': 'May the tide of life always carry you to happy harbours. Thank you for sailing by my side.',
  'Que nunca dejes de soñar,\ny que cada sueño te encuentre\npreparada.': 'May you never stop dreaming,\nand may every dream find you\nready.',
  'Te espero para celebrar juntos esta noche real.': 'I look forward to celebrating this royal night together.',
  'Te espero, para celebrar conmigo esta noche de mariposas y sueños.': 'I look forward to celebrating with you this night of butterflies and dreams.',
  'Te espero, para celebrar conmigo esta noche entre columnas y estrellas.': 'I look forward to celebrating with you this night among columns and stars.',
  'Te espero, para celebrar conmigo esta noche iluminada.': 'I look forward to celebrating with you this luminous night.',

  // Canciones (la nota bajo el título)
  'Christina Perri · primer baile': 'Christina Perri · first dance',
  'Etta James · primer baile': 'Etta James · first dance',
  'Consuelo Velázquez · su canción': 'Consuelo Velázquez · their song',
  'Train · porque sí': 'Train · just because',
  'Parte de tu mundo': 'Part of Your World',
  'Mil Años': 'A Thousand Years',
}

/** «La historia de» un libro de viejo, que varios diseños repiten con otros nombres: se traduce por su forma. */
const HISTORIA_DE_LIBRERIA =
  /^Fue en una librería de viejo, una tarde de septiembre\. (.+) buscaba a Borges\. (.+) tropezó con su pila de libros\. Se cayeron tres tomos y un cuaderno de notas con dibujos\. Lo demás, como suele decirse, es historia\. Siete años más tarde, (.+) escribe poemas\. (.+) sigue dibujando\. Y ambos firman la suya, en septiembre, igual que la primera vez\.$/

/** Fechas de portada («12 · ABR · 2026 · 18:00», «SÁBADO 8 · AGOSTO · 2026 · 19:00 HRS»): los meses y días en inglés. */
const MESES: Readonly<Record<string, string>> = {
  ENE: 'JAN', ABR: 'APR', AGO: 'AUG', DIC: 'DEC', ENERO: 'JANUARY', FEBRERO: 'FEBRUARY', MARZO: 'MARCH', ABRIL: 'APRIL', MAYO: 'MAY', JUNIO: 'JUNE',
  JULIO: 'JULY', AGOSTO: 'AUGUST', SEPTIEMBRE: 'SEPTEMBER', OCTUBRE: 'OCTOBER', NOVIEMBRE: 'NOVEMBER', DICIEMBRE: 'DECEMBER',
  LUNES: 'MONDAY', MARTES: 'TUESDAY', MIÉRCOLES: 'WEDNESDAY', JUEVES: 'THURSDAY', VIERNES: 'FRIDAY', SÁBADO: 'SATURDAY', DOMINGO: 'SUNDAY', HRS: 'HRS',
}

export function textoDeMuestraEnIngles(texto: string): string {
  const exacto = EN[texto]
  if (exacto !== undefined) return exacto
  const libro = HISTORIA_DE_LIBRERIA.exec(texto)
  if (libro !== null) {
    const [, a, b, c, d] = libro
    return `It was in a second-hand bookshop, one September afternoon. ${a} was looking for Borges. ${b} bumped into her pile of books. Three volumes and a sketchbook fell. The rest, as they say, is history. Seven years later, ${c} writes poems. ${d} still draws. And both sign their own story, in September, just like the first time.`
  }
  // Una fecha de portada: solo cifras, separadores y nombres de mes o día.
  if (/^[\d\s·:.A-ZÁÉÍÓÚ]+$/.test(texto) && /[A-Z]{3}/.test(texto)) return texto.replace(/[A-ZÁÉÍÓÚ]+/g, (p) => MESES[p] ?? p)
  return texto
}

/** La muestra de un diseño en inglés: cada texto por la tabla; claves, horas, enlaces y nombres, tal cual. */
export function muestraEnIngles(contenido: InvitationContent): InvitationContent {
  const traducir = (valor: unknown, clave: string): unknown => {
    if (typeof valor === 'string') return clave === 'imageId' || clave === 'href' || clave === 'startsAt' ? valor : textoDeMuestraEnIngles(valor)
    if (Array.isArray(valor)) return valor.map((v) => traducir(v, clave))
    if (valor !== null && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, traducir(v, k)]))
    return valor
  }
  return traducir(contenido, '') as InvitationContent
}
