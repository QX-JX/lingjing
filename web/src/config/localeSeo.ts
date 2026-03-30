/** 基础 SEO（title / description / keywords）+ canonical；文案与鲲写 AI 工具箱线上一致 */
export interface LocaleSeoConfig {
  lang: string;
  hreflang: string;
  filename: string;
  title: string;
  description: string;
  keywords: string;
  /** 预留：品牌/站点简称 */
  siteName?: string;
  /** 预留：分享图 */
  ogImage?: string;
}

export const localeSeoConfigs: LocaleSeoConfig[] = [
  {
    lang: 'zh_CN',
    hreflang: 'zh-CN',
    filename: 'index.html',
    siteName: '鲲穹AI工具箱',
    title: '灵境配音-在线配音工具',
    description:
      '灵境配音是鲲穹AI旗下一款操作简单、功能丰富的在线配音工具，支持输入文本一键生成自然流畅的语音内容，提供多音色选择，可自由调节语速、音量与音调，还具备插入停顿、变速、数字读法、多音字校准、特效音添加等专业功能，支持搭配背景音乐，能满足短视频旁白、有声书制作、课件配音等多种场景需求，轻松打造高质量的音频内容，无需专业设备与配音经验即可快速上手。',
    keywords: '灵境配音,软件详情,免费下载,鲲穹AI工具箱'
  },
  {
    lang: 'zh_TW',
    hreflang: 'zh-TW',
    filename: 'zh_TW.html',
    siteName: '鯤穹AI工具箱',
    title: '靈境配音-線上配音工具',
    description:
      '靈境配音是鯤穹AI旗下操作簡單、功能豐富的線上配音工具，支援輸入文字一鍵生成自然流暢的語音內容，提供多音色選擇，可自由調節語速、音量與音調，並具插入停頓、變速、數字讀法、多音字校準、特效音新增等專業功能，支援搭配背景音樂，滿足短影片旁白、有聲書製作、課件配音等多種場景需求，輕鬆打造高品質音訊內容，無需專業設備與配音經驗即可快速上手。',
    keywords: '靈境配音,軟體詳情,免費下載,鯤穹AI工具箱'
  },
  {
    lang: 'en',
    hreflang: 'en',
    filename: 'en.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Online Dubbing Tool',
    description:
      'Lingjing Dubbing is an easy-to-use, feature-rich online dubbing tool from Kunqiong AI. Turn text into natural speech in one click, with multiple voices and full control over speed, volume, and pitch. Includes pauses, speed changes, number reading, polyphone correction, sound effects, optional background music, and more—ideal for short-video narration, audiobooks, and courseware. Create high-quality audio without professional gear or voice-over experience.',
    keywords: 'Lingjing Dubbing,software details,free download,Kunqiong AI Toolbox'
  },
  {
    lang: 'ja',
    hreflang: 'ja',
    filename: 'ja.html',
    siteName: 'Kunqiong AIツールボックス',
    title: '靈境配音 - オンライン配音ツール',
    description:
      '靈境配音はKunqiong AI（鲲穹AI）の、操作が簡単で機能が豊富なオンライン配音ツールです。テキストを入力するだけで自然な音声を一括生成。複数の声色に対応し、話速・音量・音高を自由に調整できます。ポーズ挿入、スピード変更、数字の読み方、多音字の補正、効果音の追加などの専門機能に加え、BGMとの組み合わせにも対応。ショート動画のナレーション、オーディオブック、教材向け音声など幅広いシーンに。高品質の音声コンテンツを、専門機器や声優経験なしで作成できます。',
    keywords: '靈境配音,ソフト詳細,無料ダウンロード,Kunqiong AIツールボックス'
  },
  {
    lang: 'ko',
    hreflang: 'ko',
    filename: 'ko.html',
    siteName: 'Kunqiong AI Toolbox',
    title: '링징 더빙 - 온라인 더빙 도구',
    description:
      '링징 더빙은 Kunqiong AI(鲲穹AI)의 사용이 쉽고 기능이 풍부한 온라인 더빙 도구입니다. 텍스트만 입력하면 자연스러운 음성을 한 번에 생성하고, 여러 음색을 지원하며 속도·볼륨·음높이를 자유롭게 조절할 수 있습니다. 쉼 삽입, 속도 변경, 숫자 읽기, 다음자 보정, 효과음 추가 등 전문 기능과 배경음악 연동을 지원하여 숏폼 나레이션, 오디오북, 강의 음성 등 다양한 용도에 맞습니다. 전문 장비나 성우 경험 없이 고품질 오디오를 제작할 수 있습니다.',
    keywords: '링징 더빙,소프트웨어 정보,무료 다운로드,Kunqiong AI Toolbox'
  },
  {
    lang: 'es',
    hreflang: 'es',
    filename: 'es.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Herramienta de doblaje online',
    description:
      'Lingjing Dubbing es una herramienta de doblaje en línea sencilla y completa de Kunqiong AI: texto a voz natural en un clic, múltiples voces, control de velocidad, volumen y tono; pausas, lectura de números, corrección de politonos, efectos y música de fondo. Ideal para vídeos cortos, audiolibros y material educativo.',
    keywords: 'Lingjing Dubbing,detalles del software,descarga gratuita,Kunqiong AI Toolbox'
  },
  {
    lang: 'fr',
    hreflang: 'fr',
    filename: 'fr.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Outil de doublage en ligne',
    description:
      "Lingjing Dubbing est un outil de doublage en ligne simple et riche en fonctionnalités chez Kunqiong AI : synthèse vocale naturelle en un clic, plusieurs voix, réglage vitesse/volume/hauteur, pauses, lecture des nombres, correction des polyphones, effets sonores et fond musical. Idéal pour courtes vidéos, livres audio et cours.",
    keywords: 'Lingjing Dubbing,détails du logiciel,téléchargement gratuit,Kunqiong AI Toolbox'
  },
  {
    lang: 'de',
    hreflang: 'de',
    filename: 'de.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Online-Synchronisationstool',
    description:
      'Lingjing Dubbing ist ein einfaches, funktionsreiches Online-Synchronisationstool von Kunqiong AI: Text mit einem Klick in natürliche Sprache umwandeln, mehrere Stimmen, Tempo, Lautstärke und Tonhöhe; Pausen, Zahlenlesen, Polyphone, Effekte und Hintergrundmusik. Für Kurzvideos, Hörbücher und Lernmaterial.',
    keywords: 'Lingjing Dubbing,Software-Infos,kostenloser Download,Kunqiong AI Toolbox'
  },
  {
    lang: 'it',
    hreflang: 'it',
    filename: 'it.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Strumento di doppiaggio online',
    description:
      'Lingjing Dubbing è uno strumento di doppiaggio online semplice e ricco di funzioni di Kunqiong AI: testo in voce naturale con un clic, più voci, controllo di velocità, volume e tono; pause, lettura numeri, correzione polifoni, effetti e musica di sottofondo. Ideale per video brevi, audiolibri e didattica.',
    keywords: 'Lingjing Dubbing,dettagli software,download gratuito,Kunqiong AI Toolbox'
  },
  {
    lang: 'pt',
    hreflang: 'pt',
    filename: 'pt.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Ferramenta de dobragem online',
    description:
      'Lingjing Dubbing é uma ferramenta de dobragem online simples e completa da Kunqiong AI: texto em voz natural num clique, várias vozes, controlo de velocidade, volume e tom; pausas, leitura de números, polifonias, efeitos e música de fundo. Ideal para vídeos curtos, audiolivros e explicações.',
    keywords: 'Lingjing Dubbing,detalhes do software,download gratuito,Kunqiong AI Toolbox'
  },
  {
    lang: 'pt_BR',
    hreflang: 'pt-BR',
    filename: 'pt_BR.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Ferramenta de dublagem online',
    description:
      'Lingjing Dubbing é uma ferramenta de dublagem online simples e completa da Kunqiong AI: texto em voz natural em um clique, várias vozes, controle de velocidade, volume e tom; pausas, leitura de números, polifonias, efeitos e música de fundo. Ideal para vídeos curtos, audiolivros e aulas.',
    keywords: 'Lingjing Dubbing,detalhes do software,download grátis,Kunqiong AI Toolbox'
  },
  {
    lang: 'ru',
    hreflang: 'ru',
    filename: 'ru.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing — онлайн-инструмент озвучки',
    description:
      'Lingjing Dubbing — простой и функциональный онлайн-инструмент озвучки от Kunqiong AI: текст в естественную речь в один клик, несколько голосов, скорость, громкость и тон; паузы, чтение чисел, омографы, эффекты и фоновая музыка. Для коротких видео, аудиокниг и учебных материалов.',
    keywords: 'Lingjing Dubbing,описание ПО,бесплатная загрузка,Kunqiong AI Toolbox'
  },
  {
    lang: 'ar',
    hreflang: 'ar',
    filename: 'ar.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - أداة دوبلة على الإنترنت',
    description:
      'Lingjing Dubbing أداة دبلجة عبر الإنترنت سهلة وغنية بالميزات من Kunqiong AI: تحويل النص إلى كلام طبيعي بنقرة، أصوات متعددة، سرعة وصوت ونبرة؛ فواصل، قراءة أرقام، تصحيح متعدد النطق، مؤثرات وموسيقى خلفية. مثالية للفيديو القصير والكتب الصوتية والدروس.',
    keywords: 'Lingjing Dubbing,تفاصيل البرنامج,تنزيل مجاني,Kunqiong AI Toolbox'
  },
  {
    lang: 'hi',
    hreflang: 'hi',
    filename: 'hi.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - ऑनलाइन डबिंग टूल',
    description:
      'Lingjing Dubbing Kunqiong AI का सरल व फीचर से भरपूर ऑनलाइन डबिंग टूल है: एक क्लिक में प्राकृतिक आवाज़, कई वॉइस, गति/आवाज़/सुर; विराम, संख्या पढ़ना, बहुस्वर सुधार, इफ़ेक्ट व बैकग्राउंड म्यूज़िक। शॉर्ट वीडियो, ऑडियोबुक व पाठ्य सामग्री के लिए उपयुक्त।',
    keywords: 'Lingjing Dubbing,सॉफ़्टवेयर विवरण,मुफ्त डाउनलोड,Kunqiong AI Toolbox'
  },
  {
    lang: 'bn',
    hreflang: 'bn',
    filename: 'bn.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - অনলাইন ডাবিং টুল',
    description:
      'Lingjing Dubbing হল Kunqiong AI-এর সহজ ও ফিচারসমৃদ্ধ অনলাইন ডাবিং টুল: এক ক্লিকে প্রাকৃতিক কণ্ঠ, একাধিক ভয়েস, গতি/ভলিউম/সুর; বিরতি, সংখ্যা পাঠ, বহুস্বর সংশোধন, ইফেক্ট ও ব্যাকগ্রাউন্ড মিউজিক। শর্ট ভিডিও, অডিওবুক ও পাঠের জন্য উপযুক্ত।',
    keywords: 'Lingjing Dubbing,সফটওয়্যার বিবরণ,বিনামূল্যে ডাউনলোড,Kunqiong AI Toolbox'
  },
  {
    lang: 'nl',
    hreflang: 'nl',
    filename: 'nl.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Online nasynchronisatietool',
    description:
      'Lingjing Dubbing is een eenvoudige, rijke online nasynchronisatietool van Kunqiong AI: tekst naar natuurlijke spraak in één klik, meerdere stemmen, tempo, volume en toonhoogte; pauzes, getallen lezen, polyfonie, effecten en achtergrondmuziek. Ideaal voor korte video’s, luisterboeken en lesmateriaal.',
    keywords: 'Lingjing Dubbing,software-details,gratis download,Kunqiong AI Toolbox'
  },
  {
    lang: 'pl',
    hreflang: 'pl',
    filename: 'pl.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Narzędzie do lektora online',
    description:
      'Lingjing Dubbing to proste i bogate w funkcje narzędzie lektorskie online Kunqiong AI: tekst na naturalną mowę jednym kliknięciem, wiele głosów, tempo, głośność i ton; pauzy, odczyt liczb, polifony, efekty i podkład muzyczny. Dla krótkich filmów, audiobooków i kursów.',
    keywords: 'Lingjing Dubbing,opis oprogramowania,darmowe pobranie,Kunqiong AI Toolbox'
  },
  {
    lang: 'tr',
    hreflang: 'tr',
    filename: 'tr.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Çevrimiçi dublaj aracı',
    description:
      'Lingjing Dubbing, Kunqiong AI’nin basit ve özellik dolu çevrimiçi dublaj aracıdır: tek tıkla doğal konuşma, çoklu ses, hız/ses/perde; duraklama, sayı okuma, çok sesli düzeltme, efekt ve fon müziği. Kısa video, sesli kitap ve ders içerikleri için uygundur.',
    keywords: 'Lingjing Dubbing,yazılım detayları,ücretsiz indirme,Kunqiong AI Toolbox'
  },
  {
    lang: 'vi',
    hreflang: 'vi',
    filename: 'vi.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Công cụ thuyết minh trực tuyến',
    description:
      'Lingjing Dubbing là công cụ thuyết minh trực tuyến đơn giản, đầy đủ tính năng của Kunqiong AI: chuyển văn bản thành giọng nói tự nhiên một chạm, nhiều giọng, điều chỉnh tốc độ/âm lượng/cao độ; ngắt nghỉ, đọc số, đa âm, hiệu ứng và nhạc nền. Phù hợp video ngắn, sách nói và bài giảng.',
    keywords: 'Lingjing Dubbing,chi tiết phần mềm,tải miễn phí,Kunqiong AI Toolbox'
  },
  {
    lang: 'th',
    hreflang: 'th',
    filename: 'th.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - เครื่องมือพากย์เสียงออนไลน์',
    description:
      'Lingjing Dubbing เป็นเครื่องมือพากย์เสียงออนไลน์ที่ใช้งานง่ายและครบฟีเจอร์จาก Kunqiong AI: แปลงข้อความเป็นเสียงธรรมชาติคลิกเดียว หลายเสียง ปรับความเร็ว/ระดับเสียง/โทน มีจังหวะพัก อ่านตัวเลข แก้คำอ่านหลายแบบ เอฟเฟกต์และดนตรีประกอบ เหมาะกับวิดีโอสั้น หนังสือเสียง และสื่อการสอน',
    keywords: 'Lingjing Dubbing,รายละเอียดซอฟต์แวร์,ดาวน์โหลดฟรี,Kunqiong AI Toolbox'
  },
  {
    lang: 'he',
    hreflang: 'he',
    filename: 'he.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - כלי דיבוב מקוון',
    description:
      'Lingjing Dubbing הוא כלי דיבוב מקוון פשוט ועשיר בתכונות מבית Kunqiong AI: טקסט לדיבור טבעי בלחיצה, מספר קולות, שליטה במהירות/עוצמה/גובה צליל; הפסקות, קריאת מספרים, תיקון הטיות, אפקטים ומוזיקת רקע. לסרטונים קצרים, ספרי שמע ולימוד.',
    keywords: 'Lingjing Dubbing,פרטי התוכנה,הורדה חינם,Kunqiong AI Toolbox'
  },
  {
    lang: 'id',
    hreflang: 'id',
    filename: 'id.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Alat sulih suara online',
    description:
      'Lingjing Dubbing adalah alat sulih suara daring yang mudah dan kaya fitur dari Kunqiong AI: teks ke suara alami sekali klik, banyak suara, kontrol kecepatan/volume/nada; jeda, baca angka, polifon, efek, dan musik latar. Cocok untuk video pendek, buku audio, dan materi ajar.',
    keywords: 'Lingjing Dubbing,detail perangkat lunak,unduh gratis,Kunqiong AI Toolbox'
  },
  {
    lang: 'ms',
    hreflang: 'ms',
    filename: 'ms.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Alat alih suara dalam talian',
    description:
      'Lingjing Dubbing ialah alat alih suara dalam talian yang mudah dan berfungsi lengkap daripada Kunqiong AI: teks kepada suara semula jadi satu klik, pelbagai suara, kawalan kelajuan/kelantangan/nada; jeda, bacaan nombor, polifon, kesan dan muzik latar. Sesuai untuk video pendek, buku audio dan bahan pengajaran.',
    keywords: 'Lingjing Dubbing,butiran perisian,muat turun percuma,Kunqiong AI Toolbox'
  },
  {
    lang: 'uk',
    hreflang: 'uk',
    filename: 'uk.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing — онлайн-інструмент озвучення',
    description:
      'Lingjing Dubbing — простий і функціональний онлайн-інструмент озвучення від Kunqiong AI: текст у природне мовлення одним кліком, кілька голосів, швидкість, гучність і тон; паузи, читання чисел, поліфонія, ефекти та фонова музика. Для коротких відео, аудіокниг і навчальних матеріалів.',
    keywords: 'Lingjing Dubbing,опис ПЗ,безкоштовне завантаження,Kunqiong AI Toolbox'
  },
  {
    lang: 'ur',
    hreflang: 'ur',
    filename: 'ur.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - آن لائن ڈبنگ ٹول',
    description:
      'Lingjing Dubbing Kunqiong AI کا آسان اور فیچر سے بھرپور آن لائن ڈبنگ ٹول ہے: ایک کلک میں فطری آواز، متعدد آوازیں، رفتار/آواز/سر؛ وقفے، نمبر پڑھنا، کثیراللفظ درستگی، اثرات اور پس منظر موسیقی۔ شارٹ ویڈیو، آڈیو بکس اور سبق کے لیے موزوں۔',
    keywords: 'Lingjing Dubbing,سافٹ ویئر تفصیلات,مفت ڈاؤن لوڈ,Kunqiong AI Toolbox'
  },
  {
    lang: 'fa',
    hreflang: 'fa',
    filename: 'fa.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - ابزار دوبلهٔ آنلاین',
    description:
      'Lingjing Dubbing ابزار دوبلهٔ آنلاین ساده و پرامکان از Kunqiong AI است: متن به گفتار طبیعی با یک کلیک، چند صدا، کنترل سرعت/بلندی/زیروبمی؛ مکث، خواندن اعداد، چندآوا، جلوه‌ها و موسیقی پس‌زمینه. برای ویدیوی کوتاه، کتاب صوتی و آموزش مناسب است.',
    keywords: 'Lingjing Dubbing,جزئیات نرم‌افزار,دانلود رایگان,Kunqiong AI Toolbox'
  },
  {
    lang: 'sw',
    hreflang: 'sw',
    filename: 'sw.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Zana ya ubadilishaji sauti mtandaoni',
    description:
      'Lingjing Dubbing ni zana ya mtandaoni rahisi yenye vipengele vingi kutoka Kunqiong AI: maandishi kuwa sauti asili kwa mbofyo mmoja, sauti nyingi, kasi/sauti/toni; mapumziko, kusoma nambari, polifoni, athari na muziki wa usuli. Inafaa kwa video fupi, vitabu vya sauti na mafunzo.',
    keywords: 'Lingjing Dubbing,maelezo ya programu,pakua bure,Kunqiong AI Toolbox'
  },
  {
    lang: 'ta',
    hreflang: 'ta',
    filename: 'ta.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - ஆன்லைன் டப்பிங் கருவி',
    description:
      'Lingjing Dubbing என்பது Kunqiong AI இன் எளிய, அம்சம் நிறைந்த ஆன்லைன் டப்பிங் கருவி: ஒரே கிளிக்கில் இயல்பான பேச்சு, பல குரல்கள், வேகம்/ஒலி/சுரம்; இடைவெளி, எண் வாசிப்பு, பல்லொலி சரி, விளைவுகள் மற்றும் பின்னணி இசை. குறு வீடியோ, ஆடியோ புத்தகம், பாடங்களுக்கு ஏற்றது.',
    keywords: 'Lingjing Dubbing,மென்பொருள் விவரங்கள்,இலவச பதிவிறக்கம்,Kunqiong AI Toolbox'
  },
  {
    lang: 'tl',
    hreflang: 'tl',
    filename: 'tl.html',
    siteName: 'Kunqiong AI Toolbox',
    title: 'Lingjing Dubbing - Online na tool sa dubbing',
    description:
      'Ang Lingjing Dubbing ay simpleng, maraming feature na online na dubbing tool mula sa Kunqiong AI: text-to-speech na natural sa isang click, maraming boses, kontrol sa bilis/lakas/tono; pause, pagbasa ng numero, polyphone, effects, at background music. Para sa maikling video, audiobook, at aralin.',
    keywords: 'Lingjing Dubbing,detalye ng software,libreng download,Kunqiong AI Toolbox'
  }
];

