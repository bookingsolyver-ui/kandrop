/**
 * Meta's base code, WITHOUT any `init` or event: it only defines `fbq` and loads `fbevents.js`. Every command is then
 * made from our own code, so each pixel is initialised explicitly. Commands asked for before this ran are replayed in
 * order. Safe to include twice (the first one wins).
 */
export const PIXEL_BASE_SNIPPET = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');(window.__metaPixelQueue||[]).forEach(function(a){fbq.apply(null,a)});window.__metaPixelQueue=null;`;
