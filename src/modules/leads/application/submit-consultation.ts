import { z } from 'zod'
import { LOCALES } from '@/shared/i18n/locales'
import { err, isErr, ok, type Result } from '@/shared/result'
import { createConsultation } from '../domain/consultation'
import { leadError, type LeadError } from '../domain/errors'
import type { ConsultationRepository } from './ports'

export const consultationSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().max(200).default(''),
  phone: z.string().max(32).default(''),
  categorySlug: z.string().max(64).default(''),
  eventDate: z.string().max(10).default(''),
  message: z.string().max(2000).default(''),
  locale: z.enum(LOCALES),
})

export type ConsultationPayload = z.infer<typeof consultationSchema>

export const submitConsultation =
  (deps: { requests: ConsultationRepository; clock: () => Date }) =>
  async (payload: unknown): Promise<Result<{ ok: true }, LeadError>> => {
    const parsed = consultationSchema.safeParse(payload)
    if (!parsed.success) {
      return err(leadError('invalid_payload', parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')))
    }

    const consultation = createConsultation(parsed.data, deps.clock())
    if (isErr(consultation)) return consultation

    try {
      await deps.requests.save(consultation.value)
    } catch (cause) {
      return err(leadError('storage_failure', cause instanceof Error ? cause.message : 'error desconocido'))
    }

    return ok({ ok: true })
  }
