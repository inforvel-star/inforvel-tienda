import { LegalPage, Section, BulletList } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones Generales de Contratación | Inforvel",
  description: "Condiciones generales de contratación de productos y servicios en inforvel.online",
};

export default function CondicionesGeneralesPage() {
  return (
    <LegalPage title="Condiciones Generales de Contratación" lastUpdated="Enero 2026">
      <p className="text-gray-600 mb-8">
        Las presentes condiciones generales regulan la compra de productos y contratación de servicios a través del
        sitio web <strong>inforvel.online</strong>, propiedad de <strong>VELA CAMPAÑA, MANUEL ANTONIO</strong>.
      </p>

      <Section title="1. Datos del vendedor">
        <div className="bg-gray-50 rounded-lg p-5 space-y-1">
          <p><strong>Razón social:</strong> VELA CAMPAÑA, MANUEL ANTONIO</p>
          <p><strong>NIF:</strong> 46074409G</p>
          <p><strong>Domicilio:</strong> C/ El Avellano, 2 - 14006 Córdoba (Córdoba)</p>
          <p><strong>Teléfono:</strong> 652 369 650</p>
          <p><strong>Email:</strong> <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">inforvel@inforvel.online</a></p>
          <p><strong>Web:</strong> <a href="https://inforvel.online" className="text-blue-600 hover:underline">https://inforvel.online</a></p>
        </div>
      </Section>

      <Section title="2. Objeto">
        <p>
          Las presentes condiciones generales tienen por objeto regular la relación de compraventa de productos
          y contratación de servicios ofrecidos a través de la web inforvel.online.
        </p>
      </Section>

      <Section title="3. Perfeccionamiento del contrato">
        <p>
          El contrato se perfecciona con la confirmación del pedido por parte de Inforvel mediante correo electrónico.
          La aceptación del pedido implica la aceptación íntegra de estas condiciones generales.
        </p>
      </Section>

      <Section title="4. Precio y pago">
        <p>Los precios indicados en la web incluyen IVA. El pago puede realizarse mediante:</p>
        <BulletList items={[
          "Tarjeta de crédito o débito",
          "Transferencia bancaria",
          "Otros métodos habilitados en la plataforma"
        ]} />
      </Section>

      <Section title="5. Envío y entrega">
        <p>
          Los plazos de entrega son estimados y comienzan a contar desde la confirmación del pago.
          Inforvel no se responsabiliza de retrasos ocasionados por la empresa de transporte.
        </p>
      </Section>

      <Section title="6. Derecho de desistimiento">
        <p>
          El cliente dispone de 14 días naturales desde la recepción del producto para ejercer su derecho de desistimiento,
          sin necesidad de justificación. Consulte nuestra <a href="/desistimiento" className="text-blue-600 hover:underline">
          Política de Desistimiento</a> para más información.
        </p>
      </Section>

      <Section title="7. Garantías">
        <p>
          Todos los productos cuentan con la garantía legal de conformidad de 3 años establecida en el Real Decreto
          Legislativo 1/2007, modificado por el Real Decreto-ley 7/2021, de transposición de directivas europeas.
        </p>
      </Section>

      <Section title="8. Responsabilidad">
        <p>
          Inforvel se reserva el derecho de modificar estas condiciones en cualquier momento, siendo aplicable
          la versión vigente en el momento de la contratación.
        </p>
      </Section>

      <Section title="9. Protección de datos">
        <p>
          Los datos personales recogidos serán tratados conforme a nuestra <a href="/politica-privacidad" className="text-blue-600 hover:underline">
          Política de Privacidad</a>.
        </p>
      </Section>

      <Section title="10. Legislación aplicable">
        <p>
          Estas condiciones se rigen por la legislación española. Para la resolución de conflictos,
          las partes se someten a los juzgados y tribunales del domicilio del consumidor.
        </p>
      </Section>
    </LegalPage>
  );
}
