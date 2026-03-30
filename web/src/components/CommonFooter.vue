<template>
  <footer class="site-footer">
    <div class="footer-container">
      <div class="footer-grid">
        <section class="brand-column">
          <a :href="homeUrl" target="_blank" rel="noopener noreferrer" class="footer-brand">
            <img :src="footerLogoUrl" :alt="footerLogoAlt" class="footer-logo-image" />
          </a>

          <p class="brand-copy">
            <template v-for="(line, index) in brandCopyLines" :key="`${line}-${index}`">
              <span class="brand-copy-line">{{ line }}</span>
            </template>
          </p>

          <div class="social-list">
            <a
              v-for="item in socialItems"
              :key="item.label"
              :href="homeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              :aria-label="item.label"
            >
              <svg
                v-if="item.icon === 'douyin'"
                class="social-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M14.7 3.2c.7 1.6 1.8 2.9 3.4 3.9 1 .6 2 .9 3 .9v3.2c-1.9 0-3.7-.5-5.3-1.5v5.8c0 3.7-3 6.7-6.7 6.7S2.4 19.2 2.4 15.5s3-6.7 6.7-6.7c.4 0 .8 0 1.2.1v3.4a3.4 3.4 0 0 0-1.2-.2 3.3 3.3 0 1 0 0 6.7c1.8 0 3.3-1.5 3.3-3.3V3.2h2.3Z"
                  fill="currentColor"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'wechat'"
                class="social-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M9.3 5C5.3 5 2 7.7 2 11c0 1.9 1 3.7 2.8 4.9L4 19.1l3.5-1.8c.6.1 1.2.2 1.8.2 4 0 7.3-2.7 7.3-6S13.3 5 9.3 5Zm-2.6 4.8a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm5.2 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z"
                  fill="currentColor"
                />
                <path
                  d="M16.6 10.2c-3 0-5.4 1.9-5.4 4.4 0 1.4.8 2.7 2.1 3.5l-.5 2.1 2.3-1.2c.5.1 1 .2 1.5.2 3 0 5.4-1.9 5.4-4.4 0-2.4-2.4-4.6-5.4-4.6Zm-1.9 5a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Zm3.8 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Z"
                  fill="currentColor"
                />
              </svg>
              <img
                v-else-if="item.icon === 'video'"
                class="social-icon social-icon--image"
                :src="item.image"
                :alt="item.label"
              />
              <svg
                v-else
                class="social-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" fill="currentColor" />
              </svg>
            </a>
          </div>
        </section>

        <section class="footer-column">
          <h3>{{ quickTitle }}</h3>
          <a
            v-for="item in quickLinks"
            :key="item.label"
            :href="item.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ item.label }}
          </a>
        </section>

        <section class="footer-column">
          <h3>{{ categoryTitle }}</h3>
          <a
            v-for="item in categories"
            :key="item.label"
            :href="item.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ item.label }}
          </a>
        </section>

        <section class="footer-column contact-column">
          <h3>{{ contactTitle }}</h3>
          <a
            v-for="item in contacts"
            :key="item.label"
            :href="item.href"
            class="contact-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="contact-icon" aria-hidden="true">
              <svg v-if="item.icon === 'company'" viewBox="0 0 24 24" class="contact-icon__svg">
                <path d="M4 19.5h16M6.5 17V7.8c0-.4.2-.8.6-1l4-2.1a1 1 0 0 1 .9 0l4 2.1c.4.2.6.6.6 1V17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11h.01M14 11h.01M10 14h.01M14 14h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
              <svg v-else-if="item.icon === 'phone'" viewBox="0 0 24 24" class="contact-icon__svg">
                <path d="M6.8 4.5h2.4c.4 0 .8.3.9.7l.8 3.3a1 1 0 0 1-.3 1l-1.4 1.2a13.8 13.8 0 0 0 4.1 4.1l1.2-1.4a1 1 0 0 1 1-.3l3.3.8c.4.1.7.5.7.9v2.4a1 1 0 0 1-.9 1c-7 .5-12.7-5.2-12.2-12.2a1 1 0 0 1 1-.9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else-if="item.icon === 'location'" viewBox="0 0 24 24" class="contact-icon__svg">
                <path d="M12 20c3.5-4.1 5.3-7 5.3-9.2A5.3 5.3 0 1 0 6.7 10.8C6.7 13 8.5 15.9 12 20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="10.6" r="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" class="contact-icon__svg">
                <path d="M4 7.5h16v9H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="m5 8.5 7 5 7-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span>{{ item.label }}</span>
          </a>
        </section>
      </div>

      <div class="footer-bottom">
        <span>{{ copyright }}</span>
        <div class="footer-policies">
          <a :href="homeUrl" target="_blank" rel="noopener noreferrer">{{ userAgreement }}</a>
          <a :href="homeUrl" target="_blank" rel="noopener noreferrer">{{ privacyPolicy }}</a>
          <a :href="homeUrl" target="_blank" rel="noopener noreferrer">{{ icp }}</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const siteOrigin = 'https://www.kunqiongai.com';
