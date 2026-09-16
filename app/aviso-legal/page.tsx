import { LegalPage, Section, BulletList } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso Legal | Inforvel",
  description: "Aviso legal e información del titular del sitio web inforvel.online — VELA CAMPAÑA, MANUEL ANTONIO",
};

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso Legal" lastUpdated="Enero 2026">
      <p className="text-gray-600 mb-8">
        En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de
        Comercio Electrónico (LSSI-CE), se informa de los siguientes datos del titular de este sitio web:
      </p>

      <Section title="1. Datos identificativos">
        <div className="bg-gray-50 rounded-lg p-5 space-y-1">
          <p><strong>Titular:</strong> VELA CAMPAÑA, MANUEL ANTONIO</p>
          <p><strong>NIF:</strong> 46074409G</p>
          <p><strong>Domicilio:</strong> C/ El Avellano, 2 - 14006 Córdoba (Córdoba)</p>
          <p><strong>Teléfono:</strong> 652 369 650</p>
          <p><strong>Email:</strong> <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">inforvel@inforvel.online</a></p>
          <p><strong>Sitio web:</strong> <a href="https://inforvel.online" className="text-blue-600 hover:underline">https://inforvel.online</a></p>
        </div>
      </Section>

      <Section title="2. Objeto del sitio web">
        <p>
          Este sitio web tiene como finalidad la venta online de productos informáticos (ordenadores, portátiles,
          smartphones, componentes, accesorios y equipos reacondicionados), así como la prestación de servicios
          de reparación y mantenimiento informático.
        </p>
      </Section>

      <Section title="3. Condiciones de uso">
        <p>
          El acceso y uso de este sitio web atribuye la condición de usuario e implica la aceptación plena de
          todas las condiciones incluidas en este Aviso Legal. El usuario se compromete a hacer un uso adecuado
          del sitio web y de sus contenidos, de conformidad con la legislación vigente.
        </p>
        <p className="mt-3">Queda prohibido:</p>
        <BulletList items={[
          "Reproducir, distribuir o modificar los contenidos sin autorización previa.",
          "Utilizar los contenidos con fines comerciales no autorizados.",
          "Realizar cualquier acción que pueda dañar, inutilizar o sobrecargar el sitio web.",
          "Intentar acceder a áreas restringidas del servidor o de los sistemas informáticos.",
        ]} />
      </Section>

      <Section title="4. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio web, incluyendo textos, imágenes, logotipos, marcas, diseño gráfico,
          código fuente y software, están protegidos por las leyes de propiedad intelectual e industrial y
          son propiedad de VELA CAMPAÑA, MANUEL ANTONIO o de terceros que hayan autorizado su uso. Queda
          prohibida su reproducción total o parcial sin autorización expresa.
        </p>
      </Section>

      <Section title="5. Exclusión de responsabilidad">
        <p>El titular del sitio web no se hace responsable de:</p>
        <BulletList items={[
          "Errores u omisiones en los contenidos del sitio web.",
          "La falta de disponibilidad del sitio web por causas técnicas.",
          "Daños causados por terceros mediante intromisiones ilegítimas fuera del control del titular.",
          "Los contenidos y disponibilidad de páginas web de terceros enlazadas desde este sitio.",
        ]} />
      </Section>

      <Section title="6. Protección de datos personales">
        <p>
          De conformidad con lo establecido en el Reglamento (UE) 2016/679 (RGPD) y en la Ley Orgánica 3/2018
          (LOPDGDD), le informamos de que los datos personales facilitados a través de este sitio web serán
          tratados conforme a lo indicado en nuestra{" "}
          <a href="/politica-privacidad" className="text-blue-600 hover:underline">Política de Privacidad</a>.
        </p>
      </Section>

      <Section title="7. Legislación aplicable y jurisdicción">
        <p>
          Las presentes condiciones se rigen por la legislación española. Para la resolución de cualquier
          controversia que pudiera derivarse del acceso o uso de este sitio web, las partes se someten
          a los juzgados y tribunales del domicilio del consumidor, de conformidad con la legislación vigente.
        </p>
      </Section>
    </LegalPage>
  );
}
