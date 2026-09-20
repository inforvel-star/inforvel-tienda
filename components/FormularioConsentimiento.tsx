// components/FormularioConsentimiento.tsx
// Usar este componente en los formularios de contacto/compra de la web

/**
 * CAPA BÁSICA DE PROTECCIÓN DE DATOS
 * Para incluir debajo de cualquier formulario de contacto o solicitud.
 * 
 * Según el documento "Deber de información web: solicitudes recibidas + publicidad"
 * de VELA CAMPAÑA, MANUEL ANTONIO (NIF 46074409G)
 */

"use client";
import { useState } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────
// Versión compacta para formularios de COMPRA
// ─────────────────────────────────────────────
interface CheckboxesFormularioCompraProps {
  privacidad: boolean;
  onPrivacidadChange: (checked: boolean) => void;
  condiciones: boolean;
  onCondicionesChange: (checked: boolean) => void;
  publicidad: boolean;
  onPublicidadChange: (checked: boolean) => void;
}

export function CheckboxesFormularioCompra({
  privacidad,
  onPrivacidadChange,
  condiciones,
  onCondicionesChange,
  publicidad,
  onPublicidadChange,
}: CheckboxesFormularioCompraProps) {
  return (
    <fieldset className="mt-4 space-y-3 border-t border-gray-200 pt-4">
      <legend className="sr-only">Consentimientos y aceptaciones</legend>

      {/* Obligatorio: Política de Privacidad */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          required
          checked={privacidad}
          onChange={(e) => onPrivacidadChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-sm text-gray-700">
          He leído y acepto la{" "}
          <Link href="/politica-privacidad" className="text-blue-600 hover:underline" target="_blank">
            Política de Privacidad
          </Link>
          . <span className="text-red-500">*</span>
        </span>
      </label>

      {/* Obligatorio: Condiciones Generales */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          required
          checked={condiciones}
          onChange={(e) => onCondicionesChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-sm text-gray-700">
          He leído y acepto las{" "}
          <Link href="/condiciones-generales" className="text-blue-600 hover:underline" target="_blank">
            Condiciones Generales de la Contratación
          </Link>
          . <span className="text-red-500">*</span>
        </span>
      </label>

      {/* Opcional: Comunicaciones comerciales */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={publicidad}
          onChange={(e) => onPublicidadChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-sm text-gray-700">
          Autorizo el tratamiento de mis datos para el envío de comunicaciones comerciales con fines
          promocionales.{" "}
          <span className="text-gray-400 text-xs">(Opcional)</span>
        </span>
      </label>

      {/* Capa básica de información */}
      <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 mt-2">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-700">Información básica sobre protección de datos</strong>
          <br />
          <strong>Responsable:</strong> VELA CAMPAÑA, MANUEL ANTONIO ·{" "}
          <strong>Finalidad:</strong> Prestación del servicio y envío de comunicaciones, incluidas en su caso las
          comerciales. · <strong>Legitimación:</strong> Interés legítimo del responsable, contrato y consentimiento
          del interesado. · <strong>Destinatarios:</strong> Sus datos no se comunicarán a terceros, salvo obligación
          legal. · <strong>Derechos:</strong> Puede ejercer sus derechos de acceso, rectificación, supresión,
          oposición, limitación, portabilidad y oposición a decisiones automatizadas enviando un correo a{" "}
          <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">
            inforvel@inforvel.online
          </a>
          . · Más información en nuestra{" "}
          <Link href="/politica-privacidad" className="text-blue-600 hover:underline" target="_blank">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>

      <p className="text-xs text-gray-400">
        <span className="text-red-500">*</span> Campos obligatorios
      </p>
    </fieldset>
  );
}

// ─────────────────────────────────────────────
// Versión para formulario de CONTACTO / SOLICITUDES
// Sin checkbox de condiciones generales
// ─────────────────────────────────────────────
export function CheckboxesFormularioContacto() {
  const [privacidad, setPrivacidad] = useState(false);
  const [publicidad, setPublicidad] = useState(false);

  return (
    <fieldset className="mt-4 space-y-3 border-t border-gray-200 pt-4">
      <legend className="sr-only">Consentimientos</legend>

      {/* Obligatorio: Política de Privacidad */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          required
          checked={privacidad}
          onChange={(e) => setPrivacidad(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-sm text-gray-700">
          He leído y acepto la{" "}
          <Link href="/politica-privacidad" className="text-blue-600 hover:underline" target="_blank">
            Política de Privacidad
          </Link>
          . <span className="text-red-500">*</span>
        </span>
      </label>

      {/* Opcional: Publicidad */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={publicidad}
          onChange={(e) => setPublicidad(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-sm text-gray-700">
          Consiento el envío por parte del responsable de campañas publicitarias sobre sus servicios y/o
          productos.{" "}
          <span className="text-gray-400 text-xs">(Opcional)</span>
        </span>
      </label>

      {/* Capa básica */}
      <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 mt-2">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-700">Información básica sobre protección de datos</strong>
          <br />
          <strong>Responsable:</strong> VELA CAMPAÑA, MANUEL ANTONIO (NIF 46074409G) · C/ El Avellano, 2, 14006
          Córdoba · inforvel@inforvel.online
          <br />
          <strong>Finalidad:</strong> Gestión de su solicitud de información y, si lo consiente, envío de
          comunicaciones publicitarias.
          <br />
          <strong>Legitimación:</strong> Interés legítimo del responsable para contestar su solicitud y
          consentimiento expreso para el envío de publicidad.
          <br />
          <strong>Derechos:</strong> Acceso, rectificación, supresión, portabilidad, limitación, oposición y
          oposición a decisiones automatizadas. Puede ejercerlos en{" "}
          <a href="mailto:inforvel@inforvel.online" className="text-blue-600 hover:underline">
            inforvel@inforvel.online
          </a>{" "}
          o consultar nuestra{" "}
          <Link href="/politica-privacidad" className="text-blue-600 hover:underline" target="_blank">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>
    </fieldset>
  );
}
