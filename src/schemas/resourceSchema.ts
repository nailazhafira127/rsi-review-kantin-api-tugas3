import { z } from 'zod';

const positiveId = z.number().int().positive();

export const createMenuItemSchema = z.object({
  stallId: positiveId,
  name: z.string().trim().min(1).max(100),
  price: z.number().int().min(0),
  isAvailable: z.boolean().default(true),
}).strict();
export const updateMenuItemSchema = createMenuItemSchema.partial();
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
}).strict();
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const createLikeSchema = z.object({
  reviewId: positiveId,
}).strict();
export type CreateLikeInput = z.infer<typeof createLikeSchema>;

export const flagStatusSchema = z.object({
  status: z.enum(['pending', 'resolved', 'dismissed']),
}).strict();
export type UpdateFlagStatusInput = z.infer<typeof flagStatusSchema>;

export const createFlagSchema = z.object({
  reviewId: positiveId,
  reason: z.string().trim().max(255).nullable().optional(),
}).strict();
export type CreateFlagInput = z.infer<typeof createFlagSchema>;

export const createAuditLogSchema = z.object({
  action: z.string().trim().min(1).max(50),
  targetTable: z.string().trim().min(1).max(50),
  targetId: positiveId,
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict();
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;