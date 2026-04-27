// Web Vitals monitoring — reports Core Web Vitals to console and optionally to Supabase
// Thresholds from Google's Core Web Vitals spec

interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
}

const THRESHOLDS: Record<string, [number, number]> = {
  CLS:  [0.1,  0.25],   // Cumulative Layout Shift
  FID:  [100,  300],    // First Input Delay (ms)
  FCP:  [1800, 3000],   // First Contentful Paint (ms)
  LCP:  [2500, 4000],   // Largest Contentful Paint (ms)
  TTFB: [800,  1800],   // Time To First Byte (ms)
  INP:  [200,  500],    // Interaction to Next Paint (ms)
};

function rate(name: string, value: number): Metric['rating'] {
  const [good, poor] = THRESHOLDS[name] ?? [0, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

const COLORS = { good: '#22c55e', 'needs-improvement': '#f59e0b', poor: '#ef4444' };

function logMetric(metric: Metric) {
  const color = COLORS[metric.rating];
  console.log(
    `%c Web Vitals %c ${metric.name} %c ${metric.value.toFixed(2)} %c ${metric.rating}`,
    'background:#1e293b;color:#94a3b8;padding:2px 6px;border-radius:3px 0 0 3px;font-size:11px',
    'background:#334155;color:#e2e8f0;padding:2px 6px;font-size:11px',
    `background:${color};color:#fff;padding:2px 6px;font-size:11px;font-weight:bold`,
    `background:${color}22;color:${color};padding:2px 6px;border-radius:0 3px 3px 0;font-size:11px`,
  );
}

// Observe Largest Contentful Paint
function observeLCP() {
  if (!('PerformanceObserver' in window)) return;
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) {
        const metric = { name: 'LCP', value: last.startTime, rating: rate('LCP', last.startTime) };
        logMetric(metric);
      }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* not supported */ }
}

// Observe Cumulative Layout Shift
function observeCLS() {
  if (!('PerformanceObserver' in window)) return;
  let clsValue = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) clsValue += entry.value;
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
    // Report on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        logMetric({ name: 'CLS', value: clsValue, rating: rate('CLS', clsValue) });
      }
    }, { once: true });
  } catch { /* not supported */ }
}

// Observe First Input Delay / Interaction to Next Paint
function observeINP() {
  if (!('PerformanceObserver' in window)) return;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        const value = entry.processingStart - entry.startTime;
        if (value > 0) {
          logMetric({ name: 'FID', value, rating: rate('FID', value) });
        }
      }
    });
    po.observe({ type: 'first-input', buffered: true });
  } catch { /* not supported */ }
}

// Observe First Contentful Paint
function observeFCP() {
  if (!('PerformanceObserver' in window)) return;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          logMetric({ name: 'FCP', value: entry.startTime, rating: rate('FCP', entry.startTime) });
        }
      }
    });
    po.observe({ type: 'paint', buffered: true });
  } catch { /* not supported */ }
}

// Measure Time To First Byte
function measureTTFB() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      logMetric({ name: 'TTFB', value: ttfb, rating: rate('TTFB', ttfb) });
    }
  } catch { /* not supported */ }
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;
  // Defer until after paint
  if (document.readyState === 'complete') {
    setTimeout(() => {
      observeLCP();
      observeCLS();
      observeINP();
      observeFCP();
      measureTTFB();
    }, 0);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        observeLCP();
        observeCLS();
        observeINP();
        observeFCP();
        measureTTFB();
      }, 0);
    });
  }
}

// Bundle size budget check (development only)
export function checkBundleBudget() {
  if (import.meta.env.DEV) return;
  // Log resource sizes
  if ('PerformanceObserver' in window) {
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          if (entry.name.includes('/assets/') && entry.transferSize > 500_000) {
            console.warn(
              `%c Budget Warning %c ${entry.name.split('/').pop()} %c ${(entry.transferSize / 1024).toFixed(0)}KB — exceeds 500KB budget`,
              'background:#ef4444;color:#fff;padding:2px 6px;border-radius:3px 0 0 3px;font-size:11px',
              'background:#334155;color:#e2e8f0;padding:2px 6px;font-size:11px',
              'color:#f59e0b;font-size:11px',
            );
          }
        }
      });
      po.observe({ type: 'resource', buffered: true });
    } catch { /* not supported */ }
  }
}
