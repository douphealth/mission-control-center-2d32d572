// Lightweight localStorage wrapper for Mission Control data

export interface Website {
  id: string;
  name: string;
  url: string;
  wpAdminUrl: string;
  wpUsername: string;
  wpPassword: string;
  hostingProvider: string;
  hostingLoginUrl: string;
  hostingUsername: string;
  hostingPassword: string;
  category: string;
  status: "active" | "maintenance" | "down" | "archived";
  notes: string;
  plugins: string[];
  dateAdded: string;
  lastUpdated: string;
}

export interface Task {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "todo" | "in-progress" | "blocked" | "done";
  dueDate: string;
  category: string;
  description: string;
  linkedProject: string;
  subtasks: { id: string; title: string; done: boolean }[];
  createdAt: string;
  completedAt?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

export interface GitHubRepo {
  id: string;
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  status: "active" | "stable" | "archived" | "paused";
  demoUrl: string;
  progress: number;
  topics: string[];
  lastUpdated: string;
  devPlatformUrl?: string;
  deploymentUrl?: string;
}

export interface BuildProject {
  id: string;
  name: string;
  platform: "bolt" | "lovable" | "replit";
  projectUrl: string;
  deployedUrl: string;
  description: string;
  techStack: string[];
  status: "ideation" | "building" | "testing" | "deployed";
  startedDate: string;
  lastWorkedOn: string;
  nextSteps: string;
  githubRepo: string;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  status: "active" | "archived";
  description: string;
  dateAdded: string;
  pinned: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  title: string;
  amount: number;
  currency: string;
  type: "income" | "expense" | "invoice" | "subscription";
  status: "paid" | "pending" | "overdue" | "cancelled";
  category: string;
  from: string;
  to: string;
  dueDate: string;
  paidDate: string;
  recurring: boolean;
  recurringInterval: string;
  linkedProject: string;
  notes: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "spark" | "exploring" | "validated" | "building" | "parked";
  tags: string[];
  linkedProject: string;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialVault {
  id: string;
  label: string;
  service: string;
  url: string;
  username: string;
  password: string;
  apiKey: string;
  notes: string;
  category: string;
  createdAt: string;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const STORAGE_KEY = "mission-control-data";

export interface StoreData {
  websites: Website[];
  tasks: Task[];
  repos: GitHubRepo[];
  buildProjects: BuildProject[];
  links: LinkItem[];
  notes: Note[];
  payments: Payment[];
  ideas: Idea[];
  credentials: CredentialVault[];
  userName: string;
  userRole: string;
}

function getDefaultData(): StoreData {
  return {
    userName: "Alex",
    userRole: "Digital Creator & Developer",
    websites: [
      { id: genId(), name: "Digital Marketing Agency", url: "https://agency-demo.com", wpAdminUrl: "https://agency-demo.com/wp-admin/", wpUsername: "admin", wpPassword: "S3cur3P@ss!", hostingProvider: "SiteGround", hostingLoginUrl: "https://my.siteground.com", hostingUsername: "ag_admin", hostingPassword: "H0st1ng!", category: "Client Site", status: "active", notes: "Main client project, high priority", plugins: ["Elementor", "Yoast SEO", "WP Rocket"], dateAdded: "2025-09-15", lastUpdated: "2026-02-20" },
      { id: genId(), name: "E-Commerce Fashion Store", url: "https://fashion-store.com", wpAdminUrl: "https://fashion-store.com/wp-admin/", wpUsername: "shop_admin", wpPassword: "Sh0p@dmin!", hostingProvider: "Cloudways", hostingLoginUrl: "https://platform.cloudways.com", hostingUsername: "cloud_user", hostingPassword: "Cl0ud!", category: "E-Commerce", status: "active", notes: "WooCommerce store, 500+ products", plugins: ["WooCommerce", "Elementor", "Mailchimp"], dateAdded: "2025-06-10", lastUpdated: "2026-02-24" },
      { id: genId(), name: "Personal Portfolio", url: "https://myportfolio.dev", wpAdminUrl: "https://myportfolio.dev/wp-admin/", wpUsername: "developer", wpPassword: "D3v@2026", hostingProvider: "Bluehost", hostingLoginUrl: "https://my.bluehost.com", hostingUsername: "port_user", hostingPassword: "Blu3!", category: "Personal", status: "maintenance", notes: "Redesigning — new layout in progress", plugins: ["Starter Templates", "Spectra"], dateAdded: "2024-12-01", lastUpdated: "2026-02-18" },
      { id: genId(), name: "Tech Blog", url: "https://techinsights-blog.com", wpAdminUrl: "https://techinsights-blog.com/wp-admin/", wpUsername: "editor", wpPassword: "Bl0g@2026", hostingProvider: "SiteGround", hostingLoginUrl: "https://my.siteground.com", hostingUsername: "ti_admin", hostingPassword: "SG_p@ss", category: "Blog", status: "active", notes: "Publishing 2 articles/week", plugins: ["Yoast SEO", "WP Rocket", "TablePress"], dateAdded: "2025-03-20", lastUpdated: "2026-02-25" },
      { id: genId(), name: "SaaS Landing Page", url: "https://saas-product.io", wpAdminUrl: "", wpUsername: "", wpPassword: "", hostingProvider: "Vercel", hostingLoginUrl: "https://vercel.com/dashboard", hostingUsername: "saas_dev", hostingPassword: "V3rc3l!", category: "SaaS", status: "active", notes: "Next.js + Tailwind, connected to Stripe", plugins: [], dateAdded: "2026-01-05", lastUpdated: "2026-02-26" },
    ],
    tasks: [
      { id: genId(), title: "Fix checkout bug on fashion store", priority: "critical", status: "in-progress", dueDate: "2026-02-26", category: "Bug Fix", description: "Payment gateway timeout on mobile", linkedProject: "E-Commerce Fashion Store", subtasks: [{ id: genId(), title: "Reproduce the bug", done: true }, { id: genId(), title: "Apply gateway fix", done: false }], createdAt: "2026-02-24" },
      { id: genId(), title: "Write blog post: AI in 2026", priority: "high", status: "todo", dueDate: "2026-02-27", category: "Content", description: "Draft 2000-word article about AI trends", linkedProject: "Tech Blog", subtasks: [], createdAt: "2026-02-22" },
      { id: genId(), title: "Deploy portfolio redesign", priority: "high", status: "blocked", dueDate: "2026-02-25", category: "Deployment", description: "Waiting for new assets from designer", linkedProject: "Personal Portfolio", subtasks: [], createdAt: "2026-02-20" },
      { id: genId(), title: "Update WooCommerce plugins", priority: "medium", status: "todo", dueDate: "2026-02-28", category: "Maintenance", description: "Security update for WooCommerce 9.x", linkedProject: "E-Commerce Fashion Store", subtasks: [], createdAt: "2026-02-23" },
      { id: genId(), title: "Set up email automation", priority: "medium", status: "todo", dueDate: "2026-03-01", category: "Marketing", description: "Configure Mailchimp welcome series", linkedProject: "E-Commerce Fashion Store", subtasks: [{ id: genId(), title: "Design email templates", done: false }, { id: genId(), title: "Set up triggers", done: false }, { id: genId(), title: "Test flow", done: false }], createdAt: "2026-02-21" },
      { id: genId(), title: "Review client feedback", priority: "medium", status: "in-progress", dueDate: "2026-02-26", category: "Client", description: "Agency site round 2 revisions", linkedProject: "Digital Marketing Agency", subtasks: [], createdAt: "2026-02-25" },
      { id: genId(), title: "Optimize images site-wide", priority: "medium", status: "todo", dueDate: "2026-03-03", category: "Performance", description: "Convert to WebP, lazy load", linkedProject: "Tech Blog", subtasks: [], createdAt: "2026-02-24" },
      { id: genId(), title: "Update SSL certificates", priority: "low", status: "done", dueDate: "2026-02-20", category: "Security", description: "Renew certs for all SiteGround sites", linkedProject: "", subtasks: [], createdAt: "2026-02-15", completedAt: "2026-02-19" },
      { id: genId(), title: "Research headless CMS options", priority: "low", status: "todo", dueDate: "2026-03-10", category: "Research", description: "Compare Strapi, Sanity, Contentful", linkedProject: "", subtasks: [], createdAt: "2026-02-22" },
      { id: genId(), title: "Clean up GitHub repos", priority: "low", status: "todo", dueDate: "2026-03-15", category: "Maintenance", description: "Archive old repos, update READMEs", linkedProject: "", subtasks: [], createdAt: "2026-02-20" },
    ],
    repos: [
      { id: genId(), name: "ai-mission-control", url: "https://github.com/alexdev/ai-mission-control", description: "Personal dashboard for managing all digital work and projects", language: "TypeScript", stars: 24, forks: 3, status: "active", demoUrl: "https://mission-control.vercel.app", progress: 85, topics: ["dashboard", "react", "typescript"], lastUpdated: "2026-02-25" },
      { id: genId(), name: "wp-starter-theme", url: "https://github.com/alexdev/wp-starter-theme", description: "Modern WordPress starter theme with Tailwind CSS and block support", language: "PHP", stars: 156, forks: 42, status: "stable", demoUrl: "", progress: 100, topics: ["wordpress", "theme", "tailwind"], lastUpdated: "2025-11-15" },
      { id: genId(), name: "ecommerce-api", url: "https://github.com/alexdev/ecommerce-api", description: "RESTful API for e-commerce platforms with Stripe integration", language: "JavaScript", stars: 8, forks: 1, status: "active", demoUrl: "", progress: 60, topics: ["api", "node", "express", "mongodb"], lastUpdated: "2026-02-22" },
      { id: genId(), name: "portfolio-next", url: "https://github.com/alexdev/portfolio-next", description: "Personal portfolio built with Next.js 15 and Framer Motion", language: "TypeScript", stars: 12, forks: 5, status: "active", demoUrl: "https://myportfolio.dev", progress: 90, topics: ["portfolio", "nextjs", "framer-motion"], lastUpdated: "2026-02-18" },
      { id: genId(), name: "python-seo-tools", url: "https://github.com/alexdev/python-seo-tools", description: "Python scripts for SEO auditing, keyword research, and rank tracking", language: "Python", stars: 43, forks: 11, status: "stable", demoUrl: "", progress: 100, topics: ["seo", "python", "automation"], lastUpdated: "2025-10-05" },
    ],
    buildProjects: [
      { id: genId(), name: "AI Content Generator", platform: "bolt", projectUrl: "https://bolt.new/ai-content-gen", deployedUrl: "https://ai-content-gen.vercel.app", description: "Generate blog posts, social media content, and email copy with AI", techStack: ["React", "Supabase", "OpenAI"], status: "building", startedDate: "2026-01-15", lastWorkedOn: "2026-02-25", nextSteps: "Add content templates and history feature", githubRepo: "" },
      { id: genId(), name: "Client Portal App", platform: "lovable", projectUrl: "https://lovable.dev/projects/client-portal", deployedUrl: "https://client-portal.lovable.app", description: "Client-facing portal for project updates, invoices, and file sharing", techStack: ["Next.js", "Prisma", "Tailwind"], status: "testing", startedDate: "2025-12-01", lastWorkedOn: "2026-02-24", nextSteps: "Final QA round before launch", githubRepo: "https://github.com/alexdev/client-portal" },
      { id: genId(), name: "Automation Dashboard", platform: "replit", projectUrl: "https://replit.com/@alex/automation-dash", deployedUrl: "", description: "Automate social media posting and analytics collection", techStack: ["Python", "Flask", "Chart.js"], status: "ideation", startedDate: "2026-02-10", lastWorkedOn: "2026-02-20", nextSteps: "Define MVP features and create wireframes", githubRepo: "" },
      { id: genId(), name: "Invoice Generator", platform: "bolt", projectUrl: "https://bolt.new/invoice-gen", deployedUrl: "https://invoice-gen.vercel.app", description: "Beautiful PDF invoices with client management", techStack: ["React", "PDF-lib", "Tailwind"], status: "deployed", startedDate: "2025-10-20", lastWorkedOn: "2026-01-10", nextSteps: "Add recurring invoice feature", githubRepo: "https://github.com/alexdev/invoice-gen" },
    ],
    links: [
      { id: genId(), title: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs", category: "Documentation", status: "active", description: "Official Tailwind documentation", dateAdded: "2025-06-01", pinned: true },
      { id: genId(), title: "Supabase Dashboard", url: "https://supabase.com/dashboard", category: "Tools", status: "active", description: "Database and auth management", dateAdded: "2025-07-15", pinned: true },
      { id: genId(), title: "Figma", url: "https://figma.com", category: "Design", status: "active", description: "UI/UX design tool", dateAdded: "2025-01-10", pinned: false },
      { id: genId(), title: "MDN Web Docs", url: "https://developer.mozilla.org", category: "Documentation", status: "active", description: "Web technology reference", dateAdded: "2024-11-20", pinned: false },
      { id: genId(), title: "Stripe Dashboard", url: "https://dashboard.stripe.com", category: "Tools", status: "active", description: "Payment processing management", dateAdded: "2025-09-05", pinned: true },
      { id: genId(), title: "Can I Use", url: "https://caniuse.com", category: "Tools", status: "active", description: "Browser compatibility tables", dateAdded: "2025-03-12", pinned: false },
      { id: genId(), title: "Dribbble", url: "https://dribbble.com", category: "Design", status: "active", description: "Design inspiration", dateAdded: "2025-04-18", pinned: false },
      { id: genId(), title: "Vercel Docs", url: "https://vercel.com/docs", category: "Documentation", status: "active", description: "Vercel platform documentation", dateAdded: "2025-08-22", pinned: false },
    ],
    notes: [
      { id: genId(), title: "Project Ideas for Q1 2026", content: "• AI-powered SEO audit tool\n• Client reporting dashboard\n• WordPress plugin marketplace\n• Newsletter automation system\n• Personal finance tracker", color: "blue", pinned: true, tags: ["ideas", "planning"], createdAt: "2026-01-02", updatedAt: "2026-02-15" },
      { id: genId(), title: "Meeting Notes — Client Alpha", content: "Date: Feb 20, 2026\nAttendees: Alex, Sarah, Mike\n\nKey Points:\n- Website redesign approved for Phase 2\n- Budget increased to $15k\n- Deadline: March 30\n- Need mobile-first approach\n\nAction Items:\n1. Send updated wireframes by Feb 28\n2. Set up staging environment\n3. Schedule weekly check-ins", color: "amber", pinned: false, tags: ["meeting", "client"], createdAt: "2026-02-20", updatedAt: "2026-02-20" },
      { id: genId(), title: "Quick Reference Links", content: "Cloudflare API: https://api.cloudflare.com/client/v4/\nVercel API: https://api.vercel.com/\nGSC API: https://searchconsole.googleapis.com/\n\nUseful commands:\n- npm run build && npm run preview\n- git log --oneline -20\n- docker compose up -d", color: "green", pinned: false, tags: ["reference"], createdAt: "2026-01-15", updatedAt: "2026-02-10" },
    ],
    payments: [
      { id: genId(), title: "Agency Redesign Invoice", amount: 5000, currency: "USD", type: "income", status: "pending", category: "Freelance", from: "Client Alpha Corp", to: "Alex", dueDate: "2026-03-01", paidDate: "", recurring: false, recurringInterval: "", linkedProject: "Digital Marketing Agency", notes: "Phase 2 deposit", createdAt: "2026-02-20" },
      { id: genId(), title: "SiteGround Hosting", amount: 14.99, currency: "USD", type: "subscription", status: "paid", category: "Hosting", from: "", to: "SiteGround", dueDate: "2026-03-15", paidDate: "2026-02-15", recurring: true, recurringInterval: "monthly", linkedProject: "", notes: "Covers 2 sites", createdAt: "2025-06-01" },
      { id: genId(), title: "Cloudways Hosting", amount: 28, currency: "USD", type: "subscription", status: "paid", category: "Hosting", from: "", to: "Cloudways", dueDate: "2026-03-10", paidDate: "2026-02-10", recurring: true, recurringInterval: "monthly", linkedProject: "E-Commerce Fashion Store", notes: "", createdAt: "2025-08-01" },
      { id: genId(), title: "Fashion Store Monthly Revenue", amount: 3200, currency: "USD", type: "income", status: "paid", category: "E-Commerce", from: "Fashion Store Sales", to: "Alex", dueDate: "", paidDate: "2026-02-25", recurring: true, recurringInterval: "monthly", linkedProject: "E-Commerce Fashion Store", notes: "February sales", createdAt: "2026-02-25" },
      { id: genId(), title: "Figma Pro Subscription", amount: 12, currency: "USD", type: "subscription", status: "paid", category: "Tools", from: "", to: "Figma", dueDate: "2026-03-20", paidDate: "2026-02-20", recurring: true, recurringInterval: "monthly", linkedProject: "", notes: "", createdAt: "2025-04-01" },
      { id: genId(), title: "Logo Design for Client", amount: 800, currency: "USD", type: "income", status: "overdue", category: "Freelance", from: "Beta Inc.", to: "Alex", dueDate: "2026-02-15", paidDate: "", recurring: false, recurringInterval: "", linkedProject: "", notes: "Follow up needed", createdAt: "2026-01-28" },
      { id: genId(), title: "Domain Renewal — saas-product.io", amount: 35, currency: "USD", type: "expense", status: "paid", category: "Domains", from: "", to: "Namecheap", dueDate: "2026-01-05", paidDate: "2026-01-05", recurring: true, recurringInterval: "yearly", linkedProject: "SaaS Landing Page", notes: "", createdAt: "2026-01-05" },
    ],
    ideas: [
      { id: genId(), title: "AI-Powered SEO Audit Tool", description: "Automated SEO auditing that scans sites and provides actionable recommendations using GPT. Could integrate with GSC data.", category: "SaaS Product", priority: "high", status: "exploring", tags: ["AI", "SEO", "SaaS"], linkedProject: "", votes: 5, createdAt: "2026-01-15", updatedAt: "2026-02-20" },
      { id: genId(), title: "WordPress Plugin Marketplace", description: "A curated marketplace for premium WordPress plugins with reviews, demos, and one-click install.", category: "Platform", priority: "medium", status: "spark", tags: ["WordPress", "marketplace"], linkedProject: "", votes: 3, createdAt: "2026-02-01", updatedAt: "2026-02-01" },
      { id: genId(), title: "Client Reporting Automation", description: "Auto-generate beautiful PDF reports from analytics data for clients. Pull from GSC, GA4, and social media APIs.", category: "Tool", priority: "high", status: "validated", tags: ["automation", "client", "reports"], linkedProject: "Client Portal App", votes: 8, createdAt: "2025-12-10", updatedAt: "2026-02-22" },
      { id: genId(), title: "Personal Finance Dashboard", description: "Track income, expenses, subscriptions, and investments in one beautiful dashboard. Could be a standalone product.", category: "Personal", priority: "medium", status: "spark", tags: ["finance", "dashboard"], linkedProject: "", votes: 2, createdAt: "2026-02-18", updatedAt: "2026-02-18" },
      { id: genId(), title: "Newsletter Growth System", description: "Build an automated system for growing newsletter subscribers. Landing pages, lead magnets, and drip sequences.", category: "Marketing", priority: "low", status: "parked", tags: ["newsletter", "marketing", "automation"], linkedProject: "", votes: 1, createdAt: "2026-01-25", updatedAt: "2026-01-25" },
    ],
    credentials: [
      { id: genId(), label: "Cloudflare Account", service: "Cloudflare", url: "https://dash.cloudflare.com", username: "alex@email.com", password: "CF_s3cure!", apiKey: "cf_api_key_here", notes: "Main account managing 4 domains", category: "Infrastructure", createdAt: "2025-06-01" },
      { id: genId(), label: "Vercel Account", service: "Vercel", url: "https://vercel.com/dashboard", username: "alex@email.com", password: "V3rc3l_prod!", apiKey: "vercel_token_here", notes: "Pro plan, 3 projects", category: "Hosting", createdAt: "2025-08-01" },
      { id: genId(), label: "GitHub Account", service: "GitHub", url: "https://github.com", username: "alexdev", password: "GH_t0ken!", apiKey: "ghp_token_here", notes: "Personal access token for API", category: "Development", createdAt: "2024-11-01" },
      { id: genId(), label: "Stripe Account", service: "Stripe", url: "https://dashboard.stripe.com", username: "alex@email.com", password: "Str1pe!", apiKey: "sk_live_xxx", notes: "Connected to SaaS Landing Page", category: "Payments", createdAt: "2025-09-01" },
    ],
  };
}

export function loadData(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults for new fields
      const defaults = getDefaultData();
      return {
        ...defaults,
        ...parsed,
        payments: parsed.payments || defaults.payments,
        ideas: parsed.ideas || defaults.ideas,
        credentials: parsed.credentials || defaults.credentials,
      };
    }
  } catch { }
  const d = getDefaultData();
  saveData(d);
  return d;
}

export function saveData(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage quota exceeded", e);
  }
}

export function useStore() {
  return { load: loadData, save: saveData, genId };
}
