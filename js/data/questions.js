/* Сұрақтар банкі және генераторлар — ҚАЗАҚ ТІЛІ PRO */
import { TOPICS, GRADES, getTopicById } from './topics.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function mcq(question, correct, wrongs, meta = {}) {
  const opts = shuffle([correct, ...wrongs.slice(0, 3)]);
  return {
    id: meta.id || ('q-' + Math.random().toString(36).slice(2, 10)),
    type: 'mcq',
    question,
    options: opts,
    correct,
    rule: meta.rule || '',
    topicId: meta.topicId || '',
    difficulty: meta.difficulty || 'medium',
    category: meta.category || 'practice'
  };
}

/* ——— Дайын деректер ——— */
const VOWELS_THICK = ['а', 'о', 'ұ', 'ы'];
const VOWELS_THIN = ['ә', 'ө', 'ү', 'і', 'е'];
const CONSONANTS = ['б','г','ғ','д','ж','з','к','қ','л','м','н','ң','п','р','с','т','ш'];

const SYNONYM_PAIRS = [
  ['әдемі', 'сұлу', 'көрікті', 'жаман'],
  ['батыл', 'ержүрек', 'қайратты', 'қорқақ'],
  ['үлкен', 'зор', 'алып', 'кішкентай'],
  ['қуаныш', 'шаттық', 'қызық', 'қайғы'],
  ['ақылды', 'зейінді', 'парасатты', 'аңқау'],
  ['жылдам', 'тез', 'шапшаң', 'баяу'],
  ['дос', 'жолдас', 'әріптес', 'жау'],
  ['үй', 'баспана', 'тұрақ', 'көше']
];

const ANTONYM_PAIRS = [
  ['жақсы', 'жаман'], ['үлкен', 'кіші'], ['алыс', 'жақын'],
  ['ақ', 'қара'], ['кең', 'тар'], ['жылы', 'суық'],
  ['бастау', 'аяқтау'], ['күн', 'түн'], ['дос', 'жау'],
  ['ауыр', 'жеңіл'], ['ұзын', 'қысқа'], ['жаңа', 'ескі']
];

const HOMONYMS = [
  { word: 'ат', m1: 'жылқы', m2: 'есім', other: 'қала' },
  { word: 'жай', m1: 'қару түрі', m2: 'ыңғайлы', other: 'кітап' },
  { word: 'көк', m1: 'түс', m2: 'аспан', other: 'мектеп' },
  { word: 'бас', m1: 'дене мүшесі', m2: 'басшы', other: 'гүл' }
];

const PHRASES = [
  { phrase: 'көзін ашу', meaning: 'түсіндіру, үйрету', wrong: ['ұйықтау', 'көру', 'жуу'] },
  { phrase: 'қолға алу', meaning: 'іске кірісу', wrong: ['сәлемдесу', 'беру', 'жасыру'] },
  { phrase: 'жүрек жұтқан', meaning: 'батыл', wrong: ['қорқақ', 'ауру', 'аш'] },
  { phrase: 'аузынан ақ май ағу', meaning: 'әдемі сөйлеу', wrong: ['аш болу', 'жылау', 'үндемеу'] },
  { phrase: 'ит өлген жер', meaning: 'өте алыс жер', wrong: ['жақын жер', 'үй', 'базар'] },
  { phrase: 'төбесі көкке жету', meaning: 'қатты қуану', wrong: ['қайғыру', 'ұйықтау', 'жүгіру'] }
];

const NOUNS = ['бала','кітап','мектеп','қала','гүл','дос','ұстаз','ана','әке','оқушы'];
const ADJ = ['әдемі','үлкен','қызыл','ақылды','жаңа','қарт','жас','биік'];
const VERBS = ['оқыды','жазды','жүгірді','келді','айтты','ойлады','тұрды'];
const PRONOUNS = ['мен','сен','ол','біз','сіз','олар','бұл','кім','не'];
const NUMBERS = ['бір','екі','үш','бес','он','бірінші','екінші','бесінші'];

const WORD_PARTS = [
  { word: 'балалар', root: 'бала', affix: '-лар', rule: 'Түбір + көптік жалғау' },
  { word: 'мектептер', root: 'мектеп', affix: '-тер', rule: 'Үндестік заңы: жіңішке түбір' },
  { word: 'досым', root: 'дос', affix: '-ым', rule: 'Тәуелдік жалғау' },
  { word: 'кітапты', root: 'кітап', affix: '-ты', rule: 'Табыс септік' },
  { word: 'балықшы', root: 'балық', affix: '-шы', rule: 'Сөз тудырушы жұрнақ' },
  { word: 'оқушы', root: 'оқу', affix: '-шы', rule: 'Қызығушы/маман жұрнағы' },
  { word: 'жазба', root: 'жаз', affix: '-ба', rule: 'Сөз тудырушы жұрнақ' }
];

const SENTENCE_TYPES = [
  { s: 'Бүгін сабақ болды.', type: 'хабарлы' },
  { s: 'Сен қайда барасың?', type: 'сұраулы' },
  { s: 'Кітапты аш!', type: 'бұйрықты' },
  { s: 'Қандай әдемі гүл!', type: 'лепті' },
  { s: 'Мен мектепке барамын.', type: 'хабарлы' },
  { s: 'Неге кешіктің?', type: 'сұраулы' }
];

