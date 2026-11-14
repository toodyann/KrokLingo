// Verified medical / dental multi-word terms. Format: "english phrase|українською|word=meaning in this phrase, …".
// Phrase words are base forms; the matcher accepts inflected text ("root canals", "mental foramina").
// The optional word glosses explain what the clicked word means inside the phrase (mental → підборідний).

const RAW = `
mental nerve|підборідний нерв|mental=підборідний
mental foramen|підборідний отвір|mental=підборідний
mental protuberance|підборідний виступ|mental=підборідний
mental region|підборідна ділянка|mental=підборідний
mental artery|підборідна артерія|mental=підборідний
mental spine|підборідна ость|mental=підборідний
mental retardation|розумова відсталість|mental=розумовий
mental disorder|психічний розлад|mental=психічний
root canal|кореневий канал|root=кореневий
root canal treatment|ендодонтичне лікування (лікування кореневих каналів)
root apex|верхівка кореня|root=корінь
root sheath|кореневий чохол|root=кореневий
apical foramen|верхівковий отвір
dental plaque|зубний наліт|plaque=наліт
bacterial plaque|бактеріальний наліт|plaque=наліт
atherosclerotic plaque|атеросклеротична бляшка|plaque=бляшка
dental caries|карієс зубів
tooth decay|карієс зубів|decay=карієс (руйнування)
carious cavity|каріозна порожнина|cavity=порожнина
carious lesion|каріозне ураження
oral cavity|порожнина рота|oral=ротовий,cavity=порожнина
nasal cavity|порожнина носа|cavity=порожнина
abdominal cavity|черевна порожнина|cavity=порожнина
pleural cavity|плевральна порожнина|cavity=порожнина
pulp cavity|порожнина зуба (пульпова камера)
pulp chamber|пульпова камера
oral mucosa|слизова оболонка порожнини рота
oral hygiene|гігієна порожнини рота|oral=ротовий
oral administration|пероральне введення|oral=пероральний
dental pulp|пульпа зуба
dental crown|коронка зуба|crown=коронка
tooth crown|коронка зуба|crown=коронка
crown of the tooth|коронка зуба|crown=коронка
neck of the tooth|шийка зуба|neck=шийка
dental arch|зубна дуга|arch=дуга
zygomatic arch|вилична дуга|arch=дуга
aortic arch|дуга аорти|arch=дуга
alveolar process|альвеолярний відросток|process=відросток
coronoid process|вінцевий відросток|process=відросток
condylar process|виростковий відросток|process=відросток
styloid process|шилоподібний відросток|process=відросток
mastoid process|соскоподібний відросток|process=відросток
palatine process|піднебінний відросток|process=відросток
inflammatory process|запальний процес|process=процес
pathological process|патологічний процес|process=процес
alveolar bone|альвеолярна кістка
tooth socket|лунка зуба
tooth extraction|видалення зуба|extraction=видалення
wisdom tooth|зуб мудрості
third molar|третій моляр (зуб мудрості)
deciduous tooth|тимчасовий (молочний) зуб|deciduous=тимчасовий
primary tooth|тимчасовий (молочний) зуб|primary=тимчасовий
permanent tooth|постійний зуб
periodontal ligament|періодонтальна зв'язка (періодонт)
periodontal pocket|пародонтальна кишеня
gingival sulcus|ясенна борозна
gingival margin|ясенний край
enamel prism|емалева призма
enamel organ|емалевий орган
dentinal tubule|дентинна трубочка
dental papilla|зубний сосочок
dental lamina|зубна пластинка
stellate reticulum|зірчастий ретикулум (пульпа емалевого органа)
dental filling|пломба|filling=пломба
temporary filling|тимчасова пломба|filling=пломба
fissure sealant|герметик фісур
dental floss|зубна нитка
hard palate|тверде піднебіння
soft palate|м'яке піднебіння
cleft palate|розщілина піднебіння
cleft lip|розщілина губи
upper jaw|верхня щелепа
lower jaw|нижня щелепа
upper lip|верхня губа
lower lip|нижня губа
temporomandibular joint|скронево-нижньощелепний суглоб
masticatory muscle|жувальний м'яз
salivary gland|слинна залоза
parotid gland|привушна залоза
submandibular gland|піднижньощелепна залоза
sublingual gland|під'язикова залоза
maxillary sinus|верхньощелепна (гайморова) пазуха
mandibular canal|канал нижньої щелепи
mandibular foramen|отвір нижньої щелепи
infraorbital foramen|підочноямковий отвір
inferior alveolar nerve|нижній альвеолярний нерв
superior alveolar nerve|верхній альвеолярний нерв
lingual nerve|язиковий нерв
facial nerve|лицевий нерв
trigeminal nerve|трійчастий нерв
conduction anesthesia|провідникова анестезія
conduction anaesthesia|провідникова анестезія
infiltration anesthesia|інфільтраційна анестезія
infiltration anaesthesia|інфільтраційна анестезія
local anesthetic|місцевий анестетик
local anaesthetic|місцевий анестетик
blood pressure|артеріальний тиск
arterial pressure|артеріальний тиск
heart rate|частота серцевих скорочень|rate=частота
respiratory rate|частота дихання|rate=частота
red blood cell|еритроцит
white blood cell|лейкоцит
blood count|аналіз крові (формула)
complete blood count|загальний аналіз крові
blood vessel|кровоносна судина|vessel=судина
lymph node|лімфатичний вузол
bone marrow|кістковий мозок
connective tissue|сполучна тканина
nerve fiber|нервове волокно
nerve fibre|нервове волокно
white matter|біла речовина|matter=речовина
grey matter|сіра речовина|matter=речовина
gray matter|сіра речовина|matter=речовина
action potential|потенціал дії
resting potential|потенціал спокою
gastric juice|шлунковий сік
cell membrane|клітинна мембрана
basal metabolism|основний обмін
culture medium|поживне середовище|medium=середовище,culture=культура
nutrient medium|поживне середовище|medium=середовище
pure culture|чиста культура|culture=культура (мікроорганізмів)
cell culture|культура клітин|culture=культура
causative agent|збудник|agent=збудник
infectious agent|збудник інфекції|agent=збудник
gram stain|фарбування за Грамом|stain=фарбування
drug of choice|препарат вибору
side effect|побічна дія
adverse effect|небажана (побічна) дія
mechanism of action|механізм дії
first aid|перша допомога
case history|історія хвороби|history=анамнез
medical history|анамнез|history=анамнез
chief complaint|основна скарга
physical examination|фізикальне обстеження
x-ray examination|рентгенологічне обстеження
body temperature|температура тіла
risk factor|фактор ризику
left ventricle|лівий шлуночок|left=лівий
right ventricle|правий шлуночок
left atrium|ліве передсердя|left=лівий
right atrium|праве передсердя
immune response|імунна відповідь
passive immunity|пасивний імунітет
active immunity|активний імунітет
hairy leukoplakia|волосиста лейкоплакія
cold sore|герпетична висипка на губі («застуда»)
sore throat|біль у горлі
acute inflammation|гостре запалення
chronic inflammation|хронічне запалення
coagulative necrosis|коагуляційний некроз
`

export interface Phrase {
  /** Base-form words of the phrase. */
  words: string[]
  key: string
  uk: string
  /** Meaning of individual words inside this phrase. */
  gloss: Record<string, string>
}

function parse(raw: string): Phrase[] {
  const out: Phrase[] = []
  for (const line of raw.split('\n')) {
    const [en, uk, gloss] = line.split('|').map((s) => s?.trim())
    if (!en || !uk) continue
    const map: Record<string, string> = {}
    for (const pair of (gloss ?? '').split(',')) {
      const i = pair.indexOf('=')
      if (i > 0) map[pair.slice(0, i).trim()] = pair.slice(i + 1).trim()
    }
    const key = en.toLowerCase()
    out.push({ words: key.split(/\s+/), key, uk, gloss: map })
  }
  return out
}

export const PHRASES: readonly Phrase[] = parse(RAW)
