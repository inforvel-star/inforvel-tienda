const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  uuml: 'ü',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ntilde: 'Ñ',
  Uuml: 'Ü',
};

export function decodeHtmlEntities(value: string): string {
  let decoded = String(value || '');

  // Algunos feeds codifican dos veces (por ejemplo, &amp;#243;).
  for (let pass = 0; pass < 2; pass += 1) {
    decoded = decoded
      .replace(/&#(\d+);?/g, (entity, code) => {
        const point = Number(code);
        return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      })
      .replace(/&#x([\da-f]+);?/gi, (entity, code) => {
        const point = Number.parseInt(code, 16);
        return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      })
      .replace(/&(amp|apos|gt|lt|nbsp|quot|aacute|eacute|iacute|oacute|uacute|ntilde|uuml);?/gi,
        (entity, name) => NAMED_HTML_ENTITIES[name] ?? NAMED_HTML_ENTITIES[name.toLowerCase()] ?? entity);
  }

  return decoded;
}

/**
 * Corrige una corrupción conocida del feed: se añadió una tilde a la "o" de
 * terminaciones que continúan después de "-ion" (profesiónales, aplicaciónes,
 * proporcióna...). Una palabra española terminada en "-ión" puede llevar tilde,
 * pero la pierde al añadir un sufijo dentro de la misma palabra.
 */
export function correctSupplierAccentErrors(value: string): string {
  return String(value || '')
    .replace(/ió(?=n\p{L})/giu, (match) =>
      `${match[0]}${match[1] === 'Ó' ? 'O' : 'o'}`
    )
    // El feed a veces usa el código de entidad en mayúscula para una vocal
    // acentuada que va en mitad de palabra (dise#209o -> "diseÑo" en vez de
    // "diseño"). En español no hay mayúsculas acentuadas tras una minúscula.
    .replace(/(\p{Ll})([ÁÉÍÓÚÑÜ])/gu, (_match, before, accented) =>
      `${before}${accented.toLowerCase()}`
    );
}

function repairSupplierLists(html: string): string {
  const tokens = html.split(/(<[^>]+>)/g);
  let listTag: 'ul' | 'ol' | null = null;
  let listItemOpen = false;
  let output = '';

  const closeList = () => {
    if (listItemOpen) {
      output += '</li>';
      listItemOpen = false;
    }
    if (listTag) {
      output += `</${listTag}>`;
      listTag = null;
    }
  };

  for (const token of tokens) {
    if (!token) continue;
    const openList = token.match(/^<(ul|ol)\b[^>]*>$/i);
    if (openList) {
      closeList();
      listTag = openList[1].toLowerCase() as 'ul' | 'ol';
      output += `<${listTag}>`;
      continue;
    }
    if (/^<li\b[^>]*>$/i.test(token)) {
      if (!listTag) {
        listTag = 'ul';
        output += '<ul>';
      }
      if (listItemOpen) output += '</li>';
      output += token;
      listItemOpen = true;
      continue;
    }
    if (/^<\/li>$/i.test(token)) {
      if (listItemOpen) output += token;
      listItemOpen = false;
      continue;
    }
    if (/^<\/(?:ul|ol)>$/i.test(token)) {
      closeList();
      continue;
    }
    if (listTag && /^<(?:h[1-6]|p|div|table)\b/i.test(token)) {
      closeList();
    }
    output += token;
  }

  closeList();
  return output;
}

// Compuestos técnicos con guion real (no un separador de cláusula) que el
// feed a veces mete con espacios alrededor ("usb - c") — hay que devolverles
// el guion pegado ANTES de que la regla genérica de guiones los convierta en
// raya larga ("usb — c"), porque una vez conviertida ya no hay forma de
// distinguirla de un guion de cláusula normal.
const HYPHEN_COMPOUNDS = [
  'USB-C', 'USB-A', 'USB-B', 'Micro-USB', 'Micro-B', 'Micro-A',
  'Mini-USB', 'Mini-B', 'Mini-A', 'Type-C', 'Type-A', 'Wi-Fi',
];

