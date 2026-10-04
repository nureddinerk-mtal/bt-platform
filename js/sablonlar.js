/* =====================================================================
   PROJE EVRAK ŞABLONLARI
   Her şablon adım adım doldurulur; öğrenci "Danışmana gönder" der, danışman onaylar.
   ADIM ve ALAN KİMLİKLERİ (id) DEĞİŞMEZ: doldurulmuş evrak bunlara bağlı.
   Metin ve ipuçları serbestçe düzeltilebilir. Yeni alan = yeni kimlik.

   Alan türleri:
     metin   tek satır            uzun   paragraf (kelime: [en az, en çok])
     secim   açılır liste          coklu  birden çok seçim
     tarih   tarih                 tablo  satır eklenebilir tablo (sutunlar)
     liste   madde madde           dosya  imzalı belge / görsel yükleme
     onay    kutucuk (beyan)       bilgi  sadece açıklama, doldurulmaz
   ===================================================================== */

const ASAMALAR = [
  { id: 'fikir', ad: 'Fikir', ikon: '💡' },
  { id: 'oneri', ad: 'Öneri onayı', ikon: '📝' },
  { id: 'planlama', ad: 'Planlama', ikon: '🗺️' },
  { id: 'gelistirme', ad: 'Geliştirme', ikon: '🛠️' },
  { id: 'test', ad: 'Test', ikon: '🧪' },
  { id: 'rapor', ad: 'Rapor / başvuru', ikon: '📄' },
  { id: 'sunum', ad: 'Sunum', ikon: '🎤' },
  { id: 'bitti', ad: 'Tamamlandı', ikon: '🏁' }
];

const IS_ZAMAN = { tur: 'tablo', sutunlar: ['İş paketi / faaliyet', 'Kim yapacak', 'Başlangıç', 'Bitiş'], ornekSatir: 6 };

