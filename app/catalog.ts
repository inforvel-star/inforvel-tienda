/**
 * Parses a string that represents a number in Spanish format (e.g., "1.234,56")
 * into a JavaScript number. It handles thousand separators (.) and decimal commas (,).
 *
 * @param value The string value to parse.
 * @returns A number, or null if the input is null, undefined, or cannot be parsed.
 */
export function parseNullableNumber(value: string | null | undefined): number | null {
    if (typeof value !== 'string' || !value) {
        return null;
    }

    const sanitized = value.replace(/\./g, '').replace(',', '.');
    const number = parseFloat(sanitized);

    return isNaN(number) ? null : number;
}