// Igual que HYPHEN_COMPOUNDS pero acepta una lista extra de patrones — se usa
// para códigos de modelo con guion real que vienen en el propio nombre del
// producto (p.ej. "CB3402CVA-MW1596"), distintos en cada producto, además de
// la lista fija de compuestos técnicos conocidos.
export function tightenHyphenPatterns(text: string, extraPatterns: string[] = []): string {
  return [...HYPHEN_COMPOUNDS, ...extraPatterns].reduce((result, compound) => {
    if (!compound.includes('-')) return result;
    const escaped = compound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const spacedPattern = escaped.replace(/-/g, '\\s*-\\s*');
    try {
      return result.replace(new RegExp(`\\b${spacedPattern}\\b`, 'gi'), compound);
    } catch {
      return result;
    }
  }, text);
}

// Tokens del nombre del producto que ya traen un guion real pegado
// (p.ej. "CB3402CVA-MW1596", "RX360-II") — casi siempre son el código de
// modelo/SKU. Se usan para recomponerlos si el texto de la descripción los
// trae con espacios alrededor del guion.
export function extractHyphenatedTokensFromName(name: string): string[] {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return words.filter((w) => /^[A-Z0-9][A-Z0-9]*-[A-Z0-9-]+$/i.test(w) && w.length >= 5);
}

// Directivas UE que el feed cita como "RoHS 2002/95/EC" pero el mismo patrón
// de guion roto convierte en "rohs - 2002 - 95 - ec". A diferencia de normas
// tipo ISO/IEC (que sí llevan guion real, p.ej. "IEC 62368-1"), estas se
// escriben con barra — así que aquí el guion sustituye a la barra, no al
// revés. Limitado a las directivas conocidas; no se toca nada más para no
// arriesgar normas que si usan guion de verdad.
const EU_DIRECTIVE_KEYWORDS = ['RoHS', 'REACH', 'WEEE'];

function protectEuDirectiveCitations(text: string): string {
  return EU_DIRECTIVE_KEYWORDS.reduce((result, keyword) => {
    const re = new RegExp(`\\b${keyword}\\b((?:\\s*-\\s*[a-z0-9]+){1,4})`, 'gi');
    return result.replace(re, (_match, tail: string) => {
      const fixedTail = tail
        .split(/\s*-\s*/)
        .filter(Boolean)
        .map((segment) => (/^[a-z]+$/i.test(segment) ? segment.toUpperCase() : segment))
        .join('/');
      return `${keyword} ${fixedTail}`;
    });
  }, text);
}

// Prefijos de estándares de conector/norma que el feed escribe con guion real
// pegado al número ("RS-232C", "HD-15", "PS/2"→"PS-2") pero el patrón de
// guion roto separa con espacios ("rs - 232c"). Lista cerrada a propósito,
// igual que EU_DIRECTIVE_KEYWORDS: solo prefijos cortos y conocidos, para no
// tocar un guion de cláusula real que por casualidad preceda a un número
// (p.ej. "PC - 5 años de garantía").
const CONNECTOR_CODE_PREFIXES = ['RS', 'HD', 'PS', 'DVI', 'IEC', 'EN', 'ISO', 'IP', 'DIN', 'JIS'];

function protectConnectorCodes(text: string): string {
  return CONNECTOR_CODE_PREFIXES.reduce((result, prefix) => {
    const re = new RegExp(`\\b${prefix}\\s*-\\s*(\\d[\\dA-Za-z]{0,3})\\b`, 'gi');
    return result.replace(re, (_match, code: string) => `${prefix}-${code}`);
  }, text);
}

