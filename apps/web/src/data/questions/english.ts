import type { Passage, Question } from '../../types'
import { q } from './helpers'

// Professional English for dentistry: terminology, grammar and reading comprehension.
// The correct answer is always listed first; options are shuffled when a test starts.

const C = 'english'

export const terminology: Question[] = [
  q('term-01', 'terminology', C,
    'Which term describes the surface of a tooth that faces the tongue?',
    ['Lingual', 'Buccal', 'Labial', 'Mesial', 'Occlusal'],
    'Lingual means "facing the tongue"; buccal faces the cheek and labial faces the lips.'),
  q('term-02', 'terminology', C,
    'Which term describes the surface of a tooth that faces toward the midline of the dental arch?',
    ['Mesial', 'Distal', 'Palatal', 'Incisal', 'Cervical'],
    'Mesial is toward the midline of the arch; distal is away from it.'),
  q('term-03', 'terminology', C,
    'What does the term "odontalgia" mean?',
    ['Toothache', 'Tooth decay', 'Bleeding gums', 'Bad breath', 'Missing teeth'],
    'Odont- means tooth and -algia means pain.'),
  q('term-04', 'terminology', C,
    'Gingivitis is inflammation of which structure?',
    ['The gums', 'The tongue', 'The lips', 'The dental pulp', 'The salivary glands'],
    'Gingiva means gum, and the suffix -itis means inflammation.'),
  q('term-05', 'terminology', C,
    'What does the prefix "hypo-" mean in words such as "hypoplasia" and "hyposalivation"?',
    ['Below normal, deficient', 'Above normal, excessive', 'Around', 'Between', 'Without'],
    'Hypo- means under or deficient; hyper- means over or excessive.'),
  q('term-06', 'terminology', C,
    'A patient complains of xerostomia. What is the patient\'s complaint?',
    ['Dry mouth', 'Bad breath', 'Burning tongue', 'Difficulty opening the mouth', 'Excessive salivation'],
    'Xero- means dry and stoma means mouth.'),
  q('term-07', 'terminology', C,
    'What is the correct plural form of the anatomical term "foramen"?',
    ['Foramina', 'Foramens', 'Foramenes', 'Forami', 'Foraminae'],
    'Latin neuter nouns ending in -men form the plural with -mina: foramen → foramina.'),
  q('term-08', 'terminology', C,
    'What does the adjective "edentulous" mean?',
    ['Having no teeth', 'Having extra teeth', 'Having decayed teeth', 'Having crooked teeth', 'Having sensitive teeth'],
    'E- means without and dens (dent-) means tooth.'),
  q('term-09', 'terminology', C,
    'Choose the word that best completes the sentence: "The general practitioner ___ the patient to a dental surgeon for extraction of the impacted tooth."',
    ['referred', 'consisted', 'complained', 'attended', 'suffered'],
    'To refer a patient means to send him or her to another specialist.'),
  q('term-10', 'terminology', C,
    'Choose the correct form: "If the patient ___ the dentist earlier, he would not have lost the tooth."',
    ['had visited', 'visited', 'would visit', 'has visited', 'visits'],
    'The third conditional uses "if + past perfect" and "would have + past participle".'),
  q('term-11', 'terminology', C,
    'Choose the correct passive form: "The impression ___ with alginate during yesterday\'s appointment."',
    ['was taken', 'took', 'is taking', 'has took', 'was taking'],
    'Past simple passive: was/were + past participle.'),
  q('term-12', 'terminology', C,
    'What does the term "malocclusion" mean?',
    ['An abnormal relationship between the teeth of the upper and lower jaws', 'Inflammation of the gums', 'A missing tooth', 'A fracture of the jaw', 'Decay on the biting surface'],
    'Occlusion is the contact of the upper and lower teeth; mal- means bad or abnormal.'),
  q('term-13', 'terminology', C,
    'Which word is a synonym of "haemorrhage"?',
    ['Bleeding', 'Swelling', 'Fever', 'Infection', 'Itching'],
    'Haemorrhage means an escape of blood, that is, bleeding.'),
  q('term-14', 'terminology', C,
    'Choose the correct preposition: "The patient complains ___ severe pain in the lower jaw."',
    ['of', 'at', 'in', 'for', 'with'],
    'In medical English, "to complain of" is used to describe symptoms.'),
  q('term-15', 'terminology', C,
    'What does the term "periapical" mean?',
    ['Around the apex of the tooth root', 'Inside the pulp chamber', 'Under the tongue', 'Between two teeth', 'On the biting surface'],
    'Peri- means around, and the apex is the tip of the root.'),
  q('term-16', 'terminology', C,
    'A patient with dysphagia has difficulty with which function?',
    ['Swallowing', 'Speaking', 'Breathing', 'Chewing', 'Hearing'],
    'Dys- means difficult and -phagia refers to swallowing or eating.'),
  q('term-17', 'terminology', C,
    'What does the abbreviation "CBCT" stand for in dental radiology?',
    ['Cone-beam computed tomography', 'Central bone calcium test', 'Complete blood cell test', 'Cervical bite correction technique', 'Coronal bitewing contrast technique'],
    'Cone-beam computed tomography gives three-dimensional images of the teeth and jaws.'),
]

