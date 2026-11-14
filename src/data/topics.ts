import type { Topic } from '../types'

// Topics follow the subjects of Krok 1 (Dentistry). Broad subjects are split into the parts students
// revise separately; existing ids keep their meaning for the larger part, so old history still counts.

export const TOPICS: Topic[] = [
  { id: 'biology', name: 'Медична біологія' },
  { id: 'anatomy', name: 'Анатомія (загальна)' },
  { id: 'anatomy-head', name: 'Анатомія голови, шиї та зубів' },
  { id: 'histology', name: 'Гістологія та цитологія' },
  { id: 'embryology', name: 'Ембріологія' },
  { id: 'physiology', name: 'Фізіологія' },
  { id: 'biochemistry', name: 'Біохімія' },
  { id: 'microbiology', name: 'Мікробіологія та вірусологія' },
  { id: 'immunology', name: 'Імунологія' },
  { id: 'pathophysiology', name: 'Патологічна фізіологія' },
  { id: 'pathology', name: 'Патологічна анатомія' },
  { id: 'pharmacology', name: 'Фармакологія' },
  { id: 'terminology', name: 'Термінологія та граматика' },
  { id: 'reading', name: 'Читання (Reading)' },
]

interface Split {
  /** Topic the question moves to when its own cues outweigh the parent's. */
  to: string
  cues: RegExp[]
  /** Cues of the part that stays under the parent id. */
  stay: RegExp[]
}

