<template>
  <header class="header">
    <div class="header-container">
      <a :href="homeUrl" class="brand" target="_blank" rel="noopener noreferrer" :aria-label="brandTitle">
        <span class="brand-mark" aria-hidden="true">
          <img :src="headerLogoUrl" alt="" class="brand-mark-img" />
        </span>
        <span class="brand-text">
          <span class="brand-line1">{{ brandTitle }}</span>
          <span class="brand-line2">{{ chrome.brandLine2 }}</span>
        </span>
      </a>

      <nav class="nav" :aria-label="chrome.navAria">
        <a
          v-for="item in navItems"
          :key="item.label"
          :href="item.href"
          class="nav-link"
          :class="{ active: item.active }"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ item.label }}
        </a>
      </nav>

      <div class="header-right">
        <div class="nav-lang-switch">
          <select v-model="currentLocale" @change="handleLocaleChange">
            <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
              {{ loc.name }}
            </option>
          </select>
        </div>

        <div v-if="!userStore.userState.isLoggedIn" class="header-auth-btns">
          <button type="button" class="header-login-register-btn" @click="handleLogin">
            {{ chrome.loginRegister }}
          </button>
        </div>

        <div v-else ref="userMenuRef" class="header-user" @click.stop="toggleUserMenu">
          <img
            class="header-user-avatar"
            :src="avatarSrc"
            alt=""
            width="32"
            height="32"
            @error="onAvatarError"
          />
          <span class="header-user-name">{{ displayName }}</span>
          <span class="header-user-caret" aria-hidden="true">&#9662;</span>

          <div v-if="userMenuOpen" class="header-user-dropdown" role="menu">
            <button type="button" class="dropdown-item" role="menuitem" @click="scrollToEditor">
              {{ chrome.workspace }}
            </button>
            <button type="button" class="dropdown-item" role="menuitem" @click="handleLogout">
              {{ $t('header.logout') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../stores/userStore';
import { setLocale, availableLocales } from '../locales';

const siteOrigin = 'https://www.kunqiongai.com';
const userStore = useUserStore();
const { locale } = useI18n();

const chromeMap: Record<string, Record<string, string>> = {
  zh_CN: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: '登录 / 注册', account: '账号', navAria: '主导航', home: '首页', aiTools: 'AI工具', officeTools: '办公工具', multimedia: '多媒体', devTools: '开发工具', textTools: '文本处理', fileTools: '文件处理', systemTools: '系统工具', lifeTools: '生活工具', aiNews: 'AI资讯', customSoftware: '定制软件', workspace: '工作台' },
  zh_TW: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: '登入 / 註冊', account: '帳號', navAria: '主導覽', home: '首頁', aiTools: 'AI工具', officeTools: '辦公工具', multimedia: '多媒體', devTools: '開發工具', textTools: '文本處理', fileTools: '文件處理', systemTools: '系統工具', lifeTools: '生活工具', aiNews: 'AI資訊', customSoftware: '客製軟體', workspace: '工作台' },
  en: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Login / Register', account: 'Account', navAria: 'Main navigation', home: 'Home', aiTools: 'AI Tools', officeTools: 'Office', multimedia: 'Media', devTools: 'Dev', textTools: 'Text', fileTools: 'Files', systemTools: 'System', lifeTools: 'Lifestyle', aiNews: 'AI News', customSoftware: 'Custom', workspace: 'Workspace' },
  ja: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'ログイン / 登録', account: 'アカウント', navAria: 'メインナビゲーション', home: 'ホーム', aiTools: 'AIツール', officeTools: 'オフィス', multimedia: 'メディア', devTools: '開発', textTools: 'テキスト', fileTools: 'ファイル', systemTools: 'システム', lifeTools: 'ライフ', aiNews: 'AIニュース', customSoftware: 'カスタム', workspace: 'ワークスペース' },
  ko: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: '로그인 / 회원가입', account: '계정', navAria: '기본 탐색', home: '홈', aiTools: 'AI 도구', officeTools: '오피스', multimedia: '미디어', devTools: '개발', textTools: '텍스트', fileTools: '파일', systemTools: '시스템', lifeTools: '라이프', aiNews: 'AI 뉴스', customSoftware: '맞춤형', workspace: '작업공간' },
  es: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Iniciar sesión / Registrarse', account: 'Cuenta', navAria: 'Navegación principal', home: 'Inicio', aiTools: 'Herramientas de IA', officeTools: 'Oficina', multimedia: 'Multimedia', devTools: 'Desarrollo', textTools: 'Texto', fileTools: 'Archivos', systemTools: 'Sistema', lifeTools: 'Estilo de vida', aiNews: 'Noticias de IA', customSoftware: 'Personalizado', workspace: 'Espacio de trabajo' },
  fr: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Connexion / Inscription', account: 'Compte', navAria: 'Navigation principale', home: 'Accueil', aiTools: 'Outils IA', officeTools: 'Bureau', multimedia: 'Médias', devTools: 'Dév', textTools: 'Texte', fileTools: 'Fichiers', systemTools: 'Système', lifeTools: 'Lifestyle', aiNews: 'Actualités IA', customSoftware: 'Sur mesure', workspace: 'Espace de travail' },
  ru: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Войти / Зарегистрироваться', account: 'Аккаунт', navAria: 'Основная навигация', home: 'Главная', aiTools: 'AI-инструменты', officeTools: 'Офис', multimedia: 'Медиа', devTools: 'Разработка', textTools: 'Текст', fileTools: 'Файлы', systemTools: 'Система', lifeTools: 'Стиль жизни', aiNews: 'Новости AI', customSoftware: 'На заказ', workspace: 'Рабочее пространство' },
  de: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Anmelden / Registrieren', account: 'Konto', navAria: 'Hauptnavigation', home: 'Startseite', aiTools: 'KI-Tools', officeTools: 'Office', multimedia: 'Medien', devTools: 'Entwicklung', textTools: 'Text', fileTools: 'Dateien', systemTools: 'System', lifeTools: 'Lifestyle', aiNews: 'KI-News', customSoftware: 'Individuell', workspace: 'Arbeitsbereich' },
  it: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Accedi / Registrati', account: 'Account', navAria: 'Navigazione principale', home: 'Home', aiTools: 'Strumenti AI', officeTools: 'Office', multimedia: 'Media', devTools: 'Sviluppo', textTools: 'Testo', fileTools: 'File', systemTools: 'Sistema', lifeTools: 'Lifestyle', aiNews: 'Notizie AI', customSoftware: 'Personalizzato', workspace: 'Area di lavoro' },
  pt: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Entrar / Registrar-se', account: 'Conta', navAria: 'Navegação principal', home: 'Início', aiTools: 'Ferramentas de IA', officeTools: 'Office', multimedia: 'Mídia', devTools: 'Desenvolvimento', textTools: 'Texto', fileTools: 'Arquivos', systemTools: 'Sistema', lifeTools: 'Estilo de vida', aiNews: 'Notícias de IA', customSoftware: 'Personalizado', workspace: 'Espaço de trabalho' },
  pt_BR: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Entrar / Cadastrar-se', account: 'Conta', navAria: 'Navegação principal', home: 'Início', aiTools: 'Ferramentas de IA', officeTools: 'Office', multimedia: 'Mídia', devTools: 'Dev', textTools: 'Texto', fileTools: 'Arquivos', systemTools: 'Sistema', lifeTools: 'Lifestyle', aiNews: 'Notícias de IA', customSoftware: 'Personalizado', workspace: 'Área de trabalho' },
  ar: { brandLine2: 'صندوق أدوات كونتشيونغ للذكاء الاصطناعي', loginRegister: 'تسجيل الدخول / التسجيل', account: 'الحساب', navAria: 'التنقل الرئيسي', home: 'الرئيسية', aiTools: 'أدوات الذكاء الاصطناعي', officeTools: 'أدوات المكتب', multimedia: 'الوسائط', devTools: 'التطوير', textTools: 'معالجة النصوص', fileTools: 'معالجة الملفات', systemTools: 'أدوات النظام', lifeTools: 'أدوات الحياة', aiNews: 'أخبار الذكاء الاصطناعي', customSoftware: 'برمجيات مخصصة', workspace: 'مساحة العمل' },
  bn: { brandLine2: 'কুনচিয়ং এআই টুলবক্স', loginRegister: 'লগইন / নিবন্ধন', account: 'অ্যাকাউন্ট', navAria: 'প্রধান নেভিগেশন', home: 'হোম', aiTools: 'এআই টুলস', officeTools: 'অফিস', multimedia: 'মিডিয়া', devTools: 'ডেভ', textTools: 'টেক্সট', fileTools: 'ফাইল', systemTools: 'সিস্টেম', lifeTools: 'লাইফস্টাইল', aiNews: 'এআই সংবাদ', customSoftware: 'কাস্টম', workspace: 'ওয়ার্কস্পেস' },
  fa: { brandLine2: 'جعبه‌ابزار هوش مصنوعی کونچیونگ', loginRegister: 'ورود / ثبت‌نام', account: 'حساب کاربری', navAria: 'ناوبری اصلی', home: 'خانه', aiTools: 'ابزارهای هوش مصنوعی', officeTools: 'ابزارهای اداری', multimedia: 'چندرسانه‌ای', devTools: 'توسعه', textTools: 'متن', fileTools: 'فایل', systemTools: 'سیستم', lifeTools: 'سبک زندگی', aiNews: 'اخبار هوش مصنوعی', customSoftware: 'سفارشی', workspace: 'فضای کار' },
  he: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'התחברות / הרשמה', account: 'חשבון', navAria: 'ניווט ראשי', home: 'בית', aiTools: 'כלי AI', officeTools: 'משרד', multimedia: 'מדיה', devTools: 'פיתוח', textTools: 'טקסט', fileTools: 'קבצים', systemTools: 'מערכת', lifeTools: 'סגנון חיים', aiNews: 'חדשות AI', customSoftware: 'מותאם אישית', workspace: 'סביבת עבודה' },
  hi: { brandLine2: 'कुनचियोंग एआई टूलबॉक्स', loginRegister: 'लॉगिन / पंजीकरण', account: 'खाता', navAria: 'मुख्य नेविगेशन', home: 'होम', aiTools: 'एआई टूल्स', officeTools: 'ऑफिस', multimedia: 'मीडिया', devTools: 'डेव', textTools: 'टेक्स्ट', fileTools: 'फाइलें', systemTools: 'सिस्टम', lifeTools: 'लाइफस्टाइल', aiNews: 'एआई समाचार', customSoftware: 'कस्टम', workspace: 'वर्कस्पेस' },
  id: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Masuk / Daftar', account: 'Akun', navAria: 'Navigasi utama', home: 'Beranda', aiTools: 'Alat AI', officeTools: 'Office', multimedia: 'Media', devTools: 'Dev', textTools: 'Teks', fileTools: 'Berkas', systemTools: 'Sistem', lifeTools: 'Gaya hidup', aiNews: 'Berita AI', customSoftware: 'Kustom', workspace: 'Ruang kerja' },
  ms: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Log masuk / Daftar', account: 'Akaun', navAria: 'Navigasi utama', home: 'Laman utama', aiTools: 'Alat AI', officeTools: 'Office', multimedia: 'Media', devTools: 'Pembangunan', textTools: 'Teks', fileTools: 'Fail', systemTools: 'Sistem', lifeTools: 'Gaya hidup', aiNews: 'Berita AI', customSoftware: 'Tersuai', workspace: 'Ruang kerja' },
  nl: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Inloggen / Registreren', account: 'Account', navAria: 'Hoofdnavigatie', home: 'Home', aiTools: 'AI-tools', officeTools: 'Office', multimedia: 'Media', devTools: 'Dev', textTools: 'Tekst', fileTools: 'Bestanden', systemTools: 'Systeem', lifeTools: 'Lifestyle', aiNews: 'AI-nieuws', customSoftware: 'Aangepast', workspace: 'Werkruimte' },
  pl: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Zaloguj się / Zarejestruj się', account: 'Konto', navAria: 'Nawigacja główna', home: 'Strona główna', aiTools: 'Narzędzia AI', officeTools: 'Biuro', multimedia: 'Media', devTools: 'Dev', textTools: 'Tekst', fileTools: 'Pliki', systemTools: 'System', lifeTools: 'Lifestyle', aiNews: 'Wiadomości AI', customSoftware: 'Niestandardowe', workspace: 'Obszar roboczy' },
  sw: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Ingia / Jisajili', account: 'Akaunti', navAria: 'Urambazaji mkuu', home: 'Nyumbani', aiTools: 'Zana za AI', officeTools: 'Ofisi', multimedia: 'Vyombo vya habari', devTools: 'Maendeleo', textTools: 'Maandishi', fileTools: 'Faili', systemTools: 'Mfumo', lifeTools: 'Maisha', aiNews: 'Habari za AI', customSoftware: 'Maalum', workspace: 'Eneo la kazi' },
  ta: { brandLine2: 'குன்சியோங் AI கருவிப்பெட்டி', loginRegister: 'உள்நுழை / பதிவு செய்', account: 'கணக்கு', navAria: 'முக்கிய வழிசெலுத்தல்', home: 'முகப்பு', aiTools: 'AI கருவிகள்', officeTools: 'ஆபிஸ்', multimedia: 'மீடியா', devTools: 'டெவ்', textTools: 'உரை', fileTools: 'கோப்புகள்', systemTools: 'சிஸ்டம்', lifeTools: 'வாழ்க்கை', aiNews: 'AI செய்திகள்', customSoftware: 'தனிப்பயன்', workspace: 'வேலைப்பகுதி' },
  th: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'เข้าสู่ระบบ / สมัครสมาชิก', account: 'บัญชี', navAria: 'เมนูหลัก', home: 'หน้าแรก', aiTools: 'เครื่องมือ AI', officeTools: 'ออฟฟิศ', multimedia: 'มีเดีย', devTools: 'พัฒนา', textTools: 'ข้อความ', fileTools: 'ไฟล์', systemTools: 'ระบบ', lifeTools: 'ไลฟ์สไตล์', aiNews: 'ข่าว AI', customSoftware: 'กำหนดเอง', workspace: 'พื้นที่ทำงาน' },
  tl: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Mag-login / Magrehistro', account: 'Account', navAria: 'Pangunahing nabigasyon', home: 'Home', aiTools: 'AI Tools', officeTools: 'Office', multimedia: 'Media', devTools: 'Dev', textTools: 'Teksto', fileTools: 'Files', systemTools: 'System', lifeTools: 'Lifestyle', aiNews: 'AI News', customSoftware: 'Custom', workspace: 'Workspace' },
  tr: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Giriş / Kayıt Ol', account: 'Hesap', navAria: 'Ana gezinme', home: 'Ana sayfa', aiTools: 'Yapay Zeka Araçları', officeTools: 'Ofis', multimedia: 'Medya', devTools: 'Geliştirme', textTools: 'Metin', fileTools: 'Dosyalar', systemTools: 'Sistem', lifeTools: 'Yaşam', aiNews: 'YZ Haberleri', customSoftware: 'Özel', workspace: 'Çalışma alanı' },
  uk: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Увійти / Зареєструватися', account: 'Акаунт', navAria: 'Основна навігація', home: 'Головна', aiTools: 'AI-інструменти', officeTools: 'Офіс', multimedia: 'Медіа', devTools: 'Розробка', textTools: 'Текст', fileTools: 'Файли', systemTools: 'Система', lifeTools: 'Стиль життя', aiNews: 'AI-новини', customSoftware: 'Кастомні', workspace: 'Робочий простір' },
  ur: { brandLine2: 'کنچیونگ اے آئی ٹول باکس', loginRegister: 'لاگ اِن / رجسٹر', account: 'اکاؤنٹ', navAria: 'مرکزی نیویگیشن', home: 'ہوم', aiTools: 'اے آئی ٹولز', officeTools: 'آفس', multimedia: 'میڈیا', devTools: 'ڈیولپمنٹ', textTools: 'متن', fileTools: 'فائلز', systemTools: 'سسٹم', lifeTools: 'لائف اسٹائل', aiNews: 'اے آئی خبریں', customSoftware: 'کسٹم', workspace: 'ورک اسپیس' },
  vi: { brandLine2: 'KUNQIONG AI TOOLBOX', loginRegister: 'Đăng nhập / Đăng ký', account: 'Tài khoản', navAria: 'Điều hướng chính', home: 'Trang chủ', aiTools: 'Công cụ AI', officeTools: 'Văn phòng', multimedia: 'Đa phương tiện', devTools: 'Phát triển', textTools: 'Văn bản', fileTools: 'Tệp', systemTools: 'Hệ thống', lifeTools: 'Cuộc sống', aiNews: 'Tin tức AI', customSoftware: 'Tùy chỉnh', workspace: 'Không gian làm việc' },
};

