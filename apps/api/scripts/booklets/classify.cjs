// Keyword-based subject classifier for Krok 1 questions, plus ordered segmentation for booklets
// (official booklets list subjects in blocks: biology, anatomy, histology, physiology, biochemistry,
// microbiology, pathophysiology / pathomorphology, pharmacology).

const K = {
  biology: [
    /helminth|tapeworm|fluke|\bworms?\b|nematod|cestod|trematod|ascari|enterobi|pinworm|trichinell|echinococc|taeni|fasciol|opisthorch|schistosom|diphyllobothr|hymenolep|strongyloid|ancylostom|trichur/i,
    /\bmosquito|\bticks?\b|\blice\b|louse|insects?|larva[el]?|wingless|blood-sucking|\bfle(a|as)\b|arthropod|anophel|culex|mite\b|sarcopt/i,
    /\bprotozo|amoeba|entamoeba|lamblia|giardia|trichomon|toxoplasm|plasmodi|malaria|leishmani|trypanosom|balantid|sarcodina|sporozo/i,
    /chromosom|karyotyp|\bmitos|\bmeios|mitotic|\bgenes?\b|genetic|hereditar|inherit|mutation|genotyp|phenotyp|allel|heterozyg|homozyg|dominant|recessive|pedigree|twins|down.?s syndrome|turner|klinefelter|patau|edwards|barr bod|sex chromatin|x-linked|autosom|monogenic|penetrance|consanguin/i,
    /ontogenesis|phylogen|anthropogenesis|atavism|biosphere|ecolog|population genetics|hardy|operon|codon|anticodon|exon|intron|splicing/i,
    /\bcell cycle|interphase|prophase|metaphase|anaphase|telophase|organelle|lysosom|ribosom|golgi|endoplasmic reticulum|mitochondri/i,
  ],
  anatomy: [
    /\b(a|aa|n|nn|m|mm|v|vv|r|rr|lig|for|fossa|canalis)\.\s?[a-z]/i,
    /\barter(y|ies)\b|\bveins?\b|\bnerves?\b|\bmuscles?\b|\bbones?\b|foramen|fossa|\bcanal\b|sinus|ligament|\bjoint\b|plexus|fascia|triangle|tubercle|process of the|condyl|ganglion|lymph nodes?\b|duct\b|sulcus|fissure|gyrus|lobe of|cranial|skull|vertebr|mandible|mandibular|maxilla|zygomatic|sphenoid|temporal bone|occipital|ethmoid|palatine|hyoid|pterygoid|masseter|tongue|pharyn|laryn|esophag|peritone|pleura|mediastin|diaphragm|retroperiton|urethra|ureter|bladder|uterus|ovar|testi|prostat/i,
    /anaestheti[sz]e|anesthetize|conduction an(a)?esthesia|injection site|fracture|trauma of|injur(y|ed)|wound|damaged|hematoma|haematoma|bleeding from|abduct|adduct|flexion|extension|protrusion|elevat/i,
    /\b(incisor|canine|premolar|molar)s?\b.*(root|crown|alveol)|deciduous|eruption|dental formula|tooth (crown|root)/i,
  ],
  histology: [
    /histolog|histogenesis|odontogenesis|dentinogenesis|amelogenesis|microspecimen|micro-?specimen|micro-?slide|microslide|specimen|preparation (stained|shows|of)|stained|staining|hematoxylin|haematoxylin|eosin|silver impregnation|electron micro|microphotogra|light microscop|under a microscope|microscopy (of|shows|reveals)/i,
    /epitheli|connective tissue|cartilag|chondro|osteocyt|osteoblast|osteoclast|fibroblast|odontoblast|ameloblast|cementoblast|enamel organ|enamel prism|enamel rod|dentin(al)? tubule|predentin|mantle dentin|tomes|hertwig|dental papilla|dental sac|dental lamina|stellate reticulum|stratum intermedium/i,
    /embryo|germ layer|ectoderm|endoderm|mesoderm|mesenchym|neural tube|notochord|somite|myotome|sclerotome|dermatome|gastrulation|blastocyst|trophoblast|chorion|amnion|yolk sac|allantois|placenta|branchial|pharyngeal (arch|pouch)|cleft palate|cleft (?:upper |lower )?lip|hare lip|non-?union of|provisory organ/i,
    /lobule|acinus|alveolocyte|nephron|glomerul|podocyt|kupffer|hepatocyt|thymus|spleen|tonsil|lymph node|red bone marrow|myofibril|sarcomer|intercalated dis|cardiomyocyt|neuron|neurocyte|glial|neuroglia|astrocyt|oligodendro|schwann|mast cell|plasma cell|macrophag|melanocyt|keratinocyt|langerhans|merkel/i,
  ],
  physiology: [
    /chemoreceptor|baroreceptor|mechanoreceptor|proprioceptor|irritant receptor|coordination|partial pressure|(?:oxygen|carbon dioxide) tension|tension of (?:oxygen|carbon dioxide)|excitation|higher nervous activity|temperament|muscle tone|analy[sz]er|excitab|action potential|resting potential|membrane potential|depolari[sz]|repolari[sz]|hyperpolari[sz]|threshold|refractory|synap|neuromuscular|reflex|receptor(s)? (of|in)|afferent|efferent|spinal cord (transection|section)|decerebr|cerebell(um|ar) (function|lesion)|motor cortex/i,
    /heart rate|cardiac output|stroke volume|blood pressure|arterial pressure|pulse|ecg|electrocardiogra|cardiac cycle|vascular tone|baroreceptor|respirat(ion|ory) (rate|volume|centre|center)|tidal volume|vital capacity|ventilation|lung volume|breathing|apnea|hyperpnea/i,
    /saliva(tion)?|salivary secretion|gastric juice|gastric secretion|pancreatic juice|bile secretion|digestion|absorption|motility|peristal|chyme|thermoregulation|heat (production|loss|emission)|energy (expenditure|consumption)|basal metabolism|respiratory (quotient|coefficient)|calori|diuresis|glomerular filtration|urine (formation|volume)|thirst|hunger|satiety/i,
    /\bexperiment|test animal|\bfrog\b|\bdog\b|\brabbit\b|\bcat\b|irritation|stimulat|sensation|sensitivity|taste|vision|visual|hearing|vestibular|sleep|eeg|electroencephalogra|conditioned|unconditioned|emotion|hormone (level|secretion|concentration)/i,
  ],
  biochemistry: [
    /enzym|coenzym|isoenzym|vitamin|hypovitamin|avitamin|\batp\b|\bnad|\bfad|cytochrom|oxidative phosphoryl|tissue respiration|krebs|citric acid cycle|tricarboxylic|glycoly|gluconeogen|glycogen|pentose phosphate|beta-oxidation|ketone bod|lipogenesis|lipolysis|cholesterol|lipoprotein|triacylglycerol|fatty acid|phospholipid|bile acid/i,
    /amino acid|transaminat|deaminat|decarboxyl|\burea\b|ammonia|creatin|uric acid|purine|pyrimidine|nucleotide|\bdna\b|\brna\b|replicat|transcript|translation|protein synthesis|polypeptide|collagen (synthesis|metabolism)|hydroxyproline|oxyproline|proline|lysine|tryptophan|phenylalanin|tyrosine|glutam|glycine|serotonin|histamine formation|gaba/i,
    /bilirubin|heme|haem|porphyr|hemoglobin|haemoglobin|myoglobin|methemoglobin|carboxyhemoglobin|ferritin|transferrin|ceruloplasmin|albumin|globulin|blood protein|proteinogram|calcium (metabolism|level)|phosphate|parathormone|calcitonin|calcitriol|fluor|hydroxyapatite|fluorapatite/i,
    /second messenger|secondary mediator|\bc?amp\b|adenylate cyclase|protein kinase|insulin|glucagon|glucocorticoid|mineralocorticoid|catecholamin|metabolite|synthesi[sz]|biosynthesis|oxidation|\breduction\b|inhibitor of|substrate|catalys/i,
  ],
  microbiology: [
    /bacteri|microb|microorganism|virus|viral|virion|phage|bacteriophage|fung(i|al|us)|candida|actinomyc|spirochet|treponem|leptospir|borreli|rickett|chlamydi|mycoplasm|prion/i,
    /streptococc|staphylococc|pneumococc|meningococc|gonococc|neisseri|corynebacter|diphtheri|clostridi|tetanus|botulism|anthrax|bacill|mycobacter|tubercul|lepr|salmonell|shigell|escherichia|e\. coli|vibrio|cholera|yersini|plague|brucell|tularem|bordetell|pertussis|haemophil|legionell|helicobacter|pseudomonas|klebsiell|proteus|lactobacill|veillonell|porphyromonas|fusobacter|bacteroid|prevotell/i,
    /culture|colon(y|ies)|nutrient medium|culture medium|agar|\bbroth\b|gram(-|\s)(positive|negative)|gram stain|ziehl|neisser|burri|ginss|smear|bacterioscop|bacteriolog|virolog|serolog|serum|antiserum|toxoid|vaccin|immunization|antitoxin|agglutination|precipitation|complement fixation|hemagglutinat|elisa|immunofluoresc|\bpcr\b|sterili[sz]|disinfect|aseptic|autoclav|pasteur/i,
    /immun|antibod|antigen|immunoglobulin|\big[aegmd]\b|lymphocyt|t-?cells?|b-?cells?|t-?helper|killer|phagocyt|complement|interferon|cytokine|interleukin|allerg|anaphyla|hypersensitiv|tuberculin|mantoux|transplant|graft|rejection|autoimmun|immunodefic|\bhiv\b|aids|hepatitis [abcde]|herpes|measles|rubella|mumps|influenza|rabies|poliomyel|smallpox|causative agent|pathogen|infectious|infection/i,
  ],
  pathology: [
    /autops|post-?mortem|biopsy|necro|apoptos|inflamm|exudat|transudat|infiltrat|edema|oedema|hyperemi|ischemi|ischaemi|thromb|embol|infarct|stasis|sludge|hemorrhag|haemorrhag|dystroph|degeneration|amyloid|hyalin|calcinosis|petrification|atroph|hypertroph|hyperplas|metaplas|dysplas|sclerosis|fibrosis|cirrhosis|granulom|abscess|phlegmon|ulcer|gangren|sequest/i,
    /tumou?r|neoplasm|cancer|carcinom|sarcom|lymphom|leukemi|leukaemi|myelom|adenom|papillom|fibrom|lipom|angiom|osteom|melanom|ameloblastom|odontom|epulis|cyst|malignan|benign|metasta|atypi/i,
    /fever|pyrogen|hypoxi|anoxia|cyanosis|shock|collapse|coma|acidosis|alkalosis|dehydrat|hyperhydrat|anemi|anaemi|erythrocytosis|leukocytosis|leukopenia|leukaemoid|thrombocytopeni|agranulocyt|coagulopath|dic\b|hemophili|jaundice|icterus|uremi|azotemi|proteinuria|glucosuria|hyperglycemi|hypoglycemi|diabetes|obesity|hypertension|hypotension|heart failure|insufficiency|arrhythmi|extrasystol|fibrillation|atherosclero|rheumatism|glomerulonephritis|pyelonephritis|pneumonia|bronchitis|hepatitis|gastritis|peptic ulcer|pathogenesis|mechanism of (its )?development|pathological process|pathologic|disorder of|disturbance of/i,
    /macroscopic|on section|cut surface|the organ is|enlarged|flabby|dense|nodul|foci of|focal|diffuse|lesion|pathomorpholog|morphological (changes|picture|type)|cytolog/i,
  ],
  pharmacology: [
    /\bdrugs?\b|medication|medicine|medicinal|preparation(s)? (was|were|is|has) (prescribed|administered|given|introduced)|prescrib|administer|was given|was introduced|injected|intravenous|intramuscular|subcutaneous|sublingual(ly)?|per os|orally|tablet|ointment|solution of|dos(e|age)|overdos|poison|intoxicat|antidot|side effect|adverse|toxic effect|contraindicat|tolerance|tachyphylaxis|cumulation|addiction|dependence|withdrawal|pharmaco/i,
    /agonist|antagonist|blocker|blocking agent|inhibitor|stimulant|analgesic|anesthetic|anaesthetic|local anesth|antibiotic|antimicrobial|antibacterial|antiviral|antifungal|antiseptic|antihistamin|antihypertensive|antiarrhythmic|anticoagulant|antiplatelet|fibrinolytic|hemostatic|diuretic|laxative|antacid|antiemetic|expectorant|antitussive|bronchodilat|sedative|hypnotic|tranquili[sz]er|anxiolytic|neuroleptic|antipsychotic|antidepressant|anticonvulsant|antiepileptic|cholinomimetic|anticholinesterase|adrenomimetic|sympatholytic|ganglioblock|muscle relaxant|curare|nsaid|non-steroidal|steroid(al)? anti/i,
    /cillin\b|mycin\b|cyclin\b|floxacin|azole\b|cef[a-z]+|sulfa|sulpha|olol\b|pril\b|sartan\b|dipine\b|statin\b|prazole|tidine\b|caine\b|lidocain|novocain|procain|articain|ultracain|atropin|pilocarpin|proserin|neostigmin|adrenalin|epinephrin|noradrenalin|isadrin|salbutamol|ephedrin|mesaton|clonidin|reserpin|propranolol|anaprilin|nitroglycerin|digoxin|strophanthin|corglycon|furosemid|hypothiazid|spironolacton|heparin|warfarin|neodicumarin|vikasol|aminocapro|aspirin|acetylsalicyl|paracetamol|analgin|metamizol|diclofenac|ibuprofen|indomethacin|celecoxib|morphin|promedol|fentanyl|naloxon|nalorphin|codein|diazepam|phenobarbital|aminazin|chlorpromazin|haloperidol|amitriptyl|caffein|prednisolon|dexamethason|hydrocortison|insulin(s)? (was|is) (prescribed|administered)|metformin|glibenclamid|levothyrox|mercazolil|thiamazol|unithiol|methylene blue|bemegrid|nitrofur|isoniazid|rifampicin|metronidazol|nystatin|acyclovir|interferon (was|is) prescribed/i,
  ],
}

