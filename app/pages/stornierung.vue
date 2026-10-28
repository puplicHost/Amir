<script setup lang="ts">
import type { PublicLegalConfig } from '~~/shared/legal'
import { isLegalReviewed, legalValue, missingImpressumFields } from '~~/shared/legal'

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const legal = config.public as unknown as PublicLegalConfig
const isDe = computed(() => locale.value === 'de')
const reviewed = computed(() => isLegalReviewed(legal))
const missing = computed(() => missingImpressumFields(legal))
const deadline = computed(() => legalValue(legal.legalCancellationDeadlineHours))
const fee = computed(() => legalValue(legal.legalCancellationFeePercent))
const noShow = computed(() => legalValue(legal.legalNoShowFeePercent))

useHead(() => ({
  title: `${t('legal.stornierungTitle')} | ${t('brand.name')}`,
  meta: [{ name: 'robots', content: reviewed.value ? 'index,follow' : 'noindex,follow' }],
}))
</script>

<template>
  <Section variant="light" padded="normal">
    <Container size="md">
      <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight text-brand-black dark:text-white">
        {{ t('legal.stornierungTitle') }}
      </h1>
      <Divider class="my-6" />

      <AppLegalDraftNotice :reviewed="reviewed" :missing="missing" />

      <div class="space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 class="font-display text-xl font-medium">{{ isDe ? 'Termin absagen oder verschieben' : 'Cancel or reschedule an appointment' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Nutzen Sie nach Möglichkeit den Selbstbedienungslink aus Ihrer Buchungsbestätigung. Alternativ erreichen Sie uns über die im Impressum genannten Kontaktdaten.'
              : 'Please use the self-service link in your booking confirmation where possible. Alternatively, contact us using the details in the imprint.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">{{ isDe ? 'Fristen' : 'Deadlines' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Kostenfreie Absagen sind bis zu dem bei der Buchung angezeigten Zeitpunkt möglich. Danach können nach Maßgabe der nachfolgenden Regelung Kosten anfallen.'
              : 'Free cancellation is available until the deadline shown during booking. After that, charges may apply as set out below.' }}
          </p>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <AppLegalValue :label="isDe ? 'Kostenfreie Absage bis (Stunden vor Termin)' : 'Free cancellation until (hours before appointment)'" :value="deadline" />
            <AppLegalValue :label="isDe ? 'Absagegebühr (% des Leistungspreises)' : 'Cancellation fee (% of service price)'" :value="fee" />
            <AppLegalValue :label="isDe ? 'No-Show-Gebühr (% des Leistungspreises)' : 'No-show fee (% of service price)'" :value="noShow" />
          </dl>
          <p class="mt-3 text-muted">
            {{ isDe
              ? 'Die konkreten Fristen und Gebühren müssen den gesetzlichen Anforderungen entsprechen, transparent vor Vertragsschluss angezeigt werden und durch Rechtsberatung freigegeben sein. Diese Vorlage enthält keine abschließende Regelung.'
              : 'The concrete deadlines and fees must comply with statutory requirements, be displayed transparently before contracting, and be approved by counsel. This template is not a final set of rules.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">{{ isDe ? 'Anzahlungen und Erstattungen' : 'Deposits and refunds' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Bereits geleistete Anzahlungen werden nach den gesetzlichen Vorschriften und den vereinbarten Stornobedingungen erstattet oder verrechnet. Erstattungen erfolgen über den ursprünglich verwendeten Zahlungsweg, soweit möglich.'
              : 'Deposits already paid are refunded or offset in accordance with statutory rules and the agreed cancellation terms. Refunds are made via the original payment method where possible.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">{{ isDe ? 'Gesetzliche Widerrufsrechte' : 'Statutory withdrawal rights' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Ob und in welchem Umfang bei online gebuchten Dienstleistungen ein Widerrufsrecht besteht oder eine Ausnahme greift, ist rechtlich zu prüfen. Diese Seite ersetzt keine Widerrufsbelehrung, sofern eine solche erforderlich ist.'
              : 'Whether and to what extent a right of withdrawal applies to services booked online, or an exception applies, requires legal review. This page does not replace a withdrawal notice where one is required.' }}
          </p>
        </section>

        <p class="text-xs text-muted">
          {{ isDe ? 'Dokumentversion:' : 'Document version:' }} {{ legalValue(legal.legalVersion, '–') }}
        </p>
      </div>
    </Container>
  </Section>
</template>
