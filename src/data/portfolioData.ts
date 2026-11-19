export {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_CV_SETTINGS,
  DEFAULT_SOCIAL_NAMES,
  DEFAULT_VIEWER_CONTROLS,
} from './contentSchema';

export type {
  CursorSpeed,
  CvSettingsConfig,
  CvSourceMode,
  ExperienceItem,
  HeroMetricItem,
  MilestoneItem,
  PortfolioContentBundle,
  PreviewTheme,
  ProjectCategory,
  ProjectItem,
  ServiceItem,
  SiteProfile,
  SocialNamesConfig,
  SocialPlatformKey,
  TechStackItem,
  ViewerControlsConfig,
  WireframeRealScene,
} from './contentSchema';

import {
  DEFAULT_CV_SETTINGS,
  DEFAULT_SOCIAL_NAMES,
  DEFAULT_VIEWER_CONTROLS,
  type ExperienceItem,
  type HeroMetricItem,
  type MilestoneItem,
  type PortfolioContentBundle,
  type ProjectItem,
  type ServiceItem,
  type SiteProfile,
  type TechStackItem,
  type WireframeRealScene,
} from './contentSchema';

export const DEFAULT_SITE_PROFILE: SiteProfile = {
  greeting: "Hello, I'm",
  displayName: 'SHANTO.',
  backdropName: 'SHANTO',
  wordmark: 'SHANTO.',
  role: 'WEB DEVELOPER · APP & GAME CREATOR',
  bio: 'I design and engineer modern websites, full-stack web & mobile applications, and interactive 2D/3D games—turning live wireframes into fast, playable digital products.',
  portraitUrl: '/assets/shanto-cutout.png',
  email: 'shanto.dev@studio.com',
  phoneNumber: '',
  whatsappNumber: '',
  location: 'Dhaka, Bangladesh',
  githubHandle: '@shanto-dev',
  githubUrl: 'https://github.com/shanto-dev',
  twitterUrl: '',
  linkedinUrl: '',
  behanceUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  socialNames: { ...DEFAULT_SOCIAL_NAMES },
  availability: 'Remote Worldwide',
  disciplineSummary: 'Web · Apps · Games',
  craftMetricValue: '60',
  craftMetricSuffix: '+',
  craftMetricLabel: 'Websites, Apps & Games Shipped',
  craftSummary:
    'Every project starts as a structured wireframe and evolves into a fast, responsive, and memorable experience—built for real users and real players.',
  quoteText:
    'From the first wireframe cursor to the final playable build, every pixel and line of code should feel alive.',
  quoteAuthor: 'Shanto',
  quoteRole: 'Web Developer · App & Game Creator',
  manifestoLead:
    'Every polished website, scalable application, and responsive game starts with a blank canvas, sharp geometry, and obsessive iteration.',
  manifestoAvailability:
    'Available globally for freelance websites, custom web/mobile apps, and interactive game builds.',
  prototypeTurnaround: '3–5 DAYS',
};

export const HERO_METRICS: HeroMetricItem[] = [
  { value: '40+', label: 'Websites & Web Apps Shipped' },
  { value: '12+', label: 'Mobile & Desktop Applications' },
  { value: '8+', label: 'Original Games Designed & Built' },
  { value: '99%', label: 'Performance & Frame-Rate Focus' },
];

