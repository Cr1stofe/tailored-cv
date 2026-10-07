import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Layers,
  Lock,
  LogIn,
} from "lucide-react";
import styles from "../page.module.scss";

export function LandingView() {
  return (
    <div className={styles.page}>
      <section className={styles.landingHero}>
        <div className={styles.landingBadge}>
          <Sparkles size={14} />
          <span>Engenharia de Currículos com IA</span>
        </div>

        <h1 className={styles.landingTitle}>
          Destaque seu perfil em cada vaga com <span>fidelidade absoluta</span>
        </h1>

        <p className={styles.landingSubtitle}>
          O Tailored CV alinha seu histórico profissional aos requisitos de
          vagas e filtros ATS, sem jamais inventar ou alucinar fatos.
        </p>

        <div className={styles.landingActions}>
          <Link href="/login" className={styles.primaryButton}>
            <LogIn size={16} />
            <span>Acessar Plataforma</span>
          </Link>
        </div>
      </section>

      <section className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <ShieldCheck size={22} />
          </div>
          <h3>Never invent. Only reframe.</h3>
          <p>
            Princípio anti-alucinação estrito. A IA atua reorganizando e
            destacando conquistas reais do seu Master Profile, mantendo
            integridade factual total.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <TrendingUp size={22} />
          </div>
          <h3>Otimização e Match ATS</h3>
          <p>
            Extração profunda de palavras-chave, habilidades técnicas e cálculo
            de aderência percentual para superar triagens automatizadas.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Layers size={22} />
          </div>
          <h3>Adaptação Contextual</h3>
          <p>
            Cada vaga recebe um currículo sob medida, com sumário executivo e
            bullet points reformulados exatamente para o que a empresa busca.
          </p>
        </div>
      </section>

      <div className={styles.principleBanner}>
        <Lock size={26} className={styles.principleIcon} />
        <div>
          <div className={styles.principleTitle}>
            Acesso Protegido e Sessão Segura
          </div>
          <div className={styles.principleText}>
            Acesso exclusivo via sessões criptográficas com cookies HttpOnly no
            PostgreSQL. Todos os recursos operacionais da plataforma são
            restritos a usuários autenticados.
          </div>
        </div>
      </div>
    </div>
  );
}
