import type { Consultation } from '../domain/consultation'

export interface ConsultationRepository {
  save(consultation: Consultation): Promise<void>
}
