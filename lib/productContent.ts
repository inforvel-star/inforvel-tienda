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

// Algunas fichas no traen prosa narrativa: es una tabla de especificaciones
// en crudo, "etiqueta" y "valor" como <p> sueltos y consecutivos (caso real:
// una tarjeta gráfica cuya descripción es solo pares "Procesador" / "GeForce
// RTX 5070 Ti" / "Memoria" / "16 GB"...). El resto de este pipeline da por
// hecho prosa con puntuación real, así que aplicado aquí no la limpia: la
// deja peor (títulos de sección como "— procesador" sueltos). Se detecta por
// la proporción de bloques <p> cortos (≤6 palabras) sin puntuación de cierre.
function looksLikeRawSpecTable(html: string): boolean {
  const blocks = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) =>
    m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, 'x').trim()
  );
  const nonEmpty = blocks.filter((b) => b.length > 0);
  if (nonEmpty.length < 8) return false;
  const shortNoPunct = nonEmpty.filter((b) => b.split(/\s+/).length <= 6 && !/[.!?]$/.test(b));
  return shortNoPunct.length / nonEmpty.length > 0.6;
}

export function normalizeSupplierHtml(html: string): string {
  // No desactiva todo el pipeline para este formato — solo la conversión
  // genérica de guion a raya larga (más abajo), que es la única regla que da
  // por hecho que el guion es un separador de cláusula de prosa. El arreglo
  // de decimales rotos ("115 -8 mm" → "115.8 mm") es seguro con independencia
  // de si el texto es prosa o una tabla de specs — desactivarlo también
  // (como hacía una versión anterior de esta guarda) rompía medidas físicas
  // que antes salían bien, un efecto secundario no intencionado.
  const isRawSpecTable = looksLikeRawSpecTable(html);

  let normalized = correctSupplierAccentErrors(decodeHtmlEntities(String(html || '')))
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
    .replace(/\s*\[(?:\d{1,2}|\d{1,2}[,;]\s*\d{1,2})\](?=\s|[.,;:!?<]|$)/g, '')
    // El proveedor separa decimales con " -" (5 -1 s, 21 -6 kg).
    .replace(/(\d)\s+-\s*(\d)/g, '$1.$2')
    // Los demás guiones rodeados de espacios son separadores, no cortes de línea.
    // En una tabla de specs en crudo esta regla convertiría "- Procesador"
    // (guion de cabecera de sección) en "— Procesador" (raya larga, como si
    // fuera prosa) — se omite para ese formato.
    .replace(isRawSpecTable ? /(?!)/ : /\s+-\s+(?=[\p{L}\d])/gu, ' — ')
    .replace(/\t+/g, ': ')
    .replace(/<(p|div|ul|ol|h[2-6])[^>]*>\s*(?:\u00a0|<br\s*\/?\s*>|\s)*<\/\1>/gi, '')
    .trim();

  // Algunas fichas abren <strong> decenas de veces y nunca lo cierran, haciendo
  // que toda la descripción aparezca en negrita. En ese caso se conserva la
  // jerarquía de los encabezados y se descarta únicamente ese marcado corrupto.
  const strongOpenCount = (normalized.match(/<strong\b[^>]*>/gi) ?? []).length;
  const strongCloseCount = (normalized.match(/<\/strong>/gi) ?? []).length;
  if (strongOpenCount !== strongCloseCount) {
    normalized = normalized.replace(/<\/?strong\b[^>]*>/gi, '');
  }

  // Reparar el patrón habitual del feed: el título de sección y el párrafo
  // siguiente llegan dentro del mismo h2/h3, separados solo por un <br>.
  normalized = normalized.replace(
    /<h([2-6])([^>]*)>([^<]{3,120})<br\s*\/?\s*>/gi,
    '<h$1$2>$3</h$1><p>',
  );

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
