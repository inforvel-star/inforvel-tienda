'use client';

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-cookie-preferences'))}
      className="hover:text-white transition-colors text-left"
    >
      Preferencias de cookies
    </button>
  );
}
