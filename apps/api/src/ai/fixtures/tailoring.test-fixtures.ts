import type {
  JobAnalysisDto,
  MasterProfileDto,
  TailorResumeInput,
} from "@tailored-cv/types";

export const masterProfileFixture: MasterProfileDto = {
  fullName: "Candidato Teste",
  email: "candidate@example.com",
  location: "Brasil",
  summary:
    "Desenvolvedor Full Stack com mais de 3 anos de experiência em aplicações web e mobile em produção, com base sólida em JavaScript/TypeScript, React e Next.js e atuação em backend com Node.js (Express e NestJS), PostgreSQL e Prisma. Entreguei a plataforma Ranking dos Políticos (Next.js), com 1,4 s de LCP e nota 99 no Lighthouse, e o app Motul Expert (Flutter), com mais de 100 mil downloads. Desenvolvo uma plataforma LMS completa com Next.js, NestJS, PostgreSQL, testes e Docker.",
  skills: [
    { name: "TypeScript", category: "PROFESSIONAL" },
    { name: "JavaScript", category: "PROFESSIONAL" },
    { name: "React", category: "PROFESSIONAL" },
    { name: "Next.js (SSR, SSG, ISR)", category: "PROFESSIONAL" },
    { name: "Node.js", category: "PROFESSIONAL" },
    { name: "Express", category: "PROFESSIONAL" },
    { name: "NestJS", category: "HANDS_ON" },
    { name: "PostgreSQL", category: "HANDS_ON" },
    { name: "Prisma", category: "HANDS_ON" },
    { name: "Zustand", category: "PROFESSIONAL" },
    { name: "Zod", category: "HANDS_ON" },
    { name: "SCSS", category: "PROFESSIONAL" },
    { name: "HTML", category: "PROFESSIONAL" },
    { name: "CSS", category: "PROFESSIONAL" },
    { name: "Tailwind CSS", category: "PROFESSIONAL" },
    { name: "APIs REST", category: "PROFESSIONAL" },
    { name: "Git", category: "PROFESSIONAL" },
    { name: "GitHub Actions (CI)", category: "HANDS_ON" },
    { name: "Vitest", category: "HANDS_ON" },
    { name: "Testing Library", category: "HANDS_ON" },
    { name: "Flutter", category: "PROFESSIONAL" },
    { name: "WordPress", category: "HANDS_ON" },
    { name: "Redux", category: "HANDS_ON" },
    { name: "Docker", category: "HANDS_ON" },
  ],
  experiences: [
    {
      id: "experience-main",
      company: "Empresa Digital",
      position: "Desenvolvedor Frontend",
      location: "Remoto",
      startDate: "2023-07",
      isCurrent: true,
      technologies: [
        "React",
        "Next.js",
        "TypeScript",
        "Zustand",
        "Flutter",
        "WordPress",
        "APIs REST",
        "Git",
      ],
      highlights: [
        "Ranking dos Políticos: frontend de plataforma que avalia o desempenho de parlamentares brasileiros, em Next.js, React e TypeScript. Aprovada em todos os Core Web Vitals nos dados reais do Google, com LCP de 1,4 s e nota 99 no Lighthouse.",
        "Motul Expert: app Flutter com mais de 100 mil downloads. Participei da reestruturação da solução com foco em estabilidade e performance.",
        "Desenvolvimento de aplicações web com React e Next.js (SSR, SSG, ISR), componentes reutilizáveis e Zustand para estado.",
        "Versionamento de código e fluxo de desenvolvimento colaborativo com Git.",
        "Integração contínua com APIs REST e manutenção de sistemas legados, incluindo projetos em WordPress.",
      ],
    },
  ],
  projects: [
    {
      id: "project-ranking",
      name: "Ranking dos Políticos",
      description:
        "Frontend para plataforma pública que avalia o desempenho de parlamentares brasileiros com grande volume de acessos simultâneos.",
      url: "https://politicos.org.br/",
      highlights: [
        "Aprovada em todos os Core Web Vitals do Google em produção, atingindo LCP de 1,4 s.",
        "Nota 99 no Google Lighthouse, com arquitetura desacoplada e componentes reutilizáveis.",
      ],
      technologies: ["Next.js", "React", "TypeScript", "Zustand"],
    },
    {
      id: "project-motul",
      name: "Motul Expert",
      description:
        "Aplicativo mobile oficial para consulta técnica e recomendação de fluidos e lubrificantes automotivos.",
      url: "https://play.google.com/store/apps/details?id=br.com.motul.motulexpert",
      highlights: [
        "Mais de 100 mil downloads no Google Play com estabilidade em produção.",
      ],
      technologies: ["Flutter", "APIs REST"],
    },
    {
      id: "project-veltro",
      name: "LMS – Plataforma de ensino Full Stack (Veltro LMS)",
      description:
        "Plataforma LMS completa com frontend Next.js e backend NestJS com PostgreSQL, Prisma, testes e Docker.",
      url: "https://veltro.cr1stofe.dev/",
      highlights: [
        "Frontend em Next.js com gerenciamento de estado e validação de formulários.",
        "API modular em NestJS com PostgreSQL e Prisma.",
        "Testes automatizados com Vitest e ambiente conteinerizado com Docker.",
      ],
      technologies: [
        "Next.js",
        "NestJS",
        "PostgreSQL",
        "Prisma",
        "Vitest",
        "Docker",
      ],
    },
    {
      id: "project-portfolio",
      name: "Portfólio Pessoal",
      description:
        "Portfólio em Next.js com Static Site Generation, testes automatizados e integração contínua.",
      url: "https://cr1stofe.dev/",
      highlights: [
        "Static Site Generation (SSG), testes com Vitest e Testing Library e pipeline de CI com GitHub Actions.",
      ],
      technologies: [
        "Next.js",
        "React",
        "TypeScript",
        "Vitest",
        "Testing Library",
        "GitHub Actions",
      ],
    },
    {
      id: "project-tailored-cv",
      name: "Tailored CV",
      description:
        "Monorepo para adaptação de currículos orientada a vagas com validação anti-alucinação.",
      url: "https://github.com/Cr1stofe/tailored-cv",
      highlights: [
        "Arquitetura com Next.js, NestJS, Turborepo e contratos validados em tempo de execução com Zod.",
      ],
      technologies: [
        "Next.js",
        "NestJS",
        "PostgreSQL",
        "Prisma",
        "Turborepo",
        "Docker",
        "Zod",
      ],
    },
  ],
  educations: [],
  certifications: [],
};