const MEMBERS = [
  { s: 'Оқушы кітап оқыды.', q: 'Бастауышты тап', a: 'Оқушы', w: ['кітап','оқыды','жоқ'] },
  { s: 'Қыз әдемі өлең айтты.', q: 'Баяндауышты тап', a: 'айтты', w: ['Қыз','әдемі','өлең'] },
  { s: 'Үлкен ағаш өсті.', q: 'Анықтауышты тап', a: 'Үлкен', w: ['ағаш','өсті','жоқ'] },
  { s: 'Бала дәптерді алды.', q: 'Толықтауышты тап', a: 'дәптерді', w: ['Бала','алды','жоқ'] },
  { s: 'Ол ерте тұрды.', q: 'Пысықтауышты тап', a: 'ерте', w: ['Ол','тұрды','жоқ'] }
];

const TEXTS_SHORT = [
  {
    text: 'Көктем келді. Ағаштар бүршік жара бастады. Құстар жылы жақтан оралды. Балалар аулада ойнайды.',
    topic: 'Көктем',
    idea: 'Көктемнің келуі және табиғат өзгерісі',
    wrongTopics: ['Қыс', 'Мектеп', 'Спорт'],
    wrongIdeas: ['Қысқы ойындар', 'Жазғы демалыс', 'Кітап оқу']
  },
  {
    text: 'Абай Құнанбайұлы — ұлы қазақ ақыны. Ол қара сөздер мен өлеңдер жазды. Абай халықты білімге шақырды.',
    topic: 'Абай Құнанбайұлы',
    idea: 'Абайдың халыққа білім мен өнер жолын көрсетуі',
    wrongTopics: ['Шоқан Уәлиханов', 'Ыбырай Алтынсарин', 'Мұхтар Әуезов'],
    wrongIdeas: ['Соғыс туралы', 'Тек спорт', 'Тек музыка']
  },
  {
    text: 'Мектептегі кітапханада көптеген кітап бар. Оқушылар әр үзілісте кітап алып оқиды. Оқу — білімнің кілті.',
    topic: 'Кітапхана және оқу',
    idea: 'Оқудың маңыздылығы',
    wrongTopics: ['Спорт залы', 'Асхана', 'Аула'],
    wrongIdeas: ['Тек ойын', 'Тамақ', 'Ұйқы']
  }
];

const PISA_ITEMS = [
  {
    title: 'Автобус кестесі',
    passage: 'Алматы — Қапшағай бағытындағы автобус:\n08:00, 10:30, 13:00, 16:45, 19:20.\nБилет бағасы: ересек — 800 тг, бала (7–15) — 400 тг, 7 жасқа дейін — тегін.\nЖол уақыты: шамамен 1 сағат 20 минут.',
    questions: [
      { q: 'Егер сіз 12:00-де шыққыңыз келсе, қай автобусқа үлгересіз?', a: '13:00', w: ['10:30','08:00','16:45'], rule: 'Кестеден кейінгі ең жақын уақытты таңдау.' },
      { q: '14 жастағы бала мен анасы үшін билет қанша тұрады?', a: '1200 тг', w: ['800 тг','1600 тг','400 тг'], rule: 'Ересек 800 + бала 400 = 1200.' },
      { q: '08:00 автобусы шамамен қашан жетеді?', a: '09:20', w: ['08:20','10:00','09:00'], rule: '1 сағ 20 мин қосу.' }
    ]
  },
  {
    title: 'Мектеп хабарландыруы',
    passage: 'ҚҰРМЕТТІ АТА-АНАЛАР!\n15 қыркүйек күні сағат 18:00-де №140 мектептің акт залында ата-аналар жиналысы өтеді.\nКүн тәртібі: 1) Оқу үлгерімі 2) Мектеп формасы 3) Сауықтыру күні.\nҚатысу міндетті. Байланыс: 8 700 123 45 67.',
    questions: [
      { q: 'Жиналыс қайда өтеді?', a: 'Акт залында', w: ['Спорт залында','Аулада','Кітапханада'], rule: 'Хабарландырудағы орынды табу.' },
      { q: 'Күн тәртібінде не жоқ?', a: 'Емтихан кестесі', w: ['Оқу үлгерімі','Мектеп формасы','Сауықтыру күні'], rule: 'Берілген тізіммен салыстыру.' },
      { q: 'Жиналыс қашан?', a: '15 қыркүйек, 18:00', w: ['15 қазан, 18:00','16 қыркүйек, 17:00','15 қыркүйек, 10:00'], rule: 'Күн мен уақытты дәл оқу.' }
    ]
  },
  {
    title: 'Екі мәтін: кітапхана ережесі',
    passage: 'МӘТІН А: Кітапханада тыныш отыру керек. Кітапты 14 күнге алуға болады.\nМӘТІН Ә: Электронды кітаптар шексіз мерзімге оқылады. Дауыстап сөйлеуге болмайды.',
    questions: [
      { q: 'Екі мәтіндегі ортақ ереже қандай?', a: 'Тыныштық сақтау', w: ['14 күн мерзім','Тек электронды кітап','Төлем'], rule: 'Салыстыру арқылы ортақты табу.' },
      { q: 'Қай мәтінде мерзім шектеуі бар?', a: 'Мәтін А', w: ['Мәтін Ә','Екеуінде де','Ешқайсысында'], rule: 'А мәтінінде 14 күн.' }
    ]
  },
  {
    title: 'Жарнама',
    passage: '«ҚАЗАҚ ТІЛІ КЛУБЫ»\nЖексенбі сайын сағат 11:00.\nТегін! 5–9 сынып оқушыларына.\nМекенжай: №140 мектеп, 12-кабинет.\nТіркелу: qazaq.club@school.kz',
    questions: [
      { q: 'Клуб қашан өтеді?', a: 'Жексенбі, 11:00', w: ['Сенбі, 11:00','Жексенбі, 12:00','Дүйсенбі, 11:00'], rule: 'Жарнамадан уақытты оқу.' },
      { q: 'Қатысу ақылы ма?', a: 'Жоқ, тегін', w: ['Иә, 1000 тг','Тек бірінші сабақ тегін','Белгісіз'], rule: '«Тегін!» деген сөзді байқау.' }
    ]
  },
  {
    title: 'Диаграмма сипаттамасы',
    passage: 'Сыныптағы сүйікті пәндер сауалнамасы (30 оқушы):\nҚазақ тілі — 10, Математика — 8, Тарих — 5, Биология — 4, Басқа — 3.',
    questions: [
      { q: 'Ең көп таңдалған пән?', a: 'Қазақ тілі', w: ['Математика','Тарих','Биология'], rule: 'Ең үлкен сан — 10.' },
      { q: 'Математиканы таңдағандар пайызы шамамен?', a: 'шамамен 27%', w: ['50%','10%','80%'], rule: '8/30 ≈ 0.27.' }
    ]
  }
];

