import { z } from 'zod';

export const startLabSchema = {
  params: z.object({
    labId: z.coerce.number().int().positive('Lab id ไม่ถูกต้อง'),
  }),
};

export const instanceIdSchema = {
  params: z.object({
    id: z.string().min(1, 'Instance id ไม่ถูกต้อง'),
  }),
};