const localeSeoOverrideMap: Record<string, Pick<LocaleSeoConfig, 'title' | 'keywords'>> = {
  zh_CN: {
    title: '灵境配音-在线配音工具',
    keywords: '灵境配音,在线配音工具,文本转语音,AI配音'
  },
  zh_TW: {
    title: '靈境配音-線上配音工具',
    keywords: '靈境配音,線上配音工具,文字轉語音,AI配音'
  },
  en: {
    title: 'Lingjing Dubbing-Online Dubbing Tool',
    keywords: 'Lingjing Dubbing,online dubbing tool,text to speech,AI dubbing'
  },
  ja: {
    title: '靈境配音-オンライン配音ツール',
    keywords: '靈境配音,オンライン配音ツール,テキスト読み上げ,AI配音'
  },
  ko: {
    title: '링징 더빙-온라인 더빙 도구',
    keywords: '링징 더빙,온라인 더빙 도구,텍스트 음성 변환,AI 더빙'
  },
  es: {
    title: 'Lingjing Dubbing-Herramienta de doblaje online',
    keywords: 'Lingjing Dubbing,herramienta de doblaje online,texto a voz,doblaje con IA'
  },
  fr: {
    title: 'Lingjing Dubbing-Outil de doublage en ligne',
    keywords: 'Lingjing Dubbing,outil de doublage en ligne,texte en parole,doublage IA'
  },
  de: {
    title: 'Lingjing Dubbing-Online-Synchronisationstool',
    keywords: 'Lingjing Dubbing,Online-Synchronisationstool,Text-zu-Sprache,KI-Synchronisation'
  },
  it: {
    title: 'Lingjing Dubbing-Strumento di doppiaggio online',
    keywords: 'Lingjing Dubbing,strumento di doppiaggio online,testo in voce,doppiaggio AI'
  },
  pt: {
    title: 'Lingjing Dubbing-Ferramenta de dobragem online',
    keywords: 'Lingjing Dubbing,ferramenta de dobragem online,texto para fala,dobragem com IA'
  },
  pt_BR: {
    title: 'Lingjing Dubbing-Ferramenta de dublagem online',
    keywords: 'Lingjing Dubbing,ferramenta de dublagem online,texto para voz,dublagem com IA'
  },
  ru: {
    title: 'Lingjing Dubbing-онлайн-инструмент озвучки',
    keywords: 'Lingjing Dubbing,онлайн-инструмент озвучки,текст в речь,озвучка с ИИ'
  },
  ar: {
    title: 'Lingjing Dubbing-أداة دوبلة على الإنترنت',
    keywords: 'Lingjing Dubbing,أداة دوبلة عبر الإنترنت,تحويل النص إلى كلام,دبلجة بالذكاء الاصطناعي'
  },
  hi: {
    title: 'Lingjing Dubbing-ऑनलाइन डबिंग टूल',
    keywords: 'Lingjing Dubbing,ऑनलाइन डबिंग टूल,टेक्स्ट टू स्पीच,AI डबिंग'
  },
  bn: {
    title: 'Lingjing Dubbing-অনলাইন ডাবিং টুল',
    keywords: 'Lingjing Dubbing,অনলাইন ডাবিং টুল,টেক্সট টু স্পিচ,AI ডাবিং'
  },
  nl: {
    title: 'Lingjing Dubbing-Online nasynchronisatietool',
    keywords: 'Lingjing Dubbing,online nasynchronisatietool,tekst naar spraak,AI-dubbing'
  },
  pl: {
    title: 'Lingjing Dubbing-Narzędzie do lektora online',
    keywords: 'Lingjing Dubbing,narzędzie lektora online,tekst na mowę,AI dubbing'
  },
  tr: {
    title: 'Lingjing Dubbing-Çevrimiçi dublaj aracı',
    keywords: 'Lingjing Dubbing,çevrimiçi dublaj aracı,yazıdan konuşmaya,AI dublaj'
  },
  vi: {
    title: 'Lingjing Dubbing-Công cụ thuyết minh trực tuyến',
    keywords: 'Lingjing Dubbing,công cụ thuyết minh trực tuyến,văn bản thành giọng nói,lồng tiếng AI'
  },
  th: {
    title: 'Lingjing Dubbing-เครื่องมือพากย์เสียงออนไลน์',
    keywords: 'Lingjing Dubbing,เครื่องมือพากย์เสียงออนไลน์,แปลงข้อความเป็นเสียง,พากย์เสียงด้วย AI'
  },
  he: {
    title: 'Lingjing Dubbing-כלי דיבוב מקוון',
    keywords: 'Lingjing Dubbing,כלי דיבוב מקוון,טקסט לדיבור,דיבוב ב-AI'
  },
  id: {
    title: 'Lingjing Dubbing-Alat sulih suara online',
    keywords: 'Lingjing Dubbing,alat sulih suara online,teks ke suara,sulih suara AI'
  },
  ms: {
    title: 'Lingjing Dubbing-Alat alih suara dalam talian',
    keywords: 'Lingjing Dubbing,alat alih suara dalam talian,teks kepada suara,alih suara AI'
  },
  uk: {
    title: 'Lingjing Dubbing-онлайн-інструмент озвучення',
    keywords: 'Lingjing Dubbing,онлайн-інструмент озвучення,текст у мовлення,озвучення з ШІ'
  },
  ur: {
    title: 'Lingjing Dubbing-آن لائن ڈبنگ ٹول',
    keywords: 'Lingjing Dubbing,آن لائن ڈبنگ ٹول,ٹیکسٹ ٹو اسپیچ,AI ڈبنگ'
  },
  fa: {
    title: 'Lingjing Dubbing-ابزار دوبلهٔ آنلاین',
    keywords: 'Lingjing Dubbing,ابزار دوبله آنلاین,تبدیل متن به گفتار,دوبله هوش مصنوعی'
  },
  sw: {
    title: 'Lingjing Dubbing-Zana ya ubadilishaji sauti mtandaoni',
    keywords: 'Lingjing Dubbing,zana ya ubadilishaji sauti mtandaoni,maandishi hadi sauti,udubishaji wa AI'
  },
  ta: {
    title: 'Lingjing Dubbing-ஆன்லைன் டப்பிங் கருவி',
    keywords: 'Lingjing Dubbing,ஆன்லைன் டப்பிங் கருவி,உரையை ஒலியாக்கு,AI டப்பிங்'
  },
  tl: {
    title: 'Lingjing Dubbing-Online na tool sa dubbing',
    keywords: 'Lingjing Dubbing,online na tool sa dubbing,text to speech,AI dubbing'
  }
};