const SABLONLAR = {
  /* ------------------------------------------------------------------ */
  genel: {
    ad: 'Proje dosyası',
    kisa: 'Her proje için',
    renk: '#2f5bea',
    aciklama: 'Okulda yürüyen her proje bu dosyayı doldurur. TÜBİTAK ya da TEKNOFEST\'e başvuracak projeler önce bunu, sonra yarışma evrakını doldurur.',
    adimlar: [
      { id: 'kunye', baslik: '1. Proje künyesi', asama: 'fikir',
        aciklama: 'Projenin kimliği. Kısa ve net yaz.',
        alanlar: [
          { id: 'ad', etiket: 'Proje adı', tur: 'metin', ipucu: 'En fazla 15 kelime. Ne yaptığını söylesin: "Kantin Sipariş Uygulaması" gibi.', zorunlu: true },
          { id: 'tur', etiket: 'Proje türü', tur: 'secim', secenekler: ['Web uygulaması', 'Mobil uygulama', 'Oyun', 'Yapay zekâ / veri', 'Donanım / robotik / IoT', 'Ağ / sunucu / siber güvenlik', 'Sosyal medya / dijital pazarlama', 'Araştırma', 'Diğer'], zorunlu: true },
          { id: 'hedef', etiket: 'Hedeflenen yarışma / etkinlik', tur: 'coklu', secenekler: ['Sadece okul içi', 'TÜBİTAK 2204-A', 'TEKNOFEST', 'Bilim fuarı (4006)', 'Diğer yarışma'] },
          { id: 'ekip', etiket: 'Ekip üyeleri ve görevleri', tur: 'tablo', sutunlar: ['Ad Soyad', 'Sınıf', 'Projedeki görevi'], ornekSatir: 3, ipucu: 'Ekip listesi projeden otomatik gelir, sen sadece görevleri yaz.' },
          { id: 'github', etiket: 'GitHub / çalışma klasörü bağlantısı', tur: 'metin', ipucu: 'Henüz yoksa boş bırak.' }
        ] },
      { id: 'oneri', baslik: '2. Proje önerisi', asama: 'oneri',
        aciklama: 'Danışmanın bu adımı onaylayınca proje resmen başlar.',
        alanlar: [
          { id: 'problem', etiket: 'Hangi problemi çözüyorsunuz?', tur: 'uzun', kelime: [40, 200], ipucu: 'Kimin, hangi sorunu? Bu sorunu nereden biliyorsunuz (gözlem, anket, haber)?', zorunlu: true },
          { id: 'amac', etiket: 'Projenin amacı', tur: 'uzun', kelime: [20, 120], ipucu: '"Bu projenin amacı ... ." diye tek paragraf.', zorunlu: true },
          { id: 'hedef_kitle', etiket: 'Kim kullanacak? (hedef kitle)', tur: 'uzun', kelime: [10, 100], zorunlu: true },
          { id: 'cozum', etiket: 'Çözümünüz: ürün ne yapacak?', tur: 'uzun', kelime: [40, 250], zorunlu: true },
          { id: 'ozellikler', etiket: 'Olmazsa olmaz özellikler', tur: 'liste', ipucu: 'Bunlar yoksa proje çalışmaz. 3-6 madde.', zorunlu: true },
          { id: 'olsa_iyi', etiket: 'Olsa iyi olur özellikler', tur: 'liste', ipucu: 'Zaman kalırsa.' },
          { id: 'benzer', etiket: 'Benzer ürünler ve sizin farkınız', tur: 'tablo', sutunlar: ['Benzer ürün / çalışma', 'Ne yapıyor?', 'Bizim farkımız'], ornekSatir: 3, ipucu: 'İnternette ara. Hiç benzeri yoksa neden olmadığını düşün.' },
          { id: 'araclar', etiket: 'Kullanılacak araçlar ve teknolojiler', tur: 'liste', ipucu: 'Dil, kütüphane, program, kart, sensör...' }
        ] },
      { id: 'plan', baslik: '3. İş-zaman planı', asama: 'planlama',
        aciklama: 'Ara tatilleri (16-20 Kasım, 25 Ocak - 5 Şubat, 8-12 Mart) hesaba kat.',
        alanlar: [
          Object.assign({ id: 'is_zaman', etiket: 'İş-zaman çizelgesi', ipucu: 'Her iş paketine sorumlu ve tarih yaz. Tasarım → geliştirme → test → rapor → sunum sırasıyla.', zorunlu: true }, IS_ZAMAN),
          { id: 'kilometre', etiket: 'Kilometre taşları', tur: 'tablo', sutunlar: ['Ne bitmiş olacak?', 'Tarih'], ornekSatir: 4, ipucu: 'Örnek: "İlk çalışan sürüm" — 15 Aralık' }
        ] },
      { id: 'risk', baslik: '4. Riskler ve malzeme', asama: 'planlama',
        alanlar: [
          { id: 'riskler', etiket: 'Risk tablosu', tur: 'tablo', sutunlar: ['Risk', 'Olasılık (1-3)', 'Etki (1-3)', 'Önlem (B planı)'], ornekSatir: 4, ipucu: 'Olasılık × etki 6 ve üzeriyse önlemi mutlaka yaz.', zorunlu: true },
          { id: 'malzeme', etiket: 'Gerekli malzeme ve maliyet', tur: 'tablo', sutunlar: ['Malzeme / hizmet', 'Adet', 'Tahmini fiyat (TL)', 'Nereden?'], ornekSatir: 3, ipucu: 'Yazılım projesinde ücretsiz araçlar yeterliyse "Yok" yaz.' }
        ] },
      { id: 'izin', baslik: '5. İzinler ve etik', asama: 'planlama',
        aciklama: 'Anket, görüşme, fotoğraf ya da kişisel veri varsa izin şart. İmzalı belgeleri tarayıp yükle.',
        alanlar: [
          { id: 'veri', etiket: 'Projede insanlardan veri toplanacak mı?', tur: 'secim', secenekler: ['Hayır', 'Evet: anket', 'Evet: görüşme', 'Evet: fotoğraf / video / ses', 'Evet: başka kişisel veri'], zorunlu: true },
          { id: 'veri_aciklama', etiket: 'Evetse: kimden, ne toplanacak, nasıl korunacak?', tur: 'uzun', kelime: [0, 150] },
          { id: 'veli_izin', etiket: 'Veli izin/onam belgeleri (18 yaş altı katılımcılar ve ekip)', tur: 'dosya' },
          { id: 'kurum_izin', etiket: 'Araştırma uygulama izni (MEB / kurum) varsa', tur: 'dosya' },
          { id: 'beyan', etiket: 'Başkasının kodunu, görselini ya da metnini kaynak göstermeden kullanmayacağımızı beyan ederiz.', tur: 'onay', zorunlu: true }
        ] },
      { id: 'ara_rapor', baslik: '6. Ara rapor', asama: 'gelistirme',
        aciklama: 'Ocak tatilinden önce doldurulur.',
        alanlar: [
          { id: 'yapilan', etiket: 'Şimdiye kadar ne yaptınız?', tur: 'uzun', kelime: [40, 300], zorunlu: true },
          { id: 'plan_fark', etiket: 'Plandan sapma var mı? Neden?', tur: 'uzun', kelime: [0, 150] },
          { id: 'zorluk', etiket: 'Karşılaştığınız zorluklar ve çözümleriniz', tur: 'uzun', kelime: [0, 200] },
          { id: 'ekran', etiket: 'Çalışan kısmın ekran görüntüleri', tur: 'dosya' }
        ] },
      { id: 'test', baslik: '7. Test', asama: 'test',
        alanlar: [
          { id: 'test_tablo', etiket: 'Test tablosu', tur: 'tablo', sutunlar: ['Ne test edildi?', 'Beklenen', 'Olan', 'Sonuç (✓/✗)'], ornekSatir: 5, zorunlu: true },
          { id: 'kullanici_test', etiket: 'Gerçek kullanıcıya denettiniz mi? Ne dediler?', tur: 'uzun', kelime: [0, 200] }
        ] },
      { id: 'sonuc', baslik: '8. Sonuç raporu', asama: 'rapor',
        alanlar: [
          { id: 'ozet', etiket: 'Proje özeti', tur: 'uzun', kelime: [100, 250], ipucu: 'Problem, yöntem, sonuç: başkası sadece bunu okuyup projeyi anlayabilmeli.', zorunlu: true },
          { id: 'sonuclar', etiket: 'Sonuçlar: hangi özellikler çalışıyor?', tur: 'uzun', kelime: [40, 300], zorunlu: true },
          { id: 'eksik', etiket: 'Yapılamayanlar ve nedenleri', tur: 'uzun', kelime: [0, 150] },
          { id: 'oneriler', etiket: 'Projeyi geliştirmek isteyenlere öneriler', tur: 'uzun', kelime: [0, 150] },
          { id: 'kaynaklar', etiket: 'Kaynaklar', tur: 'liste', ipucu: 'Kullandığınız site, video, kitap, kütüphane.' },
          { id: 'demo', etiket: 'Demo / video bağlantısı', tur: 'metin' }
        ] },
      { id: 'sunum', baslik: '9. Sunum ve poster', asama: 'sunum',
        alanlar: [
          { id: 'sunum_dosya', etiket: 'Sunum ya da poster dosyası', tur: 'dosya', zorunlu: true },
          { id: 'sunum_tarih', etiket: 'Sunum tarihi', tur: 'tarih' }
        ] },
      { id: 'degerlendirme', baslik: '10. Öz değerlendirme', asama: 'bitti',
        aciklama: 'Not yok. Bu projede kendini tanıman için.',
        alanlar: [
          { id: 'sevdim', etiket: 'En çok neyi yaparken keyif aldın?', tur: 'uzun', kelime: [10, 150], zorunlu: true },
          { id: 'sevmedim', etiket: 'Neyi hiç sevmedin?', tur: 'uzun', kelime: [0, 150] },
          { id: 'ogrendim', etiket: 'Bu projede ne öğrendin?', tur: 'uzun', kelime: [10, 200], zorunlu: true },
          { id: 'tekrar', etiket: 'Bir daha yapsan neyi farklı yapardın?', tur: 'uzun', kelime: [0, 150] }
        ] }
    ]
  },

  /* ------------------------------------------------------------------ */
  tubitak2204: {
    ad: 'TÜBİTAK 2204-A',
    kisa: 'Lise Öğrencileri Araştırma Projeleri',
    renk: '#b91c1c',
    aciklama: '2027 çağrısı: başvurular 23 Eylül 2026 - 4 Ocak 2027 (sistem son gün 17.30\'da kapanır). En çok 3 öğrenci, en çok 1 danışman. Rapor Türkçe, tek PDF, 2-20 sayfa, kişisel bilgi içermez. Başvurudan önce güncel çağrı metnini ve Proje Yazım Şablonunu tubitak.gov.tr\'den kontrol edin.',
    kaynak: 'https://tubitak.gov.tr/tr/yarismalar/2204-lise-ogrencileri-arastirma-projeleri-yarismasi',
    adimlar: [
      { id: 'basvuru', baslik: '1. Başvuru bilgileri', asama: 'oneri',
        alanlar: [
          { id: 'ad', etiket: 'Proje adı', tur: 'metin', ipucu: 'En fazla 15 kelime.', kelime: [1, 15], zorunlu: true },
          { id: 'ana_alan', etiket: 'Ana alan', tur: 'secim', secenekler: ['Yazılım', 'Teknolojik Tasarım', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Coğrafya', 'Tarih', 'Sosyoloji', 'Psikoloji', 'Türk Dili ve Edebiyatı', 'Değerler Eğitimi'], zorunlu: true },
          { id: 'tematik', etiket: 'Tematik alan', tur: 'metin', ipucu: 'Çağrı metnindeki listeden: Yapay Zekâ, Robotik ve Kodlama, Siber Güvenlik, STEAM...', zorunlu: true },
          { id: 'il', etiket: 'Başvuru yapılan il', tur: 'metin', ipucu: 'İstanbul (ekip farklı illerdeyse gerekçe gerekir).' },
          { id: 'ekip_kontrol', etiket: 'Ekip en çok 3 öğrenci ve her öğrenci sadece bu projeyle başvuruyor.', tur: 'onay', zorunlu: true }
        ] },
      { id: 'ozet', baslik: '2. Proje özeti', asama: 'rapor',
        alanlar: [
          { id: 'ozet', etiket: 'Özet', tur: 'uzun', kelime: [150, 250], ipucu: 'Amaç, yöntem, beklenen/elde edilen sonuç. Kaynak ve şekil yok.', zorunlu: true },
          { id: 'anahtar', etiket: 'Anahtar kelimeler (3-5)', tur: 'metin', zorunlu: true }
        ] },
      { id: 'amac', baslik: '3. Amaç', asama: 'rapor',
        alanlar: [
          { id: 'amac', etiket: 'Amaç', tur: 'uzun', kelime: [30, 200], ipucu: 'Projede neyi araştırdığınızı / geliştirdiğinizi açık ve ölçülebilir biçimde yazın.', zorunlu: true }
        ] },
      { id: 'giris', baslik: '4. Giriş', asama: 'rapor',
        alanlar: [
          { id: 'giris', etiket: 'Giriş', tur: 'uzun', kelime: [150, 1200], ipucu: 'Konunun önemi, alandaki benzer çalışmalar (kaynak göstererek), projenizin bunlardan farkı ve özgün yönü.', zorunlu: true }
        ] },
      { id: 'yontem', baslik: '5. Yöntem', asama: 'planlama',
        alanlar: [
          { id: 'yontem', etiket: 'Yöntem', tur: 'uzun', kelime: [150, 1500], ipucu: 'Ne yaptınız, nasıl yaptınız, hangi araç ve malzemelerle? Yazılım projesinde: kullanılan dil/kütüphane, sistem tasarımı (şema), veri, test yöntemi. Başkası okuyup tekrarlayabilmeli.', zorunlu: true },
          { id: 'sema', etiket: 'Sistem şeması / akış diyagramı / fotoğraflar', tur: 'dosya' }
        ] },
      { id: 'is_zaman', baslik: '6. Proje iş-zaman çizelgesi', asama: 'planlama',
        alanlar: [
          Object.assign({ id: 'cizelge', etiket: 'İş-zaman çizelgesi', ipucu: 'Literatür taraması, tasarım, geliştirme, test, raporlama gibi iş paketleri ve ayları.', zorunlu: true }, IS_ZAMAN)
        ] },
      { id: 'bulgular', baslik: '7. Bulgular', asama: 'test',
        alanlar: [
          { id: 'bulgular', etiket: 'Bulgular', tur: 'uzun', kelime: [100, 1500], ipucu: 'Elde ettiğiniz sonuçlar: test tabloları, grafikler, ekran görüntüleri. Yorum değil, sonuç.', zorunlu: true },
          { id: 'gorseller', etiket: 'Tablo, grafik, ekran görüntüleri', tur: 'dosya' }
        ] },
      { id: 'sonuc', baslik: '8. Sonuç, tartışma ve öneriler', asama: 'rapor',
        alanlar: [
          { id: 'sonuc', etiket: 'Sonuç ve tartışma', tur: 'uzun', kelime: [100, 800], ipucu: 'Amacınıza ulaştınız mı? Sonuçlarınız benzer çalışmalarla nasıl karşılaştırılır?', zorunlu: true },
          { id: 'oneriler', etiket: 'Öneriler', tur: 'uzun', kelime: [30, 400], ipucu: 'Proje nasıl geliştirilebilir, kim nerede kullanabilir?' }
        ] },
      { id: 'kaynaklar', baslik: '9. Kaynaklar', asama: 'rapor',
        alanlar: [
          { id: 'kaynaklar', etiket: 'Kaynaklar', tur: 'liste', ipucu: 'Rehberdeki kaynak yazım kuralına göre. Metinde atıf yapılmayan kaynak yazılmaz.', zorunlu: true }
        ] },
      { id: 'etik', baslik: '10. Etik ve izin belgeleri', asama: 'rapor',
        aciklama: 'Ek belgeler kısmına yüklenecekler. Anket/görüşme varsa izin ve onamlar zorunlu.',
        alanlar: [
          { id: 'etik_form', etiket: 'Bilimsel Etik Formu (imzalı)', tur: 'dosya', zorunlu: true },
          { id: 'uygulama_izni', etiket: 'Araştırma Uygulama İzin Belgesi (MEB kurumlarında anket/uygulama varsa)', tur: 'dosya' },
          { id: 'onam', etiket: 'Katılımcı ve veli izin/onam belgeleri (18 yaş altı)', tur: 'dosya' },
          { id: 'video', etiket: 'Tanıtım videosu (isteğe bağlı: mp4, en çok 3 dk, 10 MB)', tur: 'metin', ipucu: 'Bağlantı yaz.' }
        ] },
      { id: 'kontrol', baslik: '11. Gönderim öncesi kontrol', asama: 'rapor',
        alanlar: [
          { id: 'k1', etiket: 'Rapor Proje Yazım Şablonuna göre, Türkçe, 2-20 sayfa ve tek PDF.', tur: 'onay', zorunlu: true },
          { id: 'k2', etiket: 'Raporda öğrenci, danışman ve okul adı gibi kişisel bilgi yok.', tur: 'onay', zorunlu: true },
          { id: 'k3', etiket: 'PDF dosya adı 25 karakteri geçmiyor, boyutu 10 MB altında.', tur: 'onay', zorunlu: true },
          { id: 'k4', etiket: 'Danışman başvuruyu sistemden onayladı.', tur: 'onay', zorunlu: true },
          { id: 'rapor_pdf', etiket: 'Gönderilen rapor PDF\'i', tur: 'dosya', zorunlu: true },
          { id: 'basvuru_no', etiket: 'Başvuru numarası', tur: 'metin' }
        ] },
      { id: 'sergi', baslik: '12. Bölge sergisi hazırlığı', asama: 'sunum',
        aciklama: 'Ön değerlendirmeyi geçerse. Bölge puanının %30\'u ön değerlendirmeden gelir.',
        alanlar: [
          { id: 'poster', etiket: 'Poster dosyası', tur: 'dosya' },
          { id: 'sunum_metni', etiket: '3 dakikalık sunum metni', tur: 'uzun', kelime: [0, 450] },
          { id: 'sorular', etiket: 'Jürinin sorabileceği sorular ve cevaplarımız', tur: 'tablo', sutunlar: ['Soru', 'Cevabımız'], ornekSatir: 5 },
          { id: 'malzeme', etiket: 'Stantta olacaklar (bilgisayar, prototip, uzatma kablosu...)', tur: 'liste' }
        ] }
    ]
  },

  /* ------------------------------------------------------------------ */
  teknofest: {
    ad: 'TEKNOFEST',
    kisa: 'Ön değerlendirme ve proje detay raporu',
    renk: '#0e7490',
    aciklama: 'Lise kategorileri (ör. İnsanlık Yararına Teknolojiler: Akıllı Teknolojiler ve Sistem Tasarımı · Sağlık ve İyi Yaşam · Eğitim, Kültür ve Dijital Deneyim). En çok 6 öğrenci + danışman. 2027 takvimi henüz açıklanmadı; 2026\'da başvuru 28 Şubat, ön değerlendirme raporu 27 Mart\'taydı. Başlıklar yarışmanın güncel şartnamesine ve rapor şablonuna göre son kez kontrol edilmelidir.',
    kaynak: 'https://www.teknofest.org/tr/yarismalar/',
    adimlar: [
      { id: 'basvuru', baslik: '1. Yarışma ve başvuru', asama: 'oneri',
        alanlar: [
          { id: 'yarisma', etiket: 'Yarışma adı', tur: 'metin', ipucu: 'Ör. İnsanlık Yararına Teknolojiler Yarışması - Lise Seviyesi', zorunlu: true },
          { id: 'kategori', etiket: 'Kategori', tur: 'metin', zorunlu: true },
          { id: 'takim', etiket: 'Takım adı', tur: 'metin', zorunlu: true },
          { id: 'sartname', etiket: 'Güncel şartnameyi ekip olarak okuduk.', tur: 'onay', zorunlu: true },
          { id: 'son_tarih', etiket: 'Başvuru son tarihi', tur: 'tarih' }
        ] },
      { id: 'ozet', baslik: '2. Proje özeti (proje tanımı)', asama: 'oneri',
        alanlar: [
          { id: 'ozet', etiket: 'Proje özeti', tur: 'uzun', kelime: [100, 300], ipucu: 'Proje ne, kime, nasıl fayda sağlıyor? Jüri sadece bunu okusa anlamalı.', zorunlu: true }
        ] },
      { id: 'problem', baslik: '3. Problem / sorun', asama: 'oneri',
        alanlar: [
          { id: 'problem', etiket: 'Problem / sorun', tur: 'uzun', kelime: [80, 500], ipucu: 'Sorunun büyüklüğünü veriyle gösterin (istatistik, haber, anket) ve kaynak verin.', zorunlu: true }
        ] },
      { id: 'cozum', baslik: '4. Çözüm', asama: 'planlama',
        alanlar: [
          { id: 'cozum', etiket: 'Çözüm', tur: 'uzun', kelime: [80, 600], zorunlu: true },
          { id: 'cizim', etiket: 'Taslak çizim / ekran tasarımı / blok şema', tur: 'dosya' }
        ] },
      { id: 'yontem', baslik: '5. Yöntem', asama: 'planlama',
        alanlar: [
          { id: 'yontem', etiket: 'Yöntem', tur: 'uzun', kelime: [80, 800], ipucu: 'Kullanılacak teknolojiler, algoritma, donanım, yazılım mimarisi, adım adım geliştirme süreci.', zorunlu: true }
        ] },
      { id: 'ozgun', baslik: '6. Yenilikçi (özgün) yönü', asama: 'planlama',
        alanlar: [
          { id: 'ozgun', etiket: 'Yenilikçi yönü', tur: 'uzun', kelime: [50, 400], ipucu: 'Benzerlerinden farkı ne? Benzer çözümleri isimleriyle karşılaştırın.', zorunlu: true },
          { id: 'benzer', etiket: 'Benzer çözümler karşılaştırması', tur: 'tablo', sutunlar: ['Benzer çözüm', 'Eksik yönü', 'Bizim çözümümüz'], ornekSatir: 3 }
        ] },
      { id: 'uygulanabilirlik', baslik: '7. Uygulanabilirlik', asama: 'planlama',
        alanlar: [
          { id: 'uygulanabilirlik', etiket: 'Uygulanabilirlik', tur: 'uzun', kelime: [50, 400], ipucu: 'Gerçekte üretilebilir/kullanılabilir mi? Ticari ürüne dönüşebilir mi? Gerekli altyapı var mı?', zorunlu: true }
        ] },
      { id: 'maliyet', baslik: '8. Tahmini maliyet ve proje zaman planlaması', asama: 'planlama',
        alanlar: [
          { id: 'maliyet', etiket: 'Maliyet tablosu', tur: 'tablo', sutunlar: ['Malzeme / hizmet', 'Adet', 'Birim fiyat (TL)', 'Toplam (TL)'], ornekSatir: 4, zorunlu: true },
          Object.assign({ id: 'zaman', etiket: 'Zaman planı', zorunlu: true }, IS_ZAMAN)
        ] },
      { id: 'hedef_kitle', baslik: '9. Projenin fayda sağlayacağı hedef kitle', asama: 'planlama',
        alanlar: [
          { id: 'hedef_kitle', etiket: 'Hedef kitle (kullanıcılar)', tur: 'uzun', kelime: [30, 300], zorunlu: true }
        ] },
      { id: 'riskler', baslik: '10. Riskler', asama: 'planlama',
        alanlar: [
          { id: 'riskler', etiket: 'Risk tablosu ve B planları', tur: 'tablo', sutunlar: ['Risk', 'Olasılık', 'Etki', 'B planı'], ornekSatir: 4, zorunlu: true }
        ] },
      { id: 'kaynaklar', baslik: '11. Kaynaklar', asama: 'rapor',
        alanlar: [
          { id: 'kaynaklar', etiket: 'Kaynaklar', tur: 'liste', zorunlu: true }
        ] },
      { id: 'odr_gonder', baslik: '12. Ön değerlendirme raporu gönderimi', asama: 'rapor',
        alanlar: [
          { id: 'k1', etiket: 'Rapor yarışmanın şablonuyla ve sayfa sınırına uygun hazırlandı.', tur: 'onay', zorunlu: true },
          { id: 'k2', etiket: 'Tüm görsellere ve verilere kaynak verildi.', tur: 'onay', zorunlu: true },
          { id: 'odr_pdf', etiket: 'Gönderilen ön değerlendirme raporu (PDF)', tur: 'dosya', zorunlu: true },
          { id: 'odr_tarih', etiket: 'Gönderim tarihi', tur: 'tarih' }
        ] },
      { id: 'pdr', baslik: '13. Proje detay raporu / sunum (ön elemeyi geçerse)', asama: 'gelistirme',
        alanlar: [
          { id: 'gelisme', etiket: 'Ön değerlendirmeden bu yana yapılanlar', tur: 'uzun', kelime: [0, 800] },
          { id: 'prototip', etiket: 'Prototip / çalışan ürün görselleri ve video bağlantısı', tur: 'dosya' },
          { id: 'test', etiket: 'Test sonuçları', tur: 'tablo', sutunlar: ['Test', 'Sonuç'], ornekSatir: 4 },
          { id: 'pdr_pdf', etiket: 'Gönderilen proje detay raporu / sunum dosyası', tur: 'dosya' }
        ] }
    ]
  }
};

/* Evrakta doldurulmuş alanı say (zorunlu alan kontrolü) */
function alanDolu(alan, deger) {
  if (alan.tur === 'bilgi') return true;
  if (alan.tur === 'dosya') return Array.isArray(deger) && deger.length > 0;
  if (alan.tur === 'onay') return deger === true;
  if (alan.tur === 'tablo') return Array.isArray(deger) && deger.some(r => r.some(c => String(c || '').trim()));
  if (alan.tur === 'liste' || alan.tur === 'coklu') return Array.isArray(deger) && deger.some(x => String(x || '').trim());
  return String(deger || '').trim().length > 0;
}
function kelimeSay(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }
function alanSorunu(alan, deger) {
  if (alan.zorunlu && !alanDolu(alan, deger)) return 'boş';
  if (alan.kelime && (alan.tur === 'uzun' || alan.tur === 'metin') && String(deger || '').trim()) {
    const n = kelimeSay(deger);
    if (alan.kelime[0] && n < alan.kelime[0]) return 'en az ' + alan.kelime[0] + ' kelime (' + n + ')';
    if (alan.kelime[1] && n > alan.kelime[1]) return 'en çok ' + alan.kelime[1] + ' kelime (' + n + ')';
  }
  return null;
}

export { SABLONLAR, ASAMALAR, alanDolu, alanSorunu, kelimeSay };