const chrome = computed(() => chromeMap[locale.value] || chromeMap.en);
const brandTitle = computed(() => '鲲穹AI工具箱');
const headerLogoUrl = 'https://www.kunqiongai.com/logo.png';
const homeUrl = computed(() => `${siteOrigin}/?lang=${locale.value}`);
const categoryUrl = (path: string) => `${siteOrigin}${path}`;

const navItems = computed(() => [
  { label: chrome.value.home, href: homeUrl.value, active: true },
  { label: chrome.value.aiTools, href: categoryUrl('/category/ai') },
  { label: chrome.value.officeTools, href: categoryUrl('/category/office') },
  { label: chrome.value.multimedia, href: categoryUrl('/category/multimedia') },
  { label: chrome.value.devTools, href: categoryUrl('/category/development') },
  { label: chrome.value.textTools, href: categoryUrl('/category/text') },
  { label: chrome.value.fileTools, href: categoryUrl('/category/file') },
  { label: chrome.value.systemTools, href: categoryUrl('/category/system') },
  { label: chrome.value.lifeTools, href: categoryUrl('/category/life') },
  { label: chrome.value.aiNews, href: categoryUrl('/news') },
  { label: chrome.value.customSoftware, href: categoryUrl('/custom') },
]);

const currentLocale = computed({
  get: () => locale.value,
  set: (value: string) => setLocale(value),
});

