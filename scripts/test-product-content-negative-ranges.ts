import assert from 'node:assert/strict';
import { normalizeSupplierHtml } from '../lib/productContent';

const cases: Array<{ name: string; input: string; expected: string; forbidden?: string[] }> = [
  {
    name: 'rango negativo Lanberg',
    input: '<p>intervalo de temperatura operativa<br />- 25 -  68 °c</p>',
    expected: '-25 – 68 °c',
    forbidden: ['25.68', '-68 °c'],
  },
  {
    name: 'rango negativo Dell con entidad doble',
    input: '<p>temperatura de almacenamiento: - 40 - 65 &amp;#176c</p>',
    expected: '-40 – 65 °c',
    forbidden: ['40.65', '-65 °c'],
  },
  {
    name: 'rango positivo de temperatura con espacio tras el guion',
    input: '<p>temperatura operativa: 0 - 35 °c</p>',
    expected: '0 – 35 °c',
    forbidden: ['0.35'],
  },
  {
    name: 'rango positivo de temperatura sin espacio tras el guion',
    input: '<p>temperatura operativa: 0 -35 °c</p>',
    expected: '0 – 35 °c',
    forbidden: ['0.35'],
  },
  {
    name: 'rango negativo de altitud con decimal roto y separador guion',
    input: '<p>altitud de funcionamiento: - 15 -2 - 3048 m</p>',
    expected: 'altitud de funcionamiento: -15.2 – 3048 m',
    forbidden: ['— 15.2', '-3048 m'],
  },
  {
    name: 'rango negativo de altitud con decimal roto y separador textual',
    input: '<p>altitud no operativa: - 15 -2 a 10668 m</p>',
    expected: 'altitud no operativa: -15.2 – 10668 m',
    forbidden: ['— 15.2', '-10668 m'],
  },
  {
    name: 'rango negativo sin unidad codificada',
    input: '<p>límite: - 12 - 5 foo</p>',
    expected: 'límite: -12 – 5 foo',
  },
  {
    name: 'rango positivo eléctrico',
    input: '<p>entrada: 100 - 240 V</p>',
    expected: '100 — 240 V',
    forbidden: ['100.240'],
  },
  {
    name: 'decimal roto de dos cifras',
    input: '<p>capacidad: 28 -93 Wh</p>',
    expected: '28.93 Wh',
  },
  {
    name: 'decimal roto de una cifra',
    input: '<p>ancho: 115 -8 mm</p>',
    expected: '115.8 mm',
  },
  {
    name: 'temperatura negativa simple',
    input: '<p>de - 20 °c a 65 °c</p>',
    expected: 'de -20 °c a 65 °c',
  },
  {
    name: 'decimal de vibración no es un rango',
    input: '<p>vibración operativa: 0 -66 g</p>',
    expected: 'vibración operativa: 0.66 g',
    forbidden: ['0 – 66'],
  },
  {
    name: 'enumeración positiva no adquiere signo',
    input: '<p>resoluciones: 800 - 1600 - 2400 dpi</p>',
    expected: 'resoluciones: 800 — 1600 — 2400 dpi',
    forbidden: ['-800'],
  },
];

for (const testCase of cases) {
  const actual = normalizeSupplierHtml(testCase.input);
  assert.ok(
    actual.includes(testCase.expected),
    `${testCase.name}: se esperaba "${testCase.expected}" en "${actual}"`,
  );
  for (const forbidden of testCase.forbidden ?? []) {
    assert.ok(!actual.includes(forbidden), `${testCase.name}: apareció el patrón prohibido "${forbidden}"`);
  }
  assert.equal(
    normalizeSupplierHtml(actual),
    actual,
    `${testCase.name}: la normalización no es idempotente`,
  );
}

console.log(`OK: ${cases.length} casos de normalización verificados.`);
