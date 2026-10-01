import { headers } from "next/headers";
import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/meta-pixel";
import { PixelRouteEvents } from "./PixelRouteEvents";

/**
 * The Meta Pixel base snippet, only when `NEXT_PUBLIC_META_PIXEL_ID` is set. `afterInteractive`: it never delays the page.
 * The inline script carries the request's CSP nonce (src/proxy.ts), and the loaded `fbevents.js` is trusted through it.
 * The snippet fires the first `PageView`, replays the events components asked for before it existed, and
 * `PixelRouteEvents` fires one `PageView` per later client-side navigation.
 */
export async function MetaPixel() {
  if (!META_PIXEL_ID) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');(window.__metaPixelQueue||[]).forEach(function(a){fbq.apply(null,a)});window.__metaPixelQueue=null;`;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: snippet }} />
      <PixelRouteEvents />
    </>
  );
}
