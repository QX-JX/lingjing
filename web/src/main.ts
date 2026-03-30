import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { i18n, getLocale } from './locales';
import { applyDomSeo } from './config/localeSeo';
import './styles/mobile.css';
// 官网首页完整样式（与 https://www.kunqiongai.com/ 页头/页尾颜色与布局一致）
import './styles/kunqiong-homepage.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

app.mount('#app');
void nextTick(() => {
  applyDomSeo(getLocale());
});