function applySeoOverride(config: LocaleSeoConfig): LocaleSeoConfig {
  const override = localeSeoOverrideMap[config.lang];
  if (!override) return config;
  return {
    ...config,
    ...override
  };
}

export function getHreflangLinks(_currentLang?: string): string {
  const links = localeSeoConfigs.map(config => {
    return `<link rel="alternate" hreflang="${config.hreflang}" href="${config.filename}">`;
  });
  links.push('<link rel="alternate" hreflang="x-default" href="index.html">');
  return links.join('\n  ');
}

export function getCurrentLocale(): string {
  if (typeof window !== 'undefined' && (window as any).PAGE_LOCALE) {
    return (window as any).PAGE_LOCALE;
  }
  return 'zh_CN';
}

export function switchLocale(locale: string) {
  const config = localeSeoConfigs.find(c => c.lang === locale);
  if (config && config.filename) {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';

    if (currentFile !== config.filename) {
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      const sep = basePath + config.filename;
      window.location.href = `${sep}?lang=${encodeURIComponent(locale)}`;
    }
  }
}

export function getLangCode(locale: string): string {
  const config = localeSeoConfigs.find(c => c.lang === locale);
  return config?.hreflang || 'zh-CN';
}

export function getSeoConfig(locale: string): LocaleSeoConfig | undefined {
  const config = localeSeoConfigs.find((c) => c.lang === locale);
  if (!config) return undefined;
  return applySeoOverride(config);
}