const { locale } = useI18n();

const footerChromeMap: Record<string, Record<string, string>> = {
  zh_CN: { brandAlt: '鲲穹AI工具箱', brandDesc: '我们致力于为个人和企业提供最优质的AI工具和咨询服务，助力您在人工智能时代保持竞争力。', quickLinks: '快速链接', toolCategories: '工具分类', contactUs: '联系我们', industryNews: '行业资讯', company: '江西六角星科技有限公司', address: '江西省上饶市天佑大道9号2栋19F', copyright: '© 2026 鲲穹 AI 工具箱。保留所有权利。', userAgreement: '用户协议', privacyPolicy: '隐私政策', icp: '赣 ICP 备 2022004738 号-6', douyin: '抖音', wechat: '微信', videoChannel: '视频号', home: '首页', aiTools: 'AI工具', customSoftware: '定制软件', feedback: '问题反馈', textTools: '文本处理', multimedia: '多媒体', officeTools: '办公工具', fileTools: '文件处理', devTools: '开发工具' },
  zh_TW: { brandAlt: '鯤穹AI工具箱', brandDesc: '我們致力於為個人和企業提供最優質的AI工具和顧問服務，助力您在人工智慧時代保持競爭力。', quickLinks: '快速連結', toolCategories: '工具分類', contactUs: '聯絡我們', industryNews: '產業資訊', company: '江西六角星科技有限公司', address: '江西省上饒市天佑大道9號2棟19F', copyright: '© 2026 鯤穹 AI 工具箱。保留所有權利。', userAgreement: '使用者協議', privacyPolicy: '隱私政策', icp: '贛 ICP 備 2022004738 號-6', douyin: '抖音', wechat: '微信', videoChannel: '視頻號', home: '首頁', aiTools: 'AI工具', customSoftware: '客製軟體', feedback: '問題反饋', textTools: '文本處理', multimedia: '多媒體', officeTools: '辦公工具', fileTools: '文件處理', devTools: '開發工具' },
  en: { brandAlt: 'Kunqiong AI Tools', brandDesc: 'We are committed to providing the highest-quality AI tools and consulting services for individuals and enterprises, helping you stay competitive in the AI era.', quickLinks: 'Quick Links', toolCategories: 'Categories', contactUs: 'Contact', industryNews: 'Industry News', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19F, Building 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. All rights reserved.', userAgreement: 'User Agreement', privacyPolicy: 'Privacy Policy', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Video Channel', home: 'Home', aiTools: 'AI Tools', customSoftware: 'Custom', feedback: 'Feedback', textTools: 'Text', multimedia: 'Media', officeTools: 'Office', fileTools: 'Files', devTools: 'Dev' },
  ja: { brandAlt: 'Kunqiong AIツール', brandDesc: '個人と企業に高品質なAIツールとコンサルティングサービスを提供し、AI時代でも競争力を保てるよう支援します。', quickLinks: 'クイックリンク', toolCategories: 'カテゴリ', contactUs: 'お問い合わせ', industryNews: '業界ニュース', company: '江西六角星科技有限公司', address: '江西省上饶市天佑大道9号2棟19階', copyright: '© 2026 Kunqiong AI Tools. All rights reserved.', userAgreement: '利用規約', privacyPolicy: 'プライバシーポリシー', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: '動画チャンネル', home: 'ホーム', aiTools: 'AIツール', customSoftware: 'カスタム', feedback: 'フィードバック', textTools: 'テキスト', multimedia: 'メディア', officeTools: 'オフィス', fileTools: 'ファイル', devTools: '開発' },
  ko: { brandAlt: 'Kunqiong AI 도구', brandDesc: '개인과 기업을 위해 최고 품질의 AI 도구와 컨설팅 서비스를 제공하여 AI 시대에도 경쟁력을 유지할 수 있도록 돕습니다.', quickLinks: '빠른 링크', toolCategories: '도구 분류', contactUs: '문의하기', industryNews: '업계 뉴스', company: '장시 류자오싱 테크놀로지 유한회사', address: '장시성 상라오시 톈유 대로 9번, 2동 19층', copyright: '© 2026 Kunqiong AI Tools. All rights reserved.', userAgreement: '사용자 약관', privacyPolicy: '개인정보 처리방침', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: '비디오 채널', home: '홈', aiTools: 'AI 도구', customSoftware: '맞춤형', feedback: '피드백', textTools: '텍스트', multimedia: '미디어', officeTools: '오피스', fileTools: '파일', devTools: '개발' },
  es: { brandAlt: 'Herramientas de IA Kunqiong', brandDesc: 'Nos comprometemos a ofrecer herramientas de IA y servicios de consultoría de la más alta calidad para personas y empresas, ayudándole a seguir siendo competitivo en la era de la IA.', quickLinks: 'Enlaces rápidos', toolCategories: 'Categorías', contactUs: 'Contacto', industryNews: 'Noticias del sector', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'Piso 19, Edificio 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Todos los derechos reservados.', userAgreement: 'Acuerdo de usuario', privacyPolicy: 'Política de privacidad', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Canal de video', home: 'Inicio', aiTools: 'Herramientas de IA', customSoftware: 'Personalizado', feedback: 'Comentarios', textTools: 'Texto', multimedia: 'Multimedia', officeTools: 'Oficina', fileTools: 'Archivos', devTools: 'Desarrollo' },
  fr: { brandAlt: 'Outils IA Kunqiong', brandDesc: 'Nous nous engageons à fournir des outils d’IA et des services de conseil de la plus haute qualité aux particuliers et aux entreprises, afin de vous aider à rester compétitif à l’ère de l’IA.', quickLinks: 'Liens rapides', toolCategories: 'Catégories', contactUs: 'Contact', industryNews: 'Actualités du secteur', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19e étage, bâtiment 2, n° 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Tous droits réservés.', userAgreement: 'Accord utilisateur', privacyPolicy: 'Politique de confidentialité', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Canal vidéo', home: 'Accueil', aiTools: 'Outils IA', customSoftware: 'Sur mesure', feedback: 'Retour', textTools: 'Texte', multimedia: 'Médias', officeTools: 'Bureau', fileTools: 'Fichiers', devTools: 'Dév' },
  ru: { brandAlt: 'AI-инструменты Kunqiong', brandDesc: 'Мы стремимся предоставлять частным пользователям и компаниям высококачественные AI-инструменты и консультационные услуги, помогая вам сохранять конкурентоспособность в эпоху AI.', quickLinks: 'Быстрые ссылки', toolCategories: 'Категории', contactUs: 'Контакты', industryNews: 'Новости отрасли', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19 этаж, здание 2, № 9 Tianyou Avenue, Шанжао, Цзянси', copyright: '© 2026 Kunqiong AI Tools. Все права защищены.', userAgreement: 'Пользовательское соглашение', privacyPolicy: 'Политика конфиденциальности', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Видеоканал', home: 'Главная', aiTools: 'AI-инструменты', customSoftware: 'На заказ', feedback: 'Обратная связь', textTools: 'Текст', multimedia: 'Медиа', officeTools: 'Офис', fileTools: 'Файлы', devTools: 'Разработка' },
  de: { brandAlt: 'Kunqiong KI-Tools', brandDesc: 'Wir bieten Privatpersonen und Unternehmen hochwertige KI-Tools und Beratungsleistungen, damit Sie im Zeitalter der KI wettbewerbsfähig bleiben.', quickLinks: 'Schnelllinks', toolCategories: 'Kategorien', contactUs: 'Kontakt', industryNews: 'Branchennews', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19. Etage, Gebäude 2, Nr. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Alle Rechte vorbehalten.', userAgreement: 'Nutzungsvereinbarung', privacyPolicy: 'Datenschutzrichtlinie', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Videokanal', home: 'Startseite', aiTools: 'KI-Tools', customSoftware: 'Individuell', feedback: 'Feedback', textTools: 'Text', multimedia: 'Medien', officeTools: 'Office', fileTools: 'Dateien', devTools: 'Entwicklung' },
  it: { brandAlt: 'Strumenti AI Kunqiong', brandDesc: 'Ci impegniamo a fornire strumenti AI e servizi di consulenza di alta qualità a privati e aziende, aiutandoti a rimanere competitivo nell’era dell’AI.', quickLinks: 'Link rapidi', toolCategories: 'Categorie', contactUs: 'Contatti', industryNews: 'Notizie del settore', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19° piano, Edificio 2, n. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Tutti i diritti riservati.', userAgreement: 'Accordo utente', privacyPolicy: 'Informativa sulla privacy', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Canale video', home: 'Home', aiTools: 'Strumenti AI', customSoftware: 'Personalizzato', feedback: 'Feedback', textTools: 'Testo', multimedia: 'Media', officeTools: 'Office', fileTools: 'File', devTools: 'Sviluppo' },
  pt: { brandAlt: 'Ferramentas de IA Kunqiong', brandDesc: 'Temos o compromisso de fornecer ferramentas de IA e serviços de consultoria da mais alta qualidade para indivíduos e empresas, ajudando você a se manter competitivo na era da IA.', quickLinks: 'Links rápidos', toolCategories: 'Categorias', contactUs: 'Contato', industryNews: 'Notícias do setor', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19º andar, Edifício 2, nº 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Todos os direitos reservados.', userAgreement: 'Acordo do usuário', privacyPolicy: 'Política de privacidade', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Canal de vídeo', home: 'Início', aiTools: 'Ferramentas de IA', customSoftware: 'Personalizado', feedback: 'Feedback', textTools: 'Texto', multimedia: 'Mídia', officeTools: 'Office', fileTools: 'Arquivos', devTools: 'Desenvolvimento' },
  pt_BR: { brandAlt: 'Ferramentas de IA Kunqiong', brandDesc: 'Temos o compromisso de oferecer ferramentas de IA e serviços de consultoria de alta qualidade para pessoas e empresas, ajudando você a se manter competitivo na era da IA.', quickLinks: 'Links rápidos', toolCategories: 'Categorias', contactUs: 'Contato', industryNews: 'Notícias do setor', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19º andar, Prédio 2, nº 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Todos os direitos reservados.', userAgreement: 'Contrato do usuário', privacyPolicy: 'Política de privacidade', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Canal de vídeo', home: 'Início', aiTools: 'Ferramentas de IA', customSoftware: 'Personalizado', feedback: 'Feedback', textTools: 'Texto', multimedia: 'Mídia', officeTools: 'Office', fileTools: 'Arquivos', devTools: 'Dev' },
  ar: { brandAlt: 'أدوات كونتشيونغ للذكاء الاصطناعي', brandDesc: 'نلتزم بتقديم أعلى جودة من أدوات الذكاء الاصطناعي والخدمات الاستشارية للأفراد والشركات، لمساعدتك على الحفاظ على قدرتك التنافسية في عصر الذكاء الاصطناعي.', quickLinks: 'روابط سريعة', toolCategories: 'تصنيفات الأدوات', contactUs: 'اتصل بنا', industryNews: 'أخبار الصناعة', company: 'شركة جيانغشي ليوجياوشينغ للتكنولوجيا المحدودة', address: 'الطابق 19، المبنى 2، رقم 9 شارع تيانيو، شانغراو، جيانغشي', copyright: '© 2026 أدوات كونتشيونغ للذكاء الاصطناعي. جميع الحقوق محفوظة.', userAgreement: 'اتفاقية المستخدم', privacyPolicy: 'سياسة الخصوصية', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'قناة الفيديو', home: 'الرئيسية', aiTools: 'أدوات الذكاء الاصطناعي', customSoftware: 'برمجيات مخصصة', feedback: 'ملاحظات', textTools: 'معالجة النصوص', multimedia: 'الوسائط', officeTools: 'أدوات المكتب', fileTools: 'معالجة الملفات', devTools: 'التطوير' },
  bn: { brandAlt: 'কুনচিয়ং এআই টুলস', brandDesc: 'আমরা ব্যক্তি ও প্রতিষ্ঠানের জন্য সর্বোচ্চ মানের AI টুলস ও পরামর্শসেবা দিতে প্রতিশ্রুতিবদ্ধ, যাতে আপনি AI যুগে প্রতিযোগিতামূলক থাকতে পারেন।', quickLinks: 'দ্রুত লিংক', toolCategories: 'বিভাগসমূহ', contactUs: 'যোগাযোগ', industryNews: 'ইন্ডাস্ট্রি নিউজ', company: 'জিয়াংসি লিউজিয়াওশিং টেকনোলজি কো., লিমিটেড', address: '১৯ তলা, বিল্ডিং ২, নং ৯ টিয়ানইউ অ্যাভিনিউ, শাংরাও, জিয়াংসি', copyright: '© 2026 Kunqiong AI Tools. সর্বস্বত্ব সংরক্ষিত।', userAgreement: 'ব্যবহারকারী চুক্তি', privacyPolicy: 'গোপনীয়তা নীতি', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'ভিডিও চ্যানেল', home: 'হোম', aiTools: 'এআই টুলস', customSoftware: 'কাস্টম', feedback: 'ফিডব্যাক', textTools: 'টেক্সট', multimedia: 'মিডিয়া', officeTools: 'অফিস', fileTools: 'ফাইল', devTools: 'ডেভ' },
  fa: { brandAlt: 'ابزارهای هوش مصنوعی کونچیونگ', brandDesc: 'ما متعهد هستیم باکیفیت‌ترین ابزارهای هوش مصنوعی و خدمات مشاوره را برای افراد و سازمان‌ها فراهم کنیم تا در عصر هوش مصنوعی رقابتی بمانید.', quickLinks: 'پیوندهای سریع', toolCategories: 'دسته‌بندی ابزارها', contactUs: 'تماس با ما', industryNews: 'اخبار صنعت', company: 'شرکت فناوری جیانگشی لیوجیائوشینگ', address: 'طبقه ۱۹، ساختمان ۲، شماره ۹ خیابان تیانیو، شانگراو، جیانگشی', copyright: '© 2026 Kunqiong AI Tools. تمامی حقوق محفوظ است.', userAgreement: 'توافق‌نامه کاربر', privacyPolicy: 'سیاست حفظ حریم خصوصی', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'کانال ویدئو', home: 'خانه', aiTools: 'ابزارهای هوش مصنوعی', customSoftware: 'سفارشی', feedback: 'بازخورد', textTools: 'متن', multimedia: 'چندرسانه‌ای', officeTools: 'ابزارهای اداری', fileTools: 'فایل', devTools: 'توسعه' },
  he: { brandAlt: 'כלי AI של Kunqiong', brandDesc: 'אנו מחויבים לספק את כלי ה-AI ושירותי הייעוץ האיכותיים ביותר ליחידים ולעסקים, כדי לעזור לכם להישאר תחרותיים בעידן ה-AI.', quickLinks: 'קישורים מהירים', toolCategories: 'קטגוריות', contactUs: 'צור קשר', industryNews: 'חדשות התעשייה', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'קומה 19, בניין 2, מספר 9 שדרות Tianyou, שאנגרו, ג׳יאנגשי', copyright: '© 2026 Kunqiong AI Tools. כל הזכויות שמורות.', userAgreement: 'הסכם משתמש', privacyPolicy: 'מדיניות פרטיות', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'ערוץ וידאו', home: 'בית', aiTools: 'כלי AI', customSoftware: 'מותאם אישית', feedback: 'משוב', textTools: 'טקסט', multimedia: 'מדיה', officeTools: 'משרד', fileTools: 'קבצים', devTools: 'פיתוח' },
  hi: { brandAlt: 'कुनचियोंग एआई टूल्स', brandDesc: 'हम व्यक्तियों और व्यवसायों के लिए उच्च गुणवत्ता वाले AI टूल्स और परामर्श सेवाएँ प्रदान करने के लिए प्रतिबद्ध हैं, ताकि आप AI युग में प्रतिस्पर्धी बने रहें।', quickLinks: 'त्वरित लिंक', toolCategories: 'श्रेणियाँ', contactUs: 'संपर्क', industryNews: 'इंडस्ट्री न्यूज़', company: 'जियांग्शी लिउजियाओशिंग टेक्नोलॉजी कंपनी लिमिटेड', address: '19वीं मंज़िल, बिल्डिंग 2, नंबर 9 तियानयो एवेन्यू, शांगराओ, जियांग्शी', copyright: '© 2026 Kunqiong AI Tools. सर्वाधिकार सुरक्षित।', userAgreement: 'उपयोगकर्ता समझौता', privacyPolicy: 'गोपनीयता नीति', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'वीडियो चैनल', home: 'होम', aiTools: 'एआई टूल्स', customSoftware: 'कस्टम', feedback: 'फ़ीडबैक', textTools: 'टेक्स्ट', multimedia: 'मीडिया', officeTools: 'ऑफिस', fileTools: 'फाइलें', devTools: 'डेव' },
  id: { brandAlt: 'Alat AI Kunqiong', brandDesc: 'Kami berkomitmen menyediakan alat AI dan layanan konsultasi berkualitas tinggi untuk individu dan perusahaan, membantu Anda tetap kompetitif di era AI.', quickLinks: 'Tautan cepat', toolCategories: 'Kategori', contactUs: 'Kontak', industryNews: 'Berita industri', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'Lantai 19, Gedung 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Hak cipta dilindungi.', userAgreement: 'Perjanjian pengguna', privacyPolicy: 'Kebijakan privasi', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Saluran video', home: 'Beranda', aiTools: 'Alat AI', customSoftware: 'Kustom', feedback: 'Umpan balik', textTools: 'Teks', multimedia: 'Media', officeTools: 'Office', fileTools: 'Berkas', devTools: 'Dev' },
  ms: { brandAlt: 'Alat AI Kunqiong', brandDesc: 'Kami komited untuk menyediakan alat AI dan perkhidmatan perundingan berkualiti tinggi kepada individu dan perusahaan, membantu anda kekal berdaya saing dalam era AI.', quickLinks: 'Pautan pantas', toolCategories: 'Kategori', contactUs: 'Hubungi kami', industryNews: 'Berita industri', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'Tingkat 19, Bangunan 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Hak cipta terpelihara.', userAgreement: 'Perjanjian pengguna', privacyPolicy: 'Dasar privasi', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Saluran video', home: 'Laman utama', aiTools: 'Alat AI', customSoftware: 'Tersuai', feedback: 'Maklum balas', textTools: 'Teks', multimedia: 'Media', officeTools: 'Office', fileTools: 'Fail', devTools: 'Pembangunan' },
  nl: { brandAlt: 'Kunqiong AI-tools', brandDesc: 'Wij zetten ons in om hoogwaardige AI-tools en adviesdiensten te leveren voor particulieren en bedrijven, zodat u concurrerend blijft in het AI-tijdperk.', quickLinks: 'Snelle links', toolCategories: 'Categorieën', contactUs: 'Contact', industryNews: 'Branchenieuws', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19e verdieping, Gebouw 2, nr. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Alle rechten voorbehouden.', userAgreement: 'Gebruikersovereenkomst', privacyPolicy: 'Privacybeleid', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Videokanaal', home: 'Home', aiTools: 'AI-tools', customSoftware: 'Aangepast', feedback: 'Feedback', textTools: 'Tekst', multimedia: 'Media', officeTools: 'Office', fileTools: 'Bestanden', devTools: 'Dev' },
  pl: { brandAlt: 'Narzędzia AI Kunqiong', brandDesc: 'Zobowiązujemy się dostarczać najwyższej jakości narzędzia AI i usługi doradcze dla osób prywatnych i firm, pomagając Ci zachować konkurencyjność w erze AI.', quickLinks: 'Szybkie linki', toolCategories: 'Kategorie', contactUs: 'Kontakt', industryNews: 'Aktualności branżowe', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19 piętro, Budynek 2, nr 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Wszelkie prawa zastrzeżone.', userAgreement: 'Umowa użytkownika', privacyPolicy: 'Polityka prywatności', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Kanał wideo', home: 'Strona główna', aiTools: 'Narzędzia AI', customSoftware: 'Niestandardowe', feedback: 'Opinie', textTools: 'Tekst', multimedia: 'Media', officeTools: 'Biuro', fileTools: 'Pliki', devTools: 'Dev' },
  sw: { brandAlt: 'Zana za AI za Kunqiong', brandDesc: 'Tumejitolea kutoa zana za AI na huduma za ushauri za kiwango cha juu kwa watu binafsi na biashara, kukusaidia kubaki na ushindani katika enzi ya AI.', quickLinks: 'Viungo vya haraka', toolCategories: 'Makundi', contactUs: 'Wasiliana nasi', industryNews: 'Habari za sekta', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'Ghorofa ya 19, Jengo la 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Haki zote zimehifadhiwa.', userAgreement: 'Makubaliano ya mtumiaji', privacyPolicy: 'Sera ya faragha', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Kituo cha video', home: 'Nyumbani', aiTools: 'Zana za AI', customSoftware: 'Maalum', feedback: 'Maoni', textTools: 'Maandishi', multimedia: 'Vyombo vya habari', officeTools: 'Ofisi', fileTools: 'Faili', devTools: 'Maendeleo' },
  ta: { brandAlt: 'குன்சியோங் AI கருவிகள்', brandDesc: 'தனிநபர்களுக்கும் நிறுவனங்களுக்கும் உயர்தர AI கருவிகள் மற்றும் ஆலோசனைச் சேவைகளை வழங்க நாங்கள் உறுதிபூண்டுள்ளோம்; AI காலத்தில் போட்டித்திறனை காக்க உதவுகிறோம்.', quickLinks: 'விரைவு இணைப்புகள்', toolCategories: 'வகைகள்', contactUs: 'எங்களை தொடர்பு கொள்ள', industryNews: 'துறைச் செய்திகள்', company: 'ஜியாங்சி லியுஜியாவ்ஷிங் டெக்னாலஜி கோ., லிமிடெட்', address: '19வது மாடி, கட்டிடம் 2, எண் 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.', userAgreement: 'பயனர் ஒப்பந்தம்', privacyPolicy: 'தனியுரிமைக் கொள்கை', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'வீடியோ சேனல்', home: 'முகப்பு', aiTools: 'AI கருவிகள்', customSoftware: 'தனிப்பயன்', feedback: 'பின்னூட்டம்', textTools: 'உரை', multimedia: 'மீடியா', officeTools: 'ஆபிஸ்', fileTools: 'கோப்புகள்', devTools: 'டெவ்' },
  th: { brandAlt: 'เครื่องมือ AI ของ Kunqiong', brandDesc: 'เรามุ่งมั่นที่จะมอบเครื่องมือ AI และบริการให้คำปรึกษาคุณภาพสูงสำหรับบุคคลและองค์กร เพื่อช่วยให้คุณคงความสามารถในการแข่งขันในยุค AI.', quickLinks: 'ลิงก์ด่วน', toolCategories: 'หมวดหมู่', contactUs: 'ติดต่อเรา', industryNews: 'ข่าวอุตสาหกรรม', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'ชั้น 19 อาคาร 2 เลขที่ 9 ถนน Tianyou เมือง Shangrao มณฑล Jiangxi', copyright: '© 2026 Kunqiong AI Tools. สงวนลิขสิทธิ์.', userAgreement: 'ข้อตกลงผู้ใช้', privacyPolicy: 'นโยบายความเป็นส่วนตัว', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'ช่องวิดีโอ', home: 'หน้าแรก', aiTools: 'เครื่องมือ AI', customSoftware: 'กำหนดเอง', feedback: 'ข้อเสนอแนะ', textTools: 'ข้อความ', multimedia: 'มีเดีย', officeTools: 'ออฟฟิศ', fileTools: 'ไฟล์', devTools: 'พัฒนา' },
  tl: { brandAlt: 'Kunqiong AI Tools', brandDesc: 'Nakapangako kaming magbigay ng de-kalidad na AI tools at consulting services para sa mga indibidwal at negosyo upang matulungan kang manatiling kompetitibo sa panahon ng AI.', quickLinks: 'Mabilis na link', toolCategories: 'Mga kategorya', contactUs: 'Makipag-ugnayan', industryNews: 'Balita sa industriya', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19F, Building 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Lahat ng karapatan ay nakalaan.', userAgreement: 'Kasunduan ng gumagamit', privacyPolicy: 'Patakaran sa privacy', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Video Channel', home: 'Home', aiTools: 'AI Tools', customSoftware: 'Custom', feedback: 'Feedback', textTools: 'Teksto', multimedia: 'Media', officeTools: 'Office', fileTools: 'Files', devTools: 'Dev' },
  tr: { brandAlt: 'Kunqiong AI Araçları', brandDesc: 'Bireyler ve işletmeler için en yüksek kaliteli AI araçlarını ve danışmanlık hizmetlerini sunmaya kararlıyız; AI çağında rekabetçi kalmanıza yardımcı oluyoruz.', quickLinks: 'Hızlı bağlantılar', toolCategories: 'Kategoriler', contactUs: 'İletişim', industryNews: 'Sektör haberleri', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19. kat, Bina 2, No. 9 Tianyou Avenue, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Tüm hakları saklıdır.', userAgreement: 'Kullanıcı sözleşmesi', privacyPolicy: 'Gizlilik politikası', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Video kanalı', home: 'Ana sayfa', aiTools: 'Yapay Zeka Araçları', customSoftware: 'Özel', feedback: 'Geri bildirim', textTools: 'Metin', multimedia: 'Medya', officeTools: 'Ofis', fileTools: 'Dosyalar', devTools: 'Geliştirme' },
  uk: { brandAlt: 'AI-інструменти Kunqiong', brandDesc: 'Ми прагнемо надавати приватним користувачам і компаніям високоякісні AI-інструменти та консультаційні послуги, допомагаючи вам залишатися конкурентоспроможними в епоху AI.', quickLinks: 'Швидкі посилання', toolCategories: 'Категорії', contactUs: 'Контакти', industryNews: 'Новини галузі', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: '19 поверх, будівля 2, № 9 Tianyou Avenue, Шанжао, Цзянсі', copyright: '© 2026 Kunqiong AI Tools. Усі права захищено.', userAgreement: 'Угода користувача', privacyPolicy: 'Політика конфіденційності', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Відеоканал', home: 'Головна', aiTools: 'AI-інструменти', customSoftware: 'Кастомні', feedback: 'Зворотний зв’язок', textTools: 'Текст', multimedia: 'Медіа', officeTools: 'Офіс', fileTools: 'Файли', devTools: 'Розробка' },
  ur: { brandAlt: 'کنچیونگ اے آئی ٹولز', brandDesc: 'ہم افراد اور اداروں کے لیے اعلیٰ معیار کے AI ٹولز اور مشاورتی خدمات فراہم کرنے کے لیے پُرعزم ہیں تاکہ آپ AI دور میں مسابقتی رہ سکیں۔', quickLinks: 'فوری روابط', toolCategories: 'زمروں', contactUs: 'ہم سے رابطہ کریں', industryNews: 'صنعتی خبریں', company: 'جیانگشی لیوجیاؤشنگ ٹیکنالوجی کمپنی لمیٹڈ', address: '19ویں منزل، بلڈنگ 2، نمبر 9 تیانیو ایونیو، شانگراو، جیانگشی', copyright: '© 2026 Kunqiong AI Tools. جملہ حقوق محفوظ ہیں۔', userAgreement: 'صارف معاہدہ', privacyPolicy: 'رازداری کی پالیسی', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'ویڈیو چینل', home: 'ہوم', aiTools: 'اے آئی ٹولز', customSoftware: 'کسٹم', feedback: 'فیڈبیک', textTools: 'متن', multimedia: 'میڈیا', officeTools: 'آفس', fileTools: 'فائلز', devTools: 'ڈیولپمنٹ' },
  vi: { brandAlt: 'Công cụ AI Kunqiong', brandDesc: 'Chúng tôi cam kết cung cấp các công cụ AI và dịch vụ tư vấn chất lượng cao cho cá nhân và doanh nghiệp, giúp bạn duy trì năng lực cạnh tranh trong kỷ nguyên AI.', quickLinks: 'Liên kết nhanh', toolCategories: 'Danh mục', contactUs: 'Liên hệ', industryNews: 'Tin tức ngành', company: 'Jiangxi Liujiaoxing Technology Co., Ltd.', address: 'Tầng 19, Tòa nhà 2, số 9 Đại lộ Tianyou, Shangrao, Jiangxi', copyright: '© 2026 Kunqiong AI Tools. Đã đăng ký bản quyền.', userAgreement: 'Thỏa thuận người dùng', privacyPolicy: 'Chính sách quyền riêng tư', icp: 'Gan ICP No. 2022004738-6', douyin: 'Douyin', wechat: 'WeChat', videoChannel: 'Kênh video', home: 'Trang chủ', aiTools: 'Công cụ AI', customSoftware: 'Tùy chỉnh', feedback: 'Phản hồi', textTools: 'Văn bản', multimedia: 'Đa phương tiện', officeTools: 'Văn phòng', fileTools: 'Tệp', devTools: 'Phát triển' },
};

const getFooterChrome = (key: string) => footerChromeMap[locale.value]?.[key] || footerChromeMap.en[key] || key;
const homeUrl = computed(() => `${siteOrigin}/?lang=${locale.value}`);

const footerLogoUrl = 'https://www.kunqiongai.com/logo2.png';
const videoChannelIconUrl = 'https://www.kunqiongai.com/wb.png';
const footerLogoAlt = computed(() => getFooterChrome('brandAlt'));
const brandCopy = computed(() => getFooterChrome('brandDesc'));
const brandCopyLines = computed(() => {
  if (locale.value === 'zh_CN') {
    return [
      '我们致力于为个人和企业提供最优质的AI工具',
      '和咨询服务，助力您在人工智能时代保持竞争力。',
    ];
  }
  return [brandCopy.value];
});
const quickTitle = computed(() => getFooterChrome('quickLinks'));
const categoryTitle = computed(() => getFooterChrome('toolCategories'));
const contactTitle = computed(() => getFooterChrome('contactUs'));
const copyright = computed(() => getFooterChrome('copyright'));
const userAgreement = computed(() => getFooterChrome('userAgreement'));
const privacyPolicy = computed(() => getFooterChrome('privacyPolicy'));
const icp = computed(() => getFooterChrome('icp'));

const socialItems = computed(() => [
  { label: getFooterChrome('douyin'), icon: 'douyin' },
  { label: getFooterChrome('wechat'), icon: 'wechat' },
  { label: getFooterChrome('videoChannel'), icon: 'video', image: videoChannelIconUrl },
]);

const quickLinks = computed(() => [
  { label: getFooterChrome('home'), href: homeUrl.value },
  { label: getFooterChrome('aiTools'), href: homeUrl.value },
  { label: getFooterChrome('customSoftware'), href: homeUrl.value },
  { label: getFooterChrome('industryNews'), href: homeUrl.value },
  { label: getFooterChrome('feedback'), href: homeUrl.value },
]);

const categories = computed(() => [
  { label: getFooterChrome('textTools'), href: homeUrl.value },
  { label: getFooterChrome('multimedia'), href: homeUrl.value },
  { label: getFooterChrome('officeTools'), href: homeUrl.value },
  { label: getFooterChrome('fileTools'), href: homeUrl.value },
  { label: getFooterChrome('devTools'), href: homeUrl.value },
]);

const contacts = computed(() => [
  { label: getFooterChrome('company'), icon: 'company', href: homeUrl.value },
  { label: '17770307066', icon: 'phone', href: 'tel:17770307066' },
  { label: getFooterChrome('address'), icon: 'location', href: homeUrl.value },
  { label: '11247931@qq.com', icon: 'mail', href: 'mailto:11247931@qq.com' },
]);
</script>

<style scoped>
.site-footer {
  background: #1d2939;
  color: #d7dfef;
}

.brand-copy-line {
  display: block;
}

.footer-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 48px 26px 24px;
}

.footer-grid {
  --footer-brand-col: 360px;
  --footer-link-col: 180px;
  --footer-contact-col: 300px;
  display: grid;
  /* 首列与末列共用同一 minmax 基准，与下方 max-width 一致，保证左右对齐 */
  grid-template-columns:
    minmax(280px, var(--footer-brand-col))
    minmax(150px, var(--footer-link-col))
    minmax(150px, var(--footer-link-col))
    minmax(240px, var(--footer-contact-col));
  justify-content: space-between;
  column-gap: 40px;
  row-gap: 24px;
  align-items: start;
  margin-bottom: 22px;
}

.brand-column {
  width: 100%;
  max-width: var(--footer-brand-col);
  justify-self: start;
  box-sizing: border-box;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  margin-bottom: 14px;
}

.footer-logo-image {
  height: 40px;
  width: auto;
  display: block;
  object-fit: contain;
}

.brand-copy {
  max-width: 405px;
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.72;
  color: #a9b8d0;
  min-height: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.social-list {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 0;
  flex-wrap: wrap;
}

.social-link {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #9fb1cb;
  text-decoration: none;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.social-link:hover {
  color: #d7dfef;
  border-color: rgba(113, 183, 255, 0.38);
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-1px);
}

.social-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.social-icon--image {
  object-fit: contain;
}

.footer-column h3 {
  margin: 4px 0 18px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  min-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-column {
  width: 100%;
  max-width: var(--footer-contact-col);
  justify-self: start;
  box-sizing: border-box;
}

.footer-column a {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;
  text-decoration: none;
  color: #94a3b8;
  transition: color 0.2s ease;
  white-space: normal;
}

.footer-column a:hover,
.footer-policies a:hover {
  color: #3b82f6;
}

.contact-column .contact-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.contact-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #a9b8d0;
  margin-top: 2px;
}

.contact-icon__svg {
  width: 18px;
  height: 18px;
  display: block;
}

.footer-bottom {
  padding: 16px 0 4px;
  border-top: 1px solid #374151;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
  flex-wrap: nowrap;
  text-align: left;
}

.footer-policies {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.footer-policies a:not(:last-child)::after {
  content: '|';
  color: #475569;
  margin-left: 8px;
}

.footer-policies a {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s ease;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1180px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }

  .brand-column,
  .brand-copy,
  .contact-column {
    max-width: 100%;
    justify-self: stretch;
  }
}

@media (max-width: 760px) {
  .footer-container {
    padding: 42px 24px 24px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  .brand-copy {
    max-width: 100%;
    min-height: 0;
    font-size: 15px;
  }

  .footer-column a {
    margin-bottom: 14px;
    font-size: 15px;
  }

  .footer-bottom {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .footer-policies {
    justify-content: center;
  }
}
</style>