export const PROJECTS: ProjectItem[] = [
  {
    id: 'velocity-os',
    index: '01',
    title: 'Velocity OS',
    category: 'Apps',
    year: '2026',
    platform: 'Web & Desktop App',
    client: 'Velocity Labs',
    role: 'Lead Full-Stack Developer & UI Designer',
    stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    summary:
      'A keyboard-first project workspace application featuring real-time multiplayer cursors, kanban sprints, and sub-50ms optimistic state sync.',
    architectureNotes:
      'Built modular state sync over WebSockets, virtualized infinite canvas boards, and custom dark-mode design tokens.',
    previewTheme: 'app-workspace',
    dimensions: '1440 × 900',
  },
  {
    id: 'shadow-rift',
    index: '02',
    title: 'Shadow Rift',
    category: 'Games',
    year: '2026',
    platform: 'PC & WebGL Game',
    client: 'Original Indie Title',
    role: 'Game Designer & Gameplay Programmer',
    stack: ['Unity', 'C#', 'HLSL Shaders', 'WebGL'],
    summary:
      'Fast-paced cyber-dungeon action game featuring procedural level rooms, responsive dash combat, and custom crimson rim-lighting shaders.',
    architectureNotes:
      'Authored deterministic hit-stop combat loops, pooled particle systems at locked 60 FPS, and adaptive enemy AI state machines.',
    previewTheme: 'game-rift',
    dimensions: '1920 × 1080',
  },
  {
    id: 'kinetix-commerce',
    index: '03',
    title: 'Kinetix Storefront',
    category: 'Websites',
    year: '2025',
    platform: 'Responsive Web',
    client: 'Kinetix Gear',
    role: 'Web Designer & Frontend Engineer',
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Motion'],
    summary:
      'Editorial product launch website with scroll-choreographed spec reveals, instant variant switching, and sub-second page transitions.',
    architectureNotes:
      'Zero-CLS responsive grid, hardware-accelerated scroll animations, and streamlined single-page checkout flow.',
    previewTheme: 'web-commerce',
    dimensions: '1440 × 900',
  },
  {
    id: 'pulse-realtime',
    index: '04',
    title: 'Pulse Team Hub',
    category: 'Apps',
    year: '2025',
    platform: 'Cross-Platform App',
    client: 'Pulse Digital',
    role: 'Application Architect & Designer',
    stack: ['React Native', 'TypeScript', 'Firebase', 'Tailwind'],
    summary:
      'Cross-platform messaging and sprint tracking application built for remote design and engineering teams.',
    architectureNotes:
      'Offline-first local cache, push notification routing, and shared component primitives across web and mobile.',
    previewTheme: 'app-realtime',
    dimensions: '390 × 844',
  },
  {
    id: 'neon-drift-arena',
    index: '05',
    title: 'Neon Drift Arena',
    category: 'Games',
    year: '2025',
    platform: 'Browser Multiplayer Game',
    client: 'Original Arcade Project',
    role: 'Game Creator & Physics Engineer',
    stack: ['Three.js', 'TypeScript', 'Canvas 2D', 'WebSockets'],
    summary:
      'Top-down arcade drift racer with custom tire-traction physics, boost pads, ghost replays, and live leaderboard rooms.',
    architectureNotes:
      'Fixed-timestep 60Hz physics tick with client-side prediction and procedural skidmark/spark rendering.',
    previewTheme: 'game-drift',
    dimensions: '1280 × 720',
  },
  {
    id: 'obsidian-ui-kit',
    index: '06',
    title: 'Obsidian Design System',
    category: 'UI/UX Design',
    year: '2024',
    platform: 'Figma & React Library',
    client: 'Open Studio System',
    role: 'Product Designer & UI Engineer',
    stack: ['Figma', 'React', 'Tailwind CSS', 'Storybook'],
    summary:
      'Accessible multi-surface UI system of 48 production components, keyboard navigation primitives, and interactive layout templates.',
    architectureNotes:
      'WCAG AA verified contrast tokens, strict spacing math, and zero-runtime CSS custom property theming.',
    previewTheme: 'ui-system',
    dimensions: '1440 × 900',
  },
];

export const MILESTONES: MilestoneItem[] = [
  {
    id: 'ms-1',
    title: 'Featured Interactive Web Portfolio & UI Showcase',
    context: 'Web Design & Frontend Craft',
    project: 'Kinetix Storefront',
    year: '2026',
    outcome: 'Achieved 99 Lighthouse score and +42% product engagement after launch.',
  },
  {
    id: 'ms-2',
    title: 'Indie Game Jam — Top Gameplay & Visual Polish',
    context: '48-Hour Game Creation Showcase',
    project: 'Shadow Rift',
    year: '2026',
    outcome: 'Ranked Top 3 out of 140 entries for combat feel and custom shader atmosphere.',
  },
  {
    id: 'ms-3',
    title: 'Full-Stack Realtime Workspace Launch',
    context: 'Application Design & Engineering',
    project: 'Velocity OS',
    year: '2025',
    outcome: 'Adopted by 1,200+ active makers for daily sprint planning and live canvas notes.',
  },
  {
    id: 'ms-4',
    title: 'Multiplayer Browser Game Engine Release',
    context: 'HTML5 Canvas & WebGL Physics',
    project: 'Neon Drift Arena',
    year: '2025',
    outcome: 'Sustained 60 FPS across desktop and mobile browsers with zero install required.',
  },
  {
    id: 'ms-5',
    title: 'Cross-Platform Mobile & Web App Suite',
    context: 'Product Architecture',
    project: 'Pulse Team Hub',
    year: '2025',
    outcome: 'Unified codebase delivering 92% shared UI logic across iOS, Android, and Web.',
  },
  {
    id: 'ms-6',
    title: 'Open-Source Design System Release',
    context: 'UI/UX Engineering',
    project: 'Obsidian Design System',
    year: '2024',
    outcome: 'Powering 15+ production websites and internal web applications.',
  },
];