/** 与参考站 html 根节点一致：阿语/希伯来语/波斯语/乌尔都语等为 rtl */
export function htmlDirForLocale(lang: string): 'ltr' | 'rtl' {
  const rtl = new Set(['ar', 'he', 'fa', 'ur']);
  return rtl.has(lang) ? 'rtl' : 'ltr';
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '');
}

/** 构建 canonical / og:url（支持子路径部署 BASE_URL） */
export function getPageAbsoluteUrl(config: LocaleSeoConfig): string {
  if (typeof window === 'undefined') {
    return config.filename;
  }
  const envOrigin = import.meta.env.VITE_SITE_ORIGIN?.trim();
  const origin = envOrigin ? normalizeOrigin(envOrigin) : window.location.origin;
  const base = import.meta.env.BASE_URL || '/';
  const basePath = base === '/' ? '' : base.replace(/\/$/, '');
  const path = `${basePath}/${config.filename}`.replace(/\/+/g, '/');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function ensureMetaName(name: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureCanonical(href: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** 去掉旧版 head 里残留的 og/twitter/json-ld/robots 等，避免热更新后仍堆在页面上 */
function stripLegacySeoMeta() {
  if (typeof document === 'undefined') return;
  document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="robots"]').forEach((n) => n.remove());
  document.getElementById('app-seo-jsonld')?.remove();
}

/**
 * 随界面语言切换更新 title、description、keywords、canonical、html[lang]、PAGE_LOCALE。
 */
export function applyDomSeo(locale: string) {
  const config = getSeoConfig(locale);
  if (!config || typeof document === 'undefined') return;

  stripLegacySeoMeta();

  const pageUrl = getPageAbsoluteUrl(config);

  const root = document.documentElement;
  root.setAttribute('lang', config.hreflang);
  root.setAttribute('id', 'htmlRoot');
  root.setAttribute('dir', htmlDirForLocale(locale));
  document.title = config.title;

  ensureMetaName('description', config.description);
  ensureMetaName('keywords', config.keywords);

  ensureCanonical(pageUrl);

  try {
    (window as Window & { PAGE_LOCALE?: string }).PAGE_LOCALE = locale;
  } catch {
    /* ignore */
  }
}

/** 与参考站点 ?lang=zh_CN 一致，便于分享链接携带语言 */
export function syncUrlLangParam(locale: string) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* ignore */
  }
}