const READING_PASSAGES = [
  {
    type: 'ақпараттық',
    title: 'Қазақстанның өзендері',
    text: 'Қазақстанда көптеген өзен бар. Ертіс, Жайық, Іле, Сырдария — ең ірілерінің бірі. Өзендер ауыл шаруашылығына, энергетикаға және көлікке маңызды. Суды үнемді пайдалану — әр азаматтың міндеті.',
    questions: [
      { q: 'Мәтіндегі негізгі ой?', a: 'Өзендердің маңызы және суды үнемдеу', w: ['Тек Ертіс туралы','Тек спорт','Тек тарих'], rule: 'Негізгі ой бүкіл мәтінді қамтиды.' },
      { q: 'Қайсысы мәтінде аталмаған?', a: 'Еділ', w: ['Іле','Жайық','Сырдария'], rule: 'Аталған өзендерді тексеру.' },
      { q: 'Бұл қандай мәтін түрі?', a: 'ақпараттық', w: ['көркем ғана','жарнама','өлең'], rule: 'Фактілер берілген.' }
    ]
  },
  {
    type: 'көркем',
    title: 'Алма бағы',
    text: 'Күзгі бақта алмалар қызарып тұрды. Жел жұмсақ тербеп, жапырақтар сыбдырлады. Атам: «Алма — еңбек жемісі», — деді. Мен бір алма үзіп, оның тәтті дәмін сезіндім.',
    questions: [
      { q: 'Автор қандай сезімді жеткізеді?', a: 'Табиғат пен еңбектің сұлулығы', w: ['Қорқыныш','Ашу','Қайғы'], rule: 'Көркем детальдар мен ата сөзі.' },
      { q: '«Алма — еңбек жемісі» кімнің сөзі?', a: 'Атамның', w: ['Неменің','Ұстаздың','Достың'], rule: 'Мәтіннен тікелей ақпарат.' }
    ]
  },
  {
    type: 'публицистикалық',
    title: 'Оқудың пайдасы',
    text: 'Бүгінгі жастар телефонға көп қарайды. Алайда кітап оқу миды дамытады, сөз байлығын арттырады. Мектеп кітапханасына жазылу — әр оқушыға пайдалы қадам. Оқыған ұлт — озық ұлт!',
    questions: [
      { q: 'Автор позициясы?', a: 'Кітап оқуды қолдау', w: ['Телефонды қолдау','Оқуға қарсы','Бейтарап'], rule: 'Шақыру мен дәлелдерге қарау.' },
      { q: 'Қайсысы факт?', a: 'Кітап оқу сөз байлығын арттырады (жалпы қабылданған)', w: ['Оқыған ұлт — озық ұлт! (ұран)', 'Барлық жастар оқымайды', 'Телефон зиянсыз'], rule: 'Факт пен пікірді ажырату.' }
    ]
  },
  {
    type: 'ғылыми-көпшілік',
    title: 'Буын және дыбыс',
    text: 'Буын — сөздегі дауысты дыбысқа негізделген бөлік. Қазақ тілінде әр буында бір дауысты болады. Мысалы, «қазақ» сөзінде екі буын бар: қа-зақ. Буынға бөлу оқу мен тасымалға көмектеседі.',
    questions: [
      { q: 'Буын неге негізделеді?', a: 'Дауысты дыбысқа', w: ['Дауыссызға','Әріп санына','Сөз ұзындығына'], rule: 'Анықтамадан.' },
      { q: '«қазақ» неше буын?', a: '2', w: ['1','3','4'], rule: 'қа-зақ.' }
    ]
  },
  {
    type: 'өмірлік жағдаят',
    title: 'Дүкенде',
    text: 'Айгерім дүкенге барды. Оған нан, сүт және алма керек. Нан — 150 тг, сүт — 400 тг, алма (1 кг) — 500 тг. Қолында 1000 тг бар.',
    questions: [
      { q: 'Барлығын алса, ақша жете ме?', a: 'Иә, 50 тг қалады', w: ['Жоқ, 50 тг жетпейді','Дәл 1000','200 қалды'], rule: '150+400+500=1050... wait 1050 > 1000. Let me fix.' }
    ]
  },
  {
    type: 'хабарландыру',
    title: 'Спорт күні',
    text: '20 қыркүйек күні мектеп стадионында «Спорт күні» өтеді. Басталуы — 10:00. Қатысушылар спорт формасымен келуі тиіс. Жүлделі орындарға грамота беріледі.',
    questions: [
      { q: 'Қатысушылар қалай киінуі керек?', a: 'Спорт формасымен', w: ['Мектеп формасымен','Еркін','Костюммен'], rule: 'Хабарландыру талабы.' }
    ]
  }
];

