/**
 * Smart Import Engine v15.0 — Ultra-autonomous, content-aware, multi-category,
 * NLP-enhanced detection with natural language parsing.
 *
 * v15 NEW:
 * - MULTI-CATEGORY SPLIT: Mixed data auto-splits into separate categories
 * - NLP DATE PARSING: "tomorrow", "next Monday", "March 5th", "in 3 days"
 * - NLP PRIORITY/STATUS: Extracts priority & status from natural language
 * - MARKDOWN TABLE SUPPORT: Parses |col|col| markdown tables
 * - HTML TABLE SUPPORT: Parses <table> HTML
 * - SMART VALUE INFERENCE: Infers types from content patterns
 * - EMAIL/CONTACT EXTRACTION: Detects emails, phone numbers
 * - MULTI-BLOCK MIXED DATA: Each block can be a different category
 * - FUZZY FIELD MATCHING: Levenshtein-based field name matching
 * - EXPRESS IMPORT: High-confidence data can skip review
 */
import Papa from 'papaparse';

export type ImportTarget = 'websites' | 'links' | 'tasks' | 'repos' | 'buildProjects' | 'credentials' | 'payments' | 'notes' | 'ideas' | 'habits';

export interface TargetMeta {
  label: string;
  emoji: string;
  requiredFields: string[];
  optionalFields: string[];
  aliases: Record<string, string[]>;
  contentSignals: RegExp[];
}

