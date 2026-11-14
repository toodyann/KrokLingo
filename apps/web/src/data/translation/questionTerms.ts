// Translations checked for a specific question. They win over phrase and dictionary data, because the
// meaning has been confirmed in exactly that text. Keys: question id → word base form or phrase → translation.

export const QUESTION_TERMS: Record<string, Record<string, string>> = {
  'anat-01': {
    'lingual nerve': 'язиковий нерв',
    sensation: 'чутливість',
    mucosa: 'слизова оболонка',
    'chorda tympani': 'барабанна струна',
  },
  'anat-02': {
    'inferior alveolar nerve': 'нижній альвеолярний нерв',
    'mandibular foramen': 'отвір нижньої щелепи',
    'mandibular canal': 'канал нижньої щелепи',
    block: 'блокада (провідникова анестезія)',
  },
  'anat-03': {
    protrusion: 'висування (нижньої щелепи вперед)',
  },
}
