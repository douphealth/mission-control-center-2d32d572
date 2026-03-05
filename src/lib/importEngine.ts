/**
 * Smart Import Engine v14.0 — Ultra-autonomous, content-aware, multi-category detection.
 * v14: TRANSPOSED TABLE DETECTION — when columns represent records (not rows),
 *      the engine auto-detects and transposes before processing.
 *      Handles spreadsheet-style data where Row1=field names, Col2..N=records.
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
      name: ['repo', 'repository', 'repo_name', 'project', 'full_name', 'repo name', 'repository name'],
      url: ['link', 'href', 'github_url', 'repo_url', 'html_url', 'clone_url', 'ssh_url', 'github url'],
      description: ['desc', 'about', 'summary'],
      language: ['lang', 'tech', 'primary_language'],
      stars: ['star', 'stargazers', 'stargazers_count'],
      forks: ['fork', 'forks_count'],
      status: ['state', 'archived'],
      demoUrl: ['demo', 'demo_url', 'homepage', 'live_url', 'demo url'],
      progress: ['completion', 'percent'],
      topics: ['tags', 'labels', 'keywords', 'topic'],
      devPlatformUrl: ['dev_platform', 'dev_platform_url', 'platform_url', 'platform', 'dev_url', 'builder_url', 'builder', 'ide_url', 'ide', 'aistudio', 'ai_studio', 'bolt_url', 'lovable_url', 'replit_url', 'coding_platform', 'development_url', 'dev platform', 'development platform', 'code platform', 'code url', 'dev platform url'],
      deploymentUrl: ['deployment', 'deployment_url', 'deploy_url', 'gateway', 'gateway_url', 'hosting_url', 'published_url', 'published', 'live', 'live_url', 'production_url', 'production', 'cloudways', 'vercel', 'netlify', 'railway', 'render', 'fly', 'pages', 'cloudflare_pages', 'deployed', 'deploy gateway', 'deployment gateway', 'deployment gateway url'],
    },
    contentSignals: [/github\.com/i, /gitlab\.com/i, /bitbucket/i, /repository|repo/i, /stars?|forks?/i],
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

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s:]+)/);
    return match?.[1] || url;
  }
}

function prettifyHostname(hostname: string): string {
  // "docs.google.com" → "Docs Google", "my-site.com" → "My Site"
  return hostname
    .replace(/\.(com|org|net|io|dev|co|app|me|info|biz|xyz|site|online|store|tech|ai|gg|tv|us|uk|de|fr|es|it|nl|br|ca|au|jp|kr|ru|in|cn)(\.[a-z]{2,3})?$/i, '')
    .split(/[.\-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export interface ParsedData {
  rows: Record<string, string>[];
  sourceFields: string[];
  detectedFormat: 'csv' | 'tsv' | 'json' | 'jsonlines' | 'text';
}

/**
 * Detect if a parsed TSV/CSV is actually a TRANSPOSED table where:
 * - Column 0 = field/attribute names (Site Name, URL, WP Admin URL, etc.)
 * - Columns 1..N = individual records (one per column)
 * Returns transposed rows if detected, or null.
 */
function detectAndTranspose(rows: Record<string, string>[], sourceFields: string[]): Record<string, string>[] | null {
  if (rows.length < 2 || sourceFields.length < 2) return null;

  // The first header is the "label column" header (e.g. "Site Name")
  // The remaining headers are potential record names/values
  const labelHeader = sourceFields[0];
  const dataHeaders = sourceFields.slice(1);

  // Collect all first-column values across rows — these should be field names
  const firstColValues = rows.map(r => r[labelHeader]?.trim()).filter(Boolean);
  if (firstColValues.length < 2) return null;

  // Check if first-column values look like known field names/aliases
  const allAliases = new Set<string>();
  for (const target of Object.keys(TARGET_META) as ImportTarget[]) {
    const meta = TARGET_META[target];
    for (const field of [...meta.requiredFields, ...meta.optionalFields]) {
      allAliases.add(normalize(field));
      for (const alias of (meta.aliases[field] || [])) {
        allAliases.add(normalize(alias));
      }
    }
  }

  const matchCount = firstColValues.filter(v => allAliases.has(normalize(v))).length;
  // If >40% of first-column values match known field names, it's transposed
  if (matchCount < firstColValues.length * 0.3) return null;

  // Transpose: each data column becomes a record
  const transposed: Record<string, string>[] = [];
  for (const colHeader of dataHeaders) {
    const record: Record<string, string> = {};
    for (const row of rows) {
      const fieldName = row[labelHeader]?.trim();
      const value = row[colHeader]?.trim();
      if (fieldName && value) {
        record[fieldName] = value;
      }
    }
    if (Object.keys(record).length > 0) {
      transposed.push(record);
    }
  }

  return transposed.length > 0 ? transposed : null;
}