// Rangos cuyo primer extremo es negativo. El feed separa el signo, el decimal
// y el rango con los mismos guiones ("- 15 -2 - 3048 m" = -15.2–3048 m).
// Se reconoce la ESTRUCTURA del valor, no su unidad: debe empezar justo tras
// dos puntos, salto HTML, <li> o un introductor inequívoco (de/desde/entre),
// llevar signo separado y contener exactamente dos extremos. Esta posición
// evita confundir códigos y enumeraciones como "800 - 1600 - 2400".
function protectNegativeNumericRanges(text: string): string {
  return text.replace(
    /(^|:\s*|<br\s*\/?\s*>\s*|<li[^>]*>\s*|\b(?:de|desde|entre)\s+)[-–—]\s+(\d+(?:[.,]\d+)?)(?:\s+-(\d+))?\s+(?:[-–—]|a|hasta|y)\s+(\d+(?:[.,]\d+)?)(?![\d.,])(?!\s*(?:[-–—]|a|hasta|y)\s*\d)/giu,
    (_match, prefix: string, minimum: string, decimal: string | undefined, maximum: string) =>
      `${prefix}-${minimum}${decimal ? `.${decimal}` : ''} – ${maximum}`,
  );
}

// "0 -35" puede ser tanto un rango como un decimal roto: la estructura por
// sí sola no distingue "temperatura: 0–35" de "vibración: 0.66". Para la
// variante positiva se usa por ello el nombre del campo, pero no se exige ni
// se enumera ninguna unidad. Los rangos negativos sí son agnósticos.
function protectAmbiguousPositiveTemperatureRanges(text: string): string {
  return text.replace(
    /(\btemperatura\b[^:<]{0,80}:\s*)(\d+(?:[.,]\d+)?)\s+-\s*(\d+(?:[.,]\d+)?)(?![\d.,])(?!\s*(?:[-–—]|a|hasta|y)\s*\d)/giu,
    (_match, prefix: string, minimum: string, maximum: string) =>
      `${prefix}${minimum} – ${maximum}`,
  );
}

