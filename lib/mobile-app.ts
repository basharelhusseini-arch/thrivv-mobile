/** Presentation only. This marker never grants authentication or reward access. */
export function isNativeApp(userAgent: string | null | undefined): boolean {
  return /(?:^|\s)ThrivvApp\/\d/.test(userAgent || '');
}
