// app/politica-cookies/page.tsx
import { LegalPage, Section, InfoBox } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies | Inforvel",
  description: "Política de cookies del sitio web inforvel.online",
};

export default function PoliticaCookiesPage() {
  return (
    <LegalPage title="Política de Cookies" lastUpdated="Enero 2026">
      <InfoBox>
        Este sitio web, <strong>inforvel.online</strong>, utiliza cookies y tecnologías similares. A continuación
        te explicamos qué son, para qué las usamos y cómo puedes controlarlas.
      </InfoBox>

      <div className="mt-8">
        <Section title="¿Qué son las cookies?">
          <p>
            Las cookies son pequeños ficheros de texto que los sitios web envían al navegador del usuario y que se
            almacenan en su dispositivo (ordenador, smartphone, tablet, etc.). Permiten que el sitio web recuerde
            información sobre su visita, como el idioma preferido y otras opciones, lo que puede facilitar su
            próxima visita y hacer que el sitio le resulte más útil.
          </p>
        </Section>

        <Section title="Tipos de cookies que utilizamos">
          <div className="space-y-4">
            {[
              {
                tipo: "Cookies técnicas o necesarias",
                descripcion:
                  "Son imprescindibles para que el sitio web funcione correctamente. Sin ellas, algunas partes de la web no estarán disponibles. No requieren su consentimiento.",
                ejemplos: "Gestión de sesión, seguridad, preferencias básicas del usuario.",
                retencion: "Sesión / hasta 1 año",
              },
              {
                tipo: "Cookies analíticas",
                descripcion:
                  "Nos permiten conocer cómo los visitantes interactúan con el sitio web: páginas visitadas, tiempo de permanencia, fuentes de tráfico, etc. La información es anónima y se usa para mejorar el sitio.",
                ejemplos: "Google Analytics u herramientas equivalentes.",
                retencion: "Hasta 2 años",
              },
              {
                tipo: "Cookies de preferencias o funcionales",
                descripcion:
                  "Permiten recordar información que cambia el comportamiento o el aspecto de la web, como el idioma o la región en la que se encuentra el usuario.",
                ejemplos: "Idioma seleccionado, configuración de visualización.",
                retencion: "Hasta 1 año",
              },
              {
                tipo: "Cookies de publicidad o marketing",
                descripcion:
                  "Se utilizan para mostrar anuncios más relevantes para el usuario y sus intereses. También pueden utilizarse para limitar el número de veces que se muestra un anuncio y medir la efectividad de las campañas.",
                ejemplos: "Píxeles de seguimiento de redes sociales o plataformas publicitarias.",
                retencion: "Hasta 2 años",
              },
            ].map((cookie) => (
              <div key={cookie.tipo} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800 text-sm">{cookie.tipo}</h3>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <p className="text-gray-700">{cookie.descripcion}</p>
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-600">Ejemplos: </span>
                    {cookie.ejemplos}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-600">Periodo de retención: </span>
                    {cookie.retencion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Cookies de terceros">
          <p>
            Este sitio web puede utilizar servicios de terceros que, a su vez, instalan cookies en su dispositivo.
            VELA CAMPAÑA, MANUEL ANTONIO no controla esas cookies. Para más información sobre las cookies de
            terceros, le recomendamos que consulte las políticas de privacidad de cada uno de dichos servicios.
          </p>
          <p className="mt-2">
            Entre los servicios de terceros que podemos utilizar se encuentran herramientas de análisis web (como
            Google Analytics) y redes sociales, que pueden instalar sus propias cookies de seguimiento.
          </p>
        </Section>

        <Section title="¿Cómo puede gestionar las cookies?">
          <p>
            Puede aceptar, rechazar o configurar las cookies en cualquier momento a través del panel de
            preferencias de cookies disponible en el pie de página de nuestra web.
          </p>
          <p className="mt-2">
            Asimismo, puede configurar su navegador para bloquear o eliminar las cookies almacenadas:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              {
                browser: "Chrome",
                url: "https://support.google.com/chrome/answer/95647",
              },
              {
                browser: "Firefox",
                url: "https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias",
              },
              {
                browser: "Safari",
                url: "https://support.apple.com/es-es/guide/safari/sfri11471/mac",
              },
              {
                browser: "Edge",
                url: "https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d",
              },
            ].map(({ browser, url }) => (
              <a
                key={browser}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center border border-blue-200 rounded-lg px-3 py-3 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                {browser}
              </a>
            ))}
          </div>
          <p className="mt-3 text-gray-600 text-xs">
            Tenga en cuenta que bloquear todas las cookies puede afectar al funcionamiento del sitio web.
          </p>
        </Section>

        <Section title="Base legal">
          <p>
            El uso de cookies no estrictamente necesarias se basa en su consentimiento, de conformidad con el
            artículo 22.2 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y
            Comercio Electrónico (LSSI-CE), y el Reglamento (UE) 2016/679 (RGPD).
          </p>
          <p className="mt-2">
            Las cookies técnicas o estrictamente necesarias se instalan en base al interés legítimo del responsable
            para garantizar el correcto funcionamiento del sitio web.
          </p>
        </Section>

        <Section title="Actualizaciones de esta política">
          <p>
            VELA CAMPAÑA, MANUEL ANTONIO se reserva el derecho de modificar esta Política de Cookies para
            adaptarla a novedades legislativas, jurisprudenciales o de interpretación de la Agencia Española de
            Protección de Datos. En ese caso, se anunciará en esta página.
          </p>
          <p className="mt-2">
            Para cualquier consulta, puede dirigirse a{" "}
            <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">
              inforvel@inforvel.online
            </a>
            .
          </p>
        </Section>
      </div>
    </LegalPage>
  );
}
