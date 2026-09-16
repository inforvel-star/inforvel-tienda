// app/desistimiento/page.tsx
import { LegalPage, Section, BulletList, InfoBox } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Derecho de Desistimiento | Inforvel",
  description: "Información sobre el derecho de desistimiento y formulario modelo para inforvel.online",
};

export default function DesistimientoPage() {
  return (
    <LegalPage title="Derecho de Desistimiento" lastUpdated="Enero 2026">
      <InfoBox>
        Como consumidor, tiene derecho a desistir del contrato en un plazo de{" "}
        <strong>14 días naturales</strong> sin indicar el motivo. A continuación encontrará toda la información
        sobre cómo ejercer este derecho.
      </InfoBox>

      <div className="mt-8">
        <Section title="Plazo y condiciones">
          <p>
            EL CLIENTE considerado consumidor y usuario tiene derecho a rescindir el contrato en{" "}
            <strong>catorce (14) días naturales</strong>, sin indicar el motivo de dicha rescisión. Este plazo se
            contabiliza desde:
          </p>
          <BulletList
            items={[
              "En contratos de compraventa: desde la entrega del bien al CLIENTE o a su representante autorizado (distinto al transportista).",
              "En contratos de servicios: desde el día de celebración del contrato.",
            ]}
          />
        </Section>

        <Section title="Cómo ejercer el derecho de desistimiento">
          <p>Para ejercer su derecho, debe comunicarlo de forma clara a VELA CAMPAÑA, MANUEL ANTONIO a través de cualquiera de estos canales:</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                channel: "Correo postal",
                detail: "VELA CAMPAÑA, MANUEL ANTONIO\nC/ El Avellano, 2\n14006 Córdoba (Córdoba)",
              },
              {
                channel: "Correo electrónico",
                detail: "inforvel@inforvel.online",
              },
            ].map(({ channel, detail }) => (
              <div key={channel} className="border border-gray-200 rounded-lg px-4 py-4">
                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">{channel}</span>
                <span className="block text-gray-800 text-sm whitespace-pre-line">{detail}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-gray-600">
            También puede utilizar el formulario modelo que encontrará más abajo en esta página. Su uso no es
            obligatorio, pero facilita la tramitación.
          </p>
        </Section>

        <Section title="Efectos del desistimiento">
          <p>Una vez ejercido el derecho:</p>
          <BulletList
            items={[
              "VELA CAMPAÑA, MANUEL ANTONIO devolverá todas las sumas percibidas en un plazo máximo de 14 días naturales desde la recepción de la notificación, utilizando el mismo método de pago empleado en la compra.",
              "La devolución incluye los gastos de entrega estándar (no los adicionales por elección de modalidades de entrega más costosas).",
              "EL CLIENTE deberá devolver los productos en idéntico plazo de 14 días, acompañados de la documentación acreditativa (albarán, factura, etc.).",
              "VELA CAMPAÑA, MANUEL ANTONIO podrá retener el reembolso hasta recibir los artículos devueltos o hasta que se acredite su devolución.",
              "EL CLIENTE asumirá los costes directos de devolución, salvo que VELA CAMPAÑA, MANUEL ANTONIO haya aceptado asumirlos.",
            ]}
          />
          <p className="mt-3 text-gray-600">
            EL CLIENTE no será responsable de ningún pago por la disminución del valor del bien consecuencia de un
            uso como mero examen o prueba. Todo uso que vaya más allá de la mera comprobación podrá generar la
            obligación de reembolsar dicha disminución de valor.
          </p>
        </Section>

        <Section title="Excepciones al derecho de desistimiento">
          <p>EL CLIENTE no tendrá derecho de desistimiento en los siguientes supuestos:</p>
          <BulletList
            items={[
              "Contratos de prestación de servicios completamente ejecutados con consentimiento expreso del cliente.",
              "Bienes confeccionados conforme a las especificaciones del consumidor o claramente personalizados.",
              "Bienes que puedan deteriorarse o caducar con rapidez.",
              "Bienes precintados que no puedan devolverse por razones de salud o higiene y que hayan sido desprecintados.",
              "Bienes que se hayan mezclado con otros de forma inseparable por su naturaleza.",
              "Grabaciones sonoras, de vídeo o programas informáticos precintados que hayan sido desprecintados.",
              "Suministro de prensa diaria, publicaciones periódicas o revistas.",
              "Contratos celebrados mediante subastas públicas.",
              "Contenido digital no prestado en soporte material cuando la ejecución haya comenzado con consentimiento expreso del consumidor.",
              "Servicios relacionados con el alojamiento, transporte, alquiler de vehículos o actividades de esparcimiento con fecha específica.",
              "Bienes cuyo precio dependa de fluctuaciones del mercado no controlables por VELA CAMPAÑA, MANUEL ANTONIO.",
            ]}
          />
        </Section>

        {/* Formulario modelo */}
        <Section title="Formulario modelo de desistimiento">
          <p className="text-gray-600 mb-4">
            Puede copiar, completar y enviar el siguiente formulario si desea desistir del contrato:
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <p className="font-semibold text-gray-700 mb-4 text-center uppercase tracking-wide text-sm">
              Modelo de Desistimiento de Contrato de Compraventa a Distancia
            </p>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                A la atención de: <strong>VELA CAMPAÑA, MANUEL ANTONIO</strong>
                <br />
                Dirección: C/ El Avellano, 2 – 14006 Córdoba (Córdoba)
                <br />
                Email: inforvel@inforvel.online
              </p>
              <hr className="border-gray-300" />
              <p>
                Por la presente, y conforme a lo establecido en el RDL 1/2007 (TRLGDCU), modificado por la Ley
                3/2014, le comunico mi decisión de desistir del contrato de{" "}
                <span className="bg-yellow-100 px-1 rounded">
                  [compra / prestación de servicios de _________________________]
                </span>{" "}
                celebrado a distancia el día{" "}
                <span className="bg-yellow-100 px-1 rounded">[__ / __ / ____]</span>.
              </p>
              <p>
                Esta comunicación la formulo dentro del plazo legal de desistimiento de 14 días naturales a partir
                de la fecha de entrega en mi domicilio del producto / de la contratación del servicio, el día{" "}
                <span className="bg-yellow-100 px-1 rounded">[__ / __ / ____]</span>.
              </p>
              <p>
                En caso de referirse este escrito a la adquisición de un producto, le informo de que tiene a su
                disposición el producto referido en mi domicilio, que puede pasar a retirar, o puede comunicarme
                el medio para enviarlo.
              </p>
              <p>
                Le solicito que realice a la mayor brevedad posible, y en todo caso antes de que transcurran 14
                días naturales, la devolución del importe total del precio pagado, que puede abonar en mi cuenta
                bancaria n.º{" "}
                <span className="bg-yellow-100 px-1 rounded">[______________________________]</span> o a través
                del mismo método de pago utilizado en la compra.
              </p>
              <hr className="border-gray-300" />
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Nombre y apellidos del consumidor</p>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Domicilio</p>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Teléfono de contacto</p>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Email de contacto</p>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Lugar y fecha</p>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Firma del consumidor</p>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Los campos resaltados en amarillo deben ser completados con su información personal.
          </p>
        </Section>
      </div>
    </LegalPage>
  );
}
