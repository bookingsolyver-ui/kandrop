import { hasLocale } from "next-intl";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { affiliateRepository } from "@/server/modules/affiliates/repository";
import { refCodeSchema } from "@/shared/affiliates/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ locale: string }> };

/**
 * Where an affiliate link lands: `/join?ref=code`. It counts the click for that affiliate and
 * sends the visitor to sign up. An unknown or malformed code is simply ignored (never an
 * error, so codes cannot be probed for). Sign-ups are not attributed to the affiliate yet.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { locale } = await ctx.params;
  const ref = refCodeSchema.safeParse(new URL(req.url).searchParams.get("ref") ?? "");
  if (ref.success) affiliateRepository.recordClick(ref.data);
  const target = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  return NextResponse.redirect(new URL(`/${target}/register`, req.url));
}
