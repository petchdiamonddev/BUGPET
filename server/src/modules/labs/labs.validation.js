import { z } from 'zod';

export const createLabSchema = {
  body: z.object({
    title: z.string().min(3, 'ชื่อ Lab ต้องมีความยาวอย่างน้อย 3 ตัวอักษร'),
    description: z.string().min(5, 'คำอธิบาย Lab ต้องมีความยาวอย่างน้อย 5 ตัวอักษร'),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
    dockerImage: z.string().min(2, 'ต้องระบุ Docker Image'),
    flag: z.string().min(4, 'ต้องระบุ Flag'),
    points: z.number().int().positive().default(100),
    timeoutMin: z.number().int().min(5).max(360).default(60),
    tags: z.array(z.string()).optional().default([]),
  }),
};

export const updateLabSchema = {
  params: z.object({
    id: z.string().transform((v) => parseInt(v, 10)),
  }),
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(5).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    dockerImage: z.string().min(2).optional(),
    flag: z.string().min(4).optional(),
    points: z.number().int().positive().optional(),
    timeoutMin: z.number().int().min(5).max(360).optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const submitFlagSchema = {
  params: z.object({
    id: z.string().transform((v) => parseInt(v, 10)),
  }),
  body: z.object({
    flag: z.string().min(1, 'กรุณาระบุ Flag'),
  }),
};