const handleLocaleChange = () => {
  setLocale(currentLocale.value);
};

const avatarFailed = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);
const userMenuOpen = ref(false);

watch(
  () => userStore.userState.userInfo?.avatar,
  () => {
    avatarFailed.value = false;
  }
);

const displayName = computed(() => userStore.userState.userInfo?.nickname || chrome.value.account);
const avatarSrc = computed(() => {
  const url = userStore.userState.userInfo?.avatar;
  if (avatarFailed.value || !url) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#e2ebf5"/><text x="32" y="40" text-anchor="middle" font-size="28" fill="#64748b">?</text></svg>');
  }
  return url;
});

function onAvatarError() {
  avatarFailed.value = true;
}
function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}
function closeUserMenu() {
  userMenuOpen.value = false;
}
function onDocClick(e: MouseEvent) {
  const el = userMenuRef.value;
  if (!el || !userMenuOpen.value) return;
  if (!el.contains(e.target as Node)) userMenuOpen.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

const handleLogin = async () => {
  await userStore.startLoginFlow();
};
const scrollToEditor = () => {
  closeUserMenu();
  document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
const handleLogout = async () => {
  closeUserMenu();
  await userStore.logout();
};
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  overflow: visible;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid #e8eef7;
  backdrop-filter: blur(14px);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}
.header-container {
  width: min(100%, 1600px);
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
  overflow: visible;
}
.brand {
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(280px, 36vw);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #1d2939;
  text-decoration: none;
  box-sizing: border-box;
  padding: 0 4px;
}
.brand-mark {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.brand-mark-img {
  height: 100%;
  width: auto;
  min-width: 100%;
  object-fit: cover;
  object-position: left center;
  display: block;
}
.brand-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-width: 0;
  gap: 2px;
  line-height: 1.2;
}
.brand-line1 {
  font-size: 17px;
  font-weight: 700;
  color: #1d2939;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.brand-line2 {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #64748b;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.nav {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: #d5dbe5 transparent;
  padding: 4px 6px 4px 0;
  scroll-padding-left: 0;
}
.nav::-webkit-scrollbar { height: 4px; }
.nav::-webkit-scrollbar-track { background: transparent; }
.nav::-webkit-scrollbar-thumb { background: #d5dbe5; border-radius: 999px; }
.nav-link {
  position: relative;
  flex-shrink: 0;
  min-width: max-content;
  padding: 9px 4px 11px;
  font-size: 13px;
  font-weight: 400;
  color: #2b3448;
  text-decoration: none;
  text-align: center;
  white-space: nowrap;
}
.nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 1px;
  height: 1px;
  border-radius: 999px;
  background: transparent;
}
.nav-link:hover,
.nav-link.active { color: #2286f6; font-weight: 500; }
.nav-link.active::after { background: #2286f6; }
.nav-lang-switch select {
  height: 36px;
  width: clamp(112px, 9vw, 144px);
  padding: 0 10px;
  border: 1px solid #e2ebf5;
  border-radius: 8px;
  background: #fff;
  color: #2b3448;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}
.nav-lang-switch select:hover { border-color: #f97316; }
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 1 auto;
  min-width: 0;
  justify-content: flex-end;
}
.header-auth-btns,
.header-user { display: flex; align-items: center; }
.header-login-register-btn {
  height: 36px;
  min-width: 0;
  max-width: min(250px, 20vw);
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: #1e81d2;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-user {
  position: relative;
  gap: 8px;
  max-width: 200px;
  padding: 4px 8px 4px 4px;
  border-radius: 10px;
  cursor: pointer;
}
.header-user:hover { background: #f1f5f9; }
.header-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: #e2ebf5;
}
.header-user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d2939;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-user-caret { font-size: 10px; color: #64748b; flex-shrink: 0; }
.header-user-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 160px;
  padding: 6px 0;
  background: #fff;
  border: 1px solid #e2ebf5;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  z-index: 1000;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: none;
  text-align: left;
  font-size: 14px;
  color: #1d2939;
  cursor: pointer;
}
.dropdown-item:hover { background: #f8fafc; }
@media (max-width: 1280px) {
  .header-container { padding: 0 20px; gap: 12px; }
  .nav { gap: 15px; }
}
@media (max-width: 1440px) {
  .header-container {
    flex-wrap: wrap;
    padding-top: 12px;
    padding-bottom: 12px;
  }
  .brand {
    max-width: min(320px, 48vw);
    justify-content: flex-start;
  }
  .header-right {
    margin-left: auto;
  }
  .nav {
    order: 3;
    width: 100%;
    justify-content: flex-start;
    padding-left: 0;
    padding-right: 0;
  }
}
@media (max-width: 960px) {
  .header-container { flex-wrap: wrap; padding-top: 14px; padding-bottom: 14px; }
  .brand { max-width: 100%; justify-content: flex-start; }
  .nav { order: 3; width: 100%; justify-content: flex-start; }
}
</style>