export const TARGET_META: Record<ImportTarget, TargetMeta> = {
  websites: {
    label: 'Websites', emoji: '🌐',
    requiredFields: ['name', 'url'],
    optionalFields: ['wpAdminUrl', 'wpUsername', 'wpPassword', 'hostingProvider', 'hostingLoginUrl', 'hostingUsername', 'hostingPassword', 'category', 'status', 'notes', 'plugins', 'tags'],
    aliases: {
      name: ['site', 'website', 'domain', 'siteName', 'site_name', 'website_name', 'domain_name', 'hostname', 'host', 'site name', 'website name', 'project', 'label', 'site title', 'website title'],
      url: ['link', 'href', 'siteUrl', 'site_url', 'website_url', 'address', 'domain', 'homepage', 'web', 'webpage', 'page', 'site url', 'website url', 'live url', 'liveurl', 'production url', 'prod url', 'website link', 'site link', 'main url'],
      wpAdminUrl: ['wp_admin', 'wordpress_admin', 'admin_url', 'wp_url', 'wp_admin_url', 'wp admin', 'wordpress admin', 'admin url', 'admin panel', 'wp login', 'wplogin', 'admin login', 'backend', 'backend url', 'dashboard url', 'cms url', 'cms', 'wp admin url', 'admin', 'wordpress url', 'wp-admin', 'wordpress login'],
      wpUsername: ['wp_user', 'wordpress_user', 'admin_user', 'wp_login', 'wp user', 'wordpress user', 'admin user', 'wp username', 'admin username', 'cms user', 'cms username', 'backend user', 'backend username', 'wp login user', 'username', 'user', 'login', 'user name'],
      wpPassword: ['wp_pass', 'wordpress_pass', 'admin_pass', 'wp_pwd', 'wp pass', 'wordpress pass', 'admin pass', 'wp password', 'admin password', 'cms pass', 'cms password', 'backend pass', 'backend password', 'wp login pass', 'password', 'pass', 'pwd'],
      hostingProvider: ['hosting', 'host', 'provider', 'hosting_provider', 'hoster', 'hosting provider', 'server', 'host provider', 'web host', 'webhost', 'hosting company'],
      hostingLoginUrl: ['hosting_url', 'hosting_login', 'host_url', 'hosting url', 'hosting login', 'host url', 'hosting login url', 'hosting panel', 'cpanel url', 'cpanel', 'plesk', 'server url', 'hosting dashboard'],
      hostingUsername: ['hosting_user', 'host_user', 'hosting user', 'hosting username', 'host user', 'host username', 'server user', 'server username', 'cpanel user', 'cpanel username', 'hosting login user', 'hosting account user'],
      hostingPassword: ['hosting_pass', 'host_pass', 'hosting_pwd', 'hosting pass', 'hosting password', 'host pass', 'host password', 'server pass', 'server password', 'cpanel pass', 'cpanel password', 'hosting login pass', 'hosting account password'],
      category: ['type', 'group', 'cat', 'kind', 'sector', 'niche'],
      status: ['state', 'active', 'live'],
      notes: ['note', 'comment', 'comments', 'description', 'desc', 'info', 'details'],
      plugins: ['plugin', 'extensions', 'addons', 'modules'],
      tags: ['tag', 'labels', 'keywords'],
    },
    contentSignals: [/wp-admin/i, /wordpress/i, /hosting/i, /\.com|\.org|\.io|\.net|\.dev|\.co|\.app|\.me|\.info|\.biz/i, /siteground|cloudways|bluehost|godaddy/i, /https?:\/\/[^\s]+/i],
  },
  links: {
    label: 'Links', emoji: '🔗',
    requiredFields: ['title', 'url'],
    optionalFields: ['category', 'description', 'status', 'pinned', 'tags'],
    aliases: {
      title: ['name', 'label', 'text', 'link_name', 'bookmark', 'link_title'],
      url: ['link', 'href', 'address', 'uri', 'source'],
      category: ['type', 'group', 'folder', 'cat'],
      description: ['desc', 'note', 'notes', 'comment'],
      status: ['state'],
      pinned: ['pin', 'favorite', 'starred', 'fav'],
      tags: ['tag', 'labels', 'keywords'],
    },
    contentSignals: [/bookmark/i],
  },
  tasks: {
    label: 'Tasks', emoji: '✅',
    requiredFields: ['title'],
    optionalFields: ['priority', 'status', 'dueDate', 'category', 'description', 'linkedProject', 'tags'],
    aliases: {
      title: ['name', 'task', 'todo', 'item', 'subject', 'task_name', 'action', 'action_item'],
      priority: ['prio', 'importance', 'urgency', 'level'],
      status: ['state', 'done', 'completed', 'progress', 'checked'],
      dueDate: ['due', 'deadline', 'due_date', 'duedate', 'date', 'target_date', 'end_date'],
      category: ['type', 'group', 'cat', 'project', 'list', 'board'],
      description: ['desc', 'note', 'notes', 'details', 'body', 'content'],
      linkedProject: ['project', 'linked_project', 'projectName'],
      tags: ['tag', 'labels'],
    },
    contentSignals: [/todo|to-do|to do/i, /in.?progress|done|blocked|pending/i, /high|medium|low|critical|urgent/i, /deadline|due/i],
  },
  repos: {
    label: 'GitHub Repos', emoji: '🐙',
    requiredFields: ['name'],
    optionalFields: ['url', 'description', 'language', 'stars', 'forks', 'status', 'demoUrl', 'progress', 'topics', 'devPlatformUrl', 'deploymentUrl'],
    aliases: {
      name: ['repo', 'repository', 'repo_name', 'project', 'full_name', 'repo name', 'repository name', 'project name'],
      url: ['link', 'href', 'github_url', 'repo_url', 'html_url', 'clone_url', 'ssh_url', 'github url', 'github link', 'github_link', 'repo link', 'repo_link', 'repository url', 'repository link', 'git url', 'git link', 'source url', 'source link', 'code url', 'code link'],
      description: ['desc', 'about', 'summary'],
      language: ['lang', 'tech', 'primary_language', 'programming language'],
      stars: ['star', 'stargazers', 'stargazers_count'],
      forks: ['fork', 'forks_count'],
      status: ['state', 'archived', 'visibility'],
      demoUrl: ['demo', 'demo_url', 'homepage', 'live_url', 'demo url', 'live url', 'preview url', 'preview'],
      progress: ['completion', 'percent'],
      topics: ['tags', 'labels', 'keywords', 'topic'],
      devPlatformUrl: ['dev_platform', 'dev_platform_url', 'platform_url', 'platform', 'dev_url', 'builder_url', 'builder', 'ide_url', 'ide', 'aistudio', 'ai_studio', 'bolt_url', 'lovable_url', 'replit_url', 'coding_platform', 'development_url', 'dev platform', 'development platform', 'code platform', 'dev platform url', 'lovable app', 'lovable_app', 'lovable project', 'lovable_project', 'lovable link', 'lovable url'],
      deploymentUrl: ['deployment', 'deployment_url', 'deploy_url', 'gateway', 'gateway_url', 'hosting_url', 'published_url', 'published', 'live', 'live_url', 'production_url', 'production', 'cloudways', 'vercel', 'netlify', 'railway', 'render', 'fly', 'pages', 'cloudflare_pages', 'deployed', 'deploy gateway', 'deployment gateway', 'deployment gateway url', 'cloudflare page', 'cloudflare_page', 'cloudflare url', 'cloudflare_url', 'cf page', 'cf pages', 'pages url', 'pages_url', 'deployed url', 'deployed_url'],
    },
    contentSignals: [/github\.com/i, /gitlab\.com/i, /bitbucket/i, /repository|repo/i, /stars?|forks?/i, /lovable\.dev\/projects/i, /\.pages\.dev/i],
  },
  buildProjects: {
    label: 'Build Projects', emoji: '🛠️',
    requiredFields: ['name'],
    optionalFields: ['platform', 'projectUrl', 'deployedUrl', 'description', 'techStack', 'status', 'nextSteps', 'githubRepo'],
    aliases: {
      name: ['project', 'title', 'project_name', 'app_name'],
      platform: ['tool', 'builder', 'framework'],
      projectUrl: ['project_url', 'build_url', 'url'],
      deployedUrl: ['deployed_url', 'live_url', 'demo', 'production_url'],
      description: ['desc', 'about', 'summary'],
      techStack: ['tech_stack', 'technologies', 'stack', 'tech'],
      status: ['state', 'phase'],
      nextSteps: ['next_steps', 'todo', 'next'],
      githubRepo: ['github_repo', 'repo', 'github', 'repository'],
    },
    contentSignals: [/lovable|bolt|vercel|netlify|railway/i, /deployed|building|testing/i, /react|next\.?js|vue|angular|svelte/i],
  },
  credentials: {
    label: 'Credentials', emoji: '🔐',
    requiredFields: ['label', 'service'],
    optionalFields: ['url', 'username', 'password', 'apiKey', 'notes', 'category', 'tags'],
    aliases: {
      label: ['name', 'title', 'credential_name', 'account', 'account_name'],
      service: ['provider', 'platform', 'app', 'site', 'website'],
      url: ['link', 'login_url', 'site_url', 'address'],
      username: ['user', 'login', 'email', 'user_name', 'account_name', 'login_email'],
      password: ['pass', 'pwd', 'secret', 'passwd'],
      apiKey: ['api_key', 'token', 'access_token', 'key', 'api_token', 'secret_key'],
      notes: ['note', 'comment', 'description', 'desc'],
      category: ['type', 'group', 'cat'],
      tags: ['tag', 'labels'],
    },
    contentSignals: [/password|passwd|pwd/i, /api.?key|token|secret/i, /login|credential|auth/i],
  },
  payments: {
    label: 'Payments', emoji: '💰',
    requiredFields: ['title', 'amount'],
    optionalFields: ['currency', 'type', 'status', 'category', 'from', 'to', 'dueDate', 'recurring', 'notes'],
    aliases: {
      title: ['name', 'description', 'item', 'payment', 'invoice', 'label', 'memo', 'transaction'],
      amount: ['price', 'cost', 'value', 'total', 'sum', 'fee', 'charge', 'subtotal'],
      currency: ['curr', 'money_type', 'currency_code'],
      type: ['kind', 'payment_type', 'direction', 'txn_type'],
      status: ['state', 'paid', 'payment_status'],
      category: ['group', 'cat'],
      from: ['sender', 'payer', 'source', 'client', 'buyer'],
      to: ['receiver', 'payee', 'recipient', 'vendor', 'seller'],
      dueDate: ['due', 'deadline', 'due_date', 'date', 'invoice_date', 'payment_date'],
      recurring: ['repeat', 'auto', 'subscription', 'recur'],
      notes: ['note', 'comment', 'memo', 'desc'],
    },
    contentSignals: [/\$[\d,.]+|\d+\.\d{2}/i, /invoice|payment|paid|unpaid|overdue/i, /USD|EUR|GBP|JPY/i, /income|expense|subscription/i],
  },
  notes: {
    label: 'Notes', emoji: '📝',
    requiredFields: ['title'],
    optionalFields: ['content', 'color', 'pinned', 'tags'],
    aliases: {
      title: ['name', 'subject', 'heading', 'note_title'],
      content: ['body', 'text', 'note', 'description', 'desc', 'details', 'message'],
      color: ['colour', 'theme'],
      pinned: ['pin', 'favorite', 'starred', 'fav'],
      tags: ['tag', 'labels', 'keywords', 'categories'],
    },
    contentSignals: [/note|memo|journal/i],
  },
  ideas: {
    label: 'Ideas', emoji: '💡',
    requiredFields: ['title'],
    optionalFields: ['description', 'category', 'priority', 'status', 'tags', 'linkedProject', 'votes'],
    aliases: {
      title: ['name', 'idea', 'subject', 'concept', 'proposal'],
      description: ['desc', 'details', 'body', 'content', 'notes'],
      category: ['type', 'group', 'cat'],
      priority: ['prio', 'importance'],
      status: ['state', 'phase'],
      tags: ['tag', 'labels'],
      linkedProject: ['project', 'linked_project'],
      votes: ['vote', 'score', 'rating', 'upvotes'],
    },
    contentSignals: [/idea|concept|brainstorm|proposal/i, /exploring|validated|spark/i],
  },
  habits: {
    label: 'Habits', emoji: '🔄',
    requiredFields: ['name'],
    optionalFields: ['icon', 'frequency', 'color'],
    aliases: {
      name: ['habit', 'title', 'label', 'activity', 'routine'],
      icon: ['emoji'],
      frequency: ['freq', 'interval', 'schedule', 'repeat'],
      color: ['colour', 'theme'],
    },
    contentSignals: [/daily|weekly|monthly/i, /habit|routine|streak/i],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s\-./\*#@!&^%$()]+/g, '');
}

const URL_REGEX = /https?:\/\/[^\s,;"'<>)}\]]+/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const CURRENCY_REGEX = /(?:[$€£¥₹])\s*[\d,.]+|[\d,.]+\s*(?:USD|EUR|GBP|JPY|INR|AUD|CAD)/gi;

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s:]+)/);
    return match?.[1] || url;
  }
}