export function parseImportData(text: string, fileName?: string): ParsedData {
  const trimmed = text.trim();

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

    // ★ CHECK FOR TRANSPOSED TABLE ★
    const transposed = detectAndTranspose(rows, result.meta.fields);
    if (transposed) {
      // First-column values become the new source fields
      const newSourceFields = [...new Set(transposed.flatMap(r => Object.keys(r)))];
      return { rows: transposed, sourceFields: newSourceFields, detectedFormat: isTSV ? 'tsv' : 'csv' };
    }

    return {
      rows,
      sourceFields: result.meta.fields,
      detectedFormat: isTSV ? 'tsv' : 'csv',
    };
  }

  // 4. Smart plain-text — pass ALL lines (including blanks) for block splitting
  const plainRows = smartParsePlainText(lines);
  if (plainRows.length > 0) {
    const sourceFields = [...new Set(plainRows.flatMap(r => Object.keys(r)))];
    return { rows: plainRows, sourceFields, detectedFormat: 'text' };
  }

  // 4b. Try again with non-empty lines only (for URL lists, task lists)
  const nonEmpty = lines.filter(l => l.trim());
  const plainRows2 = smartParsePlainText(nonEmpty);
  if (plainRows2.length > 0) {
    const sourceFields = [...new Set(plainRows2.flatMap(r => Object.keys(r)))];
    return { rows: plainRows2, sourceFields, detectedFormat: 'text' };
  }

  // 5. Last fallback — every line is an item
  const fallbackRows = nonEmpty.map(l => ({ item: l.trim() }));
  return { rows: fallbackRows, sourceFields: ['item'], detectedFormat: 'text' };
}

/** Detect the best delimiter from the first line */
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

