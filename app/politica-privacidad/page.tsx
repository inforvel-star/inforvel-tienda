// app/politica-privacidad/page.tsx
import { LegalPage, Section, BulletList, InfoBox } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | Inforvel",
  description: "Política de privacidad y protección de datos de inforvel.online — VELA CAMPAÑA, MANUEL ANTONIO",
};

export default function PoliticaPrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad" lastUpdated="9 de enero de 2026">
      <InfoBox>
        <strong>Responsable del tratamiento:</strong> VELA CAMPAÑA, MANUEL ANTONIO · NIF 46074409G ·
        C/ El Avellano, 2, 14006 Córdoba · <a href="mailto:inforvel@inforvel.online" className="underline">inforvel@inforvel.online</a>
      </InfoBox>

      <div className="mt-8">
        <Section title="¿Qué tratamientos realizamos con sus datos?">
          <p>
            En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y de la Ley Orgánica 3/2018 de Protección de
            Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos de que sus datos
            personales pueden ser objeto de los siguientes tratamientos:
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left border border-gray-200 px-3 py-2 font-semibold text-gray-700">Código</th>
                  <th className="text-left border border-gray-200 px-3 py-2 font-semibold text-gray-700">Tratamiento</th>
                  <th className="text-left border border-gray-200 px-3 py-2 font-semibold text-gray-700">Base legal</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["TV01", "Ventas / Prestación de Servicios", "Legislación Mercantil y Fiscal"],
                  ["TR01", "Solicitudes de información recibidas", "Código de Comercio"],
                  ["TR04", "Campañas publicitarias", "Ley 34/1988 General de Publicidad"],
                  ["TR05", "Correos electrónicos", "Código de Comercio"],
                  ["TR07", "Gestión de incidencias y/o violaciones de seguridad", "RGPD y LOPDGDD"],
                  ["TR08", "Recabar la opinión de los interesados", "RGPD y LOPDGDD"],
                  ["TR09", "Seguridades sobre medidas técnicas y organizativas", "RGPD y LOPDGDD"],
                  ["TE01", "Mantenimiento de los sistemas informáticos", "Código de Comercio"],
                  ["TE02", "Prevención de riesgos laborales", "Ley 31/1995"],
                  ["TE03", "Servicio de transporte y/o envíos", "Código de Comercio"],
                  ["TE04", "Gestión de asuntos jurídicos propios", "Legislación mercantil y laboral"],
                  ["TE07", "Destrucción de documentos", "RGPD"],
                  ["TE08", "Protección de Datos Personales", "RGPD y Ley Orgánica 3/2018"],
                  ["TG01", "Gestión contable y de libros propia", "Real Decreto 1514/2007 (PGC)"],
                  ["TG12", "Gestión laboral propia", "Real Decreto Legislativo 1/1994"],
                  ["TG25", "Recogida de datos para gestión fiscal propia", "Ley 58/2003 General Tributaria"],
                  ["TR03", "Selección de personal propio", "Real Decreto Legislativo 3/2015"],
                ].map(([code, treatment, legal]) => (
                  <tr key={code} className="even:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 font-mono text-gray-500">{code}</td>
                    <td className="border border-gray-200 px-3 py-2 text-gray-800">{treatment}</td>
                    <td className="border border-gray-200 px-3 py-2 text-gray-600">{legal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="¿Para qué usamos sus datos personales?">
          <p>Tratamos sus datos exclusivamente para las siguientes finalidades:</p>
          <BulletList
            items={[
              "Gestión administrativa de clientes particulares.",
              "Llevar a cabo la venta o prestación del servicio contratado.",
              "Gestión de las peticiones de información recibidas sobre nuestros productos o servicios.",
              "Envío de información comercial y/o publicitaria mediante correo electrónico.",
              "Realizar campañas publicitarias para publicitar nuestros servicios y/o productos.",
              "Recabar la opinión de los interesados.",
              "Envío de paquetería y correspondencia.",
              "Gestionar, mantener y reparar los sistemas de almacenamiento informático.",
              "Gestionar cualquier problema de índole jurídica que afecte a la empresa.",
              "Actuaciones para llevar a cabo la gestión laboral, fiscal y contable propia.",
              "Cumplir con los requisitos previstos en la Ley de Prevención de Riesgos Laborales.",
              "Selección de personal para cubrir las vacantes de empleo necesarias.",
              "Cumplimiento de los requisitos exigidos por el RGPD y la Ley Orgánica 3/2018.",
              "Cumplir el principio de limitación del plazo de conservación de los datos personales.",
              "Gestión exclusiva de las incidencias internas en el cumplimiento del RGPD.",
            ]}
          />
          <p className="mt-3 text-gray-600">
            <strong>Elaboración de perfiles:</strong> Podrá elaborarse un perfil comercial o de usuario en base a
            la información facilitada u obtenida. En ningún caso se elaborarán perfiles con datos de menores.
          </p>
        </Section>

        <Section title="¿Por qué estamos legitimados para tratar sus datos?">
          <p>El tratamiento de sus datos se basa en las siguientes legitimaciones:</p>
          <BulletList
            items={[
              "Su consentimiento inequívoco, informado y expreso, en los supuestos en que sea legalmente exigible.",
              "Una obligación legal del responsable del tratamiento.",
              "La ejecución del contrato de prestación de servicios y/o compraventa de productos suscrito con usted.",
              "El interés legítimo del responsable, debidamente ponderado frente a sus intereses y derechos.",
            ]}
          />
          <p className="mt-3 text-gray-600 text-xs">
            Para cualquier duda sobre la base de legitimación aplicable, puede contactar con nosotros en{" "}
            <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">
              inforvel@inforvel.online
            </a>
            .
          </p>
        </Section>

        <Section title="¿Cuánto tiempo conservamos sus datos?">
          <p>
            Los datos personales proporcionados se conservarán mientras dure la relación contractual o, en su caso,
            mientras no ejerza su derecho de oposición o retire el consentimiento otorgado. Una vez finalizada la
            relación, los datos se bloquearán y conservarán durante los plazos legalmente previstos para atender
            posibles responsabilidades.
          </p>
        </Section>

        <Section title="¿Con quién podemos compartir sus datos?">
          <p>Sus datos personales podrán comunicarse a las siguientes entidades cuando sea necesario:</p>
          <BulletList
            items={[
              "Agencia Tributaria",
              "Servicio Público de Empleo Estatal (SEPE)",
              "Tesorería General de la Seguridad Social (TGSS)",
              "Agencia Española de Protección de Datos (AEPD)",
              "Entidades bancarias (bancos y cajas)",
            ]}
          />
          <p className="mt-3">
            Además, para poder prestar el servicio contamos con los siguientes encargados del tratamiento:
          </p>
          <BulletList
            items={[
              "Stripe: procesamiento de pagos con tarjeta en el checkout.",
              "Metricool: analítica web y gestión de redes sociales.",
              "Google (Google Analytics y otros servicios de Google): analítica web y publicidad.",
            ]}
          />
          <p className="mt-3">
            <strong>Transferencias internacionales de datos:</strong> Stripe y Google son proveedores establecidos
            en Estados Unidos. Cuando estos proveedores tratan datos personales fuera del Espacio Económico Europeo,
            dicha transferencia se realiza al amparo del marco de adecuación UE-EE.UU. (EU-U.S. Data Privacy
            Framework) o, en su defecto, mediante cláusulas contractuales tipo aprobadas por la Comisión Europea,
            garantizando en todo caso un nivel de protección equivalente al exigido por el RGPD.
          </p>
        </Section>

        <Section title="¿De dónde proceden sus datos?">
          <p>
            Los datos personales que tratamos en nuestra organización proceden exclusivamente del propio interesado,
            y se incorporan a los ficheros titularidad de la organización (FP01 Clientes, FR01 Solicitudes de
            información, FG01 Gestión contable propia, entre otros).
          </p>
        </Section>

        <Section title="¿Qué derechos puede ejercer?">
          <p>Puede ejercer gratuitamente los siguientes derechos enviando solicitud escrita a nuestra dirección postal o por email a <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">inforvel@inforvel.online</a>:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              ["Acceso", "Conocer qué datos suyos tratamos y con qué finalidad."],
              ["Rectificación", "Corregir datos inexactos o incompletos."],
              ["Supresión", "Solicitar la eliminación de sus datos cuando no sean necesarios."],
              ["Oposición", "Oponerse al tratamiento por motivos relacionados con su situación particular."],
              ["Limitación", "Solicitar que únicamente conservemos sus datos para el ejercicio de reclamaciones."],
              ["Portabilidad", "Recibir sus datos en formato estructurado y de lectura mecánica."],
              ["Decisiones automatizadas", "Oponerse a decisiones automatizadas, incluida la elaboración de perfiles."],
              ["Retirada del consentimiento", "Retirar en cualquier momento el consentimiento otorgado."],
            ].map(([right, desc]) => (
              <div key={right} className="border border-gray-200 rounded p-3">
                <span className="block font-semibold text-gray-800 text-xs">{right}</span>
                <span className="block text-gray-600 text-xs mt-1">{desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-gray-600">
            También tiene derecho a presentar reclamaciones ante la{" "}
            <a
              href="https://www.aepd.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Agencia Española de Protección de Datos (www.aepd.es)
            </a>{" "}
            o ante los Tribunales de Justicia para reclamar una indemnización.
          </p>
        </Section>

        <Section title="Medidas de seguridad">
          <p>
            En cada tratamiento de sus datos personales se determinan las posibles amenazas e impactos que pueden
            producirse, mitigando o eliminando los potenciales perjuicios mediante la aplicación de las
            correspondientes medidas de seguridad, que se revisan periódicamente para determinar su eficacia.
          </p>
          <p>
            Nuestro sistema de control permite acreditar el principio de limitación a la finalidad del tratamiento,
            el principio de limitación al plazo de conservación, el principio de minimización de datos, así como el
            principio de integridad y confidencialidad.
          </p>
        </Section>
      </div>
    </LegalPage>
  );
}
