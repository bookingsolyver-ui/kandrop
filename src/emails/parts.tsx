import { Img } from "@react-email/components";

/** Tailwind theme shared by the Kandrop e-mails. */
export const EMAIL_TAILWIND = { theme: { extend: { colors: { brand: { orange: "#ff5a00", black: "#000000" } } } } } as const;

/** Absolute URLs: an e-mail client cannot read the site's relative paths. */
const LOGO_LIGHT = "https://kandrop.com/images/kandrop-logo.png";
const LOGO_DARK = "https://kandrop.com/images/kandrop-logo-dark.png";

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
  .dm-logo-light { display: none !important; }
  .dm-logo-dark { display: block !important; }
}
`;

export function DarkModeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: DARK_CSS }} />;
}

/**
 * The header logo, adaptive: the dark-wordmark one by default, the white-wordmark one in dark mode (see `DARK_CSS`; the card turns
 * dark in the same media query, so the light logo never lands on a white card).
 */
export function EmailLogo() {
  return (
    <>
      <Img src={LOGO_LIGHT} width="140" alt="Kandrop" className="dm-logo-light mx-auto" />
      <Img src={LOGO_DARK} width="140" alt="Kandrop" className="dm-logo-dark mx-auto" style={{ display: "none" }} />
    </>
  );
}
