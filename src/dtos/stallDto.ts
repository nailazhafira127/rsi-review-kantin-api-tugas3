import { stalls } from '../db/schema.ts';

export type StallRow = typeof stalls.$inferSelect;

export type StallResponseDto = Omit<StallRow, 'avgRating'> & {
  avgRating: number;
  isPopular: boolean;
};

export interface FindAllParams {
  search?: string;
  category?: string;
  page: number;
  limit: number;
}

export interface CreateStallInput {
  name: string;
  category?: string;
  location?: string;
  description?: string;
}

export type UpdateStallInput = Partial<CreateStallInput>;