export const WIREFRAME_SCENES: WireframeRealScene[] = [
  {
    id: 'web-build',
    label: '01 · Website Design → Live Frontend',
    specs: 'Figma Blueprint · 12-Col Grid · React + Tailwind CSS',
    notes: 'Compare raw wireframe bounding boxes and layout guides against the shipped responsive interface.',
    theme: 'web-build',
  },
  {
    id: 'app-ui',
    label: '02 · App Wireframe → Working Application',
    specs: 'Component Tree · State Architecture · TypeScript',
    notes: 'Interactive dashboard views, live metrics, and user flows compiled directly from structural wireframes.',
    theme: 'app-ui',
  },
  {
    id: 'game-engine',
    label: '03 · Greybox Level → Playable Game World',
    specs: 'Collision Bounds · Physics Mesh · Shaded 60 FPS Engine',
    notes: 'Hitbox prototypes and vector paths transformed into lit particles, terrain, and reactive gameplay.',
    theme: 'game-engine',
  },
];

export const TECH_STACK: TechStackItem[] = [
  { name: 'React & Next.js', role: 'Modern Web Applications & SSR' },
  { name: 'TypeScript & Node.js', role: 'Type-Safe Full-Stack APIs' },
  { name: 'Tailwind CSS & Motion', role: 'Responsive UI & Micro-Interactions' },
  { name: 'Unity / C# & Three.js', role: '2D/3D Game Design & Shaders' },
  { name: 'Figma & Design Systems', role: 'Wireframing, Prototyping & UI/UX' },
];

export const SERVICES: ServiceItem[] = [
  {
    index: '01',
    title: 'Web Design & Development',
    detail: 'High-craft custom websites, interactive landing pages, and fast responsive frontends.',
  },
  {
    index: '02',
    title: 'Application Design & Creation',
    detail: 'End-to-end SaaS tools, dashboards, mobile-ready PWAs, and full-stack web apps.',
  },
  {
    index: '03',
    title: 'Game Design & Development',
    detail: 'Original 2D/3D browser and desktop games with crisp physics, combat feel, and UI.',
  },
  {
    index: '04',
    title: 'Interactive Prototypes & UI/UX',
    detail: 'From wireframe blueprints and clickable Figma flows to production design systems.',
  },
];

export const EXPERIENCE_TIMELINE: ExperienceItem[] = [
  {
    id: 'exp-1',
    period: '2024 — Present',
    role: 'Independent Web, App & Game Developer',
    org: 'Shanto Studio · Freelance & Original Products',
    description:
      'Designing and shipping custom client websites, full-stack web applications, and original indie games from initial wireframe to live deployment.',
  },
  {
    id: 'exp-2',
    period: '2023 — 2024',
    role: 'Frontend Engineer & UI Designer',
    org: 'Kinetix Digital Lab',
    description:
      'Architected high-converting product websites, reusable React component systems, and smooth scroll-driven web interactions.',
  },
  {
    id: 'exp-3',
    period: '2022 — 2023',
    role: 'Application & Gameplay Programmer',
    org: 'Indie Collective & App Projects',
    description:
      'Built cross-platform utility apps and 2D/3D game prototypes focused on responsive controls, clean state logic, and 60 FPS performance.',
  },
  {
    id: 'exp-4',
    period: '2021 — 2022',
    role: 'Web Designer & UI Prototyping',
    org: 'Early Studio Builds',
    description:
      'Mastered responsive CSS grids, Figma component systems, and JavaScript interactivity across 20+ foundational web builds.',
  },
];

export const TECH_PARTNERS: string[] = [
  'REACT',
  'NEXT.JS',
  'TYPESCRIPT',
  'NODE.JS',
  'UNITY 3D',
  'THREE.JS',
];

export const DEFAULT_PORTFOLIO_CONTENT: PortfolioContentBundle = {
  profile: DEFAULT_SITE_PROFILE,
  viewerControls: DEFAULT_VIEWER_CONTROLS,
  cvSettings: DEFAULT_CV_SETTINGS,
  heroMetrics: HERO_METRICS,
  projects: PROJECTS,
  milestones: MILESTONES,
  wireframeScenes: WIREFRAME_SCENES,
  techStack: TECH_STACK,
  services: SERVICES,
  experience: EXPERIENCE_TIMELINE,
  techPartners: TECH_PARTNERS,
};