/* Fix the shop math in reading */
READING_PASSAGES[4].questions = [
  { q: 'Нан, сүт және 1 кг алманың қосындысы?', a: '1050 тг', w: ['1000 тг','900 тг','1500 тг'], rule: '150+400+500=1050.' },
  { q: '1000 тг-мен барлығын алуға бола ма?', a: 'Жоқ, 50 тг жетпейді', w: ['Иә, жетеді','Дәл жетеді','200 артық'], rule: '1050>1000.' }
];

const OLYMP_EASY = [
  mcq('«Бала» сөзінің антонимі?', 'ересек', ['дос','үй','кітап'], { rule: 'Антоним — қарама-қарсы мағына.', difficulty: 'easy' }),
  mcq('Қайсысы дауысты дыбыс?', 'ә', ['б','қ','н'], { rule: 'Дауыстылар: а,ә,е,и,о,ө,ұ,ү,ы,і.', difficulty: 'easy' }),
  mcq('«Мектеп» сөзінде неше буын бар?', '2', ['1','3','4'], { rule: 'мек-теп.', difficulty: 'easy' }),
  mcq('Синонимдерді тап: әдемі — ?', 'сұлу', ['жаман','үлкен','алыс'], { rule: 'Синоним — жақын мағына.', difficulty: 'easy' }),
  mcq('«Ол келді.» сөйлемінің түрі?', 'хабарлы', ['сұраулы','лепті','бұйрықты'], { rule: 'Хабар жеткізеді.', difficulty: 'easy' })
];

const OLYMP_MED = [
  mcq('«Көзін ашу» фразеологизмінің мағынасы?', 'түсіндіру', ['ұйықтау','көру','жуу'], { rule: 'Тұрақты тіркес мағынасы.', difficulty: 'medium' }),
  mcq('Қай сөйлемде қаратпа бар?', 'Айгүл, келші!', ['Айгүл келді.','Кім келді?','Ол келді.'], { rule: 'Қаратпа үтірмен бөлінеді.', difficulty: 'medium' }),
  mcq('«Оқыған» қандай форма?', 'есімше', ['көсемше','тұйық етістік','үстеу'], { rule: 'Есімше — -ған/-ген.', difficulty: 'medium' }),
  mcq('Салалас құрмаласқа тән белгі?', 'тең дәрежелі жай сөйлемдер', ['тек бір бастауыш','тек сұраулы','тек лепті'], { rule: 'Салалас — тең байланыс.', difficulty: 'medium' }),
  mcq('Қайсысы қатыстық сын есім?', 'темір', ['әдемі','үлкен','қызыл'], { rule: 'Қатыстық — заттан жасалған.', difficulty: 'medium' })
];

const OLYMP_HARD = [
  mcq('«Жүгіріп келді» тіркесіндегі «жүгіріп»?', 'көсемше', ['есімше','үстеу','зат есім'], { rule: 'Көсемше — -ып/-іп.', difficulty: 'hard' }),
  mcq('Қай сөйлем толымсыз?', '— Қайдасың? — Үйде.', ['Мен үйде отырмын.','Ол мектепке барды.','Күн шықты.'], { rule: 'Толымсыз — мүше түсірілген.', difficulty: 'hard' }),
  mcq('Айқындауыш қайсы?', 'Менің досым, Алмас, келді.', ['Алмас келді.','Досым келді.','Ол келді.'], { rule: 'Айқындауыш үтірмен бөлінеді.', difficulty: 'hard' }),
  mcq('«Оқу» сөзінің сөз табы (тұйық форма)?', 'етістік (тұйық)', ['зат есім ғана','сын есім','үстеу'], { rule: 'Тұйық етістік -у.', difficulty: 'hard' }),
  mcq('Қарсылықты салаласқа тән жалғаулық?', 'бірақ', ['және','себебі','сондықтан'], { rule: 'бірақ, алайда — қарсылық.', difficulty: 'hard' })
];

