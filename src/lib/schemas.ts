import { z } from 'zod';

// ─── Shared primitives ────────────────────────────────────────────────────────

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');
const optionalUrl = z.string().url('Must be a valid URL').or(z.literal('')).optional();
const requiredStr = (field: string) => z.string().min(1, `${field} is required`).max(500, `${field} is too long`);

// ─── Task ─────────────────────────────────────────────────────────────────────

export const taskSchema = z.object({
  title: requiredStr('Title'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['todo', 'in-progress', 'blocked', 'done']),
  startDate: dateStr,
  dueDate: dateStr,
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(5000).optional().default(''),
  linkedProject: z.string().max(200).optional().default(''),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// ─── Note ─────────────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  title: requiredStr('Title'),
  content: z.string().max(50000).optional().default(''),
  color: z.string().optional().default('blue'),
  tags: z.array(z.string()).optional().default([]),
});

export type NoteFormData = z.infer<typeof noteSchema>;

// ─── Website ──────────────────────────────────────────────────────────────────

export const websiteSchema = z.object({
  name: requiredStr('Name'),
  url: z.string().url('Must be a valid URL'),
  status: z.enum(['active', 'maintenance', 'down', 'archived']),
  category: z.string().optional().default(''),
  hostingProvider: z.string().max(100).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
});

export type WebsiteFormData = z.infer<typeof websiteSchema>;

// ─── GitHub Repo ──────────────────────────────────────────────────────────────

export const repoSchema = z.object({
  name: requiredStr('Name'),
  url: z.string().url('Must be a valid URL').or(z.literal('')),
  description: z.string().max(1000).optional().default(''),
  language: z.string().optional().default('TypeScript'),
  status: z.enum(['active', 'stable', 'archived', 'paused']),
  demoUrl: optionalUrl,
  deploymentUrl: optionalUrl,
  topics: z.array(z.string()).optional().default([]),
  progress: z.number().min(0).max(100).optional().default(0),
});

export type RepoFormData = z.infer<typeof repoSchema>;

// ─── Build Project ────────────────────────────────────────────────────────────

export const buildProjectSchema = z.object({
  name: requiredStr('Name'),
  platform: z.enum(['bolt', 'lovable', 'replit']),
  projectUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  deployedUrl: optionalUrl,
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['ideation', 'building', 'testing', 'deployed']),
  techStack: z.array(z.string()).optional().default([]),
  nextSteps: z.string().max(2000).optional().default(''),
});

export type BuildProjectFormData = z.infer<typeof buildProjectSchema>;

// ─── Payment ──────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  title: requiredStr('Title'),
  amount: z.number({ invalid_type_error: 'Amount must be a number' }).min(0, 'Amount cannot be negative'),
  type: z.enum(['income', 'expense', 'subscription']),
  status: z.enum(['paid', 'pending', 'overdue', 'cancelled']),
  category: z.string().optional().default(''),
  date: dateStr,
  notes: z.string().max(1000).optional().default(''),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ─── Idea ─────────────────────────────────────────────────────────────────────

export const ideaSchema = z.object({
  title: requiredStr('Title'),
  description: z.string().max(3000).optional().default(''),
  category: z.string().optional().default(''),
  status: z.enum(['spark', 'exploring', 'validated', 'building', 'parked']),
  votes: z.number().min(0).optional().default(0),
});

export type IdeaFormData = z.infer<typeof ideaSchema>;

// ─── Link ─────────────────────────────────────────────────────────────────────

export const linkSchema = z.object({
  title: requiredStr('Title'),
  url: z.string().url('Must be a valid URL'),
  category: z.string().optional().default(''),
  description: z.string().max(500).optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export type LinkFormData = z.infer<typeof linkSchema>;

// ─── Credential ───────────────────────────────────────────────────────────────

export const credentialSchema = z.object({
  label: requiredStr('Label'),
  username: z.string().max(200).optional().default(''),
  password: z.string().max(500).optional().default(''),
  url: optionalUrl,
  category: z.string().optional().default(''),
  notes: z.string().max(2000).optional().default(''),
});

export type CredentialFormData = z.infer<typeof credentialSchema>;

// ─── Habit ────────────────────────────────────────────────────────────────────

export const habitSchema = z.object({
  name: requiredStr('Name'),
  icon: z.string().optional().default('✅'),
  frequency: z.enum(['daily', 'weekly', 'weekdays', 'weekends']).optional().default('daily'),
  goal: z.string().max(200).optional().default(''),
  color: z.string().optional().default(''),
});

export type HabitFormData = z.infer<typeof habitSchema>;

// ─── Validation helper ────────────────────────────────────────────────────────

export type ValidationErrors = Record<string, string>;

export function validateForm<T>(schema: z.ZodType<T>, data: unknown): { data: T | null; errors: ValidationErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, errors: {} };

  const errors: ValidationErrors = {};
  result.error.issues.forEach(issue => {
    const key = issue.path.join('.');
    if (key && !errors[key]) errors[key] = issue.message;
  });
  return { data: null, errors };
}
