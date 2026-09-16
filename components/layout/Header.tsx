'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { ShoppingBag, Search, User, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { WCProduct, WCCategory } from '@/lib/woocommerce';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCartStore } from '@/lib/store/cartStore';
import { authAPI } from '@/lib/api/auth';
import { MiniCart } from './MiniCart';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProductBadges } from '@/components/products/ProductBadges';
import { ShoppingCart } from 'lucide-react';
import { useProductTabsStore } from '@/lib/store/productTabsStore';

type MenuItem = {
  id: string;
  name: string;
  slug?: string;
  children?: MenuItem[];
};

const MENU_CATEGORIES: MenuItem[] = [
  {
    id: 'c1',
    name: 'Ordenadores y periféricos',
    slug: undefined,
    children: [
      {
        id: 'c1-1',
        name: 'Portátiles',
        slug: 'portatiles',
        children: [
          {
            id: 'c1-1-1',
            name: 'Portátiles',
            slug: 'portatiles'
          },
          {
            id: 'c1-1-2',
            name: 'Portátiles homologados Kit Digital',
            slug: undefined
          },
          {
            id: 'c1-1-3',
            name: 'Portátiles AMD',
            slug: undefined
          },
          {
            id: 'c1-1-4',
            name: 'Portátiles Gaming',
            slug: undefined
          }
        ]
      },
      {
        id: 'c1-2',
        name: 'PCs Sobremesa',
        slug: 'pcs-sobremesa',
        children: [
          {
            id: 'c1-2-1',
            name: 'PC´s Sobremesa',
            slug: 'pcs-sobremesa-pcs-sobremesa'
          },
          {
            id: 'c1-2-2',
            name: 'All-in-One',
            slug: 'all-in-one'
          },
          {
            id: 'c1-2-3',
            name: 'Mini PC´s Barebones',
            slug: 'mini-pcs-barebones'
          },
          {
            id: 'c1-2-4',
            name: 'Fundas y estuches para ordenadores de bolsillo tipo PDA',
            slug: undefined
          },
          {
            id: 'c1-2-5',
            name: 'Accesorios para ordenadores de bolsillo tipo PDA',
            slug: 'accesorios-para-ordenadores-de-bolsillo-tipo-pda'
          },
          {
            id: 'c1-2-6',
            name: 'Plataformas de infraestructura modular',
            slug: 'plataformas-de-infraestructura-modular'
          },
          {
            id: 'c1-2-7',
            name: 'Accesorios para lápiz digital',
            slug: 'accesorios-para-lapiz-digital'
          },
          {
            id: 'c1-2-8',
            name: 'Monitores POS',
            slug: 'monitores-pos'
          },
          {
            id: 'c1-2-9',
            name: 'Tabletas de firma digital',
            slug: 'tabletas-de-firma-digital'
          },
          {
            id: 'c1-2-10',
            name: 'Accesorios para tablets infantiles',
            slug: 'accesorios-para-tablets-infantiles'
          }
        ]
      },
      {
        id: 'c1-3',
        name: 'Servidores',
        slug: 'servidores',
        children: [
          {
            id: 'c1-3-1',
            name: 'Servidores',
            slug: 'servidores'
          },
          {
            id: 'c1-3-2',
            name: 'Servidores DELL',
            slug: undefined
          }
        ]
      },
      {
        id: 'c1-4',
        name: 'Periféricos',
        slug: 'perifericos',
        children: [
          {
            id: 'c1-4-1',
            name: 'Monitores PC',
            slug: 'monitores-pc'
          },
          {
            id: 'c1-4-2',
            name: 'Cámaras Web',
            slug: 'camaras-web'
          },
          {
            id: 'c1-4-3',
            name: 'Teclados',
            slug: 'teclados'
          },
          {
            id: 'c1-4-4',
            name: 'Ratones',
            slug: 'ratones'
          },
          {
            id: 'c1-4-5',
            name: 'Alfombrillas',
            slug: 'alfombrillas'
          },
          {
            id: 'c1-4-6',
            name: 'Soportes para Monitor',
            slug: 'soportes-para-monitor'
          },
          {
            id: 'c1-4-7',
            name: 'Filtros para Monitor',
            slug: 'filtros-para-monitor'
          },
          {
            id: 'c1-4-8',
            name: 'Soportes para CPU',
            slug: 'soportes-para-cpu'
          },
          {
            id: 'c1-4-9',
            name: 'Accesorios para cámaras web',
            slug: 'accesorios-para-camaras-web'
          },
          {
            id: 'c1-4-10',
            name: 'Puntero para Presentaciones',
            slug: 'puntero-para-presentaciones'
          },
          {
            id: 'c1-4-11',
            name: 'Fundas para Teclado y Auriculares',
            slug: undefined
          },
          {
            id: 'c1-4-12',
            name: 'Reposamuñecas',
            slug: 'reposamunecas'
          }
        ]
      },
      {
        id: 'c1-5',
        name: 'Accesorios portátiles',
        slug: 'accesorios-portatiles',
        children: [
          {
            id: 'c1-5-1',
            name: 'Maletines para Portátiles',
            slug: 'maletines-para-portatiles'
          },
          {
            id: 'c1-5-2',
            name: 'Mochilas',
            slug: 'mochilas'
          },
          {
            id: 'c1-5-3',
            name: 'Teclados Numéricos',
            slug: 'teclados-numericos'
          },
          {
            id: 'c1-5-4',
            name: 'Cargadores, Adaptadores e Inversores de Corriente',
            slug: 'cargadores-adaptadores-e-inversores-de-corriente'
          },
          {
            id: 'c1-5-5',
            name: 'Cable Antirrobo para portátiles',
            slug: 'cable-antirrobo-para-portatiles'
          },
          {
            id: 'c1-5-6',
            name: 'Soportes y bases',
            slug: 'soportes-y-bases'
          },
          {
            id: 'c1-5-7',
            name: 'Replicadores de Puertos',
            slug: 'replicadores-de-puertos'
          },
          {
            id: 'c1-5-8',
            name: 'Bases',
            slug: 'bases'
          },
          {
            id: 'c1-5-9',
            name: 'Accesorios para portatiles',
            slug: 'accesorios-para-portatiles'
          }
        ]
      },
      {
        id: 'c1-6',
        name: 'Garantía y Soporte',
        slug: 'garantia-y-soporte',
        children: [
          {
            id: 'c1-6-1',
            name: 'Extensiones de la Garantía',
            slug: 'extensiones-de-la-garantia'
          }
        ]
      },
      {
        id: 'c1-7',
        name: 'Baterias y fuentes de alimentación',
        slug: 'baterias-y-fuentes-de-alimentacion',
        children: [
          {
            id: 'c1-7-1',
            name: 'Regletas',
            slug: 'regletas-electricidad'
          },
          {
            id: 'c1-7-2',
            name: 'Carritos y armarios de dispositivos portátiles',
            slug: 'carritos-y-armarios-de-dispositivos-portatiles'
          },
          {
            id: 'c1-7-3',
            name: 'Accesorios (UPSs)',
            slug: 'accesorios-upss'
          }
        ]
      },
      {
        id: 'c1-8',
        name: 'Material de presentación',
        slug: 'material-de-presentacion',
        children: [
          {
            id: 'c1-8-1',
            name: 'Accesorios para pizarras interactivas',
            slug: 'accesorios-para-pizarras-interactivas'
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    name: 'Telefonia y tablets',
    slug: undefined,
    children: [
      {
        id: 'c2-1',
        name: 'Telefonía',
        slug: 'telefonia',
        children: [
          {
            id: 'c2-1-1',
            name: 'Smartphones',
            slug: 'smartphones'
          },
          {
            id: 'c2-1-2',
            name: 'Teléfonos para conferencias',
            slug: 'telefonos-para-conferencias'
          },
          {
            id: 'c2-1-3',
            name: 'Móviles Senior',
            slug: 'moviles-senior'
          },
          {
            id: 'c2-1-4',
            name: 'PDA y Smartphones Rugerizados',
            slug: 'pda-y-smartphones-rugerizados'
          },
          {
            id: 'c2-1-5',
            name: 'Teléfonos fijos',
            slug: 'telefonos-fijos'
          }
        ]
      },
      {
        id: 'c2-2',
        name: 'Tablets',
        slug: 'tablets',
        children: [
          {
            id: 'c2-2-1',
            name: 'Tablets',
            slug: 'tablets'
          },
          {
            id: 'c2-2-2',
            name: 'Tabletas gráficas',
            slug: 'tabletas-graficas'
          },
          {
            id: 'c2-2-3',
            name: 'Tablets de escritura',
            slug: 'tablets-de-escritura'
          },
          {
            id: 'c2-2-4',
            name: 'Fundas para Tablets',
            slug: 'fundas-para-tablets'
          },
          {
            id: 'c2-2-5',
            name: 'Soportes de seguridad para tabletas',
            slug: 'soportes-de-seguridad-para-tabletas'
          },
          {
            id: 'c2-2-6',
            name: 'Accesorios para fundas de tabletas',
            slug: undefined
          }
        ]
      },
      {
        id: 'c2-3',
        name: 'E-books',
        slug: 'e-books',
        children: [
          {
            id: 'c2-3-1',
            name: 'Fundas para Ebooks',
            slug: 'fundas-para-ebooks'
          }
        ]
      },
      {
        id: 'c2-4',
        name: 'Equipos de navegación',
        slug: 'equipos-de-navegacion',
        children: [
          {
            id: 'c2-4-1',
            name: 'Navegadores',
            slug: 'navegadores'
          },
          {
            id: 'c2-4-2',
            name: 'Rastreadores gps',
            slug: 'rastreadores-gps'
          }
        ]
      },
      {
        id: 'c2-5',
        name: 'Accesorios telefonía',
        slug: 'accesorios-telefonia',
        children: [
          {
            id: 'c2-5-1',
            name: 'Teclados para Móviles/Tablets',
            slug: 'teclados-para-moviles-tablets'
          },
          {
            id: 'c2-5-2',
            name: 'Cables Apple',
            slug: 'cables-apple'
          },
          {
            id: 'c2-5-3',
            name: 'Cargadores',
            slug: 'cargadores'
          },
          {
            id: 'c2-5-4',
            name: 'Protectores de Pantalla',
            slug: 'protectores-de-pantalla'
          },
          {
            id: 'c2-5-5',
            name: 'Fundas para Móviles',
            slug: 'fundas-para-moviles'
          },
          {
            id: 'c2-5-6',
            name: 'Soportes',
            slug: 'soportes-wifi'
          },
          {
            id: 'c2-5-7',
            name: 'Powerbanks',
            slug: 'powerbanks'
          },
          {
            id: 'c2-5-8',
            name: 'Palos Selfie',
            slug: 'palos-selfie'
          },
          {
            id: 'c2-5-9',
            name: 'Lápiz Digital',
            slug: 'lapiz-digital'
          },
          {
            id: 'c2-5-10',
            name: 'Repetidores DECT',
            slug: undefined
          },
          {
            id: 'c2-5-11',
            name: 'Piezas de repuesto',
            slug: 'piezas-de-repuesto'
          },
          {
            id: 'c2-5-12',
            name: 'Estaciones Dock para Móviles',
            slug: 'estaciones-dock-para-moviles'
          }
        ]
      }
    ]
  },
  {
    id: 'c3',
    name: 'Componentes',
    slug: undefined,
    children: [
      {
        id: 'c3-1',
        name: 'Cajas y fuentes',
        slug: 'cajas-y-fuentes',
        children: [
          {
            id: 'c3-1-1',
            name: 'Chasis PC',
            slug: 'chasis-pc'
          },
          {
            id: 'c3-1-2',
            name: 'Fuentes de Alimentación',
            slug: 'fuentes-de-alimentacion'
          }
        ]
      },
      {
        id: 'c3-2',
        name: 'Memoria RAM',
        slug: 'memoria-ram',
        children: [
          {
            id: 'c3-2-1',
            name: 'Memoria RAM',
            slug: 'memoria-ram'
          }
        ]
      },
      {
        id: 'c3-3',
        name: 'Placas base',
        slug: 'placas-base',
        children: [
          {
            id: 'c3-3-1',
            name: 'Placas base',
            slug: 'placas-base'
          }
        ]
      },
      {
        id: 'c3-4',
        name: 'Procesadores',
        slug: 'procesadores',
        children: [
          {
            id: 'c3-4-1',
            name: 'Procesadores',
            slug: 'procesadores'
          }
        ]
      },
      {
        id: 'c3-5',
        name: 'Tarjetas',
        slug: 'tarjetas',
        children: [
          {
            id: 'c3-5-1',
            name: 'Tarjetas Gráficas',
            slug: 'tarjetas-graficas'
          },
          {
            id: 'c3-5-2',
            name: 'Tarjetas de Audio',
            slug: 'tarjetas-de-audio'
          },
          {
            id: 'c3-5-3',
            name: 'Tarjetas Controladoras',
            slug: 'tarjetas-controladoras'
          },
          {
            id: 'c3-5-4',
            name: 'Controlador RAID',
            slug: 'controlador-raid'
          }
        ]
      },
      {
        id: 'c3-6',
        name: 'Refrigeración',
        slug: 'refrigeracion',
        children: [
          {
            id: 'c3-6-1',
            name: 'Ventiladores',
            slug: 'ventiladores-pequenos-electrodomesticos'
          },
          {
            id: 'c3-6-2',
            name: 'Accesorios de refrigeración',
            slug: 'accesorios-de-refrigeracion'
          },
          {
            id: 'c3-6-3',
            name: 'Pasta Térmica',
            slug: 'pasta-termica'
          }
        ]
      },
      {
        id: 'c3-7',
        name: 'Adaptadores bahía',
        slug: 'adaptadores-bahia',
        children: [
          {
            id: 'c3-7-1',
            name: 'Kit de Montaje Bahías',
            slug: 'kit-de-montaje-bahias'
          },
          {
            id: 'c3-7-2',
            name: 'Adaptador Bahía',
            slug: 'adaptador-bahia'
          }
        ]
      },
      {
        id: 'c3-8',
        name: 'Accesorios para Rack',
        slug: 'accesorios-para-rack'
      },
      {
        id: 'c3-9',
        name: 'Componentes (otros)',
        slug: 'componentes-otros',
        children: [
          {
            id: 'c3-9-1',
            name: 'Soportes y monturas para estaciones de trabajo/ PC todo en uno',
            slug: 'soportes-y-monturas-para-estaciones-de-trabajo-pc-todo-en-uno'
          },
          {
            id: 'c3-9-2',
            name: 'Accesorios y piezas para soportes',
            slug: 'accesorios-y-piezas-para-soportes'
          },
          {
            id: 'c3-9-3',
            name: 'Tapones antipolvo para puertos',
            slug: 'tapones-antipolvo-para-puertos'
          },
          {
            id: 'c3-9-4',
            name: 'Controladores de velocidad del ventilador',
            slug: 'controladores-de-velocidad-del-ventilador'
          },
          {
            id: 'c3-9-5',
            name: 'Chasis de expansión para tarjetas gráficas externas',
            slug: 'chasis-de-expansion-para-tarjetas-graficas-externas'
          }
        ]
      }
    ]
  },
  {
    id: 'c4',
    name: 'Almacenamiento',
    slug: undefined,
    children: [
      {
        id: 'c4-1',
        name: 'Discos duros internos',
        slug: 'discos-duros-internos-discos-duros-internos',
        children: [
          {
            id: 'c4-1-1',
            name: 'Discos Duros Internos',
            slug: 'discos-duros-internos-discos-duros-internos'
          },
          {
            id: 'c4-1-2',
            name: 'Discos Duros Internos SSD',
            slug: 'discos-duros-internos-ssd'
          }
        ]
      },
      {
        id: 'c4-2',
        name: 'Estaciones Base',
        slug: 'estaciones-base'
      },
      {
        id: 'c4-3',
        name: 'Carcasas',
        slug: 'carcasas'
      },
      {
        id: 'c4-4',
        name: 'Discos Duros Externos',
        slug: 'discos-duros-externos',
        children: [
          {
            id: 'c4-4-1',
            name: 'Discos Duros Externos',
            slug: 'discos-duros-externos'
          },
          {
            id: 'c4-4-2',
            name: 'Discos Duros Externos SSD',
            slug: 'discos-duros-externos-ssd'
          }
        ]
      },
      {
        id: 'c4-5',
        name: 'Fundas y estuches para discos externos',
        slug: 'fundas-y-estuches-para-discos-externos'
      },
      {
        id: 'c4-6',
        name: 'Almacenamiento portátil',
        slug: 'almacenamiento-portatil',
        children: [
          {
            id: 'c4-6-1',
            name: 'Unidades de discos múltiples',
            slug: undefined
          },
          {
            id: 'c4-6-2',
            name: 'Pendrives USB',
            slug: 'pendrives-usb'
          },
          {
            id: 'c4-6-3',
            name: 'Tarjetas de Memorias Flash',
            slug: 'tarjetas-de-memorias-flash'
          },
          {
            id: 'c4-6-4',
            name: 'Cintas',
            slug: undefined
          },
          {
            id: 'c4-6-5',
            name: 'Lectores',
            slug: 'lectores'
          },
          {
            id: 'c4-6-6',
            name: 'Lector de tarjeta inteligente',
            slug: 'lector-de-tarjeta-inteligente'
          },
          {
            id: 'c4-6-7',
            name: 'Lector de Tarjetas',
            slug: 'lector-de-tarjetas'
          },
          {
            id: 'c4-6-8',
            name: 'Lector Grabador Óptico',
            slug: 'lector-grabador-optico'
          }
        ]
      }
    ]
  },
  {
    id: 'c5',
    name: 'Imagen y sonido',
    slug: undefined,
    children: [
      {
        id: 'c5-1',
        name: 'TV',
        slug: 'tv',
        children: [
          {
            id: 'c5-1-1',
            name: 'Accesorios para Soportes de Televisores',
            slug: 'accesorios-para-soportes-de-televisores'
          },
          {
            id: 'c5-1-2',
            name: 'Televisores LED',
            slug: 'televisores-led'
          },
          {
            id: 'c5-1-3',
            name: 'Televisores portátiles',
            slug: 'televisores-portatiles'
          },
          {
            id: 'c5-1-4',
            name: 'Soportes TV Pared',
            slug: 'soportes-tv-pared'
          },
          {
            id: 'c5-1-5',
            name: 'Soportes TV Suelo',
            slug: 'soportes-tv-suelo'
          },
          {
            id: 'c5-1-6',
            name: 'Convertidor de Smart TV',
            slug: 'convertidor-de-smart-tv'
          },
          {
            id: 'c5-1-7',
            name: 'Dongles Smart TV',
            slug: 'dongles-smart-tv'
          }
        ]
      },
      {
        id: 'c5-2',
        name: 'TDT y receptores satélite',
        slug: 'tdt-y-receptores-satelite'
      },
      {
        id: 'c5-3',
        name: 'Antenas de satélite',
        slug: 'antenas-de-satelite'
      },
      {
        id: 'c5-4',
        name: 'Proyección',
        slug: 'proyeccion',
        children: [
          {
            id: 'c5-4-1',
            name: 'Videoproyector',
            slug: 'videoproyector'
          },
          {
            id: 'c5-4-2',
            name: 'Montajes para Proyectores',
            slug: 'montajes-para-proyectores'
          },
          {
            id: 'c5-4-3',
            name: 'Proyector de TV',
            slug: 'proyector-de-tv'
          }
        ]
      },
      {
        id: 'c5-5',
        name: 'Auriculares',
        slug: 'auriculares',
        children: [
          {
            id: 'c5-5-1',
            name: 'Auriculares con Micrófono',
            slug: 'auriculares-con-microfono'
          },
          {
            id: 'c5-5-2',
            name: 'Fundas Auriculares',
            slug: 'fundas-auriculares'
          }
        ]
      },
      {
        id: 'c5-6',
        name: 'Vídeo',
        slug: 'video',
        children: [
          {
            id: 'c5-6-1',
            name: 'Sistemas de videoconferencia',
            slug: 'sistemas-de-videoconferencia'
          },
          {
            id: 'c5-6-2',
            name: 'Monitores para videoconferencias',
            slug: 'monitores-para-videoconferencias'
          },
          {
            id: 'c5-6-3',
            name: 'Acc. Sist. videoconferencia',
            slug: 'acc-sist-videoconferencia'
          },
          {
            id: 'c5-6-4',
            name: 'Grabadores vídeo en red NVR',
            slug: 'grabadores-video-en-red-nvr'
          },
          {
            id: 'c5-6-5',
            name: 'Splitter Vídeo',
            slug: 'splitter-video'
          },
          {
            id: 'c5-6-6',
            name: 'Switches de Video',
            slug: 'switches-de-video'
          },
          {
            id: 'c5-6-7',
            name: 'Convertidores de Vídeo',
            slug: undefined
          },
          {
            id: 'c5-6-8',
            name: 'Capturadores de Video',
            slug: 'capturadores-de-video'
          },
          {
            id: 'c5-6-9',
            name: 'Cámaras de videoconferencia',
            slug: 'camaras-de-videoconferencia'
          },
          {
            id: 'c5-6-10',
            name: 'Punteros',
            slug: undefined
          }
        ]
      },
      {
        id: 'c5-7',
        name: 'Fotografía',
        slug: 'fotografia',
        children: [
          {
            id: 'c5-7-1',
            name: 'Anillos de iluminación',
            slug: 'anillos-de-iluminacion'
          },
          {
            id: 'c5-7-2',
            name: 'Películas instantáneas',
            slug: 'peliculas-instantaneas'
          },
          {
            id: 'c5-7-3',
            name: 'Dashcams',
            slug: 'dashcams'
          },
          {
            id: 'c5-7-4',
            name: 'Accesorios para Cámaras',
            slug: undefined
          },
          {
            id: 'c5-7-5',
            name: 'Correas',
            slug: undefined
          },
          {
            id: 'c5-7-6',
            name: 'Kit para cámaras',
            slug: 'kit-para-camaras'
          },
          {
            id: 'c5-7-7',
            name: 'Fundas',
            slug: 'fundas'
          },
          {
            id: 'c5-7-8',
            name: 'Marco fotográfico digital',
            slug: 'marco-fotografico-digital'
          }
        ]
      },
      {
        id: 'c5-8',
        name: 'Display Interactivo',
        slug: 'display-interactivo',
        children: [
          {
            id: 'c5-8-1',
            name: 'Pantallas interactivas',
            slug: 'pantallas-interactivas'
          },
          {
            id: 'c5-8-2',
            name: 'Pantallas murales de vídeo',
            slug: 'pantallas-murales-de-video'
          },
          {
            id: 'c5-8-3',
            name: 'Soportes para pantallas murales de vídeo en pared',
            slug: 'soportes-para-pantallas-murales-de-video-en-pared'
          },
          {
            id: 'c5-8-4',
            name: 'Pizarras digitales',
            slug: 'pizarras-digitales'
          },
          {
            id: 'c5-8-5',
            name: 'Procesadores de pared de vídeo',
            slug: 'procesadores-de-pared-de-video'
          }
        ]
      },
      {
        id: 'c5-9',
        name: 'Reproductores y radios',
        slug: 'reproductores-y-radios',
        children: [
          {
            id: 'c5-9-1',
            name: 'Radios',
            slug: 'radios'
          },
          {
            id: 'c5-9-2',
            name: 'Receptores de Radio',
            slug: undefined
          },
          {
            id: 'c5-9-3',
            name: 'Reproductores LP',
            slug: 'reproductores-lp'
          },
          {
            id: 'c5-9-4',
            name: 'Autorradios',
            slug: 'autorradios'
          }
        ]
      },
      {
        id: 'c5-10',
        name: 'Altavoces',
        slug: 'altavoces',
        children: [
          {
            id: 'c5-10-1',
            name: 'Altavoces',
            slug: 'altavoces'
          },
          {
            id: 'c5-10-2',
            name: 'Altavoz',
            slug: 'altavoz'
          },
          {
            id: 'c5-10-3',
            name: 'Altavoces Portátiles',
            slug: 'altavoces-portatiles'
          },
          {
            id: 'c5-10-4',
            name: 'Barras de sonido',
            slug: 'barras-de-sonido'
          },
          {
            id: 'c5-10-5',
            name: 'Sistema de Altavoces',
            slug: 'sistema-de-altavoces'
          },
          {
            id: 'c5-10-6',
            name: 'Soportes de altavoces',
            slug: 'soportes-de-altavoces'
          },
          {
            id: 'c5-10-7',
            name: 'Amplificadores de audio',
            slug: 'amplificadores-de-audio'
          }
        ]
      },
      {
        id: 'c5-11',
        name: 'Micrófonos',
        slug: 'microfonos',
        children: [
          {
            id: 'c5-11-1',
            name: 'Micrófonos',
            slug: 'microfonos'
          },
          {
            id: 'c5-11-2',
            name: 'Soportes para micrófono',
            slug: 'soportes-para-microfono'
          }
        ]
      },
      {
        id: 'c5-12',
        name: 'Sistemas de audio',
        slug: 'sistemas-de-audio-sistemas-de-audio',
        children: [
          {
            id: 'c5-12-1',
            name: 'Sistemas de Audio',
            slug: 'sistemas-de-audio-sistemas-de-audio'
          },
          {
            id: 'c5-12-2',
            name: 'Mandos a Distancia',
            slug: 'mandos-a-distancia'
          }
        ]
      },
      {
        id: 'c5-13',
        name: 'Sonido y Home Cinema',
        slug: 'sonido-y-home-cinema',
        children: [
          {
            id: 'c5-13-1',
            name: 'Audio/Vídeo Extendedores',
            slug: 'audio-video-extendedores'
          }
        ]
      }
    ]
  },
  {
    id: 'c6',
    name: 'impresoras y consumibles',
    slug: undefined,
    children: [
      {
        id: 'c6-1',
        name: 'Impresoras',
        slug: 'impresoras',
        children: [
          {
            id: 'c6-1-1',
            name: 'Impresoras Multifunción',
            slug: 'impresoras-multifuncion'
          },
          {
            id: 'c6-1-2',
            name: 'Impresoras de Inyección',
            slug: 'impresoras-de-inyeccion'
          },
          {
            id: 'c6-1-3',
            name: 'Impresoras Láser/Led',
            slug: 'impresoras-laser-led'
          },
          {
            id: 'c6-1-4',
            name: 'Impresoras Portátiles',
            slug: 'impresoras-portatiles'
          },
          {
            id: 'c6-1-5',
            name: 'Impresoras de Etiquetas Adhesivas',
            slug: 'impresoras-de-etiquetas-adhesivas'
          },
          {
            id: 'c6-1-6',
            name: 'Impresoras de Etiquetas POS',
            slug: 'impresoras-de-etiquetas-pos'
          },
          {
            id: 'c6-1-7',
            name: 'Impresoras de tarjetas plásticas',
            slug: undefined
          },
          {
            id: 'c6-1-8',
            name: 'Impresoras Matriciales',
            slug: 'impresoras-matriciales'
          }
        ]
      },
      {
        id: 'c6-2',
        name: 'Escáneres',
        slug: 'escaneres',
        children: [
          {
            id: 'c6-2-1',
            name: 'Escáneres',
            slug: 'escaneres'
          }
        ]
      },
      {
        id: 'c6-3',
        name: 'Consumibles',
        slug: 'consumibles',
        children: [
          {
            id: 'c6-3-1',
            name: 'Bobinas de Transferencia Térmica',
            slug: undefined
          },
          {
            id: 'c6-3-2',
            name: 'Limpiador de impresoras',
            slug: 'limpiador-de-impresoras'
          },
          {
            id: 'c6-3-3',
            name: 'Tarjetas de plástico en blanco',
            slug: undefined
          },
          {
            id: 'c6-3-4',
            name: 'Cinta térmica',
            slug: 'cinta-termica'
          },
          {
            id: 'c6-3-5',
            name: 'Cartuchos de Tinta',
            slug: 'cartuchos-de-tinta'
          },
          {
            id: 'c6-3-6',
            name: 'Tóner y Cartuchos Láser',
            slug: 'toner-y-cartuchos-laser'
          },
          {
            id: 'c6-3-7',
            name: 'Recambios de tinta',
            slug: 'recambios-de-tinta'
          },
          {
            id: 'c6-3-8',
            name: 'Cartucho Impresora Tarjetas',
            slug: 'cartucho-impresora-tarjetas'
          },
          {
            id: 'c6-3-9',
            name: 'Cintas para Etiquetas',
            slug: 'cintas-para-etiquetas'
          },
          {
            id: 'c6-3-10',
            name: 'Etiquetas de Impresora',
            slug: 'etiquetas-de-impresora'
          },
          {
            id: 'c6-3-11',
            name: 'Papel Térmico',
            slug: 'papel-termico'
          },
          {
            id: 'c6-3-12',
            name: 'Papel Fotográfico',
            slug: 'papel-fotografico'
          },
          {
            id: 'c6-3-13',
            name: 'Materiales de Impresión 3D',
            slug: 'materiales-de-impresion-3d'
          }
        ]
      },
      {
        id: 'c6-4',
        name: 'Recambios',
        slug: 'recambios',
        children: [
          {
            id: 'c6-4-1',
            name: 'Kit Mantenimiento',
            slug: 'kit-mantenimiento'
          },
          {
            id: 'c6-4-2',
            name: 'Piezas de repuesto para impresión',
            slug: 'piezas-de-repuesto-para-impresion'
          },
          {
            id: 'c6-4-3',
            name: 'Cabezales de Impresion',
            slug: 'cabezales-de-impresion'
          },
          {
            id: 'c6-4-4',
            name: 'Correas para Impresoras',
            slug: undefined
          },
          {
            id: 'c6-4-5',
            name: 'Videoconsolas portátiles',
            slug: 'videoconsolas-portatiles'
          },
          {
            id: 'c6-4-6',
            name: 'Escritorios Gaming',
            slug: 'escritorios-gaming'
          },
          {
            id: 'c6-4-7',
            name: 'Gafas Realidad Virtual',
            slug: 'gafas-realidad-virtual'
          },
          {
            id: 'c6-4-8',
            name: 'Silla Gaming',
            slug: 'silla-gaming'
          }
        ]
      }
    ]
  },
  {
    id: 'c8',
    name: 'Gaming',
    slug: 'gaming',
    children: [
      {
        id: 'c8-1',
        name: 'Videojuegos, Consolas y Accesorios',
        slug: 'videojuegos-consolas-y-accesorios',
        children: [
          {
            id: 'c8-1-1',
            name: 'Accesorios para simulador de vuelo/carreras',
            slug: 'accesorios-para-simulador-de-vuelo-carreras'
          },
          {
            id: 'c8-1-2',
            name: 'Videoconsolas',
            slug: 'videoconsolas'
          },
          {
            id: 'c8-1-3',
            name: 'Fundas para consolas portátiles',
            slug: 'fundas-para-consolas-portatiles'
          },
          {
            id: 'c8-1-4',
            name: 'Mandos, Volantes y Joysticks',
            slug: 'mandos-volantes-y-joysticks'
          },
          {
            id: 'c8-1-5',
            name: 'Accesorios Consola',
            slug: 'accesorios-consola'
          },
          {
            id: 'c8-1-6',
            name: 'Accesorios de controlador de juego',
            slug: 'accesorios-de-controlador-de-juego'
          }
        ]
      }
    ]
  },
  {
    id: 'c9',
    name: 'software',
    slug: undefined,
    children: [
      {
        id: 'c9-1',
        name: 'Sistemas Operativos',
        slug: 'sistemas-operativos',
        children: [
          {
            id: 'c9-1-1',
            name: 'Sistemas Operativos',
            slug: 'sistemas-operativos'
          }
        ]
      },
      {
        id: 'c9-2',
        name: 'Seguridad',
        slug: 'seguridad',
        children: [
          {
            id: 'c9-2-1',
            name: 'Seguridad y Antivirus',
            slug: 'seguridad-y-antivirus'
          }
        ]
      },
      {
        id: 'c9-3',
        name: 'Software TPV',
        slug: undefined,
        children: [
          {
            id: 'c9-3-1',
            name: 'Software de gráficos',
            slug: undefined
          },
          {
            id: 'c9-3-2',
            name: 'Software de dirección de red',
            slug: undefined
          },
          {
            id: 'c9-3-3',
            name: 'Barcode & Labelling Software',
            slug: undefined
          },
          {
            id: 'c9-3-4',
            name: 'Software de videovigilancia',
            slug: undefined
          }
        ]
      },
      {
        id: 'c9-4',
        name: 'Software (otros)',
        slug: 'software-otros',
        children: [
          {
            id: 'c9-4-1',
            name: 'Suites de Programas',
            slug: undefined
          },
          {
            id: 'c9-4-2',
            name: 'Licencias y Actualizaciones',
            slug: 'licencias-y-actualizaciones'
          }
        ]
      }
    ]
  },
  {
    id: 'c10',
    name: 'conectividad y herramientas',
    slug: undefined,
    children: [
      {
        id: 'c10-1',
        name: 'Wifi',
        slug: 'wifi',
        children: [
          {
            id: 'c10-1-1',
            name: 'Cajas de conexiones de red',
            slug: 'cajas-de-conexiones-de-red'
          },
          {
            id: 'c10-1-2',
            name: 'Unidades/terminales de red óptica (ONT/ONU)',
            slug: 'unidades-terminales-de-red-optica-ont-onu'
          },
          {
            id: 'c10-1-3',
            name: 'Dispositivos para redes celulares',
            slug: 'dispositivos-para-redes-celulares'
          },
          {
            id: 'c10-1-4',
            name: 'Amplificador de señal celular',
            slug: undefined
          },
          {
            id: 'c10-1-5',
            name: 'Amplificador de señal Wi-fi',
            slug: 'amplificador-de-senal-wi-fi'
          },
          {
            id: 'c10-1-6',
            name: 'Mesh Wi-Fi Systems',
            slug: 'mesh-wi-fi-systems'
          },
          {
            id: 'c10-1-7',
            name: 'Accesorios para antenas de red',
            slug: 'accesorios-para-antenas-de-red'
          },
          {
            id: 'c10-1-8',
            name: 'Pasarelas y controladores',
            slug: 'pasarelas-y-controladores'
          },
          {
            id: 'c10-1-9',
            name: 'Cortafuegos (hardware)',
            slug: 'cortafuegos-hardware'
          },
          {
            id: 'c10-1-10',
            name: 'Puntos de Acceso',
            slug: 'puntos-de-acceso'
          },
          {
            id: 'c10-1-11',
            name: 'Antenas',
            slug: 'antenas'
          },
          {
            id: 'c10-1-12',
            name: 'Kit de Montaje Wifi',
            slug: 'kit-de-montaje-wifi'
          },
          {
            id: 'c10-1-13',
            name: 'Módulos de Conmutador de Red',
            slug: 'modulos-de-conmutador-de-red'
          },
          {
            id: 'c10-1-14',
            name: 'Módulos de conectores de red',
            slug: 'modulos-de-conectores-de-red'
          },
          {
            id: 'c10-1-15',
            name: 'Soportes',
            slug: 'soportes-wifi'
          },
          {
            id: 'c10-1-16',
            name: 'Piezas de repuesto para equipos de red',
            slug: 'piezas-de-repuesto-para-equipos-de-red'
          }
        ]
      },
      {
        id: 'c10-2',
        name: 'Routers y Modems',
        slug: 'routers-y-modems',
        children: [
          {
            id: 'c10-2-1',
            name: 'Routers Wireless',
            slug: 'routers-wireless'
          },
          {
            id: 'c10-2-2',
            name: 'Routers con cable',
            slug: 'routers-con-cable'
          }
        ]
      },
      {
        id: 'c10-3',
        name: 'Repetidores y extensores',
        slug: 'repetidores-y-extensores',
        children: [
          {
            id: 'c10-3-1',
            name: 'Powerline',
            slug: 'powerline'
          },
          {
            id: 'c10-3-2',
            name: 'Amplificadores de Red',
            slug: 'amplificadores-de-red'
          },
          {
            id: 'c10-3-3',
            name: 'Repetidores',
            slug: 'repetidores'
          }
        ]
      },
      {
        id: 'c10-4',
        name: 'Switches y Transceptores',
        slug: 'switches-y-transceptores',
        children: [
          {
            id: 'c10-4-1',
            name: 'Interruptores KVM',
            slug: 'interruptores-kvm'
          },
          {
            id: 'c10-4-2',
            name: 'Switches',
            slug: 'switches'
          },
          {
            id: 'c10-4-3',
            name: 'Transceptores',
            slug: 'transceptores'
          }
        ]
      },
      {
        id: 'c10-5',
        name: 'Sistemas de alimentación',
        slug: 'sistemas-de-alimentacion',
        children: [
          {
            id: 'c10-5-1',
            name: 'Adaptadores y Convertidores',
            slug: 'adaptadores-y-convertidores'
          },
          {
            id: 'c10-5-2',
            name: 'Adaptadores gráficos USB',
            slug: 'adaptadores-graficos-usb'
          },
          {
            id: 'c10-5-3',
            name: 'Adaptadores y Tarjetas de red',
            slug: 'adaptadores-y-tarjetas-de-red'
          },
          {
            id: 'c10-5-4',
            name: 'Servidores de impresión',
            slug: undefined
          },
          {
            id: 'c10-5-5',
            name: 'Adaptadores de Cable de Vídeo',
            slug: 'adaptadores-de-cable-de-video'
          },
          {
            id: 'c10-5-6',
            name: 'Adaptadores de Cable',
            slug: 'adaptadores-de-cable'
          },
          {
            id: 'c10-5-7',
            name: 'Adaptadores e inyectores de PoE',
            slug: 'adaptadores-e-inyectores-de-poe'
          },
          {
            id: 'c10-5-8',
            name: 'Hub USB',
            slug: 'hub-usb'
          },
          {
            id: 'c10-5-9',
            name: 'Convertidores de Red',
            slug: 'convertidores-de-red'
          },
          {
            id: 'c10-5-10',
            name: 'Splitter',
            slug: 'splitter'
          }
        ]
      },
      {
        id: 'c10-6',
        name: 'Rack',
        slug: 'rack',
        children: [
          {
            id: 'c10-6-1',
            name: 'Cabinetes y armarios para equipos de red',
            slug: 'cabinetes-y-armarios-para-equipos-de-red'
          },
          {
            id: 'c10-6-2',
            name: 'Armarios Rack',
            slug: 'armarios-rack'
          },
          {
            id: 'c10-6-3',
            name: 'Paneles de parcheo',
            slug: 'paneles-de-parcheo'
          },
          {
            id: 'c10-6-4',
            name: 'Acc. paneles de parcheo',
            slug: 'acc-paneles-de-parcheo'
          },
          {
            id: 'c10-6-5',
            name: 'Chasis de Red',
            slug: 'chasis-de-red'
          },
          {
            id: 'c10-6-6',
            name: 'Terminales de líneas ópticas',
            slug: 'terminales-de-lineas-opticas'
          },
          {
            id: 'c10-6-7',
            name: 'Equipos de refrigeración para racks',
            slug: 'equipos-de-refrigeracion-para-racks'
          }
        ]
      },
      {
        id: 'c10-7',
        name: 'Cables y Conectores',
        slug: 'cables-y-conectores',
        children: [
          {
            id: 'c10-7-1',
            name: 'Cables de Alimentación',
            slug: 'cables-de-alimentacion'
          },
          {
            id: 'c10-7-2',
            name: 'Cables USB',
            slug: 'cables-usb'
          },
          {
            id: 'c10-7-3',
            name: 'Cables Ethernet',
            slug: 'cables-ethernet'
          },
          {
            id: 'c10-7-4',
            name: 'Cables HDMI',
            slug: 'cables-hdmi'
          },
          {
            id: 'c10-7-5',
            name: 'Cables VGA',
            slug: 'cables-vga'
          },
          {
            id: 'c10-7-6',
            name: 'Cables DisplayPort',
            slug: 'cables-displayport'
          },
          {
            id: 'c10-7-7',
            name: 'Cables seriales',
            slug: 'cables-seriales'
          },
          {
            id: 'c10-7-8',
            name: 'Cables de Audio',
            slug: 'cables-de-audio'
          },
          {
            id: 'c10-7-9',
            name: 'Cables de SATA',
            slug: 'cables-de-sata'
          },
          {
            id: 'c10-7-10',
            name: 'Conectores de fibra óptica',
            slug: undefined
          },
          {
            id: 'c10-7-11',
            name: 'Accesorios para cables',
            slug: 'accesorios-para-cables'
          },
          {
            id: 'c10-7-12',
            name: 'Cables',
            slug: 'cables'
          },
          {
            id: 'c10-7-13',
            name: 'Adaptadores de fibra óptica',
            slug: 'adaptadores-de-fibra-optica'
          },
          {
            id: 'c10-7-14',
            name: 'Conectores',
            slug: 'conectores'
          },
          {
            id: 'c10-7-15',
            name: 'Divisores de cable coaxial',
            slug: undefined
          },
          {
            id: 'c10-7-16',
            name: 'Conectores y Adapt. Coaxiales',
            slug: undefined
          },
          {
            id: 'c10-7-17',
            name: 'Cables Internos de Corriente',
            slug: 'cables-internos-de-corriente'
          },
          {
            id: 'c10-7-18',
            name: 'Cables de Fibra Óptica',
            slug: 'cables-de-fibra-optica'
          },
          {
            id: 'c10-7-19',
            name: 'Cables Paralelos',
            slug: 'cables-paralelos'
          },
          {
            id: 'c10-7-20',
            name: 'Cables (varios)',
            slug: 'cables-varios'
          }
        ]
      },
      {
        id: 'c10-8',
        name: 'Medición, pruebas y control',
        slug: 'medicion-pruebas-y-control',
        children: [
          {
            id: 'c10-8-1',
            name: 'Equipamiento para análisis y medición',
            slug: 'equipamiento-para-analisis-y-medicion'
          }
        ]
      },
      {
        id: 'c10-9',
        name: 'Herramientas',
        slug: 'herramientas',
        children: [
          {
            id: 'c10-9-1',
            name: 'Taladros',
            slug: 'taladros'
          },
          {
            id: 'c10-9-2',
            name: 'Destornilladores eléctricos y llaves de impacto',
            slug: 'destornilladores-electricos-y-llaves-de-impacto'
          },
          {
            id: 'c10-9-3',
            name: 'Pistolas de clavos y grapadoras',
            slug: 'pistolas-de-clavos-y-grapadoras'
          },
          {
            id: 'c10-9-4',
            name: 'Bombas de aire eléctricas',
            slug: 'bombas-de-aire-electricas'
          },
          {
            id: 'c10-9-5',
            name: 'Soportes y escuadras',
            slug: undefined
          },
          {
            id: 'c10-9-6',
            name: 'Crimpadoras',
            slug: 'crimpadoras'
          },
          {
            id: 'c10-9-7',
            name: 'Cable Tester',
            slug: 'cable-tester'
          },
          {
            id: 'c10-9-8',
            name: 'Pelacables',
            slug: 'pelacables'
          },
          {
            id: 'c10-9-9',
            name: 'Destornilladores',
            slug: 'destornilladores'
          },
          {
            id: 'c10-9-10',
            name: 'Toallitas Limpieza Pantallas',
            slug: 'toallitas-limpieza-pantallas'
          },
          {
            id: 'c10-9-11',
            name: 'Spray Aire Comprimido',
            slug: 'spray-aire-comprimido'
          },
          {
            id: 'c10-9-12',
            name: 'Atornilladoras de impacto con batería',
            slug: 'atornilladoras-de-impacto-con-bateria'
          },
          {
            id: 'c10-9-13',
            name: 'Accesorios para herramientas de instalación de cables',
            slug: 'accesorios-para-herramientas-de-instalacion-de-cables'
          },
          {
            id: 'c10-9-14',
            name: 'Tijeras de electricista',
            slug: 'tijeras-de-electricista'
          }
        ]
      }
    ]
  },
  {
    id: 'c11',
    name: 'deporte y tiempo libre',
    slug: undefined,
    children: [
      {
        id: 'c11-1',
        name: 'Bicicletas y accesorios',
        slug: 'bicicletas-y-accesorios',
        children: [
          {
            id: 'c11-1-1',
            name: 'Ordenador para bicicletas',
            slug: 'ordenador-para-bicicletas'
          },
          {
            id: 'c11-1-2',
            name: 'Cámaras de visión trasera para bicicletas',
            slug: 'camaras-de-vision-trasera-para-bicicletas'
          }
        ]
      },
      {
        id: 'c11-2',
        name: 'Equipamiento deportivo',
        slug: 'equipamiento-deportivo',
        children: [
          {
            id: 'c11-2-1',
            name: 'Elíptica',
            slug: 'eliptica'
          },
          {
            id: 'c11-2-2',
            name: 'Bicicletas estáticas',
            slug: 'bicicletas-estaticas'
          },
          {
            id: 'c11-2-3',
            name: 'Caminadoras',
            slug: 'caminadoras'
          },
          {
            id: 'c11-2-4',
            name: 'Máquinas de remo',
            slug: 'maquinas-de-remo'
          },
          {
            id: 'c11-2-5',
            name: 'Pedalinas',
            slug: 'pedalinas'
          },
          {
            id: 'c11-2-6',
            name: 'Cuerdas para saltar',
            slug: 'cuerdas-para-saltar'
          }
        ]
      },
      {
        id: 'c11-3',
        name: 'Patinetes y scooters',
        slug: 'patinetes-y-scooters',
        children: [
          {
            id: 'c11-3-1',
            name: 'Patinete Eléctrico',
            slug: 'patinete-electrico'
          }
        ]
      },
      {
        id: 'c11-4',
        name: 'Relojes Inteligentes',
        slug: 'relojes-inteligentes',
        children: [
          {
            id: 'c11-4-1',
            name: 'Smartwatches',
            slug: 'smartwatches'
          },
          {
            id: 'c11-4-2',
            name: 'Pulseras de Actividad',
            slug: 'pulseras-de-actividad'
          }
        ]
      },
      {
        id: 'c11-5',
        name: 'Camping, turismo y exteriores',
        slug: 'camping-turismo-y-exteriores',
        children: [
          {
            id: 'c11-5-1',
            name: 'Mochilas de excursión',
            slug: 'mochilas-de-excursion'
          },
          {
            id: 'c11-5-2',
            name: 'Linternas de camping',
            slug: 'linternas-de-camping'
          },
          {
            id: 'c11-5-3',
            name: 'Nevera portátil',
            slug: 'nevera-portatil'
          }
        ]
      }
    ]
  },
  {
    id: 'c12',
    name: 'TPVs',
    slug: undefined,
    children: [
      {
        id: 'c12-1',
        name: 'TPV, Lectores e Impresoras',
        slug: 'tpv-lectores-e-impresoras',
        children: [
          {
            id: 'c12-1-1',
            name: 'TPVs y Monitores',
            slug: 'tpvs-y-monitores'
          },
          {
            id: 'c12-1-2',
            name: 'Lectores de código barras',
            slug: 'lectores-de-codigo-barras'
          },
          {
            id: 'c12-1-3',
            name: 'TPVs homologados Verifactu',
            slug: undefined
          },
          {
            id: 'c12-1-4',
            name: 'Accesorios TPV',
            slug: 'accesorios-tpv'
          },
          {
            id: 'c12-1-5',
            name: 'Cortadores',
            slug: 'cortadores'
          },
          {
            id: 'c12-1-6',
            name: 'Accesorios para terminales de punto de venta',
            slug: undefined
          },
          {
            id: 'c12-1-7',
            name: 'Contadores de dinero',
            slug: 'contadores-de-dinero'
          },
          {
            id: 'c12-1-8',
            name: 'Cajones de efectivo',
            slug: 'cajones-de-efectivo'
          },
          {
            id: 'c12-1-9',
            name: 'Cargadores de Batería',
            slug: 'cargadores-de-bateria'
          },
          {
            id: 'c12-1-10',
            name: 'Lectores de tarjeta magnética',
            slug: 'lectores-de-tarjeta-magnetica'
          },
          {
            id: 'c12-1-11',
            name: 'Detectores de billetes falsos',
            slug: 'detectores-de-billetes-falsos'
          },
          {
            id: 'c12-1-12',
            name: 'Visores de Cliente',
            slug: 'visores-de-cliente'
          },
          {
            id: 'c12-1-13',
            name: 'Lectores RFID',
            slug: 'lectores-rfid'
          },
          {
            id: 'c12-1-14',
            name: 'Soportes, Accesorios y Recambios',
            slug: 'soportes-accesorios-y-recambios'
          },
          {
            id: 'c12-1-15',
            name: 'Capturador de Firmas',
            slug: 'capturador-de-firmas'
          }
        ]
      }
    ]
  },
  {
    id: 'c13',
    name: 'oficina y electricidad',
    slug: undefined,
    children: [
      {
        id: 'c13-1',
        name: 'Artículos de papelería y oficina',
        slug: 'articulos-de-papeleria-y-oficina',
        children: [
          {
            id: 'c13-1-1',
            name: 'Cajas de almacenaje',
            slug: 'cajas-de-almacenaje'
          },
          {
            id: 'c13-1-2',
            name: 'Organizadores para estación de carga',
            slug: undefined
          },
          {
            id: 'c13-1-3',
            name: 'Bolígrafo de gel',
            slug: 'boligrafo-de-gel'
          }
        ]
      },
      {
        id: 'c13-2',
        name: 'Muebles de oficina',
        slug: 'muebles-de-oficina',
        children: [
          {
            id: 'c13-2-1',
            name: 'Mesas de escritorio',
            slug: 'mesas-de-escritorio'
          },
          {
            id: 'c13-2-2',
            name: 'Soportes para el apoyo de pies',
            slug: 'soportes-para-el-apoyo-de-pies'
          },
          {
            id: 'c13-2-3',
            name: 'Estructuras regulables para escritorio',
            slug: undefined
          },
          {
            id: 'c13-2-4',
            name: 'Atriles',
            slug: 'atriles'
          },
          {
            id: 'c13-2-5',
            name: 'Muebles y soportes para dispositivos multimedia',
            slug: 'muebles-y-soportes-para-dispositivos-multimedia'
          }
        ]
      },
      {
        id: 'c13-3',
        name: 'Smarthome y Seguridad',
        slug: 'smarthome-y-seguridad',
        children: [
          {
            id: 'c13-3-1',
            name: 'Llaveros',
            slug: 'llaveros'
          },
          {
            id: 'c13-3-2',
            name: 'Cámaras de Vigilancia',
            slug: 'camaras-de-vigilancia'
          },
          {
            id: 'c13-3-3',
            name: 'Accesorios para cámaras de seguridad',
            slug: 'accesorios-para-camaras-de-seguridad'
          },
          {
            id: 'c13-3-4',
            name: 'Controles de Acceso',
            slug: 'controles-de-acceso'
          },
          {
            id: 'c13-3-5',
            name: 'Servidores de vigilancia en red',
            slug: 'servidores-de-vigilancia-en-red'
          },
          {
            id: 'c13-3-6',
            name: 'Sistemas de seguridad inteligente',
            slug: 'sistemas-de-seguridad-inteligente'
          },
          {
            id: 'c13-3-7',
            name: 'Sensores de temperatura y humedad',
            slug: 'sensores-de-temperatura-y-humedad'
          },
          {
            id: 'c13-3-8',
            name: 'Videograbadores digitales',
            slug: undefined
          },
          {
            id: 'c13-3-9',
            name: 'Detectores de movimiento',
            slug: 'detectores-de-movimiento'
          },
          {
            id: 'c13-3-10',
            name: 'Botones de alarma de pánico',
            slug: undefined
          },
          {
            id: 'c13-3-11',
            name: 'Sensores de puertas y ventanas',
            slug: 'sensores-de-puertas-y-ventanas'
          }
        ]
      },
      {
        id: 'c13-4',
        name: 'Cargadores, Equipos Eléctricos y Suministros',
        slug: 'cargadores-equipos-electricos-y-suministros',
        children: [
          {
            id: 'c13-4-1',
            name: 'Interruptores de luz',
            slug: 'interruptores-de-luz'
          },
          {
            id: 'c13-4-2',
            name: 'Placas de pared y cubiertas de interruptor',
            slug: 'placas-de-pared-y-cubiertas-de-interruptor'
          },
          {
            id: 'c13-4-3',
            name: 'Organizadores de cables',
            slug: 'organizadores-de-cables'
          },
          {
            id: 'c13-4-4',
            name: 'Tubos termorretráctiles',
            slug: 'tubos-termorretractiles'
          },
          {
            id: 'c13-4-5',
            name: 'Conmutadores de transferencia automática (ATS)',
            slug: 'conmutadores-de-transferencia-automatica-ats'
          },
          {
            id: 'c13-4-6',
            name: 'Pasacables',
            slug: 'pasacables'
          },
          {
            id: 'c13-4-7',
            name: 'Reguladores de voltaje',
            slug: 'reguladores-de-voltaje'
          },
          {
            id: 'c13-4-8',
            name: 'Temporizadores eléctricos',
            slug: undefined
          },
          {
            id: 'c13-4-9',
            name: 'Accesorios para contadores eléctricos',
            slug: undefined
          },
          {
            id: 'c13-4-10',
            name: 'Cables de alta, media y baja tensión',
            slug: undefined
          },
          {
            id: 'c13-4-11',
            name: 'Placas solares',
            slug: 'placas-solares'
          },
          {
            id: 'c13-4-12',
            name: 'Accesorios para montajes de paneles solares',
            slug: 'accesorios-para-montajes-de-paneles-solares'
          },
          {
            id: 'c13-4-13',
            name: 'Kits de energía solar',
            slug: 'kits-de-energia-solar'
          }
        ]
      },
      {
        id: 'c13-5',
        name: 'Iluminación',
        slug: 'iluminacion',
        children: [
          {
            id: 'c13-5-1',
            name: 'Cinta luminosa',
            slug: 'cinta-luminosa'
          },
          {
            id: 'c13-5-2',
            name: 'Luces nocturnas',
            slug: 'luces-nocturnas'
          },
          {
            id: 'c13-5-3',
            name: 'Bombillas inteligentes',
            slug: 'bombillas-inteligentes'
          },
          {
            id: 'c13-5-4',
            name: 'Lámparas de mesa',
            slug: 'lamparas-de-mesa'
          }
        ]
      }
    ]
  },
  {
    id: 'c14',
    name: 'energia y electricidad',
    slug: undefined,
    children: [
      {
        id: 'c14-1',
        name: 'Electricidad',
        slug: 'electricidad',
        children: [
          {
            id: 'c14-1-1',
            name: 'SAI (UPS)',
            slug: 'sai-ups'
          },
          {
            id: 'c14-1-2',
            name: 'Lámparas para paneles LED',
            slug: 'lamparas-para-paneles-led'
          },
          {
            id: 'c14-1-3',
            name: 'Armarios y baterías para SAI',
            slug: 'armarios-y-baterias-para-sai'
          },
          {
            id: 'c14-1-4',
            name: 'Adaptadores para enchufe',
            slug: 'adaptadores-para-enchufe'
          },
          {
            id: 'c14-1-5',
            name: 'Enchufes inteligentes',
            slug: 'enchufes-inteligentes'
          },
          {
            id: 'c14-1-6',
            name: 'Tomas de pared con USB',
            slug: 'tomas-de-pared-con-usb'
          },
          {
            id: 'c14-1-7',
            name: 'Pilas',
            slug: 'pilas'
          },
          {
            id: 'c14-1-8',
            name: 'Regletas',
            slug: 'regletas-electricidad'
          },
          {
            id: 'c14-1-9',
            name: 'Limitador de Tensión',
            slug: 'limitador-de-tension'
          },
          {
            id: 'c14-1-10',
            name: 'Cajas de Salida',
            slug: 'cajas-de-salida'
          }
        ]
      },
      {
        id: 'c14-2',
        name: 'Energia fotovoltaica',
        slug: 'energia-fotovoltaica',
        children: [
          {
            id: 'c14-2-1',
            name: 'Inversores solares',
            slug: undefined
          },
          {
            id: 'c14-2-2',
            name: 'Reguladores de carga para paneles solares',
            slug: 'reguladores-de-carga-para-paneles-solares'
          }
        ]
      }
    ]
  },
  {
    id: 'c15',
    name: 'hogar, cuidado personal y cocina',
    slug: undefined,
    children: [
      {
        id: 'c15-1',
        name: 'Pequeños electrodomésticos',
        slug: 'pequenos-electrodomesticos',
        children: [
          {
            id: 'c15-1-1',
            name: 'Ventiladores',
            slug: 'ventiladores-pequenos-electrodomesticos'
          },
          {
            id: 'c15-1-2',
            name: 'Máquinas productoras de hielo',
            slug: 'maquinas-productoras-de-hielo'
          },
          {
            id: 'c15-1-3',
            name: 'Cafeteras',
            slug: 'cafeteras'
          },
          {
            id: 'c15-1-4',
            name: 'Básculas de cocina',
            slug: 'basculas-de-cocina'
          },
          {
            id: 'c15-1-5',
            name: 'Batidoras',
            slug: 'batidoras'
          },
          {
            id: 'c15-1-6',
            name: 'Planchas eléctricas',
            slug: 'planchas-electricas'
          },
          {
            id: 'c15-1-7',
            name: 'Espumadores para leche',
            slug: 'espumadores-para-leche'
          },
          {
            id: 'c15-1-8',
            name: 'Enfriadores de vino',
            slug: 'enfriadores-de-vino'
          },
          {
            id: 'c15-1-9',
            name: 'Estaciones de planchado de vapor',
            slug: 'estaciones-de-planchado-de-vapor'
          },
          {
            id: 'c15-1-10',
            name: 'Exprimidores',
            slug: 'exprimidores'
          },
          {
            id: 'c15-1-11',
            name: 'Freidoras',
            slug: 'freidoras'
          },
          {
            id: 'c15-1-12',
            name: 'Hornos',
            slug: 'hornos'
          },
          {
            id: 'c15-1-13',
            name: 'Hornos tostadores',
            slug: 'hornos-tostadores'
          },
          {
            id: 'c15-1-14',
            name: 'Licuadoras',
            slug: 'licuadoras'
          },
          {
            id: 'c15-1-15',
            name: 'Microondas',
            slug: 'microondas'
          },
          {
            id: 'c15-1-16',
            name: 'Molinillos de café',
            slug: 'molinillos-de-cafe'
          },
          {
            id: 'c15-1-17',
            name: 'Ollas a presión',
            slug: 'ollas-a-presion'
          },
          {
            id: 'c15-1-18',
            name: 'Ollas multi-cocción',
            slug: 'ollas-multi-coccion'
          },
          {
            id: 'c15-1-19',
            name: 'Parrillas de interior',
            slug: 'parrillas-de-interior'
          },
          {
            id: 'c15-1-20',
            name: 'Parrillas eléctricas de contacto',
            slug: 'parrillas-electricas-de-contacto'
          },
          {
            id: 'c15-1-21',
            name: 'Planchas',
            slug: 'planchas'
          },
          {
            id: 'c15-1-22',
            name: 'Prensas de cítricos eléctricos',
            slug: 'prensas-de-citricos-electricos'
          },
          {
            id: 'c15-1-23',
            name: 'Rasuradora de pelusa',
            slug: 'rasuradora-de-pelusa'
          },
          {
            id: 'c15-1-24',
            name: 'Rebanadoras',
            slug: 'rebanadoras'
          },
          {
            id: 'c15-1-25',
            name: 'Robots de cocina',
            slug: 'robots-de-cocina'
          },
          {
            id: 'c15-1-26',
            name: 'Sandwicheras',
            slug: 'sandwicheras'
          },
          {
            id: 'c15-1-27',
            name: 'Selladores de vacío',
            slug: 'selladores-de-vacio'
          },
          {
            id: 'c15-1-28',
            name: 'Tostadores',
            slug: 'tostadores'
          },
          {
            id: 'c15-1-29',
            name: 'Vapores',
            slug: 'vapores'
          },
          {
            id: 'c15-1-30',
            name: 'Accesorios para freidora',
            slug: 'accesorios-para-freidora'
          },
          {
            id: 'c15-1-31',
            name: 'Arroceras',
            slug: 'arroceras'
          },
          {
            id: 'c15-1-32',
            name: 'Dispensadores de agua',
            slug: 'dispensadores-de-agua'
          },
          {
            id: 'c15-1-33',
            name: 'Heladoras',
            slug: 'heladoras'
          },
          {
            id: 'c15-1-34',
            name: 'Fabricantes de postres congelados',
            slug: 'fabricantes-de-postres-congelados'
          },
          {
            id: 'c15-1-35',
            name: 'Dispensadores de bebida',
            slug: 'dispensadores-de-bebida'
          },
          {
            id: 'c15-1-36',
            name: 'Accesorios para dispensadores de agua',
            slug: 'accesorios-para-dispensadores-de-agua'
          }
        ]
      },
      {
        id: 'c15-2',
        name: 'Electrodomésticos grandes',
        slug: 'electrodomesticos-grandes',
        children: [
          {
            id: 'c15-2-1',
            name: 'Campana',
            slug: 'campana'
          },
          {
            id: 'c15-2-2',
            name: 'Neveras y congeladores',
            slug: undefined
          },
          {
            id: 'c15-2-3',
            name: 'Congeladores',
            slug: 'congeladores'
          }
        ]
      },
      {
        id: 'c15-3',
        name: 'Cuidado personal',
        slug: 'cuidado-personal',
        children: [
          {
            id: 'c15-3-1',
            name: 'Jabones',
            slug: 'jabones'
          },
          {
            id: 'c15-3-2',
            name: 'Afeitadoras y accesorios',
            slug: 'afeitadoras-y-accesorios'
          },
          {
            id: 'c15-3-3',
            name: 'Báscula baño',
            slug: 'bascula-bano'
          },
          {
            id: 'c15-3-4',
            name: 'Cepillos dentales eléctricos',
            slug: 'cepillos-dentales-electricos'
          },
          {
            id: 'c15-3-5',
            name: 'Depiladores',
            slug: 'depiladores'
          },
          {
            id: 'c15-3-6',
            name: 'Cabezales cepillo de dientes',
            slug: 'cabezales-cepillo-de-dientes'
          },
          {
            id: 'c15-3-7',
            name: 'Cortadoras de pelo y maquinillas',
            slug: 'cortadoras-de-pelo-y-maquinillas'
          },
          {
            id: 'c15-3-8',
            name: 'Secadores',
            slug: 'secadores'
          },
          {
            id: 'c15-3-9',
            name: 'Utensilios de peinado',
            slug: 'utensilios-de-peinado'
          },
          {
            id: 'c15-3-10',
            name: 'Irrigador oral',
            slug: 'irrigador-oral'
          },
          {
            id: 'c15-3-11',
            name: 'Aparatos eléctricos para manicura',
            slug: 'aparatos-electricos-para-manicura'
          },
          {
            id: 'c15-3-12',
            name: 'Masajeadores para el cuidado de la piel',
            slug: 'masajeadores-para-el-cuidado-de-la-piel'
          },
          {
            id: 'c15-3-13',
            name: 'Cepillos para el cabello y peines',
            slug: 'cepillos-para-el-cabello-y-peines'
          }
        ]
      },
      {
        id: 'c15-4',
        name: 'Control de clima',
        slug: 'control-de-clima',
        children: [
          {
            id: 'c15-4-1',
            name: 'Aire acondicionado portátil',
            slug: 'aire-acondicionado-portatil'
          },
          {
            id: 'c15-4-2',
            name: 'Calefactores eléctricos',
            slug: 'calefactores-electricos'
          },
          {
            id: 'c15-4-3',
            name: 'Estufas de combustible líquido',
            slug: 'estufas-de-combustible-liquido'
          },
          {
            id: 'c15-4-4',
            name: 'Deshumidificadores',
            slug: 'deshumidificadores'
          },
          {
            id: 'c15-4-5',
            name: 'Purificadores de aire',
            slug: 'purificadores-de-aire'
          },
          {
            id: 'c15-4-6',
            name: 'Accesorios para purificadores de aire',
            slug: undefined
          },
          {
            id: 'c15-4-7',
            name: 'Chimeneas',
            slug: 'chimeneas'
          },
          {
            id: 'c15-4-8',
            name: 'Humidificadores',
            slug: 'humidificadores'
          },
          {
            id: 'c15-4-9',
            name: 'Termómetros ambientales',
            slug: 'termometros-ambientales'
          },
          {
            id: 'c15-4-10',
            name: 'Estaciones meteorológicas digitales',
            slug: 'estaciones-meteorologicas-digitales'
          },
          {
            id: 'c15-4-11',
            name: 'Estufas',
            slug: 'estufas'
          },
          {
            id: 'c15-4-12',
            name: 'Termostatos',
            slug: 'termostatos'
          }
        ]
      },
      {
        id: 'c15-5',
        name: 'Cuidados de la salud',
        slug: 'cuidados-de-la-salud',
        children: [
          {
            id: 'c15-5-1',
            name: 'Masajeadores',
            slug: 'masajeadores'
          },
          {
            id: 'c15-5-2',
            name: 'Difusores de aroma',
            slug: 'difusores-de-aroma'
          },
          {
            id: 'c15-5-3',
            name: 'Mantas eléctricas',
            slug: 'mantas-electricas'
          },
          {
            id: 'c15-5-4',
            name: 'Gafas para ordenador',
            slug: 'gafas-para-ordenador'
          }
        ]
      },
      {
        id: 'c15-6',
        name: 'Limpieza',
        slug: 'limpieza',
        children: [
          {
            id: 'c15-6-1',
            name: 'Aspiradoras',
            slug: 'aspiradoras'
          },
          {
            id: 'c15-6-2',
            name: 'Aspiradoras de pie y escobas eléctricas',
            slug: 'aspiradoras-de-pie-y-escobas-electricas'
          },
          {
            id: 'c15-6-3',
            name: 'Aspiradoras de mano',
            slug: 'aspiradoras-de-mano'
          },
          {
            id: 'c15-6-4',
            name: 'Aspiradoras robotizadas',
            slug: 'aspiradoras-robotizadas'
          },
          {
            id: 'c15-6-5',
            name: 'Limpiadoras de alta presión o Hidrolimpiadoras',
            slug: 'limpiadoras-de-alta-presion-o-hidrolimpiadoras'
          },
          {
            id: 'c15-6-6',
            name: 'Limpiador de vapor',
            slug: 'limpiador-de-vapor'
          },
          {
            id: 'c15-6-7',
            name: 'Accesorios y suministros de vacío',
            slug: 'accesorios-y-suministros-de-vacio'
          },
          {
            id: 'c15-6-8',
            name: 'Aspiradoras de cenizas',
            slug: 'aspiradoras-de-cenizas'
          },
          {
            id: 'c15-6-9',
            name: 'Fregonas',
            slug: 'fregonas'
          },
          {
            id: 'c15-6-10',
            name: 'Aspiradores de polvo eléctricos',
            slug: 'aspiradores-de-polvo-electricos'
          },
          {
            id: 'c15-6-11',
            name: 'Máquinas de limpieza de alfombras',
            slug: 'maquinas-de-limpieza-de-alfombras'
          },
          {
            id: 'c15-6-12',
            name: 'Limpiadores generales',
            slug: 'limpiadores-generales'
          },
          {
            id: 'c15-6-13',
            name: 'Trapos para limpiar',
            slug: 'trapos-para-limpiar'
          }
        ]
      },
      {
        id: 'c15-7',
        name: 'Utensilios y vajillas de cocina',
        slug: 'utensilios-y-vajillas-de-cocina',
        children: [
          {
            id: 'c15-7-1',
            name: 'Sartenes y cazuelas',
            slug: 'sartenes-y-cazuelas'
          },
          {
            id: 'c15-7-2',
            name: 'Juegos de cuchillos y cubertería de cocina',
            slug: 'juegos-de-cuchillos-y-cuberteria-de-cocina'
          },
          {
            id: 'c15-7-3',
            name: 'Termos',
            slug: 'termos'
          },
          {
            id: 'c15-7-4',
            name: 'Tazones',
            slug: 'tazones'
          }
        ]
      },
      {
        id: 'c15-8',
        name: 'Seguridad en hogar',
        slug: 'seguridad-en-hogar',
        children: [
          {
            id: 'c15-8-1',
            name: 'Mulltisensores smart home',
            slug: 'mulltisensores-smart-home'
          },
          {
            id: 'c15-8-2',
            name: 'Cerraduras inteligentes',
            slug: 'cerraduras-inteligentes'
          },
          {
            id: 'c15-8-3',
            name: 'Regletas inteligentes',
            slug: 'regletas-inteligentes'
          },
          {
            id: 'c15-8-4',
            name: 'Accesorios para el control de acceso a la lectura',
            slug: 'accesorios-para-el-control-de-acceso-a-la-lectura'
          },
          {
            id: 'c15-8-5',
            name: 'Lectores de huella digital',
            slug: 'lectores-de-huella-digital'
          },
          {
            id: 'c15-8-6',
            name: 'Kits de videovigilancia',
            slug: 'kits-de-videovigilancia'
          },
          {
            id: 'c15-8-7',
            name: 'Kits de timbre',
            slug: 'kits-de-timbre'
          },
          {
            id: 'c15-8-8',
            name: 'Etiquetas RFID',
            slug: 'etiquetas-rfid'
          },
          {
            id: 'c15-8-9',
            name: 'Detectores de agua',
            slug: 'detectores-de-agua'
          },
          {
            id: 'c15-8-10',
            name: 'Sistemas de intercomunicación de video',
            slug: 'sistemas-de-intercomunicacion-de-video'
          },
          {
            id: 'c15-8-11',
            name: 'Accesorios intercomunicadores',
            slug: 'accesorios-intercomunicadores'
          },
          {
            id: 'c15-8-12',
            name: 'Reguladores inteligentes de luz',
            slug: 'reguladores-inteligentes-de-luz'
          },
          {
            id: 'c15-8-13',
            name: 'Centralitas para hogares inteligentes',
            slug: 'centralitas-para-hogares-inteligentes'
          },
          {
            id: 'c15-8-14',
            name: 'Transmisores smart home',
            slug: 'transmisores-smart-home'
          },
          {
            id: 'c15-8-15',
            name: 'Tarjetas de acceso',
            slug: undefined
          },
          {
            id: 'c15-8-16',
            name: 'Mandos de entrada sin llave y llaves electrónicas inalámbricas',
            slug: undefined
          },
          {
            id: 'c15-8-17',
            name: 'Sirenas',
            slug: undefined
          },
          {
            id: 'c15-8-18',
            name: 'Sistemas de seguridad',
            slug: 'sistemas-de-seguridad'
          },
          {
            id: 'c15-8-19',
            name: 'Video-Monitores para Bebés',
            slug: 'video-monitores-para-bebes'
          },
          {
            id: 'c15-8-20',
            name: 'Cerraduras electromagnéticas',
            slug: 'cerraduras-electromagneticas'
          },
          {
            id: 'c15-8-21',
            name: 'Accionadores smart home',
            slug: 'accionadores-smart-home'
          },
          {
            id: 'c15-8-22',
            name: 'Timbres de puerta',
            slug: undefined
          }
        ]
      }
    ]
  }
];

interface HeaderProps {
  categories?: WCCategory[];
}

export function Header({ categories = [] }: HeaderProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<WCProduct[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toggleCart, getItemCount } = useCartStore();
  const itemCount = getItemCount();

  useEffect(() => {
    let isActive = true;

    const refreshAuthState = async () => {
      const session = await authAPI.getSession();
      if (!isActive) return;
      setIsLoggedIn(session.authenticated);
      setUserName(authAPI.getUserDisplayName());
    };

    setMounted(true);
    refreshAuthState();

    const onAuthChanged = () => {
      setIsLoggedIn(authAPI.isAuthenticated());
      setUserName(authAPI.getUserDisplayName());
    };

    window.addEventListener('inforvel-auth-changed', onAuthChanged);
    return () => {
      isActive = false;
      window.removeEventListener('inforvel-auth-changed', onAuthChanged);
    };
  }, []);

  const handleLogout = async () => {
    await authAPI.logout();
    setIsLoggedIn(false);
    setUserName(null);
    toast.success('Sesión cerrada correctamente');
    router.push('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!categoriesRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!categoriesRef.current.contains(e.target as Node)) {
        setIsCategoriesOpen(false);
      }
    }

    if (isCategoriesOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoriesOpen]);

  // close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!searchBoxRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!searchBoxRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    }

    if (isSuggestionsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSuggestionsOpen]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/tienda?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  // live suggestions for desktop
  useEffect(() => {
    const id = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length >= 2) {
        setIsSuggestLoading(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (response.ok) {
            const res = await response.json();
            setSuggestions(res);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error("Search error:", error);
          setSuggestions([]);
        }
        setIsSuggestLoading(false);
        setIsSuggestionsOpen(true);
      } else {
        setSuggestions([]);
        setIsSuggestionsOpen(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [searchQuery]);

  const featured = [
    { label: 'Blog', href: '/blog' },
    { label: 'Reacondicionados', href: '/reacondicionados' },
    { label: 'Campañas y ofertas', href: '/ofertas' },
  ];

  const productTabsActive = useProductTabsStore((state) => state.active);
  const productTabsVisible = useProductTabsStore((state) => state.visible);
  const productTabItems = useProductTabsStore((state) => state.tabs);
  const productActiveTab = useProductTabsStore((state) => state.activeTab);
  const productPrice = useProductTabsStore((state) => state.price);
  const productCanAddToCart = useProductTabsStore((state) => state.canAddToCart);
  const onProductTabClick = useProductTabsStore((state) => state.onTabClick);
  const onProductAddToCart = useProductTabsStore((state) => state.onAddToCart);
  const showProductTabs = productTabsActive && productTabsVisible;

  const [openParent, setOpenParent] = useState<string | null>(null);

  const getHref = (slug?: string) => slug ? `/categoria/${slug}` : '/tienda';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-background/95 backdrop-blur-lg ${isScrolled ? 'border-b border-border shadow-lg' : ''
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Left: logo */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-105">
                  <img src="/logo.png" alt="Logo Inforvel" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-lg hidden sm:block">Inforvel</span>
              </Link>
            </div>

            {/* Center: search with category selector */}
            <div className="flex-1 px-2">
              <div className="w-full">
                <form onSubmit={handleSearchSubmit} className="hidden md:flex items-stretch relative w-full">
                  <button
                    type="button"
                    onClick={() => setIsCategoriesOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-l bg-zinc-900 text-sm text-zinc-200 hover:bg-zinc-800 shrink-0"
                  >
                    <span className="truncate">Todo el catálogo</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div className="relative flex-1 min-w-0" ref={searchBoxRef}>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar"
                      className="w-full px-3 py-2 text-sm bg-zinc-900 text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                    />

                    {isSuggestionsOpen && (
                      <div className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto bg-background border border-border rounded shadow-lg z-50 p-2">
                        {isSuggestLoading ? (
                          <div className="p-4 text-center text-zinc-400">Buscando...</div>
                        ) : suggestions.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {suggestions.map((product) => (
                              <Link
                                key={product.id}
                                href={`/producto/${product.slug}`}
                                onClick={() => setIsSuggestionsOpen(false)}
                                className="flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors"
                              >
                                <div className="relative w-12 h-12 rounded overflow-hidden bg-accent shrink-0">
                                  <img src={product.images[0]?.src || '/placeholder.png'} alt={product.name} className="w-full h-full object-cover" />
                                  <ProductBadges
                                    product={product}
                                    variant="icons"
                                    limit={1}
                                    className="absolute right-1 top-1 z-10"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{product.name}</div>
                                  <div className="text-sm font-bold text-blue-500">{product.price}€</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-zinc-400">No se encontraron productos</div>
                        )}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="px-3 py-2 rounded-r bg-zinc-900 text-zinc-400 hover:text-white shrink-0">
                    <Search className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right: account / cart / mobile menu */}
            <div className="flex items-center gap-1 md:gap-3 shrink-0">
              {isLoggedIn ? (
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <Link href="/cuenta" className="text-sm font-medium hover:text-blue-400 transition-colors">
                    {userName || 'Usuario'}
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <Link href="/login" className="hidden md:inline-block shrink-0">
                  <Button variant="ghost" size="icon" title="Iniciar sesión">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
              )}

              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="md:hidden shrink-0">
                <Search className="w-5 h-5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={toggleCart} className="relative shrink-0">
                <ShoppingBag className="w-5 h-5" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>

              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex lg:hidden shrink-0">
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Secondary featured links bar — swapped for the product page's
              own tabs (Descripción/Especificaciones/...) once the user
              scrolls past its add-to-cart buttons. */}
          <div className="hidden md:block border-t border-border mt-2">
            {showProductTabs ? (
              <nav className="flex items-center gap-1 overflow-x-auto">
                {productTabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onProductTabClick(tab.id)}
                    className={`flex-none px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                      productActiveTab === tab.id
                        ? 'text-foreground border-blue-500'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-4 py-1 pl-4">
                  {productPrice && (
                    <span className="text-base font-bold text-blue-500 whitespace-nowrap">{productPrice}</span>
                  )}
                  {productCanAddToCart && (
                    <Button size="sm" onClick={onProductAddToCart}>
                      <ShoppingCart className="w-4 h-4 mr-2" /> Añadir al carrito
                    </Button>
                  )}
                </div>
              </nav>
            ) : (
              <nav className="flex items-center gap-6 py-2 overflow-x-auto">
                {featured.map((f) => (
                  <Link key={f.label} href={f.href} className="text-sm text-zinc-400 hover:text-white whitespace-nowrap">
                    {f.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-lg">
              <div className="px-4 py-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoriesOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <span className="font-medium">Todo el catálogo</span>
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </button>

                <div className="border-t border-border my-1" />

                {featured.map((f) => (
                  <Link
                    key={f.label}
                    href={f.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    {f.label}
                  </Link>
                ))}

                <div className="border-t border-border my-1" />

                {isLoggedIn ? (
                  <>
                    <Link
                      href="/cuenta"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Mi cuenta ({userName || 'Usuario'})
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <Sheet open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
        <SheetContent
          side="left"
          className="w-screen max-w-screen p-0 flex flex-col border-r-0"
          style={{ width: '100vw', maxWidth: '100vw' }}
        >
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base font-semibold">Todas las categorías</SheetTitle>
          </SheetHeader>

          {/* ── MOBILE: accordion layout ── */}
          <div className="flex flex-col flex-1 overflow-y-auto lg:hidden bg-zinc-950">
            <Link
              href="/tienda"
              className="flex items-center px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              onClick={() => setIsCategoriesOpen(false)}
            >
              Ver toda la tienda
            </Link>
            <div className="border-t border-border" />

            {MENU_CATEGORIES.map((parent) => {
              const isOpen = openParent === parent.id;
              const children = parent.children || [];
              return (
                <div key={parent.id}>
                  <button
                    type="button"
                    onClick={() => setOpenParent(isOpen ? null : parent.id)}
                    className={`w-full flex items-center justify-between px-5 py-3 text-sm text-left transition-colors border-b border-zinc-900 ${isOpen
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                  >
                    <span>{parent.name}</span>
                    {children.length > 0 && (
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* Inline subcategories */}
                  {isOpen && children.length > 0 && (
                    <div className="bg-zinc-900 border-b border-zinc-800">
                      {parent.slug && (
                        <Link
                          href={getHref(parent.slug)}
                          className="block px-7 py-2.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-zinc-900/40 font-medium"
                          onClick={() => setIsCategoriesOpen(false)}
                        >
                          Ver todo en {parent.name} →
                        </Link>
                      )}
                      {children.map((child) => (
                        <div key={child.id} className="border-t border-zinc-800/50">
                          <Link
                            href={getHref(child.slug)}
                            className="block px-7 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
                            onClick={() => setIsCategoriesOpen(false)}
                          >
                            {child.name}
                          </Link>
                          {child.children && child.children.length > 0 && (
                            <div className="pb-1">
                              {child.children.map(subchild => (
                                <Link
                                  key={subchild.id}
                                  href={getHref(subchild.slug)}
                                  className="block px-11 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                  onClick={() => setIsCategoriesOpen(false)}
                                >
                                  {subchild.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Parent link if no children */}
                  {isOpen && children.length === 0 && (
                    <div className="bg-zinc-900 border-b border-zinc-800 px-7 py-2.5">
                      <Link
                        href={getHref(parent.slug)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={() => setIsCategoriesOpen(false)}
                      >
                        Ver {parent.name} →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── DESKTOP: side-by-side hover layout ── */}
          <div className="hidden lg:flex flex-row flex-1 overflow-hidden" onMouseLeave={() => setOpenParent(null)}>
            <nav className="w-64 shrink-0 border-r border-border overflow-y-auto bg-zinc-950">
              <Link
                href="/tienda"
                className="flex items-center px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                onClick={() => setIsCategoriesOpen(false)}
              >
                Ver toda la tienda
              </Link>
              <div className="border-t border-border" />

              {MENU_CATEGORIES.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onMouseEnter={() => setOpenParent(parent.id)}
                  onClick={() => setOpenParent(parent.id)}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm text-left transition-colors border-b border-zinc-900 ${openParent === parent.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                >
                  <span>{parent.name}</span>
                  {(parent.children?.length ?? 0) > 0 && (
                    <span className="text-zinc-500 text-base leading-none">›</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto bg-zinc-900 p-6">
              {openParent ? (
                <>
                  <h2 className="text-xl font-semibold text-zinc-100 mb-1">
                    {MENU_CATEGORIES.find((p) => p.id === openParent)?.name}
                  </h2>
                  {MENU_CATEGORIES.find((p) => p.id === openParent)?.slug && (
                    <Link
                      href={getHref(MENU_CATEGORIES.find((p) => p.id === openParent)?.slug)}
                      className="inline-block text-sm text-blue-400 hover:text-blue-300 mb-6 transition-colors font-medium"
                      onClick={() => setIsCategoriesOpen(false)}
                    >
                      Ver todo en {MENU_CATEGORIES.find((p) => p.id === openParent)?.name} →
                    </Link>
                  )}

                  {(MENU_CATEGORIES.find((p) => p.id === openParent)?.children?.length ?? 0) > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
                      {MENU_CATEGORIES.find((p) => p.id === openParent)?.children?.map((child) => (
                        <div key={child.id} className="flex flex-col gap-2">
                          <Link
                            href={getHref(child.slug)}
                            className="font-semibold text-zinc-200 hover:text-white transition-colors text-base border-b border-zinc-800 pb-2 mb-1"
                            onClick={() => setIsCategoriesOpen(false)}
                          >
                            {child.name}
                          </Link>
                          {child.children && child.children.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {child.children.map(subchild => (
                                <Link
                                  key={subchild.id}
                                  href={getHref(subchild.slug)}
                                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors block"
                                  onClick={() => setIsCategoriesOpen(false)}
                                >
                                  {subchild.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 mt-4">Esta categoría no tiene subcategorías. Ve al enlace superior para ver sus productos.</p>
                  )}
                </>
              ) : (
                <div className="h-full min-h-[180px] flex items-center justify-center">
                  <p className="text-sm text-zinc-500 text-center leading-relaxed">
                    Selecciona una categoría
                    <br />
                    para ver sus subcategorías
                  </p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MiniCart />
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
