import assert from 'node:assert/strict'
import test from 'node:test'

import { localizedText } from '../app/utils/content.ts'

test('German prefers nameDe and falls back to English', () => {
  assert.equal(localizedText('de', { de: 'Haarschnitt', en: 'Haircut' }), 'Haarschnitt')
  assert.equal(localizedText('de', { de: '', en: 'Haircut' }), 'Haircut')
  assert.equal(localizedText('de', { de: null, en: 'Haircut' }), 'Haircut')
  assert.equal(localizedText('de', { de: '   ', en: 'Haircut' }), 'Haircut')
})

test('English never renders German copy when English exists', () => {
  assert.equal(localizedText('en', { de: 'Haarschnitt', en: 'Haircut' }), 'Haircut')
  assert.equal(localizedText('en', { de: 'Haarschnitt' }), 'Haarschnitt')
})

test('Arabic branch is legacy-only and falls back to English', () => {
  assert.equal(localizedText('ar', { ar: 'قصة شعر', en: 'Haircut', de: 'Haarschnitt' }), 'قصة شعر')
  assert.equal(localizedText('ar', { en: 'Haircut', de: 'Haarschnitt' }), 'Haircut')
})

test('unknown and missing locales fall back to English then German', () => {
  assert.equal(localizedText('fr', { de: 'Haarschnitt', en: 'Haircut' }), 'Haircut')
  assert.equal(localizedText(undefined, { de: 'Haarschnitt' }), 'Haarschnitt')
  assert.equal(localizedText(null, {}), '')
  assert.equal(localizedText('de', {}, 'Fallback'), 'Fallback')
})

test('localizedText trims stored whitespace', () => {
  assert.equal(localizedText('de', { de: '  Haarschnitt  ', en: 'Haircut' }), 'Haarschnitt')
  assert.equal(localizedText('en', { en: '  Haircut  ' }), 'Haircut')
})