export function normalizeSupplierHtml(html: string, extraHyphenPatterns: string[] = []): string {
  // Detección de tabla-de-specs-en-crudo: tiene que vivir AQUÍ, no solo en
  // finalizeProductDescription, porque hay tres sitios en la web (el render
  // de la ficha de producto, dos veces, y el JSON-LD de SEO) que llaman
  // directamente a capitalizeProductSentences sin pasar por
  // finalizeProductDescription — si la comprobación solo estuviera allí,
  // esos tres sitios seguirían reconstruyendo el mismo texto falso
  // ("— procesador") encima del dato ya bueno guardado en WooCommerce, cada
  // vez que se renderiza la página. Ver looksLikeRawSpecTable más abajo.
  //
  // OJO: esto NO desactiva todo el pipeline para ese formato — solo la
  // conversión genérica de guion a raya larga (más abajo), que es la única
  // regla que da por hecho que el guion es un separador de cláusula de
  // prosa. El arreglo de decimales rotos ("115 -8 mm" → "115.8 mm") es
  // seguro con independencia de si el texto es prosa o una tabla de specs
  // — desactivarlo también fue un error de la primera versión de esta
  // guarda: dejaba "— procesador" sin corromper pero rompía medidas físicas
  // que antes salían bien (115.8 mm → 115 -8 mm), un efecto secundario no
  // intencionado encontrado en revisión manual.
  const isRawSpecTable = looksLikeRawSpecTable(html);

  let normalized = correctSupplierAccentErrors(decodeHtmlEntities(String(html || '')))
    // Algunos feeds meten markdown suelto (**negrita**) en vez de HTML — se
    // convierte a <strong> antes de cualquier otra cosa para que el resto
    // del pipeline (incluida la comprobación de <strong> sin cerrar más abajo)
    // lo trate como HTML real. Se admite un <br /> suelto dentro del texto en
    // negrita (patrón real del feed: "**palabra <br />resto de la frase**"),
    // pero no otras etiquetas, para no engullir de más si un "**" queda huérfano.
    .replace(/\*\*((?:[^*<>]|<br\s*\/?\s*>)+?)\*\*/g, '<strong>$1</strong>')
    // Algunas fichas meten el título de sección como primera línea de un <p>,
    // precedido de un guion suelto, en vez de usar un encabezado real:
    // "<p><strong> - Diseño y comodidad<br />texto...". Se recupera como <h4>.
    // Deliberadamente estricto (solo justo tras <p>): el mismo patrón de guion
    // suelto también aparece en tablas de especificaciones ("- Tipo<br>Pc<br>")
    // y listas de viñetas, donde SÍ hay que dejarlo como está.
    .replace(
      /<p>\s*(?:<strong[^>]*>)?\s*-\s*([^<]{3,80}?)\s*<br\s*\/?\s*>/gi,
      '<h4>$1</h4><p>',
    )
    // Los feeds incluyen colores, tamaños y clases propios que rompen el tema oscuro.
    .replace(/\s(?:style|class|bgcolor|color|width|height|cellpadding|cellspacing)=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Eliminar referencias de notas copiadas de fichas de fabricante: [1], [2]...
    .replace(/\s*\[(?:\d{1,2}|\d{1,2}[,;]\s*\d{1,2})\](?=\s|[.,;:!?<]|$)/g, '');

  // Antes de colapsar <br>: en algunas tablas el salto es la única marca que
  // permite saber que el guion siguiente ocupa la posición de signo del valor.
  normalized = protectAmbiguousPositiveTemperatureRanges(
    protectNegativeNumericRanges(normalized),
  );

  // Reparar el patrón habitual del feed: el título de sección y el párrafo
  // siguiente llegan dentro del mismo h2/h3, separados solo por un <br>. El
  // feed a veces envuelve el título en un <strong> extra y redundante
  // ("<h2><strong>Título<br/>") — si no se admite aquí, ese <br> nunca se
  // separa del título (el <strong> con "<" rompe la captura de texto plano)
  // y el colapsador de <br> de abajo lo funde con el párrafo siguiente antes
  // de que el chequeo de <strong> sin cerrar pueda limpiarlo. Límite de
  // longitud ampliado (antes 120) porque el nombre de producto + "Características
  // del " puede superar sobradamente esa cifra en este catálogo.
  //
  // Algunos títulos vienen partidos en dos líneas por un <br> intermedio
  // ANTES del <br> real de fin de título ("...unified frame <br />rgb
  // white<br />el <strong>corsair..."), validado contra el propio catálogo:
  // en los 4 casos encontrados el fragmento intermedio es corto (bajo 30
  // caracteres) y no vuelve a abrir <strong> — a diferencia del <br> real,
  // que siempre va seguido de <strong> tras la primera palabra del párrafo.
  // Sin este segundo grupo opcional, ese <br> intermedio se toma como el
  // final del título y el fragmento corto queda huérfano como si fuera el
  // arranque de un párrafo nuevo (con su propia mayúscula inicial indebida).
  normalized = normalized.replace(
    /<h([2-6])([^>]*)>\s*(?:<strong[^>]*>)?\s*([^<]{3,200}(?:<br\s*\/?\s*>[^<]{1,30})?)<br\s*\/?\s*>/gi,
    '<h$1$2>$3</h$1><p>',
  );

  // El feed mete <br> sueltos a mitad de frase (no son cortes de párrafo
  // reales). Se colapsan a un espacio, salvo cuando van justo después de
  // punto/dos puntos/interrogación/exclamación — ahí sí puede ser un corte
  // de línea intencionado dentro del mismo bloque.
  normalized = normalized.replace(/<br\s*\/?\s*>/gi, (match, offset: number) => {
    const before = normalized.slice(0, offset).trimEnd();
    return /[.:!?]$/.test(before) ? match : ' ';
  }).replace(/[ \t]{2,}/g, ' ');

  // Algunas fichas abren <strong> decenas de veces y nunca lo cierran, haciendo
  // que toda la descripción aparezca en negrita. En ese caso se conserva la
  // jerarquía de los encabezados y se descarta únicamente ese marcado corrupto.
  const strongOpenCount = (normalized.match(/<strong\b[^>]*>/gi) ?? []).length;
  const strongCloseCount = (normalized.match(/<\/strong>/gi) ?? []).length;
  if (strongOpenCount !== strongCloseCount) {
    normalized = normalized.replace(/<\/?strong\b[^>]*>/gi, '');
  }


  // Proteger códigos normativos y compuestos con guion real ANTES de las
  // reglas genéricas de guion de abajo — una vez que "usb - c" se convierte
  // en raya larga, o "rohs - 2002 - 95 - ec" en una falsa cadena de decimales,
  // ya no hay forma de distinguirlos de un guion de cláusula normal.
  normalized = tightenHyphenPatterns(
    protectConnectorCodes(protectEuDirectiveCitations(normalized)),
    extraHyphenPatterns,
  )
    // Signo menos en medidas ("de - 20 °c a 65 °c"): se pega el guion al
    // número (sin espacio) para que quede inmune a las reglas genéricas de
    // abajo, igual que con los compuestos técnicos. Solo cuando el número va
    // seguido de un símbolo de grado — es una señal fuerte de que es un signo
    // menos, no un separador de cláusula que casualmente precede a un número.
    // Excluye el caso en que a la izquierda ya hay un número con grado
    // completo ("10 °c - 60 °c"): eso es un RANGO, no un signo menos, y
    // pegar el guion cambiaría el significado (60°C no es -60°C).
    .replace(/(?<!\d\s?°[a-zA-Zº]{0,2}\s)-\s+(\d+(?:[.,]\d+)?\s*°)/g, '-$1')
    // Mismo signo menos pero en raíles de fuentes de alimentación ("- 12v:
    // 0.3a" es "-12V: 0.3A", no "algo — 12v"). Aquí la unidad va pegada al
    // número sin espacio (12v, no 12 v), al contrario que los grados — esa
    // es la señal de que es una unidad eléctrica y no texto de cláusula.
    .replace(/(?<!\d(?:v|a|w|hz)\s)-\s+(\d+(?:[.,]\d+)?(?:v|a|w|hz)\b)/gi, '-$1');

  normalized = normalized
    // El proveedor separa decimales con " -" (5 -1 s, 21 -6 kg, 28 -93 wh,
    // 2 -4 ghz...). La señal fiable para distinguir esto de un rango real
    // ("100 - 240 V", "1.44 - 2.88:1") no es cuántas cifras tiene el número
    // de la derecha — es la ASIMETRÍA del espacio: un decimal roto SIEMPRE
    // trae espacio antes del guion pero NINGUNO después ("28 -93", pegado a
    // la cifra siguiente), mientras que un rango real trae espacio a ambos
    // lados ("100 - 240"). Validado contra los 50 productos del primer lote
    // del backfill: 112/112 casos sin espacio tras el guion eran decimales
    // rotos (medidas, GHz, versiones, MTBF...) y 28/28 casos con espacio
    // eran rangos o enumeraciones reales — ninguna excepción encontrada.
    .replace(/(\d)\s+-(\d)/g, '$1.$2')
    // Los demás guiones rodeados de espacios son separadores de cláusula
    // ("rápido - ligero - preciso"), incluida la forma "Etiqueta - Valor" de
    // las listas de especificaciones. Los casos que NO son separador (signo
    // menos, compuestos técnicos, códigos normativos) ya se han resuelto
    // arriba a una forma sin espacios, así que a estas alturas son inmunes.
    // En una tabla de specs en crudo esta regla es la que convierte
    // "- Procesador" (guion de cabecera de sección) en "— Procesador"
    // (raya larga, como si fuera prosa) — se omite para ese formato, dejando
    // el guion simple tal cual (visible como "raro" en vez de disfrazado).
    .replace(isRawSpecTable ? /(?!)/ : /\s+-\s+(?=[\p{L}\d])/gu, ' — ')
    .replace(/\t+/g, ': ')
    .replace(/<(p|div|ul|ol|h[2-6])[^>]*>\s*(?:\u00a0|<br\s*\/?\s*>|\s)*<\/\1>/gi, '')
    .trim();


  return repairSupplierLists(normalized)
    .replace(/<ul>\s*<\/p>/gi, '</p><ul>')
    .replace(/<ol>\s*<\/p>/gi, '</p><ol>')
    .replace(/(?:<\/p>\s*){2,}/gi, '</p>')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
}

export function stripProductHtml(html: string): string {
  return correctSupplierAccentErrors(decodeHtmlEntities(String(html || '')))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasReadableProductContent(html: string): boolean {
  return stripProductHtml(normalizeSupplierHtml(html)).length > 20;
}

export function capitalizeProductSentences(html: string, protectedTerms: string[] = []): string {
  let capitalizeNext = true;

  const capitalized = normalizeSupplierHtml(html)
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part) return part;
      if (part.startsWith('<')) {
        // Los feeds insertan <br> dentro de frases, así que no implica una frase nueva.
        if (/^<\/?(?:p|div|li|h[1-6]|td|th)\b/i.test(part)) capitalizeNext = true;
        return part;
      }

      let result = '';
      for (const character of part) {
        if (capitalizeNext && /[a-záéíóúñü]/i.test(character)) {
          result += character.toLocaleUpperCase('es-ES');
          capitalizeNext = false;
        } else {
          result += character;
        }

        if (/[.!?]/.test(character)) capitalizeNext = true;
        else if (!/\s/.test(character) && capitalizeNext && !/["'“”‘’([{¿¡-]/.test(character)) capitalizeNext = false;
      }
      return result;
    })
    .join('');

  return protectedTerms.reduce((result, rawTerm) => {
    const term = String(rawTerm || '').trim();
    if (term.length < 2) return result;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(
      new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'gi'),
      (_, prefix) => `${prefix}${term}`,
    );
  }, capitalized);
}