const OLYMP_ELITE = [
  mcq('Күрделі синтаксистік талдау: «Егер ерте тұрсаң, сабаққа үлгересің.» — бұл?', 'шартты бағыныңқы сабақтас', ['ыңғайлас салалас','атаулы','жалаң жай'], { rule: 'Егер... — шартты бағыныңқы.', difficulty: 'olympiad' }),
  mcq('Төл сөздегі дұрыс пунктуация?', 'Ұстаз: «Сабақ басталды», — деді.', ['Ұстаз «Сабақ басталды» деді.', 'Ұстаз: Сабақ басталды деді.', 'Ұстаз — Сабақ басталды — деді.'], { rule: 'Төл сөз тырнақшада, автор сөзі сызықшамен.', difficulty: 'olympiad' }),
  mcq('Қай мәтінде публицистикалық стиль басым?', 'Оқыған ұлт — озық ұлт! Кітапқа жазылыңыз!', ['H₂O — су молекуласы.','Өтініш жазамын.','Баяғыда бір хан болыпты.'], { rule: 'Шақыру, ұран — публицистика.', difficulty: 'olympiad' }),
  mcq('«Шынайылықты бағалау» дағдысы нені талап етеді?', 'дереккөз бен дәлелді тексеру', ['тек есте сақтау','тек көшіру','тек жаттау'], { rule: 'PISA/сауаттылық дағдысы.', difficulty: 'olympiad' }),
  mcq('Аралас құрмалас дегеніміз?', 'салалас пен сабақтас белгілері бірге', ['тек жалаң','тек атаулы','тек сұраулы'], { rule: 'Аралас құрмалас анықтамасы.', difficulty: 'olympiad' })
];

/* ——— Генераторлар ——— */
function genPhonetics(topicId, n = 20) {
  const out = [];
  const rules = {
    '5-ph-1': 'Дыбыс — айтылым, әріп — жазылым.',
    '5-ph-2': 'Дауысты/дауыссыз айырмасы.',
    '5-ph-3': 'Буын — дауыстыға негізделген.',
    '5-ph-4': 'Тасымал буын бойынша.',
    '5-ph-5': 'Үндестік: жуан/жіңішке.',
    '5-ph-6': 'Орфография ережелері.'
  };
  const rule = rules[topicId] || 'Фонетика ережесі.';
  for (let i = 0; i < n; i++) {
    const kind = i % 6;
    if (kind === 0) {
      const v = pick([...VOWELS_THICK, ...VOWELS_THIN]);
      out.push(mcq(`«${v}» дыбысы қандай?`, 'дауысты', ['дауыссыз','буын','әріп'], { topicId, rule, difficulty: i < 5 ? 'easy' : 'medium' }));
    } else if (kind === 1) {
      const c = pick(CONSONANTS);
      out.push(mcq(`«${c}» дыбысы қандай?`, 'дауыссыз', ['дауысты','үстеу','септік'], { topicId, rule }));
    } else if (kind === 2) {
      const words = [['бала','2'],['мектеп','2'],['кітап','2'],['а','1'],['Қазақстан','3'],['оқушы','3']];
      const [w, ans] = pick(words);
      out.push(mcq(`«${w}» сөзінде неше буын?`, ans, shuffle(['1','2','3','4']).filter(x => x !== ans).slice(0,3), { topicId, rule }));
    } else if (kind === 3) {
      out.push(mcq('Қайсысы дұрыс тасымал?', 'мек-теп', ['м-ектеп','мекте-п','мектеп-'], { topicId, rule: 'Буын бойынша тасымал.' }));
    } else if (kind === 4) {
      out.push(mcq('Жіңішке дауыстыны тап', pick(VOWELS_THIN), [...VOWELS_THICK, 'б'].slice(0,3), { topicId, rule: 'Жіңішке: ә,ө,ү,і,е.' }));
    } else {
      out.push(mcq('Үндестік заңы бойынша дұрыс?', 'інілер', ['інілар','інілор','ініләр'], { topicId, rule: 'Жіңішке түбір + жіңішке қосымша.' }));
    }
  }
  return out;
}

function genLexicon(topicId, n = 20) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const kind = i % 7;
    if (kind === 0 || topicId.includes('lx-5') || topicId.includes('lx-1')) {
      const [a, b, c, wrong] = pick(SYNONYM_PAIRS);
      out.push(mcq(`«${a}» сөзінің синонимі?`, b, [wrong, pick(NOUNS), pick(VERBS)], { topicId, rule: 'Синоним — жақын мағыналы сөз.' }));
    } else if (kind === 1) {
      const [a, b] = pick(ANTONYM_PAIRS);
      const others = ANTONYM_PAIRS.map(p => p[1]).filter(x => x !== b);
      out.push(mcq(`«${a}» сөзінің антонимі?`, b, shuffle(others).slice(0,3), { topicId, rule: 'Антоним — қарама-қарсы.' }));
    } else if (kind === 2) {
      const h = pick(HOMONYMS);
      out.push(mcq(`«${h.word}» омонимінің бір мағынасы?`, h.m1, [h.other, pick(ADJ), pick(VERBS)], { topicId, rule: 'Омоним — бірдей дыбыс, әр мағына.' }));
    } else if (kind === 3) {
      const p = pick(PHRASES);
      out.push(mcq(`«${p.phrase}» мағынасы?`, p.meaning, p.wrong, { topicId, rule: 'Фразеологизм мағынасы тұтас.' }));
    } else if (kind === 4) {
      out.push(mcq('Ауыспалы мағынаны тап', 'алтын қол', ['алтын сағат','темір қақпа','ағаш үстел'], { topicId, rule: 'Ауыспалы — бейнелі қолданыс.' }));
    } else if (kind === 5) {
      out.push(mcq('Қайсысы термин?', 'синтаксис', ['үй','жаксы','ойнау'], { topicId, rule: 'Термин — ғылыми ұғым.' }));
    } else {
      out.push(mcq('Қайсысы кәсіби сөз (дәрігер)?', 'скальпель', ['қалам','доп','наның'], { topicId, rule: 'Кәсіби лексика.' }));
    }
  }
  return out;
}

