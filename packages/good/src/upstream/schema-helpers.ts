import { z } from 'zod'
export function zodEnumWithDefault<T extends string>(
  values: readonly T[],
  defaultValue: T
) {
  return z.enum(values as unknown as [T, ...T[]]).catch(defaultValue)
}

export function zodClampedNumber(min: number, max: number, fallback: number) {
  return z
    .number()
    .catch(fallback)
    .transform((val) => Math.max(min, Math.min(max, val)))
}

export function zodBoolean(defaultValue = false) {
  return z.boolean().catch(defaultValue)
}

export function zodNumericLiteral<T extends readonly number[]>(values: T) {
  return z.number().refine((val): val is T[number] => values.includes(val), {
    message: `Must be one of: ${values.join(', ')}`,
  })
}
export function zodNumericLiteralWithDefault<T extends readonly number[]>(
  values: T,
  defaultValue: T[number]
) {
  return zodNumericLiteral(values).catch(defaultValue)
}

export function zodArray<T extends z.ZodTypeAny>(
  schema: T,
  fallback: z.infer<T>[] = []
) {
  return z.array(schema).catch(fallback)
}
