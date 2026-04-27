import { useState, useCallback } from 'react';
import { z } from 'zod';
import { type ValidationErrors } from '@/lib/schemas';
import { toast } from 'sonner';

export function useFormValidation<T>(schema: z.ZodType<T>) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = useCallback((data: unknown): data is T => {
    const result = schema.safeParse(data);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: ValidationErrors = {};
    result.error.issues.forEach(issue => {
      const key = issue.path.join('.');
      if (key && !newErrors[key]) newErrors[key] = issue.message;
    });
    setErrors(newErrors);

    // Show the first error as a toast
    const firstError = result.error.issues[0];
    if (firstError) {
      const field = firstError.path[firstError.path.length - 1] || '';
      toast.error(firstError.message, {
        description: field ? `Field: ${String(field)}` : undefined,
      });
    }
    return false;
  }, [schema]);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  const getError = useCallback((field: string): string | undefined => errors[field], [errors]);

  const hasError = useCallback((field: string): boolean => !!errors[field], [errors]);

  return { errors, validate, clearError, clearAll, getError, hasError };
}