function genMorphology(topicId, n = 20) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const kind = i % 8;
    if (kind === 0) {
      const w = pick(WORD_PARTS);
      out.push(mcq(`«${w.word}» сөзінің түбірі?`, w.root, shuffle([w.affix.replace('-',''), pick(NOUNS), 'лар']).slice(0,3), { topicId, rule: w.rule }));
    } else if (kind === 1) {
      out.push(mcq('Зат есімді тап', pick(NOUNS), [pick(ADJ), pick(VERBS), pick(['тез','өте','мұнда'])], { topicId, rule: 'Зат есім: кім? не?' }));
    } else if (kind === 2) {
      out.push(mcq('Сын есімді тап', pick(ADJ), [pick(NOUNS), pick(VERBS), pick(PRONOUNS)], { topicId, rule: 'Сын есім: қандай?' }));
    } else if (kind === 3) {
      out.push(mcq('Етістікті тап', pick(VERBS), [pick(NOUNS), pick(ADJ), pick(NUMBERS)], { topicId, rule: 'Етістік: не істеді?' }));
    } else if (kind === 4) {
      out.push(mcq('Есімдікті тап', pick(PRONOUNS), [pick(NOUNS), pick(ADJ), pick(VERBS)], { topicId, rule: 'Есімдік — орнына жүретін сөз.' }));
    } else if (kind === 5) {
      out.push(mcq('Сан есімді тап', pick(NUMBERS), [pick(NOUNS), pick(ADJ), pick(VERBS)], { topicId, rule: 'Сан есім: неше? қай?' }));
    } else if (kind === 6) {
      out.push(mcq('Есімшені тап', 'оқыған', ['оқып','оқу','тез'], { topicId, rule: 'Есімше: -ған/-ген/-етін.' }));
    } else {
      out.push(mcq('Көсемшені тап', 'жүгіріп', ['жүгірген','жүгіру','жүгіріс'], { topicId, rule: 'Көсемше: -ып/-іп/-п.' }));
    }
  }
  // topic-specific extras
  if (topicId.includes('mo-5') || topicId.includes('wd')) {
    out.push(mcq('Шылауды тап', 'үшін', ['бала','жақсы','оқыды'], { topicId, rule: 'Шылау — көмекші сөз.' }));
    out.push(mcq('Одағайды тап', 'әх', ['мен','кітап','жазу'], { topicId, rule: 'Одағай — сезім сөзі.' }));
  }
  return out.slice(0, n);
}

function genSyntax(topicId, n = 20) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const kind = i % 7;
    if (kind === 0) {
      const st = pick(SENTENCE_TYPES);
      const wrongs = ['хабарлы','сұраулы','бұйрықты','лепті'].filter(x => x !== st.type);
      out.push(mcq(`«${st.s}» сөйлемінің түрі?`, st.type, wrongs.slice(0,3), { topicId, rule: 'Мақсатына қарай сөйлем түрлері.' }));
    } else if (kind === 1) {
      const m = pick(MEMBERS);
      out.push(mcq(`${m.q}: «${m.s}»`, m.a, m.w, { topicId, rule: 'Сөйлем мүшелерін сұрақпен табу.' }));
    } else if (kind === 2) {
      out.push(mcq('Қайсысы сөз тіркесі?', 'әдемі гүл', ['гүл','және','?'], { topicId, rule: 'Сөз тіркесі — байланысқан сөздер.' }));
    } else if (kind === 3) {
      out.push(mcq('Қаратпасы бар сөйлем?', 'Балалар, тыңдаңдар!', ['Балалар тыңдады.','Кім тыңдады?','Олар тыңдады.'], { topicId, rule: 'Қаратпа үтірмен бөлінеді.' }));
    } else if (kind === 4) {
      out.push(mcq('Қыстырмасы бар сөйлем?', 'Әрине, мен келемін.', ['Мен келемін.','Кел!','Кім келеді?'], { topicId, rule: 'Қыстырма үтірмен бөлінеді.' }));
    } else if (kind === 5) {
      out.push(mcq('Салалас құрмалас?', 'Жел соқты және жаңбыр жауды.', ['Келген бала отырды.','Қыс.','Кім?'], { topicId, rule: 'Салалас — тең жай сөйлемдер.' }));
    } else {
      out.push(mcq('Сабақтас құрмалас?', 'Егер оқысаң, білерсің.', ['Мен оқыдым және жаздым.','Ол келді.','Күн шықты, құстар сайрады.'], { topicId, rule: 'Басыңқы+бағыныңқы.' }));
    }
  }
  if (topicId.includes('sy-3') || topicId.includes('sy-4') || topicId.includes('8-sy')) {
    out.push(mcq('Жалаң сөйлем?', 'Құстар ұшты.', ['Көктемде әдемі құстар ұшты.','Ертең мен мектепке барамын.','Досым, келші!'], { topicId, rule: 'Жалаң — тек тұрлаулы.' }));
    out.push(mcq('Атаулы сөйлем?', 'Қыс.', ['Қыс келді.','Қыс суық болды.','Қыс па?'], { topicId, rule: 'Атаулы — бір мүшелі.' }));
  }
  return out.slice(0, n);
}

