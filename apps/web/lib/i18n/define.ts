/** One domain of UI strings with English, Sinhala and Tamil kept side by side; a missing key in any language fails the type check. */
export function defineDomain<const E extends Record<string, string>>(d: {
  en: E;
  si: Record<keyof E, string>;
  ta: Record<keyof E, string>;
}) {
  return d;
}
