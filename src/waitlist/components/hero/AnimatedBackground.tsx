/**
 * Fundo do hero — PRD 3.6.
 * Adaptação do padrão DarkGradientBg com paleta Kandrop:
 *   · azul original (#00CFFF) → laranja da marca (#FF5A00)
 *   · gradiente radial canto superior esquerdo (tom escuro → preto)
 *   · riscos inclinados (skewX 45°) em laranja
 *   · grelha de pontos subtil (sem imagem externa)
 *   · destaque radial central em laranja muito suave
 * Sem JS — tudo CSS, GPU-friendly.
 */
export default function AnimatedBackground() {
  /* Cor base dos riscos: #FF5A00 = rgb(255,90,0) */
  const streakColor = "rgb(255, 90, 0)";
  const streakTransparent = "rgba(255, 90, 0, 0)";

  const skewedStreaks: Array<{ mask: string }> = [
    {
      mask: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 20%, rgba(0,0,0,0) 36%, rgb(0,0,0) 55%, rgba(0,0,0,0.13) 67%, rgb(0,0,0) 78%, rgba(0,0,0,0) 97%)",
    },
    {
      mask: "linear-gradient(90deg, rgba(0,0,0,0) 11%, rgb(0,0,0) 25%, rgba(0,0,0,0.55) 41%, rgba(0,0,0,0.13) 67%, rgb(0,0,0) 78%, rgba(0,0,0,0) 97%)",
    },
    {
      mask: "linear-gradient(90deg, rgba(0,0,0,0) 9%, rgb(0,0,0) 20%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0.42) 40%, rgb(0,0,0) 48%, rgba(0,0,0,0.27) 54%, rgba(0,0,0,0.13) 78%, rgb(0,0,0) 88%, rgba(0,0,0,0) 97%)",
    },
    {
      mask: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 17%, rgba(0,0,0,0.55) 26%, rgb(0,0,0) 35%, rgba(0,0,0,0) 47%, rgba(0,0,0,0.13) 69%, rgb(0,0,0) 79%, rgba(0,0,0,0) 97%)",
    },
    {
      mask: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 20%, rgba(0,0,0,0.55) 27%, rgb(0,0,0) 42%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.13) 67%, rgb(0,0,0) 74%, rgb(0,0,0) 82%, rgba(0,0,0,0.47) 88%, rgba(0,0,0,0) 97%)",
    },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">

      {/* Camada 1 — gradiente radial canto superior esquerdo (escuro → preto) */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(100% 100% at 0% 0%, rgb(35, 35, 35) 0%, rgb(0, 0, 0) 100%)",
          mask: "radial-gradient(125% 100% at 0% 0%, rgb(0,0,0) 0%, rgba(0,0,0,0.22) 88%, rgba(0,0,0,0) 100%)",
        }}
      >
        {/* Camada 2 — riscos inclinados em laranja (#FF5A00) */}
        {skewedStreaks.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(${streakColor} 0%, ${streakTransparent} 100%)`,
              mask: s.mask,
              transform: "skewX(45deg)",
            }}
          />
        ))}
      </div>

      {/* Camada 3 — grelha de pontos muito subtil (sem imagem externa) */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Camada 4 — brilho radial laranja central muito suave */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_38%,rgb(255_90_0_/_0.09),transparent_70%)]" />

      {/* Camada 5 — riscos CSS (globals.css) que deslizam devagar */}
      <div className="streak streak-1" />
      <div className="streak streak-2" />
      <div className="streak streak-3" />

    </div>
  );
}