const ORDER = [
  'biology',
  'anatomy',
  'histology',
  'physiology',
  'biochemistry',
  'microbiology',
  'pathology',
  'pharmacology',
]

function scores(item) {
  const text = item.text + ' || ' + item.options.join(' | ')
  const s = {}
  for (const t of ORDER) {
    let v = 0
    for (const re of K[t]) {
      const g = new RegExp(re.source, 'gi')
      const m = text.match(g)
      if (m) v += Math.min(m.length, 3)
    }
    s[t] = v
  }
  // the stem's final question is a strong hint ("What drug...", "What enzyme...")
  const tail = item.text.slice(-160)
  if (
    /what (drug|medicine|preparation|agent|medication)|which (drug|medicine|preparation)|drug of choice|mechanism of action|pharmacological|antidote/i.test(
      tail,
    )
  )
    s.pharmacology += 4
  if (/what (enzyme|vitamin|coenzyme|amino acid|substance|compound|metabolite)|which (enzyme|vitamin)/i.test(tail))
    s.biochemistry += 3
  if (
    /causative agent|what (microorganism|bacteri|virus|pathogen)|what (method|reaction|test) .*diagnos|what (medium|culture medium|stain)|immunity|vaccin/i.test(
      tail,
    )
  )
    s.microbiology += 4
  if (
    /what (helminth|parasite|protozoa|organism)|helminthiasis|mode of inheritance|type of inheritance|probability|karyotype|chromosom/i.test(
      tail,
    )
  )
    s.biology += 4
  if (
    /what (nerve|artery|vein|muscle|bone|ligament|foramen|lymph node|structure|part|organ)|which (nerve|artery|vein|muscle|bone)|is (most likely )?(damaged|injured|affected)/i.test(
      tail,
    )
  )
    s.anatomy += 3
  if (
    /what (cells?|tissue|structure|organ) (is|are|was|were)? ?(shown|presented|visualized|observed|in the specimen)|name (the|these) cells|what cells|what tissue|what (stage|period) of (embryo|develop)|provisory organ|germ layer/i.test(
      tail,
    )
  )
    s.histology += 3
  if (
    /what (process|pathological process|disease|condition|type of|complication|mechanism)|pathogenesis|what is the (most likely )?(diagnosis|cause)/i.test(
      tail,
    )
  )
    s.pathology += 2
  if (
    /what (changes|reflex|receptor)|what will (happen|change|increase|decrease)|how will .* change|what (hormone|mechanism of regulation)/i.test(
      tail,
    )
  )
    s.physiology += 2

  // --- what is being asked (the last sentence) ---
  const ask = item.text.split(/(?<=[.?!:])\s+/).pop() || tail
  const bump = (topic, re, w) => {
    if (re.test(ask)) s[topic] += w
  }
  bump(
    'physiology',
    /receptors? (?:initiate|of)|initiate (?:this|the) reflex|what (?:kind|type) of (?:inhibition|muscle contraction|contraction|reflex)|inhibition caused|(?:localized|located) in(?: the)?:?$|what (?:part|structure) of the (?:brain|cns|central nervous)|analy[sz]er|what (?:process|processes) (?:of|in) (?:the )?(?:heart|kidney|nephron)|basal metabolism|respiratory (?:quotient|coefficient)/i,
    4,
  )
  bump(
    'pathology',
    /(?:hypoxia|jaundice|an(?:a)?emia|leukocytosis|arrhythmia|shock|fever) type|what (?:type|kind|form) of (?:hypoxia|jaundice|an(?:a)?emia|leukocytosis|arrhythmia|shock|o?edema|fever|hypersensitivity|allergic reaction|inflammation|necrosis|dystrophy|atrophy)|mechanism (?:has caused|underlies|of (?:its|their|the) development|is the leading)|leading (?:link|mechanism)|what disorder|what (?:is the )?(?:most likely )?diagnosis|what (?:pathological )?process/i,
    4,
  )
  bump('pathology', /most likely cause/i, 2)
  if (
    /histolog\w* (?:specimen|preparation|slide)|microspecimen|microslide|electron micro\w*|microphotogra\w*/i.test(
      item.text,
    )
  )
    s.histology += 4
  bump(
    'histology',
    /name (?:this|the) tissue|what tissue|what epithelium|epithelium lines|what cells (?:are|is|form)|specify (?:these|this) cells|cells? (?:of|in) (?:the )?(?:specimen|preparation)|what (?:structure|organ) is (?:shown|presented)|microslide|microspecimen/i,
    4,
  )
  bump(
    'pharmacology',
    /specify (?:this|the) (?:drug|agent|preparation|medicine|antiseptic)|name (?:this|the) (?:drug|preparation)|what (?:drug|agent) (?:should|can|is)/i,
    4,
  )
  bump(
    'pathology',
    /gland'?s? function (?:was|is) (?:disturbed|impaired|affected)|function of (?:what|which) gland|what gland'?s?/i,
    3,
  )
  bump(
    'microbiology',
    /causative agent|what (?:microorganisms?|bacteria|viruses?|fungi)|what (?:method|reaction|test) (?:should|can|allows|is used)|nutrient medium|what (?:stain|staining)|isolated (?:pure )?culture/i,
    3,
  )
  if (
    /bacteriolog\w*|bacterioscop\w*|virolog\w*|gram'?s? (?:method|stain)|stained (?:by|with|according to) (?:gram|ziehl|neisser|burri|ginss)|inoculat\w*|colonies|pure culture/i.test(
      item.text,
    )
  )
    s.microbiology += 3

  // --- what kind of answers are offered (how many options are of one type) ---
  const opts = item.options
  const share = (re) => opts.filter((o) => re.test(o)).length
  const byType = [
    [
      'anatomy',
      /\b(?:nerves?|arter(?:y|ies)|veins?|muscles?|m\.|n\.|a\.|v\.|bones?|foramen|canal|fossa|ganglion|ligament|joint|nucleus of|branch(?:es)? of|lymph nodes?|sinus|duct)\b/i,
    ],
    [
      'pathology',
      /(?:itis|osis|oma|emia|aemia|uria|pathy|plasia|trophy)\b|\b(?:an(?:a)?emia|leuk(?:a)?emia|insufficiency|failure|hypofunction|hyperfunction|hyper\w+ism|hypo\w+ism|jaundice|hypoxia|shock|edema|oedema|thrombosis|embolism|infarction|necrosis|inflammation|cachexia|syndrome|disease)\b/i,
    ],
    [
      'microbiology',
      /\b(?:[a-z]+cocc(?:us|i)|bacill\w*|clostridi\w*|mycobacteri\w*|corynebacteri\w*|salmonell\w*|shigell\w*|escherichia|neisseri\w*|treponem\w*|candida|actinomyc\w*|virus\w*|vibrio|bordetell\w*|klebsiell\w*|pseudomonas|proteus|yersini\w*|rickett\w*|chlamyd\w*|mycoplasm\w*|spirochet\w*|leptospir\w*|borreli\w*)\b/i,
    ],
    [
      'pharmacology',
      /(?:cillin|mycin|cyclin|floxacin|azole|olol|pril|sartan|dipine|statin|prazole|tidine|caine|azepam|barbital|profen|fenac|metacin)\b|\b(?:drugs?|blockers?|agonists?|antagonists?|inhibitors? of|analgesics?|anesthetics?|anaesthetics?|antibiotics?|diuretics?)\b/i,
    ],
    [
      'biochemistry',
      /(?:ase|ases)\b|\b(?:acid|vitamin|coenzyme|nad|fad|atp|glucose|glycogen|cholesterol|lipoprotein|urea|ammonia|bilirubin|hemoglobin|haemoglobin|amino|phosphate|lactate|pyruvate|ketone)\b/i,
    ],
    [
      'histology',
      /(?<!lympho|mono)(?:cytes?|blasts?|clasts?)\b|\b(?:epitheli\w*|tissue|cells?|fibers|fibres|lamina|layer|membrane|granules|organelles?|mitochondria|ribosomes?|lysosomes?)\b/i,
    ],
  ]
  for (const [topic, re] of byType) {
    const n = share(re)
    if (n >= 3) s[topic] += 4
    else if (n === 2) s[topic] += 2
  }
  return s
}

