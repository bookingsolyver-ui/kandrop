import { useTranslations } from "next-intl";

export default function ProductNotFound() {
  const t = useTranslations("Storefront.notFound");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <h1 className="font-serif text-[1.75rem] leading-tight font-medium">{t("title")}</h1>
      <p className="mt-3 text-ink-2">{t("body")}</p>
    </main>
  );
}
