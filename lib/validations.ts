import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  tenantName: z.string().min(2, 'Nome da empresa obrigatório'),
})

export const createDealSchema = z.object({
  contactId: z.string().uuid().optional(),
  title: z.string().min(1),
  value: z.number().min(0).default(0),
  stageId: z.string().uuid(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactCompany: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const moveDealSchema = z.object({
  stageId: z.string().uuid(),
  lostReason: z.string().optional(),
})

export const createContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const createStageSchema = z.object({
  name: z.string().min(1),
  color: z.string().default('#C9A84C'),
  position: z.number().int(),
  stageType: z.enum(['open', 'won', 'lost']).default('open'),
})

export const createActivitySchema = z.object({
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  type: z.enum(['note', 'call', 'email', 'task_done']),
  content: z.string().min(1),
})
