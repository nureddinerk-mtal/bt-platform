/* =====================================================================
   SUPABASE BAĞLANTISI
   Supabase → Project Settings → API Keys bölümündeki iki değeri buraya yaz.
   Buraya sadece "anon / publishable" anahtar yazılır. service_role / secret ASLA yazılmaz.
   ===================================================================== */
// Hangi Supabase projesine bağlanılacak: 'canli' (gerçek veriler) ya da 'gelistirme' (öğrenci ekibi, uydurma veriler)
export const ORTAM = 'canli';
const ORTAMLAR = {
  canli:      { url: 'https://hmeozxkqfnfbnmkstggs.supabase.co', anahtar: 'sb_publishable_XhgQiVH4EZrYVS7zht_xyA_dqORgbSR' },  // bt-platform-canli
  gelistirme: { url: 'https://ufoducmoouzuqdkfiujv.supabase.co', anahtar: 'sb_publishable_G7QWVqSZ2lbfdFSJzlkPrQ_4iXnErhV' }   // bt-platform-gelistirme
};
export const SUPABASE_URL = ORTAMLAR[ORTAM].url;
export const SUPABASE_ANON_KEY = ORTAMLAR[ORTAM].anahtar;

// Kullanıcı adı → giriş e-postası (veritabanındaki hesap_eposta fonksiyonuyla aynı olmalı)
export const EPOSTA_UZANTI = '@ogr.evrakurek.com.tr';

// Ekran kaydı yedek sayfası (okulda platform içi kayıt açılmazsa)
export const KAYIT_ADRESI = 'https://ceydadogan.github.io/gecici/kayit.html';

// Menü artık veritabanındaki "moduller" tablosundan gelir (Yönetim → Ayarlar → Modüller).