export interface RenderHtmlOptions {
  /** 若设置，canonical / alternate 使用绝对 URL（生产环境域名） */
  siteOrigin?: string;
}

function hrefForAlternate(filename: string, siteOrigin?: string): string {
  if (!siteOrigin?.trim()) return filename;
  const o = normalizeOrigin(siteOrigin.trim());
  return `${o}/${filename.replace(/^\//, '')}`;
}

/**
 * 生成入口 HTML，结构与参考站一致（charset → viewport → 基础 SEO → canonical → PAGE_LOCALE → hreflang 交替链接）。
 * @see https://www.kunqiongai.com/?lang=zh_CN
 */
export function renderLocaleHtmlDocument(config: LocaleSeoConfig, options: RenderHtmlOptions = {}): string {
  const effectiveConfig = applySeoOverride(config);
  const { siteOrigin } = options;
  const canonical = hrefForAlternate(effectiveConfig.filename, siteOrigin);
  const dir = htmlDirForLocale(effectiveConfig.lang);

  const alternates = localeSeoConfigs
    .map(
      (c) =>
        `    <link rel="alternate" hreflang="${c.hreflang}" href="${hrefForAlternate(c.filename, siteOrigin)}">`
    )
    .join('\n');
  const xDefault = `    <link rel="alternate" hreflang="x-default" href="${hrefForAlternate('index.html', siteOrigin)}">`;

  return `<!DOCTYPE html>
<html lang="${effectiveConfig.hreflang}" id="htmlRoot" dir="${dir}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="/favicon.png">
    <title>${escapeHtml(effectiveConfig.title)}</title>
    <meta name="description" content="${escapeHtml(effectiveConfig.description)}">
    <meta name="keywords" content="${escapeHtml(effectiveConfig.keywords)}">
    <link rel="canonical" href="${escapeAttr(canonical)}">
    <script>window.PAGE_LOCALE=${JSON.stringify(effectiveConfig.lang)};</script>
${alternates}
${xDefault}
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

