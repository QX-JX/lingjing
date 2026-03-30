/**
 * 与 https://www.kunqiongai.com/ 首页页脚 DOM/类名一致，样式由 kunqiong-homepage.css 提供
 */
import { t } from '../locales';

async function openExternalUrl(url: string) {
  if (window.electronAPI?.openExternalUrl) {
    const result = await window.electronAPI.openExternalUrl(url);
    if (!result.success) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function WebFooter() {
  return (
    <footer className="footer shrink-0">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section footer-brand-section">
            <img
              src="https://www.kunqiongai.com/logo2.png"
              alt={t('footer.brandAlt')}
              className="footer-logo"
            />
            <p className="footer-desc">
              {t('footer.brandDesc')}
            </p>
            <div className="footer-social">
              <a href="#" className="social-icon" aria-label={t('footer.social.douyin')} onClick={(e) => e.preventDefault()}>
                <img src="https://www.kunqiongai.com/dy.png" alt="" className="social-icon-img" />
              </a>
              <a href="#" className="social-icon" aria-label={t('footer.social.wechat')} onClick={(e) => e.preventDefault()}>
                <img src="https://www.kunqiongai.com/wx.png" alt="" className="social-icon-img" />
              </a>
              <a href="#" className="social-icon" aria-label={t('footer.social.video')} onClick={(e) => e.preventDefault()}>
                <img src="https://www.kunqiongai.com/wb.png" alt="" className="social-icon-img" />
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4>{t('footer.quickLinks')}</h4>
            <ul>
              <li>
                <a href="https://www.kunqiongai.com/" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/'); }}>{t('headerNav.home')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/category/ai" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/category/ai'); }}>{t('headerNav.aiTools')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/custom" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/custom'); }}>{t('footer.consulting')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/news" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/news'); }}>{t('footer.industryNews')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/feedback" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/feedback'); }}>{t('settings.feedback')}</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>{t('footer.toolCategories')}</h4>
            <ul>
              <li>
                <a href="https://www.kunqiongai.com/category/text" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/category/text'); }}>{t('headerNav.textTools')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/category/multimedia" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/category/multimedia'); }}>{t('footer.imageGeneration')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/category/office" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/category/office'); }}>{t('headerNav.officeTools')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/category/file" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/category/file'); }}>{t('headerNav.fileTools')}</a>
              </li>
              <li>
                <a href="https://www.kunqiongai.com/category/development" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/category/development'); }}>{t('footer.codeDevelopment')}</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>{t('footer.contactUs')}</h4>
            <ul className="contact-list">
              <li>
                <img src="https://www.kunqiongai.com/gonsi.png" alt="" className="contact-icon-img" />
                {t('footer.company')}
              </li>
              <li>
                <img src="https://www.kunqiongai.com/dianhua.png" alt="" className="contact-icon-img" />
                17770307066
              </li>
              <li>
                <img src="https://www.kunqiongai.com/weizhi.png" alt="" className="contact-icon-img" />
                {t('footer.address')}
              </li>
              <li>
                <img src="https://www.kunqiongai.com/youxiang.png" alt="" className="contact-icon-img" />
                11247931@qq.com
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright-links">
            <span>{t('footer.copyright')}</span>
            <span className="separator">|</span>
            <a href="https://www.kunqiongai.com/agreement" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/agreement'); }}>{t('footer.userAgreement')}</a>
            <span className="separator">|</span>
            <a href="https://www.kunqiongai.com/privacy" onClick={(e) => { e.preventDefault(); void openExternalUrl('https://www.kunqiongai.com/privacy'); }}>{t('footer.privacyPolicy')}</a>
            <span className="separator">|</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{t('footer.icp')}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