/** Parse plain text lines into structured rows by detecting patterns */
function smartParsePlainText(lines: string[]): Record<string, string>[] {
  const kvRegex = /^([^:=]+?)[:=]\s*(.+)$/;
  // A line is KV only if the key part is NOT a URL scheme
  const isKvLine = (l: string): boolean => {
    if (/^https?:/i.test(l.trim())) return false; // URL line, not KV
    return kvRegex.test(l);
  };

  // ── Strategy 1: Multi-block key:value data (websites/credentials) ──
  // Split by blank lines into blocks, each block = one record
  const rawText = lines.join('\n');
  const blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  if (blocks.length >= 1) {
    // Check if blocks are key:value structured
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
        // Also capture a "header" line (first line without : or =) as a potential name
        let headerUsed = false;
        for (const l of blockLines) {
          if (isKvLine(l)) {
            const m = l.match(kvRegex);
            if (m) obj[m[1].trim()] = m[2].trim();
          } else if (!headerUsed && l.trim() && !l.startsWith('#') && !l.startsWith('---') && !/^https?:/i.test(l.trim())) {
            // Treat first non-kv line as a title/name
            obj['__header__'] = l.replace(/^[-*•▪▸►→#]+\s*/, '').trim();
            headerUsed = true;
          }
        }
        if (Object.keys(obj).length > 0) kvBlocks.push(obj);
      }
    }

    // If >40% of all lines are key:value, treat as structured blocks
    if (totalKvLines > 0 && totalKvLines >= totalLines * 0.35 && kvBlocks.length > 0) {
      // Normalize keys to match known field aliases
      return kvBlocks.map(block => {
        const normalized: Record<string, string> = {};
        for (const [rawKey, val] of Object.entries(block)) {
          if (rawKey === '__header__') {
            // Use header as name/site/title if no name field exists
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

  // ── Strategy 2: Lines with URLs (website/link list) ──
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

  // ── Strategy 3: Plain list items (tasks/notes) ──
  return lines.filter(l => l.trim()).map(l => {
    const clean = l.replace(/^[-*•▪▸►→]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    return { title: clean };
  });
}

// ─── Content-Aware Auto-detection ─────────────────────────────────────────────

/** Score a category using both header matching AND content value analysis */
function scoreCategory(sourceFields: string[], rows: Record<string, string>[], target: ImportTarget): number {
  const meta = TARGET_META[target];
  const allFields = [...meta.requiredFields, ...meta.optionalFields];
  let score = 0;

  // --- Header scoring ---
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
    }
  }

  // Penalize missing required fields (but less harshly — we can auto-fill some)
  for (const rf of meta.requiredFields) {
    if (!matchedRequired.has(rf)) score -= 3;
  }

  // --- Content value scoring ---
  const sampleRows = rows.slice(0, Math.min(10, rows.length));
  const allValues = sampleRows.flatMap(r => Object.values(r)).filter(Boolean).join(' ');

  for (const signal of meta.contentSignals) {
    const matches = allValues.match(new RegExp(signal.source, signal.flags.includes('g') ? signal.flags : signal.flags + 'g'));
    if (matches) {
      score += Math.min(matches.length * 2, 10);
    }
  }

  // --- Special boosts ---
  if (target === 'websites') {
    const urlCount = sampleRows.filter(r => Object.values(r).some(v => URL_REGEX.test(v))).length;
    URL_REGEX.lastIndex = 0;
    if (urlCount > sampleRows.length * 0.5) score += 15;
    // If fields include "name" + "url" pattern, strong website signal
    const hasNameAndUrl = sourceFields.some(f => normalize(f) === 'name' || normalize(f) === 'site' || normalize(f) === 'website' || normalize(f) === 'domain') &&
                          sourceFields.some(f => normalize(f) === 'url' || normalize(f) === 'link' || normalize(f) === 'href' || normalize(f) === 'address');
    if (hasNameAndUrl) score += 10;
    // Boost for website-specific key:value fields (WP Admin, Hosting, etc.)
    const websiteKeywords = ['wpadmin', 'wordpress', 'hosting', 'hostingprovider', 'wpusername', 'wppassword', 'siteurl', 'adminurl', 'hostinglogin', 'cpanel', 'nameserver', 'dns', 'ssl'];
    const keywordHits = sourceFields.filter(f => websiteKeywords.some(kw => normalize(f).includes(kw))).length;
    if (keywordHits > 0) score += keywordHits * 8;
    // If ANY row has multiple URLs, likely a website record
    const multiUrlRows = sampleRows.filter(r => {
      const allVals = Object.values(r).join(' ');
      const matches = allVals.match(URL_REGEX);
      URL_REGEX.lastIndex = 0;
      return matches && matches.length >= 2;
    }).length;
    if (multiUrlRows > 0) score += 12;
  }

  // Boost links less than websites when URLs are present  
  if (target === 'links') {
    const hasWebsiteSignals = sourceFields.some(f => ['site', 'website', 'domain', 'hosting', 'wp', 'wpadmin', 'wordpress', 'hostingprovider', 'wpusername', 'wppassword', 'adminurl'].some(kw => normalize(f).includes(kw)));
    if (hasWebsiteSignals) score -= 15;
  }

  // Penalize credentials less when password/username present alongside URL
  if (target === 'credentials') {
    const hasWebsiteSignals = sourceFields.some(f => ['hosting', 'wpadmin', 'wordpress', 'hostingprovider', 'siteurl'].some(kw => normalize(f).includes(kw)));
    if (hasWebsiteSignals) score -= 10;
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

/** Detect category with confidence level */
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

  // Pass 4: single-field fallback
  if (Object.keys(map).length === 0 && sourceFields.length === 1) {
    const singleField = sourceFields[0];
    const firstRequired = meta.requiredFields[0];
    if (firstRequired) {
      map[firstRequired] = singleField;
    }
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
  // Build a lookup: for each target field, collect ALL normalized alias strings (including the field name itself)
  const fieldAliasMap = new Map<string, Set<string>>();
  const allTargetFields = [...meta.requiredFields, ...meta.optionalFields];
  for (const tf of allTargetFields) {
    const aliases = new Set<string>();
    aliases.add(normalize(tf));
    for (const a of (meta.aliases[tf] || [])) aliases.add(normalize(a));
    fieldAliasMap.set(tf, aliases);
  }

  // Pre-normalize all row keys once per call for perf
  const normalizedRowKeys = new Map<string, string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!normalizedRowKeys.has(k)) normalizedRowKeys.set(k, normalize(k));
    }
  }

  const get = (row: Record<string, string>, field: string): string => {
    // 1. Try mapped field first
    const mapped = fieldMap[field];
    if (mapped && row[mapped]?.trim()) return row[mapped].trim();
    // 2. Try direct field name
    if (row[field]?.trim()) return row[field].trim();
    // 3. Exact normalized match against aliases (NO partial matching — prevents ambiguity)
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

  /** Extract any URL from a row's values */
  const extractUrl = (row: Record<string, string>): string => {
    for (const v of Object.values(row)) {
      if (!v) continue;
      const m = v.match(URL_REGEX);
      URL_REGEX.lastIndex = 0;
      if (m) return m[0];
    }
    return '';
  };

  /** Derive a name from a URL */
  const nameFromUrl = (url: string): string => {
    if (!url) return '';
    return prettifyHostname(extractHostname(url));
  };

  return rows.map(row => {
    switch (target) {
      case 'websites': {
        let url = get(row, 'url') || extractUrl(row);
        let name = get(row, 'name') || nameFromUrl(url) || 'Unnamed';
        // If name looks like a URL and we have no url field, swap
        if (!url && URL_REGEX.test(name)) { url = name; name = nameFromUrl(url); }
        URL_REGEX.lastIndex = 0;
        // If url doesn't start with http, try to fix it
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
      case 'tasks':
        return {
          title: get(row, 'title') || Object.values(row).find(v => v?.trim()) || 'Untitled',
          priority: get(row, 'priority') || 'medium',
          status: get(row, 'status') || 'todo',
          dueDate: get(row, 'dueDate') || now,
          category: get(row, 'category') || 'General',
          description: get(row, 'description'),
          linkedProject: get(row, 'linkedProject'),
          subtasks: [], tags: toArray(get(row, 'tags')), createdAt: now,
        };
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
        const amount = parseFloat(amountStr.replace(/[^0-9.\-]/g, '')) || 0;
        return {
          title: get(row, 'title') || 'Untitled', amount,
          currency: get(row, 'currency') || 'USD', type: get(row, 'type') || 'expense',
          status: get(row, 'status') || 'pending', category: get(row, 'category') || 'Other',
          from: get(row, 'from'), to: get(row, 'to'),
          dueDate: get(row, 'dueDate') || now, paidDate: '', linkedProject: '',
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
    // v12: Relaxed validation — at least ONE required field must be non-empty
    // This prevents legitimate items from being dropped when one field is auto-derived
    const meta = TARGET_META[target];
    const filledRequired = meta.requiredFields.filter(f => {
      const val = item[f];
      return val !== undefined && val !== null && val !== '' && val !== 'Unnamed' && val !== 'Untitled' && val !== 'unnamed-repo';
    });
    // If at least one real required field OR the item has meaningful content (URL, description, etc.)
    if (filledRequired.length > 0) return true;
    // Fallback: check if the item has ANY URL or meaningful text content
    const allVals = Object.values(item).filter(v => typeof v === 'string' && v.trim()).join(' ');
    return URL_REGEX.test(allVals) || allVals.length > 10;
  });
}

/** Generate a CSV template for a given target */
export function generateTemplate(target: ImportTarget): string {
  const meta = TARGET_META[target];
  const headers = [...meta.requiredFields, ...meta.optionalFields];
  return headers.join(',') + '\n' + headers.map(() => '').join(',');
}

// ─── Autonomous Import ───────────────────────────────────────────────────────

export interface AutonomousImportResult {
  categories: {
    target: ImportTarget;
    meta: TargetMeta;
    confidence: 'high' | 'medium' | 'low';
    items: Record<string, any>[];
    fieldMap: Record<string, string>;
    score: number;
  }[];
  parsedData: ParsedData;
  totalItems: number;
}

/**
 * Fully autonomous import: parse → detect → map → normalize in one call.
 */
export function autonomousImport(text: string, fileName?: string): AutonomousImportResult {
  const parsedData = parseImportData(text, fileName);

  if (parsedData.rows.length === 0) {
    return { categories: [], parsedData, totalItems: 0 };
  }

  const detections = autoDetectWithConfidence(parsedData.sourceFields, parsedData.rows);
  
  // Try the top 3 detections and pick the one that produces the most valid items
  let bestResult: { target: ImportTarget; items: Record<string, any>[]; confidence: 'high' | 'medium' | 'low'; fieldMap: Record<string, string>; score: number } | null = null;

  for (const det of detections.slice(0, 3)) {
    const items = normalizeItems(parsedData.rows, det.target, det.fieldMap);
    if (items.length > 0 && (!bestResult || items.length > bestResult.items.length || (items.length === bestResult.items.length && det.score > bestResult.score))) {
      bestResult = { target: det.target, items, confidence: det.confidence, fieldMap: det.fieldMap, score: det.score };
    }
  }

  if (!bestResult || bestResult.items.length === 0) {
    // Fallback: force websites if URLs detected, or tasks otherwise
    const allValues = parsedData.rows.flatMap(r => Object.values(r)).join(' ');
    const hasUrls = URL_REGEX.test(allValues);
    URL_REGEX.lastIndex = 0;
    const fallbackTarget: ImportTarget = hasUrls ? 'websites' : 'tasks';
    const fieldMap = autoMapFields(parsedData.sourceFields, fallbackTarget);
    const items = normalizeItems(parsedData.rows, fallbackTarget, fieldMap);
    if (items.length > 0) {
      bestResult = { target: fallbackTarget, items, confidence: 'medium', fieldMap, score: 0 };
    }
  }

  const categories = bestResult
    ? [{
        target: bestResult.target,
        meta: TARGET_META[bestResult.target],
        confidence: bestResult.confidence,
        items: bestResult.items,
        fieldMap: bestResult.fieldMap,
        score: bestResult.score,
      }]
    : [];

  return {
    categories,
    parsedData,
    totalItems: categories.reduce((sum, c) => sum + c.items.length, 0),
  };
}
