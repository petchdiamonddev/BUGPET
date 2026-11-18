import { z } from 'zod';

/**
 * Shared query-param building blocks.
 *
 * Rule: an empty value (`?difficulty=`) means "no filter", but a non-empty
 * value that is not allowed must fail with 400 instead of being silently
 * dropped — otherwise a typo looks like "the filter does nothing".
 */

export const optionalEnum = (values, label) =>
  z
    .enum(values, { message: `${label} ไม่ถูกต้อง` })
    .optional()
    .or(z.literal('').transform(() => undefined));

export const optionalText = (max, label = 'ข้อความ') =>
  z
    .string()
    .trim()
    .max(max, `${label}ยาวเกิน ${max} ตัวอักษร`)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const optionalInt = (min, max, fallback, label = 'ค่าตัวเลข') =>
  z.coerce
    .number({ message: `${label}ต้องเป็นตัวเลข` })
    .int(`${label}ต้องเป็นจำนวนเต็ม`)
    .min(min, `${label}ต้องไม่น้อยกว่า ${min}`)
    .max(max, `${label}ต้องไม่เกิน ${max}`)
    .optional()
    .or(z.literal('').transform(() => fallback));
