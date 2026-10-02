import { Img } from "@react-email/components";

/** Tailwind theme shared by the Kandrop e-mails. */
export const EMAIL_TAILWIND = { theme: { extend: { colors: { brand: { orange: "#ff5a00", black: "#000000" } } } } } as const;

/** Absolute URLs: an e-mail client cannot read the site's relative paths. */
const LOGO_LIGHT = "https://kandrop.com/images/kandrop-logo.png";
const LOGO_DARK = "https://kandrop.com/images/brand/inverted.png";

/**
 * Dark mode, written as plain CSS in the message's <style>. (Tailwind's `dark:` is NOT used: the e-mail Tailwind inliner
 * resolves it into the inline styles, which would paint the dark theme for everybody.) The light theme is what the inline styles
 * say, so any client that ignores `prefers-color-scheme` (Outlook desktop, Gmail, which has its own auto-dark) shows the light
 * message; where the device is in dark mode (Apple Mail, iOS Mail, Outlook for Mac/iOS, Thunderbird) this block replaces it.
 * `!important` is needed to win over the inline styles.
 */
const DARK_CSS = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  html, body, .dm-page, .dm-page > table > tbody > tr > td { background-color: #000000 !important; }
  .dm-card { background-color: #121212 !important; }
  .dm-title { color: #ffffff !important; }
  .dm-text { color: #d4d4d4 !important; }
  .dm-box { background-color: #2b1a10 !important; }
  .dm-hr { border-color: #2a2a2a !important; }
  .dm-logo-light { display: none !important; max-height: 0 !important; overflow: hidden !important; mso-hide: all !important; }
  .dm-logo-dark { display: block !important; max-height: none !important; overflow: visible !important; }
}
`;

export function DarkModeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: DARK_CSS }} />;
}

/**
 * The header logo, adaptive, as two separate images in two wrappers: the dark-wordmark one by default, the white-wordmark one
 * (`/images/brand/inverted.png`) in dark mode (see `DARK_CSS`; the card turns dark in the same media query, so the light logo
 * never lands on a white card).
 */
export function EmailLogo() {
  return (
    <>
      {/* Light mode (and every client that ignores the media query): shown. Hidden in dark mode by `.dm-logo-light`. */}
      <div className="dm-logo-light" style={{ display: "block" }}>
        <Img src={LOGO_LIGHT} width="140" alt="Kandrop" className="mx-auto" style={{ display: "block" }} />
      </div>
      {/* Dark mode: the white wordmark. Collapsed everywhere else (`mso-hide` is for Outlook desktop, which ignores media queries). */}
      <div className="dm-logo-dark" style={{ display: "none", maxHeight: 0, overflow: "hidden", msoHide: "all" } as React.CSSProperties}>
        <Img src={LOGO_DARK} width="140" alt="Kandrop" className="mx-auto" style={{ display: "block" }} />
      </div>
    </>
  );
}
