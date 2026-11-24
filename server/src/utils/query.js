import { z } from 'zod';

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
