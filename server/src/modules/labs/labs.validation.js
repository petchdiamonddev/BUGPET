import { z } from 'zod';
import { optionalEnum, optionalText } from '../../utils/query.js';

const tagSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'แท็กต้องไม่ว่าง')
      .max(32, 'แท็กยาวเกินไป (ไม่เกิน 32 ตัวอักษร)')
  )
  .max(12, 'ใส่แท็กได้ไม่เกิน 12 รายการ')
  .default([]);

const dockerImageSchema = z
  .string()
  .trim()
  .min(3, 'ต้องระบุ Docker Image')
  .max(255, 'ชื่อ Docker Image ยาวเกินไป')
  .regex(
    /^[a-z0-9][a-z0-9._\-/:@]*$/i,
    'Docker Image ต้องเป็นรูปแบบที่ถูกต้อง เช่น bkimminich/juice-shop:latest'
  );

export const labBodySchema = z.object({
  title: z.string().trim().min(3, 'ชื่อ Lab ต้องมีความยาวอย่างน้อย 3 ตัวอักษร').max(120, 'ชื่อ Lab ยาวเกินไป'),
  description: z.string().trim().min(5, 'คำอธิบาย Lab ต้องมีความยาวอย่างน้อย 5 ตัวอักษร').max(5000),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
  dockerImage: dockerImageSchema.default('nginx:alpine'),
  flag: z.string().trim().min(4, 'ต้องระบุ Flag').max(255, 'Flag ยาวเกินไป'),
  points: z.number().int().min(10, 'คะแนนขั้นต่ำ 10').max(5000, 'คะแนนสูงสุด 5000').default(100),
  timeoutMin: z.number().int().min(5, 'เวลาขั้นต่ำ 5 นาที').max(360, 'เวลาสูงสุด 360 นาที').default(60),
  tags: tagSchema,
  isActive: z.boolean().default(true),
});

export const createLabSchema = {
  body: labBodySchema,
};

export const updateLabSchema = {
  params: z.object({
    id: z.coerce.number().int().positive('Lab id ไม่ถูกต้อง'),
  }),
  body: labBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'ไม่มีข้อมูลที่ต้องการอัปเดต',
  }),
};

export const labIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive('Lab id ไม่ถูกต้อง'),
  }),
};

export const listLabsQuerySchema = {
  query: z.object({
    difficulty: optionalEnum(['EASY', 'MEDIUM', 'HARD'], 'ระดับความยาก'),
    search: optionalText(120, 'คำค้น'),
    status: optionalEnum(['all', 'solved', 'unsolved'], 'สถานะ'),
    sort: optionalEnum(['default', 'newest', 'points', 'difficulty'], 'การเรียงลำดับ'),
    tag: optionalText(32, 'แท็ก'),
  }),
};

export const adminListLabsQuerySchema = {
  query: z.object({
    search: optionalText(120, 'คำค้น'),
    difficulty: optionalEnum(['EASY', 'MEDIUM', 'HARD'], 'ระดับความยาก'),
    active: optionalEnum(['all', 'active', 'inactive'], 'สถานะ'),
  }),
};

export const submitFlagSchema = {
  params: z.object({
    labId: z.coerce.number().int().positive('Lab id ไม่ถูกต้อง'),
  }),
  body: z.object({
    flag: z.string().trim().min(1, 'กรุณาระบุ Flag').max(255, 'Flag ยาวเกินไป'),
  }),
};