export function jsonLdStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// Palabras genéricas que no deben tratarse como parte de un código de modelo
// aunque aparezcan en mayúsculas en el nombre (los nombres del feed vienen
// enteros en mayúsculas, así que "TECLADO" o "NEGRO" no son menos "caps" que
// "PRO" — hay que descartarlas explícitamente).
const GENERIC_NAME_WORDS = new Set([
  'DE', 'CON', 'PARA', 'Y', 'EL', 'LA', 'LOS', 'LAS', 'SIN', 'POR', 'A', 'EN',
  'GAMING', 'INALAMBRICO', 'INALÁMBRICO', 'INALAMBRICA', 'INALÁMBRICA',
  'NEGRO', 'NEGRA', 'BLANCO', 'BLANCA', 'AZUL', 'ROJO', 'ROJA', 'VERDE', 'GRIS',
  'ORDENADOR', 'PORTATIL', 'PORTÁTIL', 'TECLADO', 'RATON', 'RATÓN', 'MONITOR',
  'IMPRESORA', 'MOVIL', 'MÓVIL', 'SMARTPHONE', 'TABLET', 'AURICULARES',
  'ALTAVOZ', 'CARGADOR', 'FUNDA', 'CABLE', 'ADAPTADOR', 'SOPORTE', 'BASE',
  'NUEVO', 'NUEVA', 'ORIGINAL', 'OFICIAL', 'PACK', 'KIT', 'SET',
]);

