import { eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { consultationRequests, eventCategories } from '@/shared/db/schema'
import type { Consultation } from '../domain/consultation'
import type { ConsultationRepository } from '../application/ports'

export const createDrizzleConsultationRepository = (database: DbExecutor): ConsultationRepository => ({
  async save(consultation: Consultation): Promise<void> {
    let categoryId: string | null = null

    // An unknown slug stores as null instead of failing: losing the category is far
    // cheaper than losing the lead.
    if (consultation.categorySlug !== null) {
      const [category] = await database
        .select({ id: eventCategories.id })
        .from(eventCategories)
        .where(eq(eventCategories.slug, consultation.categorySlug))
        .limit(1)
      categoryId = category?.id ?? null
    }

    await database.insert(consultationRequests).values({
      name: consultation.name,
      email: consultation.email,
      phone: consultation.phone,
      categoryId,
      eventDate: consultation.eventDate,
      message: consultation.message,
      locale: consultation.locale,
    })
  },
})

export const drizzleConsultationRepository = createDrizzleConsultationRepository(db)