function analysis(
  requiredSkills: string[],
  desiredSkills: string[],
  keywords: string[],
): JobAnalysisDto {
  return {
    applicationId: "fixture-application",
    summary: "Fixture de análise de vaga.",
    requiredSkills,
    desiredSkills,
    keyResponsibilities: [],
    keywords,
    matchScore: 0,
    matchingSkills: [],
    missingSkills: [],
    strategicRecommendations: [],
  };
}

export const luminaFrontendFixture: TailorResumeInput = {
  company: "Lumina Pagamentos",
  position: "Desenvolvedor Front-end Pleno",
  targetLanguage: "PT",
  jobDescription:
    "Desenvolvimento de interfaces com React, TypeScript e Next.js. Experiência com SSR, SSG, testes automatizados e GitHub Actions/CI é diferencial. Cypress é obrigatório.",
  masterProfile: masterProfileFixture,
  jobAnalysis: analysis(
    ["React", "TypeScript", "Next.js", "Cypress"],
    ["GitHub Actions", "Vitest", "SSR", "SSG"],
    ["React", "TypeScript", "Next.js", "CI", "testes", "SSR", "SSG"],
  ),
};

export const juniorFrontendFixture: TailorResumeInput = {
  company: "Produto Júnior",
  position: "Desenvolvedor Front-end Júnior",
  targetLanguage: "PT",
  jobDescription:
    "Vaga júnior para desenvolvimento de páginas com HTML, CSS, JavaScript, React e Git. Conhecimento de TypeScript é desejável.",
  masterProfile: masterProfileFixture,
  jobAnalysis: analysis(
    ["HTML", "CSS", "JavaScript", "React", "Git"],
    ["TypeScript"],
    ["HTML", "CSS", "JavaScript", "React", "Git", "TypeScript"],
  ),
};

export const angularFrontendFixture: TailorResumeInput = {
  company: "Angular Enterprise",
  position: "Desenvolvedor Angular",
  targetLanguage: "PT",
  jobDescription:
    "Desenvolvimento com Angular, RxJS e NgRx. Testes com Jasmine e deploy em Azure são obrigatórios.",
  masterProfile: masterProfileFixture,
  jobAnalysis: analysis(
    ["Angular", "RxJS", "NgRx", "Jasmine", "Azure"],
    ["TypeScript", "CI/CD"],
    ["Angular", "RxJS", "NgRx", "Jasmine", "Azure", "TypeScript"],
  ),
};

export const orbitaCommerceFixture: TailorResumeInput = {
  company: "Orbita Commerce",
  position: "Pessoa Desenvolvedora Front-end Next.js (Pleno/Sênior)",
  targetLanguage: "PT",
  jobDescription:
    "Plataforma de e-commerce headless. Construir páginas em Next.js com SSR/ISR, Tailwind CSS, APIs REST e endpoints em Node.js. Perfil full stack, testes automatizados, Docker, CI/CD e PostgreSQL. Requisitos: React, Next.js, TypeScript, HTML, CSS, Redux Toolkit, testes, GraphQL, AWS e Core Web Vitals.",
  masterProfile: masterProfileFixture,
  jobAnalysis: analysis(
    [
      "React",
      "Next.js",
      "TypeScript",
      "HTML",
      "CSS",
      "Redux Toolkit",
      "Testes (Jest, RTL, Cypress)",
      "GraphQL",
      "AWS",
      "Core Web Vitals",
    ],
    ["Docker", "CI/CD", "PostgreSQL"],
    [
      "Next.js",
      "React",
      "TypeScript",
      "Node.js",
      "Tailwind CSS",
      "APIs REST",
      "PostgreSQL",
      "Docker",
      "Vitest",
      "Testing Library",
    ],
  ),
};

export const tailoringFixtures = [
  luminaFrontendFixture,
  juniorFrontendFixture,
  angularFrontendFixture,
  orbitaCommerceFixture,
];