function genPunctuation(topicId, n = 18) {
  const out = [];
  const items = [
    mcq('Бірыңғай мүшелерде қандай белгі?', 'үтір', ['тек нүкте','тек сұрақ','тек леп'], { topicId, rule: 'Бірыңғай мүшелер үтірмен.' }),
    mcq('Қаратпа қалай бөлінеді?', 'үтірмен', ['тек сызықшамен','тек жақшамен','белгісіз'], { topicId, rule: 'Қаратпа үтірмен.' }),
    mcq('Төл сөз қандай белгімен алынады?', 'тырнақша', ['тек нүкте','тек үтір','тек жақша'], { topicId, rule: 'Төл сөз — тырнақша.' }),
    mcq('Дұрыс нұсқа?', 'Мен, әрине, келемін.', ['Мен әрине келемін.','Мен әрине, келемін','Мен, әрине келемін'], { topicId, rule: 'Қыстырма екі жақтан үтір.' }),
    mcq('Қос нүкте қайда қойылады?', 'тізбе алдында', ['тек сөйлем соңында','тек басында','ешқашан'], { topicId, rule: 'Қос нүкте — түсіндірме/тізбе.' }),
    mcq('Сызықша қайда қойылуы мүмкін?', 'бастауыш пен баяндауыш арасында', ['тек дауыстыдан кейін','тек кітапта','ешқашан'], { topicId, rule: 'Бастауыш—баяндауыш сызықшасы.' }),
    mcq('Дұрыс төл сөз?', 'Ол: «Сәлем!» — деді.', ['Ол сәлем деді.','Ол — сәлем деді','Ол «Сәлем»'], { topicId, rule: 'Төл/автор сөзі ережесі.' }),
    mcq('Нүктелі үтір не үшін?', 'күрделі бөліністе', ['тек леп үшін','тек сұрақ үшін','тек атауда'], { topicId, rule: 'Нүктелі үтір — күштірек бөлу.' })
  ];
  while (out.length < n) out.push(...items.map(x => ({ ...x, id: 'q-' + Math.random().toString(36).slice(2, 9) })));
  return out.slice(0, n);
}

function genText(topicId, n = 16) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = pick(TEXTS_SHORT);
    const kind = i % 4;
    if (kind === 0) out.push(mcq(`Мәтін тақырыбын таңда:\n«${t.text}»`, t.topic, t.wrongTopics, { topicId, rule: 'Тақырып мәтін мазмұнына сай.' }));
    else if (kind === 1) out.push(mcq(`Негізгі ойды тап:\n«${t.text}»`, t.idea, t.wrongIdeas, { topicId, rule: 'Негізгі ой — басты идея.' }));
    else if (kind === 2) out.push(mcq('Мәтін құрылымының дұрыс реті?', 'кіріспе — негізгі бөлім — қорытынды', ['қорытынды — кіріспе — негізгі','тек қорытынды','тек тақырып'], { topicId, rule: 'Үш бөлікті құрылым.' }));
    else out.push(mcq('Пікірге тән белгі?', 'жеке көзқарас', ['тек дата','тек сан','тек атау'], { topicId, rule: 'Пікір — субъективті баға.' }));
  }
  if (topicId.includes('tx') && (topicId.startsWith('8') || topicId.startsWith('9') || topicId.startsWith('7'))) {
    out.push(mcq('Ғылыми стильге тән?', 'термин мен дәлдік', ['тек жаргон','тек ұран','тек диалог'], { topicId, rule: 'Ғылыми стиль ерекшелігі.' }));
    out.push(mcq('Ресми стильге тән?', 'стандартты құжат тілі', ['тек өлең','тек анекдот','тек сөйлеу'], { topicId, rule: 'Ресми іс қағаздары.' }));
  }
  return out.slice(0, n);
}

function genForTopic(topic) {
  const id = topic.id;
  const sec = topic.section;
  let bank = [];
  if (sec === 'phonetics') bank = genPhonetics(id, 22);
  else if (sec === 'lexicon') bank = genLexicon(id, 22);
  else if (sec === 'morphology' || sec === 'words') bank = genMorphology(id, 22);
  else if (sec === 'syntax') bank = genSyntax(id, 22);
  else if (sec === 'punctuation') bank = genPunctuation(id, 20);
  else if (sec === 'text') bank = genText(id, 18);
  else bank = genLexicon(id, 20);

  // ensure unique ids
  bank = bank.map((q, i) => ({ ...q, id: `${id}-p${i}`, topicId: id, category: 'practice' }));

  const quiz = shuffle(bank).slice(0, 10).map((q, i) => ({ ...q, id: `${id}-z${i}`, category: 'quiz' }));
  const hard = shuffle(bank).slice(0, 5).map((q, i) => ({ ...q, id: `${id}-h${i}`, category: 'hard', difficulty: 'hard' }));

  // text tasks
  const t = pick(TEXTS_SHORT);
  const textTasks = [
    { id: `${id}-t0`, type: 'mcq', question: `Мәтінді оқып, тақырыпты тап:\n${t.text}`, options: shuffle([t.topic, ...t.wrongTopics]), correct: t.topic, rule: 'Мәтін тақырыбы.', topicId: id, category: 'text', difficulty: 'medium' },
    { id: `${id}-t1`, type: 'mcq', question: `Негізгі ой:\n${t.text}`, options: shuffle([t.idea, ...t.wrongIdeas]), correct: t.idea, rule: 'Негізгі ой.', topicId: id, category: 'text', difficulty: 'medium' }
  ];

  return { practice: bank, quiz, hard, textTasks };
}