// Each regex counts once per match (capped); the stem weighs more than the answer options.
const SPLITS: Record<string, Split> = {
  anatomy: {
    to: 'anatomy-head',
    cues: [
      /\b(?:tooth|teeth|dental|dentition|molars?|premolars?|incisors?|canines?|crowns?|alveol\w*|gingiva\w*|gums?)\b/g,
      /\b(?:mandib\w*|maxill\w*|jaws?|temporomandibular|masticat\w*|masseter|pterygoid\w*|temporal(?:is)? muscle|chewing|mouth)\b/g,
      /\b(?:head|neck|face|facial|skull|cran\w*|orbit\w*|nasal|nose|zygomatic|sphenoid|ethmoid|occipital|frontal|parietal|hyoid)\b/g,
      /\b(?:tongue|lingual|palat\w*|lips?|cheeks?|buccal|oral|pharyn\w*|laryn\w*|tonsil\w*|salivary|parotid|submandibular|sublingual)\b/g,
      /\b(?:trigemin\w*|hypoglossal|glossopharyngeal|chorda tympani|infraorbital|mental|carotid|jugular|thyroid|sternocleidomastoid|cervical)\b/g,
    ],
    stay: [
      /\b(?:arm|forearm|hand|leg|thigh|knee|foot|feet|shoulder|hip|pelvi\w*|femor\w*|humer\w*|spinal|vertebr\w*|rib|thora\w*|abdom\w*|heart|lungs?|liver|stomach|intestin\w*|kidney|uter\w*|bladder|urethra|prostat\w*|ovar\w*|testi\w*|peritone\w*|diaphragm|brachial|lumbar|sacral)\b/g,
    ],
  },
  histology: {
    to: 'embryology',
    cues: [
      /\b(?:embryo\w*|fet(?:us|al)|foet\w*|zygote|blastocyst|blastula|gastrula\w*|cleavage|implantation|ontogenesis)\b/g,
      /\b(?:germ layers?|ectoderm\w*|mesoderm\w*|endoderm\w*|mesenchym\w*|neural (?:tube|crest)|notochord|somites?|myotome|sclerotome|dermatome)\b/g,
      /\b(?:placent\w*|chorion\w*|amnion|amniotic|yolk sac|allantois|provisory|umbilical)\b/g,
      /\b(?:branchial|pharyngeal (?:arch|pouch|cleft)\w*|cleft (?:lip|palate)|malformation\w*|tooth (?:germ|development|bud)|enamel organ|dental (?:papilla|lamina|sac|follicle)|hertwig\w*|odontogenesis|stellate reticulum|inner enamel epithelium|outer enamel epithelium)\b/g,
    ],
    stay: [/\b(?:specimen|microslide|stain\w*|electron micro\w*|tissue|epitheli\w*|cells?)\b/g],
  },
  microbiology: {
    to: 'immunology',
    cues: [
      /\b(?:immun\w*|antibod\w*|antigen\w*|immunoglobulin\w*|ig[agmde]\b|t-?(?:cells?|lymphocytes?|helpers?|killers?)|b-?(?:cells?|lymphocytes?)|lymphocyt\w*)\b/g,
      /\b(?:phagocyt\w*|complement|interferon\w*|cytokine\w*|interleukin\w*|histocompatib\w*|hla)\b/g,
      /\b(?:allerg\w*|anaphyla\w*|hypersensitiv\w*|tuberculin|mantoux|transplant\w*|graft\w*|rejection|autoimmun\w*|immunodeficien\w*|serum sickness|arthus)\b/g,
      /\b(?:vaccin\w*|toxoid|immunization|immunisation|prophylaxis)\b/g,
    ],
    stay: [
      /\b(?:bacteri\w*|virus\w*|viral|fung\w*|cocci|bacill\w*|spore\w*|culture\w*|colon(?:y|ies)|medium|agar|gram|stain\w*|smear|causative agent|microscopy|incubat\w*|isolat\w*|phage\w*|toxin)\b/g,
    ],
  },
  pathology: {
    to: 'pathophysiology',
    cues: [
      /\b(?:pathogenesis|mechanism\w*|leading (?:link|cause)|caused by|due to|result(?:s|ed)? (?:in|from)|develop\w*)\b/g,
      /\b(?:fever|pyrogen\w*|hypoxi\w*|anoxi\w*|shock|acidosis|alkalosis|dehydrat\w*|hyperhydrat\w*|edema|oedema|osmotic|oncotic)\b/g,
      /\b(?:leukocytosis|leukopenia|anemi\w*|anaemi\w*|erythrocytosis|thrombocytopeni\w*|coagul\w*|hemostasis|blood count|reticulocyt\w*|hemoglobin|haemoglobin|hematocrit)\b/g,
      /\b(?:experiment\w*|test animal|rabbit|rat|dog|insufficiency|failure|hyperfunction|hypofunction|hormone\w*|secretion|arterial pressure|blood pressure|heart rate|breathing|respiration)\b/g,
    ],
    stay: [
      /\b(?:autops\w*|post-?mortem|biopsy|bioptate|macroscop\w*|microscop\w*|histolog\w*|section|cut surface|on palpation|morpholog\w*|specimen|deceased|died)\b/g,
      /\b(?:necro\w*|dystroph\w*|amyloid\w*|hyalin\w*|calcif\w*|petrifi\w*|atroph\w*|metaplas\w*|dysplas\w*|granulom\w*|giant cells|infiltrat\w*|fibrin\w*|purulent|abscess|phlegmon)\b/g,
      /\b(?:tumou?r\w*|carcinom\w*|sarcom\w*|adenom\w*|papillom\w*|ameloblastom\w*|odontom\w*|lymphom\w*|metasta\w*|atypi\w*|cyst\w*)\b/g,
    ],
  },
}

function score(text: string, list: RegExp[]): number {
  let s = 0
  for (const re of list) s += Math.min((text.match(re) ?? []).length, 3)
  return s
}

/**
 * The detailed topic of a question within its subject. Moves a question only when the cues of the
 * new part clearly outweigh those of the part that keeps the parent id.
 */
export function refineTopic(topic: string, text: string, options: readonly string[] = []): string {
  const split = SPLITS[topic]
  if (!split) return topic
  const stem = text.toLowerCase()
  const opts = options.join(' | ').toLowerCase()
  const move = score(stem, split.cues) * 2 + score(opts, split.cues)
  const stay = score(stem, split.stay) * 2 + score(opts, split.stay)
  // pathology: without clear morphological cues the question is about mechanisms (pathophysiology)
  if (topic === 'pathology') return move >= stay ? split.to : topic
  return move > stay && move >= 2 ? split.to : topic
}