export const passages: Passage[] = [
  {
    id: 'p-caries',
    title: 'Dental caries',
    text:
      'Dental caries is one of the most common chronic diseases in the world. It develops when bacteria in dental plaque ferment sugars from the diet and produce acids. ' +
      'These acids lower the pH at the tooth surface, and when the pH falls below a critical level, minerals begin to dissolve from the enamel. This process is called demineralization. ' +
      'Saliva can neutralize the acids and supply calcium and phosphate ions, so the early lesion may be repaired. This process is called remineralization. ' +
      'If demineralization happens more often than remineralization, a white spot lesion appears, and later a cavity forms. ' +
      'The frequency of sugar intake is therefore more important than the total amount of sugar eaten. ' +
      'Regular brushing with fluoride toothpaste, a healthy diet and regular dental check-ups can prevent most carious lesions.',
  },
  {
    id: 'p-periodontal',
    title: 'Periodontal disease',
    text:
      'Periodontal disease is a chronic inflammatory condition that affects the tissues supporting the teeth. ' +
      'It usually begins as gingivitis, an inflammation of the gums caused by the accumulation of bacterial plaque along the gingival margin. ' +
      'Gingivitis is reversible: when plaque is removed by effective oral hygiene, the gums return to health. ' +
      'If the inflammation is not treated, it may spread to the periodontal ligament and the alveolar bone. This stage is called periodontitis. ' +
      'In periodontitis, periodontal pockets form, bone is gradually destroyed, and the teeth may become loose and eventually be lost. ' +
      'Smoking and poorly controlled diabetes are important risk factors. ' +
      'Treatment includes professional removal of plaque and calculus, instruction in oral hygiene and, in advanced cases, surgery.',
  },
  {
    id: 'p-fluoride',
    title: 'Fluoride in dentistry',
    text:
      'Fluoride is widely used to prevent dental caries. It works mainly at the surface of the teeth after they have erupted. ' +
      'Fluoride reduces demineralization, promotes remineralization of early lesions and makes the enamel more resistant to acid by forming fluorapatite. ' +
      'It can also inhibit the metabolism of bacteria in dental plaque. ' +
      'Fluoride is delivered through toothpaste, mouth rinses, varnishes applied by the dentist and, in some countries, fluoridated drinking water. ' +
      'However, too much fluoride during the period of tooth development can cause dental fluorosis, which appears as white or brown spots on the enamel. ' +
      'For this reason, parents are advised to use only a small amount of toothpaste for young children and to supervise brushing.',
  },
  {
    id: 'p-infection',
    title: 'Infection control in the dental office',
    text:
      'Dental treatment often produces blood, saliva and aerosols, so infection control is essential to protect both patients and staff. ' +
      'Standard precautions are based on the idea that every patient may be infectious. ' +
      'Dental staff must wash their hands before and after each patient and wear gloves, masks and protective eyewear. ' +
      'Reusable instruments are first cleaned to remove organic debris and then sterilized, usually in an autoclave. ' +
      'Disposable items, such as needles and saliva ejectors, must never be reused. ' +
      'Used needles and other sharp items are placed in special puncture-resistant containers. ' +
      'All members of the dental team should also be vaccinated against hepatitis B.',
  },
]

