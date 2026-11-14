// Sense inventory for ambiguous words. The translator scores every sense against the clicked word's
// context and only commits to one when the cues clearly favour it; otherwise it shows the most likely
// medical sense marked as uncertain, with the alternatives.
//
// next / prev: base forms of the words right after / before the clicked word (strongest cue).
// cues: base forms anywhere in the same sentence.
// medical: the usual sense in Krok questions; used as a tie-breaker, never as proof.

export interface Sense {
  id: string
  uk: string
  next?: string[]
  prev?: string[]
  cues?: string[]
  medical?: boolean
}

export const SENSES: Record<string, Sense[]> = {
  mental: [
    {
      id: 'chin',
      uk: 'підборідний',
      next: ['nerve', 'foramen', 'foramina', 'protuberance', 'tubercle', 'region', 'artery', 'spine', 'branch', 'muscle', 'symphysis', 'area'],
      cues: ['chin', 'mandible', 'mandibular', 'lower', 'jaw', 'premolar', 'lip', 'anesthesia', 'anaesthesia'],
      medical: true,
    },
    {
      id: 'mind',
      uk: 'психічний, розумовий',
      next: ['health', 'state', 'disorder', 'illness', 'retardation', 'development', 'activity', 'status', 'stress', 'capacity', 'work'],
      cues: ['psychiatric', 'emotional', 'psychological', 'behavior', 'behaviour', 'anxiety', 'depression', 'memory', 'intellect'],
    },
  ],
  process: [
    {
      id: 'projection',
      uk: 'відросток',
      prev: ['alveolar', 'coronoid', 'condylar', 'styloid', 'mastoid', 'palatine', 'zygomatic', 'frontal', 'spinous', 'transverse', 'articular', 'xiphoid', 'pterygoid', 'cell', 'cytoplasmic'],
      next: ['of'],
      cues: ['bone', 'mandible', 'maxilla', 'vertebra', 'jaw', 'odontoblast', 'neuron', 'cell', 'skull', 'fracture'],
      medical: true,
    },
    {
      id: 'course',
      uk: 'процес',
      prev: ['inflammatory', 'pathological', 'pathologic', 'infectious', 'destructive', 'chronic', 'acute', 'metabolic', 'healing', 'tumor', 'tumour', 'carious', 'purulent'],
      cues: ['inflammation', 'disease', 'development', 'develop', 'spread', 'stage', 'course', 'reaction', 'metabolism', 'synthesis', 'chronic', 'acute', 'progress', 'healing'],
    },
  ],
  left: [
    {
      id: 'side',
      uk: 'лівий',
      next: ['side', 'ventricle', 'atrium', 'lung', 'kidney', 'hand', 'arm', 'leg', 'eye', 'ear', 'lobe', 'half', 'upper', 'lower', 'cheek', 'shoulder', 'subclavian', 'coronary', 'hemisphere', 'mandible', 'maxilla', 'temporal', 'common', 'internal', 'external', 'inferior', 'superior'],
      prev: ['the', 'on', 'to', 'its', 'his', 'her'],
      cues: ['right', 'side', 'lateral', 'deviate', 'deviation'],
      medical: true,
    },
    {
      id: 'leave',
      uk: 'залишив(ся), пішов (від leave)',
      prev: ['has', 'have', 'had', 'was', 'were', 'is', 'be', 'been', 'being', 'she', 'he', 'they', 'patient'],
      next: ['untreated', 'behind', 'alone', 'unattended', 'without', 'for', 'in', 'after', 'over', 'home', 'hospital'],
    },
  ],
  cavity: [
    {
      id: 'carious',
      uk: 'каріозна порожнина',
      prev: ['carious', 'deep', 'shallow', 'class', 'prepared', 'cervical'],
      cues: ['caries', 'carious', 'filling', 'restoration', 'dentin', 'enamel', 'tooth', 'molar', 'premolar', 'incisor', 'drill', 'prepare'],
      medical: true,
    },
    {
      id: 'body',
      uk: 'порожнина (анатомічна)',
      prev: ['oral', 'nasal', 'abdominal', 'pleural', 'thoracic', 'pericardial', 'tympanic', 'cranial', 'peritoneal', 'articular', 'pulp', 'joint', 'body'],
      cues: ['organ', 'wall', 'fluid', 'mucosa', 'mucous'],
    },
  ],
  plaque: [
    {
      id: 'dental',
      uk: 'наліт (зубний)',
      prev: ['dental', 'bacterial', 'microbial', 'soft'],
      cues: ['tooth', 'teeth', 'gingiva', 'gum', 'caries', 'brushing', 'hygiene', 'enamel', 'streptococcus', 'calculus', 'tartar', 'oral'],
      medical: true,
    },
    {
      id: 'vessel',
      uk: 'бляшка',
      prev: ['atherosclerotic', 'fibrous', 'senile', 'amyloid', 'psoriatic'],
      cues: ['artery', 'vessel', 'atherosclerosis', 'cholesterol', 'lipid', 'aorta', 'coronary', 'intima', 'skin', 'brain', 'alzheimer'],
    },
  ],
  crown: [
    {
      id: 'tooth',
      uk: 'коронка',
      cues: ['tooth', 'teeth', 'root', 'enamel', 'dental', 'molar', 'premolar', 'incisor', 'canine', 'artificial', 'porcelain', 'metal', 'prosthesis', 'cervical', 'crown-root'],
      medical: true,
    },
    { id: 'head', uk: 'тім\'я, верхівка (голови)', cues: ['head', 'scalp', 'skull'] },
  ],
  neck: [
    { id: 'tooth', uk: 'шийка (зуба, кістки)', cues: ['tooth', 'teeth', 'root', 'crown', 'enamel', 'femur', 'femoral', 'mandible', 'condyle', 'rib', 'gallbladder'], medical: true },
    { id: 'body', uk: 'шия', cues: ['head', 'lymph', 'node', 'nodes', 'thyroid', 'muscle', 'swelling', 'cervical', 'skin', 'stiff', 'stiffness'] },
  ],
  culture: [
    { id: 'micro', uk: 'культура (мікроорганізмів)', prev: ['pure', 'blood', 'cell', 'bacterial', 'tissue', 'urine', 'sputum'], cues: ['medium', 'colony', 'colonies', 'agar', 'inoculate', 'grow', 'growth', 'bacterium', 'microorganism', 'isolate', 'incubate', 'microbiological', 'bacteriological', 'virus', 'strain'], medical: true },
    { id: 'society', uk: 'культура (суспільна)', cues: ['society', 'social', 'tradition', 'art', 'language', 'people', 'national'] },
  ],
  medium: [
    { id: 'nutrient', uk: 'середовище (поживне)', prev: ['culture', 'nutrient', 'selective', 'differential', 'enrichment', 'transport', 'liquid', 'solid', 'endo', 'ploskirev'], cues: ['culture', 'colony', 'colonies', 'agar', 'inoculate', 'grow', 'bacterium', 'microorganism', 'incubate'], medical: true },
    { id: 'middle', uk: 'середній', next: ['size', 'sized', 'severity', 'degree', 'term'], cues: ['small', 'large'] },
  ],
  agent: [
    { id: 'pathogen', uk: 'збудник', prev: ['causative', 'infectious', 'etiological', 'aetiological'], cues: ['disease', 'infection', 'cause', 'bacterium', 'virus', 'isolate', 'pathogen', 'culture', 'detect'], medical: true },
    { id: 'drug', uk: 'засіб, препарат', prev: ['antibacterial', 'antimicrobial', 'antiviral', 'antifungal', 'hypotensive', 'antihypertensive', 'chemotherapeutic', 'pharmacological', 'cholinergic', 'blocking', 'therapeutic', 'local', 'anesthetic'], cues: ['prescribe', 'administer', 'drug', 'dose', 'treatment', 'effect', 'action', 'use', 'medication'] },
  ],
  preparation: [
    { id: 'drug', uk: 'препарат (лікарський)', cues: ['prescribe', 'administer', 'dose', 'drug', 'treatment', 'effect', 'inject', 'take', 'tablet', 'vaccine', 'immunization'], medical: true },
    { id: 'slide', uk: 'препарат (мікроскопічний)', cues: ['microscope', 'microscopy', 'stain', 'stained', 'histological', 'specimen', 'smear', 'cell', 'section'] },
    { id: 'prepare', uk: 'підготовка, препарування', next: ['of', 'for'], cues: ['cavity', 'tooth', 'surgery', 'operation', 'patient'] },
  ],
  discharge: [
    { id: 'secretion', uk: 'виділення', cues: ['purulent', 'pus', 'nasal', 'vaginal', 'wound', 'mucous', 'serous', 'bloody', 'fistula', 'canal', 'smell', 'odor', 'odour'], medical: true },
    { id: 'release', uk: 'виписка (з лікарні)', next: ['from'], cues: ['hospital', 'home', 'ward'] },
  ],
  filling: [
    { id: 'dental', uk: 'пломба', cues: ['tooth', 'teeth', 'cavity', 'carious', 'composite', 'amalgam', 'cement', 'material', 'restoration', 'dentist', 'molar', 'premolar', 'incisor', 'root', 'canal'], medical: true },
    { id: 'fill', uk: 'заповнення, наповнення', cues: ['blood', 'ventricle', 'lung', 'bladder', 'pressure'] },
  ],
  impression: [
    { id: 'dental', uk: 'відбиток', cues: ['tooth', 'teeth', 'jaw', 'material', 'tray', 'alginate', 'silicone', 'prosthesis', 'denture', 'cast', 'model', 'take', 'make'], medical: true },
    { id: 'feeling', uk: 'враження', cues: ['feel', 'seem', 'appear', 'patient', 'general'] },
  ],
  cast: [
    { id: 'model', uk: 'модель (гіпсова), відливок', cues: ['impression', 'plaster', 'gypsum', 'model', 'tooth', 'teeth', 'jaw', 'prosthesis', 'denture'], medical: true },
    { id: 'urine', uk: 'циліндр (у сечі)', cues: ['urine', 'urinary', 'sediment', 'hyaline', 'granular', 'kidney', 'renal'] },
    { id: 'plaster', uk: 'гіпсова пов\'язка', cues: ['fracture', 'limb', 'immobilization', 'leg', 'arm'] },
  ],
  bridge: [
    { id: 'denture', uk: 'мостоподібний протез (міст)', cues: ['tooth', 'teeth', 'abutment', 'prosthesis', 'denture', 'crown', 'pontic', 'missing'], medical: true },
    { id: 'nose', uk: 'спинка (носа)', next: ['of'], cues: ['nose', 'nasal'] },
  ],
  bite: [
    { id: 'occlusion', uk: 'прикус', prev: ['open', 'deep', 'cross', 'mesial', 'distal', 'normal', 'orthognathic', 'progenic', 'prognathic', 'abnormal'], cues: ['occlusion', 'jaw', 'teeth', 'incisor', 'molar', 'orthodontic', 'anomaly'], medical: true },
    { id: 'wound', uk: 'укус', prev: ['dog', 'cat', 'animal', 'insect', 'tick', 'snake', 'mosquito', 'human'], cues: ['wound', 'rabies', 'animal', 'dog', 'insect', 'tick', 'snake'] },
  ],
  arch: [
    { id: 'dental', uk: 'дуга (зубна, анатомічна)', medical: true },
  ],
  case: [
    { id: 'instance', uk: 'випадок', medical: true },
    { id: 'patient', uk: 'хворий (клінічний випадок)', cues: ['patient', 'clinical'] },
  ],
  sign: [
    { id: 'symptom', uk: 'ознака, симптом', cues: ['disease', 'clinical', 'symptom', 'patient', 'typical', 'characteristic', 'present', 'positive', 'negative'], medical: true },
    { id: 'signature', uk: 'підписувати', prev: ['to', 'must', 'should'], next: ['the', 'a', 'consent', 'document'] },
  ],
  host: [
    { id: 'biology', uk: 'хазяїн (паразита)', prev: ['intermediate', 'definitive', 'final', 'main', 'reservoir', 'paratenic'], cues: ['parasite', 'helminth', 'larva', 'larvae', 'life', 'cycle', 'fluke', 'tapeworm', 'worm', 'infection', 'virus'], medical: true },
  ],
  vessel: [
    { id: 'blood', uk: 'судина', cues: ['blood', 'lymphatic', 'artery', 'vein', 'wall', 'capillary', 'bleeding', 'hemorrhage', 'damage', 'injure'], medical: true },
    { id: 'container', uk: 'посудина, ємність', cues: ['water', 'glass', 'liquid', 'container', 'pour'] },
  ],
  lead: [
    { id: 'metal', uk: 'свинець', prev: ['of', 'with'], next: ['poisoning', 'intoxication', 'salt', 'salts', 'compound', 'compounds', 'acetate', 'line'], cues: ['poisoning', 'intoxication', 'metal', 'battery', 'paint', 'industry', 'heavy'], medical: true },
    { id: 'cause', uk: 'призводити (до), вести', next: ['to'], prev: ['can', 'may', 'will', 'might', 'could', 'which', 'that', 'to'] },
    { id: 'ecg', uk: 'відведення (ЕКГ)', prev: ['standard', 'chest', 'limb'], cues: ['ecg', 'electrocardiogram', 'wave', 'segment'] },
  ],
  solution: [
    { id: 'liquid', uk: 'розчин', prev: ['saline', 'isotonic', 'hypertonic', 'hypotonic', 'aqueous', 'alcohol', 'glucose', 'ringer'], next: ['of'], cues: ['percent', 'concentration', 'inject', 'infusion', 'rinse', 'irrigation', 'intravenous', 'drop', 'ml'], medical: true },
    { id: 'answer', uk: 'рішення', cues: ['problem', 'decision', 'question', 'find'] },
  ],
  administration: [
    { id: 'drug', uk: 'введення (препарату)', prev: ['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'parenteral', 'repeated', 'drug', 'after', 'following'], next: ['of'], cues: ['drug', 'dose', 'injection', 'vaccine', 'serum', 'preparation'], medical: true },
    { id: 'management', uk: 'адміністрація, керівництво', prev: ['hospital', 'clinic'], cues: ['manager', 'staff', 'office'] },
  ],
  delivery: [
    { id: 'birth', uk: 'пологи', cues: ['pregnant', 'pregnancy', 'birth', 'newborn', 'labor', 'labour', 'premature', 'mother', 'woman', 'fetus', 'week', 'gestation'], medical: true },
    { id: 'transport', uk: 'доставка', cues: ['hospital', 'ambulance', 'transport', 'drug', 'oxygen'] },
  ],
  labor: [
    { id: 'birth', uk: 'пологи', cues: ['pregnant', 'pregnancy', 'birth', 'newborn', 'premature', 'mother', 'woman', 'fetus', 'contraction'], medical: true },
    { id: 'work', uk: 'праця', cues: ['physical', 'hard', 'work', 'worker', 'occupation'] },
  ],
  labour: [
    { id: 'birth', uk: 'пологи', cues: ['pregnant', 'pregnancy', 'birth', 'newborn', 'premature', 'mother', 'woman', 'fetus', 'contraction'], medical: true },
    { id: 'work', uk: 'праця', cues: ['physical', 'hard', 'work', 'worker', 'occupation'] },
  ],
  plate: [
    { id: 'anatomy', uk: 'пластинка', prev: ['cribriform', 'pterygoid', 'horizontal', 'perpendicular', 'orbital', 'cortical', 'epiphyseal', 'growth', 'motor', 'end', 'dental', 'base'], cues: ['bone', 'palatine', 'ethmoid', 'sphenoid', 'denture', 'prosthesis'], medical: true },
    { id: 'petri', uk: 'чашка (Петрі)', prev: ['petri', 'agar', 'culture'], cues: ['colony', 'colonies', 'agar', 'culture', 'inoculate', 'medium'] },
  ],
  stain: [
    { id: 'technique', uk: 'фарбування, барвник', prev: ['gram', 'ziehl', 'giemsa', 'neisser', 'burri', 'ginss', 'romanowsky', 'hematoxylin', 'silver', 'special'], cues: ['smear', 'microscopy', 'microscope', 'preparation', 'specimen', 'dye', 'method'], medical: true },
    { id: 'spot', uk: 'пляма', cues: ['tooth', 'teeth', 'enamel', 'skin', 'brown', 'dark', 'yellow', 'tetracycline', 'fluorosis'] },
  ],
  resistance: [
    { id: 'drug', uk: 'резистентність, стійкість', cues: ['antibiotic', 'drug', 'bacterium', 'strain', 'insulin', 'penicillin', 'microorganism', 'infection', 'immune', 'nonspecific'], medical: true },
    { id: 'physics', uk: 'опір', prev: ['vascular', 'peripheral', 'airway', 'electrical', 'total'], cues: ['pressure', 'flow', 'vessel', 'airway', 'ohm'] },
  ],
  current: [
    { id: 'electric', uk: 'струм', prev: ['electric', 'electrical', 'ion', 'ionic', 'sodium', 'potassium', 'calcium', 'direct', 'alternating'], cues: ['electrode', 'membrane', 'electrophoresis', 'galvanic'], medical: true },
    { id: 'present', uk: 'поточний, теперішній', next: ['state', 'condition', 'symptom', 'treatment', 'situation', 'medication'] },
  ],
  matter: [
    { id: 'substance', uk: 'речовина', prev: ['white', 'gray', 'grey', 'organic', 'inorganic', 'foreign'], medical: true },
    { id: 'issue', uk: 'питання, справа', prev: ['no', 'the'], next: ['of'] },
  ],
  head: [
    { id: 'part', uk: 'головка', prev: ['femoral', 'humeral', 'radial', 'condylar', 'mandibular', 'pancreatic'], next: ['of'], cues: ['bone', 'femur', 'humerus', 'mandible', 'condyle', 'pancreas', 'muscle', 'sperm', 'spermatozoon', 'scolex', 'tapeworm'], medical: true },
    { id: 'body', uk: 'голова', cues: ['injury', 'trauma', 'neck', 'face', 'headache', 'skull', 'brain', 'scalp'] },
  ],
  body: [
    { id: 'organism', uk: 'тіло, організм', cues: ['temperature', 'weight', 'mass', 'fluid', 'immune', 'whole', 'human', 'surface'], medical: true },
    { id: 'part', uk: 'тіло (частина органа)', prev: ['ciliary', 'vertebral', 'carotid', 'mammillary', 'pineal', 'geniculate'], next: ['of'], cues: ['mandible', 'tongue', 'bone', 'vertebra', 'stomach', 'uterus', 'pancreas'] },
    { id: 'inclusion', uk: 'тільце', prev: ['inclusion', 'ketone', 'babes', 'negri', 'councilman', 'russell', 'lewy', 'barr', 'heinz', 'howell', 'jolly', 'nissl', 'thymic', 'hassall'] },
  ],
  base: [
    { id: 'chemistry', uk: 'основа', medical: true },
    { id: 'anatomy', uk: 'основа (основна частина)', next: ['of'], cues: ['skull', 'tongue', 'heart', 'lung'] },
  ],
  means: [
    { id: 'method', uk: 'засіб, спосіб', prev: ['by', 'a', 'the', 'effective', 'main', 'best'], medical: true },
    { id: 'signify', uk: 'означає', prev: ['it', 'this', 'that', 'which', 'term'] },
  ],
  lower: [
    { id: 'position', uk: 'нижній', next: ['jaw', 'lip', 'limb', 'extremity', 'molar', 'premolar', 'incisor', 'canine', 'tooth', 'teeth', 'third', 'pole', 'lobe', 'part', 'eyelid', 'border', 'edge', 'margin', 'respiratory', 'esophageal', 'back', 'abdomen', 'leg'], medical: true },
    { id: 'reduce', uk: 'знижувати', prev: ['to', 'can', 'may', 'will', 'should', 'drug', 'which', 'that'], next: ['the', 'blood', 'pressure', 'level', 'body', 'temperature', 'cholesterol', 'glucose'] },
  ],
  oral: [
    { id: 'mouth', uk: 'ротовий, порожнини рота', next: ['cavity', 'mucosa', 'hygiene', 'health', 'surgery', 'lesion', 'ulcer', 'flora', 'microflora', 'disease', 'tissue', 'candidiasis'], medical: true },
    { id: 'route', uk: 'пероральний (через рот)', next: ['administration', 'intake', 'route', 'dose', 'drug', 'medication', 'contraceptive', 'rehydration', 'vaccine', 'antidiabetic'], cues: ['tablet', 'administer', 'dose', 'prescribe'] },
  ],
  cause: [
    { id: 'reason', uk: 'причина', prev: ['the', 'a', 'main', 'most', 'common', 'likely', 'possible', 'probable', 'leading', 'primary'], next: ['of'], medical: true },
    { id: 'verb', uk: 'спричиняти, викликати', prev: ['can', 'may', 'will', 'to', 'that', 'which', 'could', 'might', 'often', 'usually', 'be', 'is', 'are', 'was', 'were', 'been', 'being'], next: ['by', 'the', 'a', 'an', 'damage', 'disease', 'inflammation'] },
  ],
  condition: [
    { id: 'state', uk: 'стан', prev: ['the', 'his', 'her', 'general', 'patient', 'pathological', 'this', 'such', 'clinical', 'which'], medical: true },
    { id: 'requirement', uk: 'умова', next: ['for', 'of'], cues: ['experiment', 'experimental', 'laboratory', 'necessary', 'required', 'under'] },
  ],
  complaint: [{ id: 'symptom', uk: 'скарга', medical: true }],
  history: [
    { id: 'anamnesis', uk: 'анамнез', cues: ['patient', 'disease', 'illness', 'family', 'medical', 'allergic', 'previous', 'past', 'long', 'years'], medical: true },
    { id: 'past', uk: 'історія', cues: ['medicine', 'century', 'discovery', 'scientist'] },
  ],
  sample: [
    { id: 'specimen', uk: 'зразок, проба (матеріал)', medical: true },
  ],
  attack: [
    { id: 'episode', uk: 'напад', prev: ['heart', 'asthma', 'asthmatic', 'panic', 'acute', 'sudden', 'an'], cues: ['pain', 'asthma', 'angina', 'seizure'], medical: true },
    { id: 'verb', uk: 'атакувати, уражати', next: ['the', 'cells', 'tissue'] },
  ],
  shock: [
    { id: 'state', uk: 'шок', medical: true },
  ],
  depression: [
    { id: 'mood', uk: 'депресія', cues: ['mood', 'psychiatric', 'antidepressant', 'mental', 'anxiety', 'sleep'], medical: true },
    { id: 'inhibition', uk: 'пригнічення', prev: ['respiratory', 'cns', 'myocardial', 'bone', 'marrow', 'immune'], next: ['of'] },
    { id: 'segment', uk: 'депресія (зниження сегмента)', prev: ['st', 'segment'], cues: ['ecg', 'segment'] },
  ],
  tolerance: [
    { id: 'drug', uk: 'толерантність (звикання)', cues: ['drug', 'dose', 'morphine', 'opioid', 'repeated', 'alcohol'], medical: true },
    { id: 'immune', uk: 'імунологічна толерантність', prev: ['immunological', 'immune', 'immunologic'], cues: ['antigen', 'autoimmune'] },
    { id: 'glucose', uk: 'толерантність (до глюкози)', prev: ['glucose', 'carbohydrate'] },
  ],
  fasting: [
    { id: 'empty', uk: 'натще (голодування)', medical: true },
  ],
  opening: [
    { id: 'hole', uk: 'отвір', prev: ['an', 'the', 'small', 'narrow', 'external', 'internal'], next: ['of', 'in'], medical: true },
    { id: 'act', uk: 'відкривання', cues: ['mouth', 'jaw', 'limited', 'restricted', 'difficulty'] },
  ],
  findings: [{ id: 'results', uk: 'дані, результати (обстеження)', medical: true }],
  swelling: [{ id: 'edema', uk: 'набряк, припухлість', medical: true }],
  bleeding: [{ id: 'hemorrhage', uk: 'кровотеча, кровоточивість', medical: true }],
  hearing: [{ id: 'sense', uk: 'слух', medical: true }],
  lining: [{ id: 'cover', uk: 'вистилка, вистилаючий шар', medical: true }],
  dressing: [{ id: 'bandage', uk: 'пов\'язка', medical: true }],
}