function argmax(s) {
  let best = ORDER[0]
  for (const t of ORDER) if (s[t] > s[best]) best = t
  return best
}

/** Monotonic segmentation over one subject order (blocks may be skipped); DP maximizes total score. */
function segmentWith(order, S) {
  const n = S.length
  const T = order.length
  const NEG = -1e9
  const dp = Array.from({ length: n }, () => new Array(T).fill(NEG))
  const from = Array.from({ length: n }, () => new Array(T).fill(-1))
  for (let t = 0; t < T; t++) dp[0][t] = S[0][order[t]] - t * 0.01
  for (let i = 1; i < n; i++) {
    for (let t = 0; t < T; t++) {
      let best = NEG
      let arg = -1
      for (let u = 0; u <= t; u++) {
        const v = dp[i - 1][u] - (u === t ? 0 : 2) // small switch penalty
        if (v > best) {
          best = v
          arg = u
        }
      }
      dp[i][t] = best + S[i][order[t]]
      from[i][t] = arg
    }
  }
  let t = 0
  for (let k = 1; k < T; k++) if (dp[n - 1][k] > dp[n - 1][t]) t = k
  const total = dp[n - 1][t]
  const out = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    out[i] = order[t]
    t = from[i][t]
  }
  return { out, total }
}

// Booklets of different years put microbiology before or after pathology; try both orders.
const ORDERS = [
  ORDER,
  ['biology', 'anatomy', 'histology', 'physiology', 'biochemistry', 'pathology', 'microbiology', 'pharmacology'],
]

