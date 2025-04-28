import { z } from "zod";

export const CampaignSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  startDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  endDate: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export type Campaign = z.infer<typeof CampaignSchema>;