export const reading: Question[] = [
  q('read-01', 'reading', C,
    'According to the text, what happens when the pH at the tooth surface falls below a critical level?',
    ['Minerals begin to dissolve from the enamel', 'Saliva production stops', 'Bacteria stop producing acids', 'Fluorapatite is formed', 'A cavity is immediately repaired'],
    'The text says that below a critical pH "minerals begin to dissolve from the enamel".', 'p-caries'),
  q('read-02', 'reading', C,
    'According to the text, which factor is more important in the development of caries than the total amount of sugar eaten?',
    ['The frequency of sugar intake', 'The type of toothbrush', 'The age of the patient', 'The colour of the enamel', 'The number of teeth'],
    'The text states that "the frequency of sugar intake is therefore more important than the total amount".', 'p-caries'),
  q('read-03', 'reading', C,
    'In the text, the word "repaired" in "the early lesion may be repaired" is closest in meaning to:',
    ['restored', 'removed', 'infected', 'enlarged', 'detected'],
    'Here, repaired means restored to a healthy state through remineralization.', 'p-caries'),
  q('read-04', 'reading', C,
    'According to the text, why is gingivitis described as reversible?',
    ['The gums return to health when plaque is removed', 'It always develops into periodontitis', 'It affects only the alveolar bone', 'It can be treated only by surgery', 'It is not caused by bacteria'],
    'The text explains that removal of plaque allows the gums to return to health.', 'p-periodontal'),
  q('read-05', 'reading', C,
    'Which of the following is mentioned in the text as a risk factor for periodontal disease?',
    ['Smoking', 'Drinking milk', 'Using fluoride toothpaste', 'Regular dental visits', 'Chewing sugar-free gum'],
    'The text names smoking and poorly controlled diabetes as important risk factors.', 'p-periodontal'),
  q('read-06', 'reading', C,
    'According to the text, which change is typical of periodontitis but not of gingivitis?',
    ['Gradual destruction of the alveolar bone', 'Accumulation of plaque at the gingival margin', 'Inflammation of the gums', 'Bleeding during brushing', 'Presence of bacteria'],
    'Periodontitis involves pocket formation and gradual bone destruction.', 'p-periodontal'),
  q('read-07', 'reading', C,
    'According to the text, where does fluoride mainly work?',
    ['At the surface of erupted teeth', 'Inside the dental pulp', 'In the salivary glands', 'In the alveolar bone', 'In the periodontal ligament'],
    'The text says that fluoride "works mainly at the surface of the teeth after they have erupted".', 'p-fluoride'),
  q('read-08', 'reading', C,
    'According to the text, what can excessive fluoride intake during tooth development cause?',
    ['Dental fluorosis', 'Periodontitis', 'Gingival bleeding', 'Root fractures', 'Tooth sensitivity'],
    'The text explains that too much fluoride during tooth development causes dental fluorosis.', 'p-fluoride'),
  q('read-09', 'reading', C,
    'Why does the text advise parents to supervise young children\'s brushing?',
    ['To prevent swallowing too much fluoride toothpaste', 'To make brushing faster', 'To choose the colour of the toothbrush', 'To avoid using water', 'To remove the need for dental check-ups'],
    'Supervision and a small amount of toothpaste reduce the risk of fluorosis in young children.', 'p-fluoride'),
  q('read-10', 'reading', C,
    'What is the main idea of standard precautions according to the text?',
    ['Every patient may be infectious', 'Only patients with known infections are dangerous', 'Gloves are not needed for short procedures', 'Instruments should be sterilized once a week', 'Only dentists need protection'],
    'Standard precautions treat every patient as potentially infectious.', 'p-infection'),
  q('read-11', 'reading', C,
    'According to the text, what must be done with reusable instruments before sterilization?',
    ['They must be cleaned to remove organic debris', 'They must be thrown away', 'They must be stored in a sharps container', 'They must be coated with fluoride', 'They must be heated in water for one minute'],
    'Instruments are first cleaned to remove organic debris and then sterilized.', 'p-infection'),
  q('read-12', 'reading', C,
    'In the text, the word "puncture-resistant" describes containers that:',
    ['cannot easily be pierced by sharp objects', 'can be opened very easily', 'are made of paper', 'are used for saliva samples', 'must be reused many times'],
    'A puncture-resistant container cannot easily be pierced, so used needles do not injure staff.', 'p-infection'),
]