function segment(items, score = scores) {
  const S = items.map(score)
  let best = null
  for (const order of ORDERS) {
    const r = segmentWith(order, S)
    if (!best || r.total > best.total) best = r
  }
  return best.out
}

/** Topics for a booklet: subject-ordered head (segmented) + mixed tail (per-question). */
function bookletTopics(items, score = scores) {
  const raw = items.map((i) => argmax(score(i)))
  // the ordered head ends after the first pharmacology run (>=3 in a window of 5) in the first 130 items
  let headEnd = items.length
  for (let i = 10; i < Math.min(items.length, 130); i++) {
    const win = raw.slice(i, i + 5).filter((t) => t === 'pharmacology').length
    if (raw[i] === 'pharmacology' && win >= 3) {
      let j = i
      while (j < items.length && raw.slice(j, j + 4).includes('pharmacology')) j++
      headEnd = j
      break
    }
  }
  // block position decides, unless the question's own evidence clearly points elsewhere
  const head = segment(items.slice(0, headEnd), score).map((t, k) => {
    const s = score(items[k])
    const own = argmax(s)
    return s[own] - s[t] >= 5 ? own : t
  })
  const tail = items.slice(headEnd).map((it, k) => {
    const s = score(it)
    const best = argmax(s)
    return s[best] > 0 ? best : raw[headEnd + k]
  })
  return { topics: [...head, ...tail], headEnd }
}

module.exports = { scores, argmax, segment, bookletTopics, ORDER }