// Términos técnicos/de marca que se repiten en muchos productos del catálogo
// y conviene mantener siempre con su capitalización real, independientemente
// del producto concreto.
const KNOWN_TECH_TERMS = [
  'LIGHTSPEED', 'LIGHTSYNC', 'KeyControl', 'G HUB', 'RGB', 'Bluetooth', 'Wi-Fi',
  'USB-C', 'USB', 'HDMI', 'DisplayPort', 'NVMe', 'PCIe', 'DDR5', 'DDR4', 'DDR3',
  'Windows', 'Intel', 'AMD', 'NVIDIA', 'Thunderbolt', 'QWERTY', 'PC', 'GHz', 'MHz',
  'RoHS', 'WD', 'HFS+', 'APFS', 'ATX',
  // Siglas de certificación/protección de fuentes de alimentación, casi
  // siempre listadas juntas y sin puntuación real ("ocp - ovp - scp...").
  'CE', 'FCC', 'OCP', 'OVP', 'SCP', 'OPP', 'UVP', 'OTP', 'PFC', 'TÜV Rheinland', 'TÜV',
];

// Marcas que se repiten mucho en el catálogo y cuyo atributo "Marca" en
// WooCommerce suele venir como razón social completa ("SAMSUNG ELECTRONICS
// IBERIA S.A", "SONY ESPAÑA S.A") en vez del nombre comercial limpio — así
// que además de usar el atributo, se protegen siempre estos nombres tal cual
// aparecen en el texto, independientemente de lo que diga el atributo.
// "be quiet!" se deja fuera a propósito: su marca real es en minúsculas.
const KNOWN_BRAND_ALIASES = [
  'Samsung', 'Sony', 'Corsair', 'Gigabyte', 'Seagate', 'Logitech', 'Epson',
  'ASUS', 'MSI', 'JBL', 'Anker', 'Nilox', 'Xiaomi', 'HP', 'Dell', 'Lenovo',
  'Acer', 'Apple', 'LG', 'Kingston', 'Crucial', 'TP-Link', 'Netgear',
];

