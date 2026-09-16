import { isGenuinelyRefurbished } from '../lib/refurbishedProducts';

const cases = [
  {
    expected: false,
    product: {
      id: 537021,
      name: 'DISCO DURO EXTERNO HDD INTENSO 1TB 2.5 USB 3.2 NEGRO',
      description: 'Características del Intenso HDD externo certified refurbished',
    },
  },
  {
    expected: false,
    product: {
      id: 532374,
      name: 'MONITOR LED 23.8 DELL PRO P2423DE',
      description: 'El Dell P2423DE reacondicionado es un monitor profesional',
    },
  },
  {
    expected: false,
    product: {
      id: 532372,
      name: 'SERVIDOR DELL POWEREDGE T350 REACONDICIONADO',
      description: 'Servidor reacondicionado',
    },
  },
  {
    label: 'positive title',
    expected: true,
    product: { name: 'PORTATIL HP ELITEBOOK REACONDICIONADO', description: 'Reacondicionado: No' },
  },
  {
    label: 'positive characteristics',
    expected: true,
    product: { name: 'MONITOR DELL P2423DE', description: 'El monitor Dell P2423DE reacondicionado ha sido revisado.' },
  },
  {
    label: 'supplier negative characteristic',
    expected: false,
    product: { name: 'MOCHILA PARA PORTATIL', description: 'Reacondicionado: No' },
  },
  {
    label: 'encoded supplier negative characteristic',
    expected: false,
    product: { name: 'MONITOR PHILIPS', description: 'reacondicionado&amp;#160 no&amp;#160 reposición' },
  },
  {
    label: 'cartridge compatibility mention',
    expected: false,
    product: { name: 'HP LASERJET', description: 'Los chips de HP permiten usar cartuchos reutilizados, rellenados o reacondicionados.' },
  },
  {
    label: 'acondicionado title',
    expected: true,
    product: { name: 'APPLE IPHONE 15 ACONDICIONADO' },
  },
  {
    label: 'affirmative attribute',
    expected: true,
    product: { name: 'EQUIPO DELL', attributes: [{ name: 'Reacondicionado', options: ['Sí'] }] },
  },
  {
    label: 'new condition attribute',
    expected: false,
    product: { name: 'EQUIPO NUEVO', attributes: [{ name: 'Estado', options: ['Nuevo'] }] },
  },
  {
    label: 'unrelated new product',
    expected: false,
    product: { name: 'HP LASERJET PRO', description: 'Impresora nueva con impresión dúplex.' },
  },
];

const failures = cases.filter(({ product, expected }) => isGenuinelyRefurbished(product) !== expected);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`OK: ${cases.length} casos de reacondicionados`);