/* Cache */
const _cache = {};

export function getTopicQuestions(topicId) {
  if (_cache[topicId]) return _cache[topicId];
  const topic = getTopicById(topicId);
  if (!topic) return { practice: [], quiz: [], hard: [], textTasks: [] };
  _cache[topicId] = genForTopic(topic);
  return _cache[topicId];
}

export function getShuffledPractice(topicId, count = 15, difficulty = null) {
  const { practice, hard } = getTopicQuestions(topicId);
  let pool = [...practice];
  if (difficulty === 'hard') pool = [...hard, ...practice];
  if (difficulty === 'easy') pool = practice.filter(q => q.difficulty === 'easy' || !q.difficulty).concat(practice);
  return shuffle(pool).slice(0, count).map(q => ({ ...q, options: shuffle(q.options) }));
}

export function getQuiz(topicId, count = 10) {
  const { quiz, practice } = getTopicQuestions(topicId);
  const pool = quiz.length >= count ? quiz : shuffle(practice).slice(0, count);
  return shuffle(pool).slice(0, count).map(q => ({ ...q, options: shuffle([...q.options]) }));
}

export function getSimilarQuestion(topicId, excludeId) {
  const list = getShuffledPractice(topicId, 20);
  return list.find(q => q.id !== excludeId) || list[0];
}

export function getDiagnosticQuestions(grade) {
  const topics = TOPICS[grade] || TOPICS[5];
  const selected = shuffle(topics).slice(0, 8);
  const qs = [];
  for (const t of selected) {
    const batch = getShuffledPractice(t.id, 2);
    qs.push(...batch.map(q => ({ ...q, diagSection: t.section, topicTitle: t.title })));
  }
  return shuffle(qs).slice(0, 12);
}

export function getTestByType(grade, type, topicId = null) {
  const topics = TOPICS[grade] || [];
  let pool = [];
  if (type === 'тақырыптық' && topicId) {
    pool = getQuiz(topicId, 10);
  } else if (type === 'аралық') {
    const mid = topics.slice(0, Math.ceil(topics.length / 2));
    for (const t of shuffle(mid).slice(0, 5)) pool.push(...getShuffledPractice(t.id, 3));
    pool = shuffle(pool).slice(0, 15);
  } else if (type === 'тоқсандық') {
    for (const t of shuffle(topics).slice(0, 8)) pool.push(...getShuffledPractice(t.id, 2));
    pool = shuffle(pool).slice(0, 20);
  } else if (type === 'қорытынды') {
    for (const t of shuffle(topics).slice(0, 10)) pool.push(...getShuffledPractice(t.id, 2));
    pool = shuffle(pool).slice(0, 25);
  } else {
    for (const t of shuffle(topics).slice(0, 6)) pool.push(...getShuffledPractice(t.id, 2));
    pool = shuffle(pool).slice(0, 12);
  }
  return pool.map(q => ({ ...q, options: shuffle([...q.options]) }));
}

export function getReadingLiteracy(grade) {
  const items = [];
  for (const p of READING_PASSAGES) {
    for (const qq of p.questions) {
      items.push(mcq(`[${p.type}] ${p.title}\n\n${p.text}\n\n${qq.q}`, qq.a, qq.w, {
        rule: qq.rule, category: 'reading', difficulty: 'medium',
        topicId: `reading-${grade}`
      }));
    }
  }
  return shuffle(items).map(q => ({ ...q, options: shuffle([...q.options]) }));
}

export function getPISAItems() {
  const items = [];
  for (const block of PISA_ITEMS) {
    for (const qq of block.questions) {
      items.push({
        ...mcq(`[PISA] ${block.title}\n\n${block.passage}\n\n${qq.q}`, qq.a, qq.w, {
          rule: qq.rule, category: 'pisa', difficulty: 'medium', topicId: 'pisa'
        }),
        passageTitle: block.title
      });
    }
  }
  return shuffle(items).map(q => ({ ...q, options: shuffle([...q.options]) }));
}

export function getOlympiad(level) {
  const map = {
    'Жеңіл': OLYMP_EASY,
    'Орташа': OLYMP_MED,
    'Күрделі': OLYMP_HARD,
    'Олимпиадалық': OLYMP_ELITE
  };
  const base = map[level] || OLYMP_MED;
  // expand with generated
  const extra = [];
  const g = pick(GRADES);
  const topics = shuffle(TOPICS[g]).slice(0, 5);
  for (const t of topics) {
    extra.push(...getShuffledPractice(t.id, 2, level === 'Күрделі' || level === 'Олимпиадалық' ? 'hard' : null));
  }
  return shuffle([...base, ...extra]).slice(0, level === 'Олимпиадалық' ? 15 : 10)
    .map(q => ({ ...q, options: shuffle([...q.options]), category: 'olympiad' }));
}

export function countAllQuestions() {
  let n = 0;
  for (const g of GRADES) {
    for (const t of TOPICS[g]) {
      const q = getTopicQuestions(t.id);
      n += q.practice.length + q.quiz.length + q.hard.length + q.textTasks.length;
    }
  }
  n += getReadingLiteracy(5).length + getPISAItems().length;
  return n;
}