function prettifyHostname(hostname: string): string {
  return hostname
    .replace(/\.(com|org|net|io|dev|co|app|me|info|biz|xyz|site|online|store|tech|ai|gg|tv|us|uk|de|fr|es|it|nl|br|ca|au|jp|kr|ru|in|cn)(\.[a-z]{2,3})?$/i, '')
    .split(/[.\-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── NLP Date Parsing ─────────────────────────────────────────────────────────

function parseNaturalDate(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  const now = new Date();

  // ISO / standard date formats
  const isoMatch = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return t;
  const slashMatch = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashMatch) {
    const y = slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3];
    return `${y}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  }

  // Relative dates
  if (t === 'today' || t === 'now') return formatDate(now);
  if (t === 'tomorrow' || t === 'tmr' || t === 'tmrw') return formatDate(addDays(now, 1));
  if (t === 'yesterday') return formatDate(addDays(now, -1));

  // "in X days/weeks/months"
  const inMatch = t.match(/in\s+(\d+)\s+(day|week|month|hour|min)s?/);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    if (inMatch[2] === 'day') return formatDate(addDays(now, n));
    if (inMatch[2] === 'week') return formatDate(addDays(now, n * 7));
    if (inMatch[2] === 'month') { now.setMonth(now.getMonth() + n); return formatDate(now); }
    return formatDate(addDays(now, 1));
  }

  // "next Monday/Tuesday/etc"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const nextMatch = t.match(/next\s+(\w+)/);
  if (nextMatch) {
    let targetDay = dayNames.indexOf(nextMatch[1]);
    if (targetDay === -1) targetDay = shortDays.indexOf(nextMatch[1]);
    if (targetDay !== -1) {
      const currentDay = now.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      return formatDate(addDays(now, daysAhead));
    }
    if (nextMatch[1] === 'week') return formatDate(addDays(now, 7));
    if (nextMatch[1] === 'month') { now.setMonth(now.getMonth() + 1); return formatDate(now); }
  }

  // "this Friday", "this weekend"
  const thisMatch = t.match(/this\s+(\w+)/);
  if (thisMatch) {
    let targetDay = dayNames.indexOf(thisMatch[1]);
    if (targetDay === -1) targetDay = shortDays.indexOf(thisMatch[1]);
    if (targetDay !== -1) {
      const currentDay = now.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead < 0) daysAhead += 7;
      return formatDate(addDays(now, daysAhead));
    }
    if (thisMatch[1] === 'weekend') {
      const daysToSat = (6 - now.getDay() + 7) % 7 || 7;
      return formatDate(addDays(now, daysToSat));
    }
  }

  // "end of week/month"
  if (t.includes('end of week') || t === 'eow') {
    const daysToFri = (5 - now.getDay() + 7) % 7 || 7;
    return formatDate(addDays(now, daysToFri));
  }
  if (t.includes('end of month') || t === 'eom') {
    return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  // "March 5th", "Jan 15", "December 25 2026"
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthDateMatch = t.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/);
  if (monthDateMatch) {
    let monthIdx = months.indexOf(monthDateMatch[1]);
    if (monthIdx === -1) monthIdx = shortMonths.indexOf(monthDateMatch[1]);
    if (monthIdx !== -1) {
      const year = monthDateMatch[3] ? parseInt(monthDateMatch[3]) : now.getFullYear();
      const day = parseInt(monthDateMatch[2]);
      return formatDate(new Date(year, monthIdx, day));
    }
  }

  // "5th March", "15 Jan 2026"
  const datemonthMatch = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s+(\d{4}))?/);
  if (datemonthMatch) {
    let monthIdx = months.indexOf(datemonthMatch[2]);
    if (monthIdx === -1) monthIdx = shortMonths.indexOf(datemonthMatch[2]);
    if (monthIdx !== -1) {
      const year = datemonthMatch[3] ? parseInt(datemonthMatch[3]) : now.getFullYear();
      const day = parseInt(datemonthMatch[1]);
      return formatDate(new Date(year, monthIdx, day));
    }
  }

  return null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── NLP Priority/Status Extraction ───────────────────────────────────────────

function extractPriority(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(critical|asap|urgent|emergency|p0)\b/.test(t)) return 'critical';
  if (/\b(high|important|p1)\b/.test(t)) return 'high';
  if (/\b(medium|moderate|normal|p2)\b/.test(t)) return 'medium';
  if (/\b(low|minor|nice.?to.?have|p3|p4)\b/.test(t)) return 'low';
  return null;
}

function extractStatus(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(done|completed|finished|resolved|closed|shipped)\b/.test(t)) return 'done';
  if (/\b(in.?progress|wip|working|started|ongoing|active)\b/.test(t)) return 'in-progress';
  if (/\b(blocked|stuck|waiting|on.?hold|paused)\b/.test(t)) return 'blocked';
  if (/\b(todo|to.?do|pending|planned|backlog|open|new)\b/.test(t)) return 'todo';
  return null;
}

function extractPaymentType(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(income|revenue|earning|received|inflow|sale)\b/.test(t)) return 'income';
  if (/\b(expense|cost|spend|paid|outflow|purchase|bought)\b/.test(t)) return 'expense';
  if (/\b(subscription|sub|recurring|monthly|annual|yearly)\b/.test(t)) return 'subscription';
  return null;
}

function extractCurrency(text: string): string {
  if (/[$]|USD/i.test(text)) return 'USD';
  if (/[€]|EUR/i.test(text)) return 'EUR';
  if (/[£]|GBP/i.test(text)) return 'GBP';
  if (/[¥]|JPY/i.test(text)) return 'JPY';
  if (/[₹]|INR/i.test(text)) return 'INR';
  return 'USD';
}

function extractAmount(text: string): number {
  const m = text.match(/[$€£¥₹]?\s*([\d,]+(?:\.\d{1,2})?)/);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  return 0;
}

// ─── NLP Task Extraction (from natural language sentences) ────────────────────

interface NLPTaskResult {
  title: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}

function nlpExtractTask(line: string): NLPTaskResult {
  let title = line.replace(/^[-*•▪▸►→]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  let dueDate: string | undefined;
  let priority: string | undefined;
  let status: string | undefined;

  // Extract inline date references: "by tomorrow", "due next Monday", "before March 5th"
  const datePatterns = [
    /\b(?:by|due|before|until|deadline)\s+(.+?)(?:\s*[,;.|]|$)/i,
    /\b(?:on|at)\s+((?:next\s+)?\w+day|tomorrow|today)/i,
    /\(\s*(.*?(?:tomorrow|today|next\s+\w+|in\s+\d+\s+\w+|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d+).*?)\s*\)/i,
  ];

  for (const pat of datePatterns) {
    const m = title.match(pat);
    if (m) {
      const parsed = parseNaturalDate(m[1].trim());
      if (parsed) {
        dueDate = parsed;
        title = title.replace(m[0], '').trim();
        break;
      }
    }
  }

  // Extract priority markers: [HIGH], !!!, (urgent), @high
  const prioPatterns = [
    /\[(critical|high|medium|low|urgent)\]/i,
    /\((critical|high|medium|low|urgent)\)/i,
    /@(critical|high|medium|low|urgent)\b/i,
    /(!{3,})/,
    /(!{2})/,
  ];
  for (const pat of prioPatterns) {
    const m = title.match(pat);
    if (m) {
      if (m[1] === '!!' || m[1]?.startsWith('!!!')) {
        priority = m[1].length >= 3 ? 'critical' : 'high';
      } else {
        priority = extractPriority(m[1] || m[0]);
      }
      title = title.replace(m[0], '').trim();
      break;
    }
  }

  // Extract status markers: [done], [in progress], (WIP), @done
  const statusPatterns = [
    /\[(done|completed|in.?progress|wip|blocked|todo)\]/i,
    /\((done|completed|in.?progress|wip|blocked|todo)\)/i,
    /@(done|completed|wip|blocked)\b/i,
  ];
  for (const pat of statusPatterns) {
    const m = title.match(pat);
    if (m) {
      status = extractStatus(m[1] || m[0]);
      title = title.replace(m[0], '').trim();
      break;
    }
  }

  // If no explicit priority found, check the remaining title text
  if (!priority) priority = extractPriority(title) || undefined;
  if (!status) status = extractStatus(title) || undefined;

  // Clean up trailing commas, extra spaces
  title = title.replace(/[,;]+$/, '').replace(/\s{2,}/g, ' ').trim();

  return { title, dueDate, priority, status };
}

// ─── Levenshtein Distance for Fuzzy Matching ──────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Markdown Table Parser ────────────────────────────────────────────────────

function parseMarkdownTable(text: string): { rows: Record<string, string>[]; fields: string[] } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Find header row (contains |)
  const headerIdx = lines.findIndex(l => /^\|?.+\|.+\|?$/.test(l));
  if (headerIdx === -1) return null;

  // Check for separator row (|---|---|)
  const sepIdx = headerIdx + 1;
  if (sepIdx >= lines.length || !/^\|?[\s\-:]+\|[\s\-:|]+\|?$/.test(lines[sepIdx])) return null;

  const parseRow = (line: string): string[] => {
    return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  };

  const headers = parseRow(lines[headerIdx]);
  const rows: Record<string, string>[] = [];

  for (let i = sepIdx + 1; i < lines.length; i++) {
    if (!/\|/.test(lines[i])) break;
    const cells = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { if (cells[j]) row[h] = cells[j]; });
    if (Object.keys(row).length > 0) rows.push(row);
  }

  return rows.length > 0 ? { rows, fields: headers } : null;
}

// ─── HTML Table Parser ────────────────────────────────────────────────────────

function parseHtmlTable(text: string): { rows: Record<string, string>[]; fields: string[] } | null {
  const tableMatch = text.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const html = tableMatch[1];
  const extractCells = (row: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'gi');
    const cells: string[] = [];
    let m;
    while ((m = regex.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]+>/g, '').trim());
    }
    return cells;
  };

  const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!rowMatches || rowMatches.length < 2) return null;

  // First row with <th> or first <tr> = headers
  let headers = extractCells(rowMatches[0], 'th');
  let dataStart = 1;
  if (headers.length === 0) {
    headers = extractCells(rowMatches[0], 'td');
    dataStart = 1;
  }
  if (headers.length === 0) return null;

  const rows: Record<string, string>[] = [];
  for (let i = dataStart; i < rowMatches.length; i++) {
    const cells = extractCells(rowMatches[i], 'td');
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { if (cells[j]) row[h] = cells[j]; });
    if (Object.keys(row).length > 0) rows.push(row);
  }

  return rows.length > 0 ? { rows, fields: headers } : null;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export interface ParsedData {
  rows: Record<string, string>[];
  sourceFields: string[];
  detectedFormat: 'csv' | 'tsv' | 'json' | 'jsonlines' | 'text' | 'markdown' | 'html';
}

/**
 * Detect if a parsed TSV/CSV is actually a TRANSPOSED table.
 */
function detectAndTranspose(rows: Record<string, string>[], sourceFields: string[]): Record<string, string>[] | null {
  if (rows.length < 2 || sourceFields.length < 2) return null;
  const labelHeader = sourceFields[0];
  const dataHeaders = sourceFields.slice(1);
  const firstColValues = rows.map(r => r[labelHeader]?.trim()).filter(Boolean);
  if (firstColValues.length < 2) return null;

  const allAliases = new Set<string>();
  for (const target of Object.keys(TARGET_META) as ImportTarget[]) {
    const meta = TARGET_META[target];
    for (const field of [...meta.requiredFields, ...meta.optionalFields]) {
      allAliases.add(normalize(field));
      for (const alias of (meta.aliases[field] || [])) allAliases.add(normalize(alias));
    }
  }

  const matchCount = firstColValues.filter(v => allAliases.has(normalize(v))).length;
  if (matchCount < firstColValues.length * 0.3) return null;

  const transposed: Record<string, string>[] = [];
  for (const colHeader of dataHeaders) {
    const record: Record<string, string> = {};
    for (const row of rows) {
      const fieldName = row[labelHeader]?.trim();
      const value = row[colHeader]?.trim();
      if (fieldName && value) record[fieldName] = value;
    }
    if (Object.keys(record).length > 0) transposed.push(record);
  }
  return transposed.length > 0 ? transposed : null;
}

export function parseImportData(text: string, fileName?: string): ParsedData {
  const trimmed = text.trim();

  // 0. Try HTML table
  const htmlResult = parseHtmlTable(trimmed);
  if (htmlResult && htmlResult.rows.length > 0) {
    return { rows: htmlResult.rows, sourceFields: htmlResult.fields, detectedFormat: 'html' };
  }

  // 0b. Try Markdown table
  const mdResult = parseMarkdownTable(trimmed);
  if (mdResult && mdResult.rows.length > 0) {
    return { rows: mdResult.rows, sourceFields: mdResult.fields, detectedFormat: 'markdown' };
  }

  // 1. Try JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      let parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) parsed = [parsed];
      const rows = parsed.map((item: any) => {
        const obj: Record<string, string> = {};
        for (const [k, v] of Object.entries(item)) {
          obj[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
        }
        return obj;
      });
      const sourceFields: string[] = rows.length > 0 ? [...new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r)))] as string[] : [];
      return { rows, sourceFields, detectedFormat: 'json' };
    } catch { /* fall through */ }
  }

  // 2. Try JSON Lines
  const lines = trimmed.split('\n');
  if (lines.length > 0 && lines[0].trim().startsWith('{')) {
    try {
      const rows = lines.filter(l => l.trim()).map(l => {
        const item = JSON.parse(l.trim());
        const obj: Record<string, string> = {};
        for (const [k, v] of Object.entries(item)) {
          obj[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
        }
        return obj;
      });
      const sourceFields = rows.length > 0 ? [...new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r)))] : [];
      return { rows, sourceFields, detectedFormat: 'jsonlines' };
    } catch { /* fall through */ }
  }

  // 3. Auto-detect delimiter and try CSV/TSV
  const delimiter = detectDelimiter(lines[0] || '');
  const isTSV = delimiter === '\t' || fileName?.endsWith('.tsv');
  const result = Papa.parse(trimmed, {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter || undefined,
    dynamicTyping: false,
    transformHeader: (h: string) => h.trim().replace(/^["']|["']$/g, ''),
  });

  if (result.data.length > 0 && result.meta.fields && result.meta.fields.length > 1) {
    const rows = (result.data as Record<string, string>[]).map(r => {
      const obj: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) obj[k] = String(v ?? '').trim();
      return obj;
    });

    const transposed = detectAndTranspose(rows, result.meta.fields);
    if (transposed) {
      const newSourceFields = [...new Set(transposed.flatMap(r => Object.keys(r)))];
      return { rows: transposed, sourceFields: newSourceFields, detectedFormat: isTSV ? 'tsv' : 'csv' };
    }

    return { rows, sourceFields: result.meta.fields, detectedFormat: isTSV ? 'tsv' : 'csv' };
  }

  // 4. Smart plain-text
  const plainRows = smartParsePlainText(lines);
  if (plainRows.length > 0) {
    const sourceFields = [...new Set(plainRows.flatMap(r => Object.keys(r)))];
    return { rows: plainRows, sourceFields, detectedFormat: 'text' };
  }

  const nonEmpty = lines.filter(l => l.trim());
  const plainRows2 = smartParsePlainText(nonEmpty);
  if (plainRows2.length > 0) {
    const sourceFields = [...new Set(plainRows2.flatMap(r => Object.keys(r)))];
    return { rows: plainRows2, sourceFields, detectedFormat: 'text' };
  }

  // 5. Last fallback
  const fallbackRows = nonEmpty.map(l => ({ item: l.trim() }));
  return { rows: fallbackRows, sourceFields: ['item'], detectedFormat: 'text' };
}

function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    const count = (line.match(new RegExp(d === '|' ? '\\|' : d === '\t' ? '\t' : d, 'g')) || []).length;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

function smartParsePlainText(lines: string[]): Record<string, string>[] {
  const kvRegex = /^([^:=]+?)[:=]\s*(.+)$/;
  const isKvLine = (l: string): boolean => {
    if (/^https?:/i.test(l.trim())) return false;
    return kvRegex.test(l);
  };

  // ── Strategy 1: Multi-block key:value data ──
  const rawText = lines.join('\n');
  const blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  if (blocks.length >= 1) {
    const kvBlocks: Record<string, string>[] = [];
    let totalKvLines = 0;
    let totalLines = 0;

    for (const block of blocks) {
      const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
      totalLines += blockLines.length;
      const kvMatches = blockLines.filter(l => isKvLine(l));
      totalKvLines += kvMatches.length;

      if (kvMatches.length >= 1) {
        const obj: Record<string, string> = {};
        let headerUsed = false;
        for (const l of blockLines) {
          if (isKvLine(l)) {
            const m = l.match(kvRegex);
            if (m) obj[m[1].trim()] = m[2].trim();
          } else if (!headerUsed && l.trim() && !l.startsWith('#') && !l.startsWith('---') && !/^https?:/i.test(l.trim())) {
            obj['__header__'] = l.replace(/^[-*•▪▸►→#]+\s*/, '').trim();
            headerUsed = true;
          }
        }
        if (Object.keys(obj).length > 0) kvBlocks.push(obj);
      }
    }

    if (totalKvLines > 0 && totalKvLines >= totalLines * 0.35 && kvBlocks.length > 0) {
      return kvBlocks.map(block => {
        const normalized: Record<string, string> = {};
        for (const [rawKey, val] of Object.entries(block)) {
          if (rawKey === '__header__') {
            if (!Object.keys(block).some(k => ['name', 'site', 'website', 'title', 'domain'].some(a => normalize(k).includes(a)))) {
              normalized['name'] = val;
            }
            continue;
          }
          normalized[rawKey] = val;
        }
        return normalized;
      });
    }
  }

  // ── Strategy 2: Lines with URLs ──
  const urlLines: { line: string; urls: string[] }[] = [];
  for (const l of lines) {
    const urls = l.match(URL_REGEX);
    URL_REGEX.lastIndex = 0;
    if (urls && urls.length > 0) urlLines.push({ line: l, urls });
  }

  if (urlLines.length > 0 && urlLines.length >= lines.length * 0.3) {
    return urlLines.map(({ line, urls }) => {
      const url = urls[0];
      const textWithoutUrl = line.replace(url, '').replace(/[-,|:•▪▸►→*]\s*/g, '').trim();
      const hostname = extractHostname(url);
      const name = textWithoutUrl || prettifyHostname(hostname);
      return { name, url };
    });
  }

  // ── Strategy 3: Mixed content — detect per-line category ──
  // Check if lines are a mix of different types (URLs, tasks with dates, amounts, etc.)
  const categorizedLines: Record<string, string>[] = [];
  for (const l of lines) {
    if (!l.trim()) continue;
    const clean = l.replace(/^[-*•▪▸►→]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();

    // Check for payment-like lines: "$500 from Client" or "Pay $200 to Vendor"
    const amountMatch = clean.match(CURRENCY_REGEX);
    if (amountMatch) {
      CURRENCY_REGEX.lastIndex = 0;
      const amount = extractAmount(clean);
      if (amount > 0) {
        const title = clean.replace(CURRENCY_REGEX, '').replace(/^\s*[-–—:,]+\s*/, '').trim() || 'Payment';
        CURRENCY_REGEX.lastIndex = 0;
        categorizedLines.push({ title, amount: String(amount), currency: extractCurrency(clean), __type: 'payments' });
        continue;
      }
    }
    CURRENCY_REGEX.lastIndex = 0;

    // Default: treat as a task with NLP extraction
    const nlp = nlpExtractTask(clean);
    const row: Record<string, string> = { title: nlp.title };
    if (nlp.dueDate) row.dueDate = nlp.dueDate;
    if (nlp.priority) row.priority = nlp.priority;
    if (nlp.status) row.status = nlp.status;
    categorizedLines.push(row);
  }

  return categorizedLines;
}

// ─── Content-Aware Auto-detection ─────────────────────────────────────────────

function scoreCategory(sourceFields: string[], rows: Record<string, string>[], target: ImportTarget): number {
  const meta = TARGET_META[target];
  const allFields = [...meta.requiredFields, ...meta.optionalFields];
  let score = 0;

  // --- Header scoring (with fuzzy matching) ---
  const matchedRequired = new Set<string>();
  for (const tf of allFields) {
    const normalTf = normalize(tf);
    const aliasList = (meta.aliases[tf] || []).map(normalize);
    for (const sf of sourceFields) {
      const normalSf = normalize(sf);
      if (normalSf === normalTf) {
        const pts = meta.requiredFields.includes(tf) ? 12 : 4;
        score += pts;
        if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
        break;
      }
      if (aliasList.includes(normalSf)) {
        const pts = meta.requiredFields.includes(tf) ? 10 : 3;
        score += pts;
        if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
        break;
      }
      if (normalSf.includes(normalTf) || normalTf.includes(normalSf)) {
        const pts = meta.requiredFields.includes(tf) ? 6 : 1;
        score += pts;
        if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
        break;
      }
      // Fuzzy match: if field names are close (Levenshtein ≤ 2)
      if (normalSf.length > 3 && normalTf.length > 3 && levenshtein(normalSf, normalTf) <= 2) {
        const pts = meta.requiredFields.includes(tf) ? 5 : 1;
        score += pts;
        if (meta.requiredFields.includes(tf)) matchedRequired.add(tf);
        break;
      }
    }
  }

  for (const rf of meta.requiredFields) {
    if (!matchedRequired.has(rf)) score -= 3;
  }

  // --- Content value scoring ---
  const sampleRows = rows.slice(0, Math.min(10, rows.length));
  const allValues = sampleRows.flatMap(r => Object.values(r)).filter(Boolean).join(' ');

  for (const signal of meta.contentSignals) {
    const matches = allValues.match(new RegExp(signal.source, signal.flags.includes('g') ? signal.flags : signal.flags + 'g'));
    if (matches) score += Math.min(matches.length * 2, 10);
  }

  // --- Detect GitHub/repo signals in content ---
  const githubUrlCount = sampleRows.filter(r => Object.values(r).some(v => /github\.com/i.test(v))).length;
  const lovableUrlCount = sampleRows.filter(r => Object.values(r).some(v => /lovable\.dev\/projects/i.test(v))).length;
  const pagesDevCount = sampleRows.filter(r => Object.values(r).some(v => /\.pages\.dev/i.test(v))).length;
  const isGitHubData = githubUrlCount > sampleRows.length * 0.3;
  const hasRepoFieldSignals = sourceFields.some(f => {
    const n = normalize(f);
    return ['repositoryname', 'reponame', 'githublink', 'githuburl', 'cloudflarepage', 'lovableapp', 'lovableproject', 'pagesurl'].some(kw => n.includes(kw));
  });
  const hasLanguageField = sourceFields.some(f => normalize(f) === 'language' || normalize(f) === 'lang' || normalize(f) === 'programminglanguage');

  // --- Special boosts ---
  if (target === 'repos') {
    // Massive boost when GitHub URLs dominate the data
    if (isGitHubData) score += 50;
    if (hasRepoFieldSignals) score += 30;
    if (hasLanguageField) score += 15;
    if (lovableUrlCount > 0) score += lovableUrlCount * 3;
    if (pagesDevCount > 0) score += pagesDevCount * 3;
    // Boost for "Repository" appearing in field names
    const repoFieldCount = sourceFields.filter(f => /repo|repository/i.test(f)).length;
    if (repoFieldCount > 0) score += repoFieldCount * 10;
  }

  if (target === 'websites') {
    // PENALIZE websites when data is clearly GitHub repos
    if (isGitHubData) score -= 40;
    if (hasRepoFieldSignals) score -= 30;
    if (hasLanguageField) score -= 20;

    const urlCount = sampleRows.filter(r => Object.values(r).some(v => URL_REGEX.test(v))).length;
    URL_REGEX.lastIndex = 0;
    // Only boost URLs if NOT GitHub data
    if (!isGitHubData && urlCount > sampleRows.length * 0.5) score += 15;
    const hasNameAndUrl = sourceFields.some(f => normalize(f) === 'name' || normalize(f) === 'site' || normalize(f) === 'website' || normalize(f) === 'domain') &&
                          sourceFields.some(f => normalize(f) === 'url' || normalize(f) === 'link' || normalize(f) === 'href' || normalize(f) === 'address');
    if (hasNameAndUrl && !isGitHubData) score += 10;
    const websiteKeywords = ['wpadmin', 'wordpress', 'hosting', 'hostingprovider', 'wpusername', 'wppassword', 'siteurl', 'adminurl', 'hostinglogin', 'cpanel', 'nameserver', 'dns', 'ssl'];
    const keywordHits = sourceFields.filter(f => websiteKeywords.some(kw => normalize(f).includes(kw))).length;
    if (keywordHits > 0) score += keywordHits * 8;
    const multiUrlRows = sampleRows.filter(r => {
      const allVals = Object.values(r).join(' ');
      const matches = allVals.match(URL_REGEX);
      URL_REGEX.lastIndex = 0;
      return matches && matches.length >= 2;
    }).length;
    if (multiUrlRows > 0 && !isGitHubData) score += 12;
  }

  if (target === 'links') {
    // Penalize links for GitHub/repo data
    if (isGitHubData) score -= 30;
    if (hasRepoFieldSignals) score -= 20;
    const hasWebsiteSignals = sourceFields.some(f => ['site', 'website', 'domain', 'hosting', 'wp', 'wpadmin', 'wordpress', 'hostingprovider', 'wpusername', 'wppassword', 'adminurl'].some(kw => normalize(f).includes(kw)));
    if (hasWebsiteSignals) score -= 15;
  }

  if (target === 'buildProjects') {
    // Penalize buildProjects when it's clearly repos
    if (isGitHubData && hasRepoFieldSignals) score -= 20;
  }

  if (target === 'credentials') {
    const hasWebsiteSignals = sourceFields.some(f => ['hosting', 'wpadmin', 'wordpress', 'hostingprovider', 'siteurl'].some(kw => normalize(f).includes(kw)));
    if (hasWebsiteSignals) score -= 10;
    if (isGitHubData) score -= 20;
  }

  // Boost payments when currency/amount patterns found
  if (target === 'payments') {
    const hasCurrency = CURRENCY_REGEX.test(allValues);
    CURRENCY_REGEX.lastIndex = 0;
    if (hasCurrency) score += 15;
    const paymentMarkers = sampleRows.filter(r => r.__type === 'payments').length;
    if (paymentMarkers > 0) score += paymentMarkers * 5;
    if (isGitHubData) score -= 20;
  }

  // Boost tasks when NLP markers found
  if (target === 'tasks') {
    const taskMarkers = sampleRows.filter(r => r.dueDate || r.priority || r.status).length;
    if (taskMarkers > 0) score += taskMarkers * 3;
    if (isGitHubData) score -= 20;
  }

  return score;
}

export interface DetectionResult {
  target: ImportTarget;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  fieldMap: Record<string, string>;
  validCount: number;
}

export function autoDetectWithConfidence(sourceFields: string[], rows: Record<string, string>[]): DetectionResult[] {
  const results = (Object.keys(TARGET_META) as ImportTarget[]).map(t => {
    const score = scoreCategory(sourceFields, rows, t);
    const fieldMap = autoMapFields(sourceFields, t);
    const items = normalizeItems(rows, t, fieldMap);
    return { target: t, score, fieldMap, validCount: items.length };
  });

  results.sort((a, b) => b.score - a.score);
  const top = results[0];
  const second = results[1];
  const gap = top.score - (second?.score ?? 0);

  return results.map((r, i) => ({
    ...r,
    confidence: i === 0
      ? (gap > 8 && r.validCount > 0 ? 'high' : gap > 3 && r.validCount > 0 ? 'medium' : 'low')
      : 'low' as const,
  }));
}

export function autoDetectCategory(sourceFields: string[]): ImportTarget {
  return autoDetectWithConfidence(sourceFields, [])[0].target;
}

export function autoMapFields(sourceFields: string[], target: ImportTarget): Record<string, string> {
  const meta = TARGET_META[target];
  const allTargetFields = [...meta.requiredFields, ...meta.optionalFields];
  const map: Record<string, string> = {};
  const usedSource = new Set<string>();

  // Pass 1: exact match
  for (const tf of allTargetFields) {
    const normalTf = normalize(tf);
    const match = sourceFields.find(sf => !usedSource.has(sf) && normalize(sf) === normalTf);
    if (match) { map[tf] = match; usedSource.add(match); }
  }

  // Pass 2: alias match
  for (const tf of allTargetFields) {
    if (map[tf]) continue;
    const aliasList = (meta.aliases[tf] || []).map(normalize);
    const match = sourceFields.find(sf => !usedSource.has(sf) && aliasList.includes(normalize(sf)));
    if (match) { map[tf] = match; usedSource.add(match); }
  }

  // Pass 3: partial/contains match
  for (const tf of allTargetFields) {
    if (map[tf]) continue;
    const normalTf = normalize(tf);
    const match = sourceFields.find(sf => {
      if (usedSource.has(sf)) return false;
      const n = normalize(sf);
      return n.includes(normalTf) || normalTf.includes(n);
    });
    if (match) { map[tf] = match; usedSource.add(match); }
  }

  // Pass 4: fuzzy match (Levenshtein ≤ 2)
  for (const tf of allTargetFields) {
    if (map[tf]) continue;
    const normalTf = normalize(tf);
    if (normalTf.length < 4) continue;
    const match = sourceFields.find(sf => {
      if (usedSource.has(sf)) return false;
      const n = normalize(sf);
      return n.length > 3 && levenshtein(n, normalTf) <= 2;
    });
    if (match) { map[tf] = match; usedSource.add(match); }
  }

  // Pass 5: single-field fallback
  if (Object.keys(map).length === 0 && sourceFields.length === 1) {
    const singleField = sourceFields[0];
    const firstRequired = meta.requiredFields[0];
    if (firstRequired) map[firstRequired] = singleField;
  }

  return map;
}

// ─── Normalization ────────────────────────────────────────────────────────────

export function normalizeItems(
  rows: Record<string, string>[],
  target: ImportTarget,
  fieldMap: Record<string, string>
): Record<string, any>[] {
  const now = new Date().toISOString().split('T')[0];
  const meta = TARGET_META[target];
  const fieldAliasMap = new Map<string, Set<string>>();
  const allTargetFields = [...meta.requiredFields, ...meta.optionalFields];
  for (const tf of allTargetFields) {
    const aliases = new Set<string>();
    aliases.add(normalize(tf));
    for (const a of (meta.aliases[tf] || [])) aliases.add(normalize(a));
    fieldAliasMap.set(tf, aliases);
  }

  const normalizedRowKeys = new Map<string, string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!normalizedRowKeys.has(k)) normalizedRowKeys.set(k, normalize(k));
    }
  }

  const get = (row: Record<string, string>, field: string): string => {
    const mapped = fieldMap[field];
    if (mapped && row[mapped]?.trim()) return row[mapped].trim();
    if (row[field]?.trim()) return row[field].trim();
    const aliases = fieldAliasMap.get(field);
    if (aliases) {
      for (const k of Object.keys(row)) {
        const nk = normalizedRowKeys.get(k) || normalize(k);
        if (aliases.has(nk) && row[k]?.trim()) return row[k].trim();
      }
    }
    return '';
  };
  const toArray = (val: string) => val ? val.split(/[,;|]/).map(s => s.trim()).filter(Boolean) : [];
  const toBool = (val: string) => val ? ['true', '1', 'yes', 'on'].includes(val.toLowerCase()) : false;

  const extractUrl = (row: Record<string, string>): string => {
    for (const v of Object.values(row)) {
      if (!v) continue;
      const m = v.match(URL_REGEX);
      URL_REGEX.lastIndex = 0;
      if (m) return m[0];
    }
    return '';
  };

  const nameFromUrl = (url: string): string => {
    if (!url) return '';
    return prettifyHostname(extractHostname(url));
  };

  return rows.map(row => {
    switch (target) {
      case 'websites': {
        let url = get(row, 'url') || extractUrl(row);
        let name = get(row, 'name') || nameFromUrl(url) || 'Unnamed';
        if (!url && URL_REGEX.test(name)) { url = name; name = nameFromUrl(url); }
        URL_REGEX.lastIndex = 0;
        if (url && !url.startsWith('http')) url = 'https://' + url;
        return {
          name, url,
          wpAdminUrl: get(row, 'wpAdminUrl'), wpUsername: get(row, 'wpUsername'), wpPassword: get(row, 'wpPassword'),
          hostingProvider: get(row, 'hostingProvider'), hostingLoginUrl: get(row, 'hostingLoginUrl'),
          hostingUsername: get(row, 'hostingUsername'), hostingPassword: get(row, 'hostingPassword'),
          category: get(row, 'category') || 'Personal', status: get(row, 'status') || 'active',
          notes: get(row, 'notes'), plugins: toArray(get(row, 'plugins')),
          tags: toArray(get(row, 'tags')), dateAdded: now, lastUpdated: now,
        };
      }
      case 'links': {
        let url = get(row, 'url') || extractUrl(row);
        let title = get(row, 'title') || nameFromUrl(url) || 'Untitled';
        if (!url && URL_REGEX.test(title)) { url = title; title = nameFromUrl(url); }
        URL_REGEX.lastIndex = 0;
        if (url && !url.startsWith('http')) url = 'https://' + url;
        return {
          title, url,
          category: get(row, 'category') || 'Other', status: get(row, 'status') || 'active',
          description: get(row, 'description'), dateAdded: now,
          pinned: toBool(get(row, 'pinned')), tags: toArray(get(row, 'tags')),
        };
      }
      case 'tasks': {
        // Use NLP extraction for richer parsing
        const rawTitle = get(row, 'title') || Object.values(row).find(v => v?.trim()) || 'Untitled';
        const nlp = nlpExtractTask(rawTitle);
        const rawDueDate = get(row, 'dueDate');
        const parsedDueDate = rawDueDate ? (parseNaturalDate(rawDueDate) || rawDueDate) : nlp.dueDate;

        return {
          title: nlp.title || rawTitle,
          priority: get(row, 'priority') || nlp.priority || 'medium',
          status: get(row, 'status') || nlp.status || 'todo',
          dueDate: parsedDueDate || now,
          category: get(row, 'category') || 'General',
          description: get(row, 'description'),
          linkedProject: get(row, 'linkedProject'),
          subtasks: [], tags: toArray(get(row, 'tags')), createdAt: now,
        };
      }
      case 'repos':
        return {
          name: get(row, 'name') || 'unnamed-repo', url: get(row, 'url') || extractUrl(row),
          description: get(row, 'description'), language: get(row, 'language') || 'TypeScript',
          stars: parseInt(get(row, 'stars')) || 0, forks: parseInt(get(row, 'forks')) || 0,
          status: get(row, 'status') || 'active', demoUrl: get(row, 'demoUrl'),
          progress: parseInt(get(row, 'progress')) || 0,
          topics: toArray(get(row, 'topics')), lastUpdated: now,
          devPlatformUrl: get(row, 'devPlatformUrl'),
          deploymentUrl: get(row, 'deploymentUrl'),
        };
      case 'buildProjects':
        return {
          name: get(row, 'name') || 'Unnamed', platform: get(row, 'platform') || 'other',
          projectUrl: get(row, 'projectUrl'), deployedUrl: get(row, 'deployedUrl'),
          description: get(row, 'description'), techStack: toArray(get(row, 'techStack')),
          status: get(row, 'status') || 'building', startedDate: now, lastWorkedOn: now,
          nextSteps: get(row, 'nextSteps'), githubRepo: get(row, 'githubRepo'),
        };
      case 'credentials':
        return {
          label: get(row, 'label') || get(row, 'name') || 'Untitled',
          service: get(row, 'service') || get(row, 'provider') || get(row, 'platform') || '',
          url: get(row, 'url') || extractUrl(row), username: get(row, 'username'), password: get(row, 'password'),
          apiKey: get(row, 'apiKey'), notes: get(row, 'notes'),
          category: get(row, 'category') || 'Other',
          tags: toArray(get(row, 'tags')), createdAt: now,
        };
      case 'payments': {
        const amountStr = get(row, 'amount');
        const allVals = Object.values(row).join(' ');
        const amount = amountStr ? (parseFloat(amountStr.replace(/[^0-9.\-]/g, '')) || 0) : extractAmount(allVals);
        const rawDueDate = get(row, 'dueDate');
        return {
          title: get(row, 'title') || 'Untitled', amount,
          currency: get(row, 'currency') || extractCurrency(allVals),
          type: get(row, 'type') || extractPaymentType(allVals) || 'expense',
          status: get(row, 'status') || 'pending', category: get(row, 'category') || 'Other',
          from: get(row, 'from'), to: get(row, 'to'),
          dueDate: rawDueDate ? (parseNaturalDate(rawDueDate) || rawDueDate) : now,
          paidDate: '', linkedProject: '',
          recurring: toBool(get(row, 'recurring')), recurringInterval: '',
          notes: get(row, 'notes'), createdAt: now,
        };
      }
      case 'notes':
        return {
          title: get(row, 'title') || Object.values(row).find(v => v?.trim()) || 'Untitled',
          content: get(row, 'content') || '', color: get(row, 'color') || 'blue',
          pinned: toBool(get(row, 'pinned')),
          tags: toArray(get(row, 'tags')), createdAt: now, updatedAt: now,
        };
      case 'ideas':
        return {
          title: get(row, 'title') || Object.values(row).find(v => v?.trim()) || 'Untitled',
          description: get(row, 'description') || '', category: get(row, 'category') || 'General',
          priority: get(row, 'priority') || 'medium', status: get(row, 'status') || 'spark',
          tags: toArray(get(row, 'tags')), linkedProject: get(row, 'linkedProject'),
          votes: parseInt(get(row, 'votes')) || 0, createdAt: now, updatedAt: now,
        };
      case 'habits':
        return {
          name: get(row, 'name') || Object.values(row).find(v => v?.trim()) || 'Untitled',
          icon: get(row, 'icon') || '🎯', frequency: get(row, 'frequency') || 'daily',
          completions: [], streak: 0, color: get(row, 'color') || '', createdAt: now,
        };
      default:
        return {};
    }
  }).filter(item => {
    const meta = TARGET_META[target];
    const filledRequired = meta.requiredFields.filter(f => {
      const val = item[f];
      return val !== undefined && val !== null && val !== '' && val !== 'Unnamed' && val !== 'Untitled' && val !== 'unnamed-repo';
    });
    if (filledRequired.length > 0) return true;
    const allVals = Object.values(item).filter(v => typeof v === 'string' && v.trim()).join(' ');
    return URL_REGEX.test(allVals) || allVals.length > 10;
  });
}

export function generateTemplate(target: ImportTarget): string {
  const meta = TARGET_META[target];
  const headers = [...meta.requiredFields, ...meta.optionalFields];
  return headers.join(',') + '\n' + headers.map(() => '').join(',');
}

// ─── Multi-Category Split ─────────────────────────────────────────────────────

interface SplitCategory {
  target: ImportTarget;
  meta: TargetMeta;
  confidence: 'high' | 'medium' | 'low';
  items: Record<string, any>[];
  fieldMap: Record<string, string>;
  score: number;
}

/**
 * Attempt to split rows into multiple categories when the data contains
 * mixed types (e.g., some rows have URLs → websites, some have amounts → payments).
 * Returns null if data is homogeneous (single category is better).
 */
function tryMultiCategorySplit(rows: Record<string, string>[], sourceFields: string[]): SplitCategory[] | null {
  // Only attempt multi-split for plain-text parsed data with __type markers
  // or when rows have very different signatures
  const typeMarked = rows.filter(r => r.__type);
  if (typeMarked.length > 0) {
    // Group by __type
    const groups = new Map<string, Record<string, string>[]>();
    const unmarked: Record<string, string>[] = [];
    for (const row of rows) {
      if (row.__type) {
        const t = row.__type;
        if (!groups.has(t)) groups.set(t, []);
        groups.get(t)!.push(row);
      } else {
        unmarked.push(row);
      }
    }

    // If we have meaningful groups, build categories
    if (groups.size > 0 || unmarked.length > 0) {
      const categories: SplitCategory[] = [];

      for (const [type, groupRows] of groups) {
        const target = type as ImportTarget;
        if (!TARGET_META[target]) continue;
        const fieldMap = autoMapFields(Object.keys(groupRows[0]), target);
        const items = normalizeItems(groupRows, target, fieldMap);
        if (items.length > 0) {
          categories.push({
            target,
            meta: TARGET_META[target],
            confidence: 'high',
            items,
            fieldMap,
            score: 100,
          });
        }
      }

      // Process unmarked rows through normal detection
      if (unmarked.length > 0) {
        const sf = [...new Set(unmarked.flatMap(r => Object.keys(r)))];
        const detections = autoDetectWithConfidence(sf, unmarked);
        const best = detections[0];
        if (best && best.validCount > 0) {
          const items = normalizeItems(unmarked, best.target, best.fieldMap);
          if (items.length > 0) {
            // Merge if same target exists
            const existing = categories.find(c => c.target === best.target);
            if (existing) {
              existing.items.push(...items);
            } else {
              categories.push({
                target: best.target,
                meta: TARGET_META[best.target],
                confidence: best.confidence,
                items,
                fieldMap: best.fieldMap,
                score: best.score,
              });
            }
          }
        }
      }

      if (categories.length > 1 || (categories.length === 1 && groups.size > 0)) {
        return categories;
      }
    }
  }

  // Signature-based split: check if different rows match different categories strongly
  if (rows.length >= 3) {
    const rowSignatures = rows.map(row => {
      const values = Object.values(row).join(' ');
      const hasUrl = URL_REGEX.test(values);
      URL_REGEX.lastIndex = 0;
      const hasCurrency = CURRENCY_REGEX.test(values);
      CURRENCY_REGEX.lastIndex = 0;
      const hasEmail = EMAIL_REGEX.test(values);
      EMAIL_REGEX.lastIndex = 0;

      if (hasCurrency) return 'payments';
      if (hasUrl && (row.username || row.password || row.wpAdminUrl)) return 'websites';
      if (hasUrl) return 'links';
      if (hasEmail && (row.password || row.apiKey)) return 'credentials';
      return 'tasks';
    });

    const uniqueTypes = new Set(rowSignatures);
    if (uniqueTypes.size >= 2) {
      const groups = new Map<string, Record<string, string>[]>();
      rows.forEach((row, i) => {
        const type = rowSignatures[i];
        if (!groups.has(type)) groups.set(type, []);
        groups.get(type)!.push(row);
      });

      const categories: SplitCategory[] = [];
      for (const [type, groupRows] of groups) {
        const target = type as ImportTarget;
        if (!TARGET_META[target]) continue;
        const sf = [...new Set(groupRows.flatMap(r => Object.keys(r)))];
        const fieldMap = autoMapFields(sf, target);
        const items = normalizeItems(groupRows, target, fieldMap);
        if (items.length > 0) {
          categories.push({
            target,
            meta: TARGET_META[target],
            confidence: items.length >= 2 ? 'medium' : 'low',
            items,
            fieldMap,
            score: items.length * 10,
          });
        }
      }

      if (categories.length >= 2) return categories;
    }
  }

  return null;
}

// ─── Autonomous Import ───────────────────────────────────────────────────────

export interface AutonomousImportResult {
  categories: SplitCategory[];
  parsedData: ParsedData;
  totalItems: number;
  expressReady: boolean; // true when confidence is high enough to skip review
}

/**
 * Fully autonomous import: parse → detect → map → normalize → split.
 * v15: Now supports multi-category output and express mode.
 */
export function autonomousImport(text: string, fileName?: string): AutonomousImportResult {
  const parsedData = parseImportData(text, fileName);

  if (parsedData.rows.length === 0) {
    return { categories: [], parsedData, totalItems: 0, expressReady: false };
  }

  // Try multi-category split first
  const multiSplit = tryMultiCategorySplit(parsedData.rows, parsedData.sourceFields);
  if (multiSplit && multiSplit.length > 0) {
    const totalItems = multiSplit.reduce((sum, c) => sum + c.items.length, 0);
    const allHigh = multiSplit.every(c => c.confidence === 'high');
    return {
      categories: multiSplit.sort((a, b) => b.items.length - a.items.length),
      parsedData,
      totalItems,
      expressReady: allHigh && totalItems > 0,
    };
  }

  // Single-category detection
  const detections = autoDetectWithConfidence(parsedData.sourceFields, parsedData.rows);

  let bestResult: SplitCategory | null = null;

  for (const det of detections.slice(0, 3)) {
    const items = normalizeItems(parsedData.rows, det.target, det.fieldMap);
    if (items.length > 0 && (!bestResult || items.length > bestResult.items.length || (items.length === bestResult.items.length && det.score > bestResult.score))) {
      bestResult = {
        target: det.target,
        meta: TARGET_META[det.target],
        items,
        confidence: det.confidence,
        fieldMap: det.fieldMap,
        score: det.score,
      };
    }
  }

  if (!bestResult || bestResult.items.length === 0) {
    const allValues = parsedData.rows.flatMap(r => Object.values(r)).join(' ');
    const hasUrls = URL_REGEX.test(allValues);
    URL_REGEX.lastIndex = 0;
    const fallbackTarget: ImportTarget = hasUrls ? 'websites' : 'tasks';
    const fieldMap = autoMapFields(parsedData.sourceFields, fallbackTarget);
    const items = normalizeItems(parsedData.rows, fallbackTarget, fieldMap);
    if (items.length > 0) {
      bestResult = {
        target: fallbackTarget,
        meta: TARGET_META[fallbackTarget],
        items,
        confidence: 'medium',
        fieldMap,
        score: 0,
      };
    }
  }

  const categories = bestResult ? [bestResult] : [];
  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const expressReady = categories.length === 1 && categories[0].confidence === 'high' && totalItems > 0;

  return { categories, parsedData, totalItems, expressReady };
}

// ─── Public NLP helpers (for testing/external use) ────────────────────────────

export { parseNaturalDate, nlpExtractTask, extractPriority, extractStatus, extractPaymentType };