/**
 * Extrae del propio nombre del producto (que ya viene con el código de
 * modelo bien delimitado, p.ej. "TECLADO GAMING LOGITECH PRO X 60
 * INALAMBRICO NEGRO") las palabras que probablemente forman parte de un
 * código de modelo — para poder restaurar su capitalización correcta
 * cuando ese mismo texto aparece en minúsculas dentro de la descripción.
 *
 * Heurística: un código de modelo casi siempre incluye al menos un token
 * con dígitos (p.ej. "60", "5090", "S24"). Se agrupan también los tokens
 * alfabéticos cortos inmediatamente adyacentes (como "X" o "PRO") que no
 * estén en la lista de palabras genéricas, ya que suelen ser parte del
 * mismo código ("PRO X 60", "RTX 5090").
 */
export function extractModelTermsFromName(name: string, brand: string = ''): string[] {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const brandWords = new Set(
    String(brand || '').trim().toUpperCase().split(/\s+/).filter(Boolean)
  );
  const hasDigit = (w: string) => /\d/.test(w);
  const isCandidateNeighbor = (w: string) =>
    /^[A-ZÁÉÍÓÚÑ0-9-]+$/.test(w) &&
    !GENERIC_NAME_WORDS.has(w.toUpperCase()) &&
    !brandWords.has(w.toUpperCase());

  const seedIndexes = words
    .map((w, i) => (hasDigit(w) ? i : -1))
    .filter((i) => i !== -1);

  const MAX_NEIGHBOR_WORDS = 3; // tope de seguridad, no debería hacer falta más para un código de modelo
  const usedRanges: Array<[number, number]> = [];
  for (const seed of seedIndexes) {
    let start = seed;
    let end = seed;
    while (start > 0 && seed - (start - 1) <= MAX_NEIGHBOR_WORDS && isCandidateNeighbor(words[start - 1]) && !hasDigit(words[start - 1])) {
      start -= 1;
    }
    while (end < words.length - 1 && (end + 1) - seed <= MAX_NEIGHBOR_WORDS && isCandidateNeighbor(words[end + 1])) {
      end += 1;
    }
    usedRanges.push([start, end]);
  }

  const terms = usedRanges.map(([start, end]) => words.slice(start, end + 1).join(' '));
  return Array.from(new Set(terms)).filter((t) => t.length >= 2);
}

