import { headers } from "next/headers";
import { META_PIXEL_ID, isPrivatePath } from "@/lib/meta-pixel";
import { PixelLoader } from "./PixelLoader";

/**
 * The Meta Pixel base snippet, only on public routes (see `PixelLoader`) and only when `NEXT_PUBLIC_META_PIXEL_ID` is set. `afterInteractive`: it never delays the page.
 * The inline script carries the request's CSP nonce (src/proxy.ts), and the loaded `fbevents.js` is trusted through it.
 * The snippet fires the first `PageView`, replays the events components asked for before it existed, and
 * `PixelRouteEvents` fires one `PageView` per later client-side navigation.
 */
export async function MetaPixel() {
  if (!META_PIXEL_ID) return null;
  const h = await headers();
  // A private route (admin, dashboard, supplier portal) never even receives the snippet in its HTML.
  if (isPrivatePath(h.get("x-pathname"))) return null;
  const nonce = h.get("x-nonce") ?? undefined;
  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('set','autoConfig',false,'${META_PIXEL_ID}');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');(window.__metaPixelQueue||[]).forEach(function(a){fbq.apply(null,a)});window.__metaPixelQueue=null;`;
  return <PixelLoader snippet={snippet} nonce={nonce} />;
}
