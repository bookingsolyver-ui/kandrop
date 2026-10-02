import Header from "@/waitlist/components/sections/Header";
import Hero from "@/waitlist/components/sections/Hero";
import Problem from "@/waitlist/components/sections/Problem";
import Footer from "@/waitlist/components/sections/Footer";

/**
 * Estrutura enxuta de alta conversão para a Lista de Espera:
 * Cabeçalho → Hero com formulário & explicação → O Problema → Rodapé.
 */
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
      </main>
      <Footer />
    </>
  );
}