/**
 * Limpieza completa de la descripción de un producto, pensada para
 * ejecutarse UNA VEZ al importar/sincronizar (no en cada visita): decodifica
 * entidades, corrige errores de acentuación y HTML del feed, capitaliza
 * frases y restaura la capitalización de la marca, el código de modelo
 * (extraído del propio nombre) y los términos técnicos conocidos.
 */
// Marcas cuyo nombre real se escribe en siglas (no en formato título) — el
// resto de marcas se pasan por Título Caso para no gritar en mitad de frase
// aunque en el atributo de WooCommerce estén guardadas en mayúsculas.
const ALL_CAPS_BRANDS = new Set([
  'MSI', 'LG', 'HP', 'ASUS', 'BQ', 'TP-LINK', 'JBL',
]);

export function toBrandDisplayCase(brand: string): string {
  const trimmed = String(brand || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 3 || ALL_CAPS_BRANDS.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toLocaleUpperCase('es-ES') + word.slice(1))
    .join(' ');
}

// Algunas fichas no traen prosa narrativa en absoluto: es una tabla de
// especificaciones en crudo, "etiqueta" y "valor" como <p> sueltos y
// consecutivos, sin ningún <ul>/<li> ni frases reales (el caso encontrado:
// una tarjeta gráfica cuya descripción es solo pares "Procesador" / "GeForce
// RTX 5070 Ti" / "Memoria" / "16 GB"...). Todo el resto del pipeline da por
// hecho prosa con puntuación real, así que aplicado aquí no la limpia: la
// deja peor (títulos de sección como "— procesador" sueltos, sin la
// jerarquía ni el emparejamiento etiqueta:valor que tendría una lista real).
// Se detecta por la proporción de bloques <p> cortos (≤6 palabras) sin
// puntuación de cierre — validado contra los 50 productos del primer lote
// del backfill: 0.97 en el único caso real de este formato, 0.00 en los
// otros 49. Si se detecta, no se reescribe nada más allá de decodificar
// entidades HTML y corregir tildes rotas — se dejan igual que antes de este
// proyecto, a la espera de un parser dedicado a este formato (fuera de
// alcance aquí).
function looksLikeRawSpecTable(html: string): boolean {
  const blocks = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) =>
    m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, 'x').trim()
  );
  const nonEmpty = blocks.filter((b) => b.length > 0);
  if (nonEmpty.length < 8) return false;
  const shortNoPunct = nonEmpty.filter((b) => b.split(/\s+/).length <= 6 && !/[.!?]$/.test(b));
  return shortNoPunct.length / nonEmpty.length > 0.6;
}

export function finalizeProductDescription(
  rawDescriptionHtml: string,
  productName: string,
  brand: string,
): string {
  // La guarda de tabla-de-specs-en-crudo vive dentro de normalizeSupplierHtml
  // (más abajo en la cadena de llamadas) para que también proteja a quien
  // llame directamente a capitalizeProductSentences sin pasar por aquí.

  // Códigos de modelo/SKU con guion real que el propio nombre del producto
  // ya trae bien escritos (p.ej. "CB3402CVA-MW1596") — se recomponen ANTES
  // de todo lo demás, por si la descripción los trae con espacios sueltos
  // alrededor del guion.
  const dynamicHyphenCodes = extractHyphenatedTokensFromName(productName);
  const pretightened = tightenHyphenPatterns(rawDescriptionHtml, dynamicHyphenCodes);

  const modelTerms = extractModelTermsFromName(productName, brand);
  const protectedTerms = [
    toBrandDisplayCase(brand),
    ...KNOWN_BRAND_ALIASES,
    ...modelTerms,
    ...KNOWN_TECH_TERMS,
  ].filter(Boolean);
  return capitalizeProductSentences(pretightened, protectedTerms);
}
