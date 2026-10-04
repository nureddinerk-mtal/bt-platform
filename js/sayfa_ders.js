/* Dersler, ders sayfası, teslim, inceleme, sınıf durumu, içerik düzenleme */
import { sb, S, $, $$, esc, bicim, q, tost, hata, modal, modalKapat, ogretmen, yonetici, moderator, ders, guzelAd, adi, DURUM_AD, DURUM_IKON, tarihYaz, once, kalanYaz, gorevListesi, ekGorevKime, sinifOgrencileri, haftaSonTeslim, semaHtml, imzaliUrl, dosyaYukle, dosyaSec, gorselKucult, guvenliAd, secenekler, formVeri, csvIndir } from './ortak.js';
import { KAYIT_ADRESI } from './ayar.js';

/* ================= DERS LİSTESİ ================= */
export async function dersler(el, p) {
  if (p[0]) return dersSayfasi(el, p[0], p[1] ? Number(p[1]) : null, p[2]);
  const o = ogretmen();
  const icerik = await q(sb.from('hafta_icerik').select('ders_kodu,hafta,yayinda,icerik->>konu').order('hafta'));
  const liste = o ? S.dersler : S.dersler.filter(d => d.sinif === S.ben.sinif);
  let h = '<div class="bas-satir"><h1>' + (o ? 'Dersler' : 'Derslerim') + '</h1>' + (o ? '<button class="btn kucuk" id="yeniHafta">+ Yeni hafta içeriği</button>' : '') + '</div>';
  h += '<div class="izgara iki">';
  liste.forEach(d => {
    const hs = icerik.filter(x => x.ders_kodu === d.kod);
    h += '<div class="kart ders-kart" style="--ders:' + d.renk + ';cursor:default"><div class="etiket">' + esc(d.sinif) + ' · ' + esc(d.zaman || '') + '</div><h3 style="margin-top:4px">' + esc(d.ad) + '</h3>' +
      (d.proje_aciklama ? '<div class="mini" style="margin-bottom:10px">' + esc(d.proje_aciklama) + '</div>' : '') +
      '<div class="satir">' + (hs.length ? hs.map(x => '<a class="btn kucuk ' + (x.hafta === S.hafta ? 'ana' : '') + '" href="#/dersler/' + d.kod + '/' + x.hafta + '">' + x.hafta + '. hafta' + (x.yayinda ? '' : ' (taslak)') + '</a>').join('') : '<span class="alt">İçerik yok</span>') + '</div></div>';
  });
  h += '</div>';
  el.innerHTML = h;
  if (o) $('#yeniHafta').onclick = () => icerikDuzenle(null, null, () => dersler(el, []));
}

/* ================= DERS SAYFASI ================= */
async function dersSayfasi(el, kod, hafta, odakGorev) {
  const d = ders(kod); if (!d) { el.innerHTML = '<div class="kart">Ders bulunamadı.</div>'; return; }
  const o = ogretmen();
  const hs = await q(sb.from('hafta_icerik').select('hafta,yayinda').eq('ders_kodu', kod).order('hafta'));
  if (!hafta) hafta = (hs.filter(x => x.hafta <= S.hafta).pop() || hs[hs.length - 1] || {}).hafta;
  if (!hafta) { el.innerHTML = '<a class="btn kucuk" href="#/dersler">← Dersler</a><div class="kart" style="margin-top:12px">Bu ders için henüz içerik yok.</div>'; return; }
  const [kayit, ogr, materyal, odevler, teslimler, istisna, ekler] = await Promise.all([
    q(sb.from('hafta_icerik').select('*').eq('ders_kodu', kod).eq('hafta', hafta).maybeSingle()),
    o ? q(sb.from('hafta_ogretmen').select('*').eq('ders_kodu', kod).eq('hafta', hafta).maybeSingle()) : null,
    q(sb.from('materyaller').select('*').eq('ders_kodu', kod).eq('hafta', hafta).order('olusturma')),
    q(sb.from('isler').select('*').eq('ders_kodu', kod).eq('hafta', hafta).is('proje_id', null).order('olusturma')),
    o ? q(sb.from('teslimler').select('id,ogrenci_id,gorev_id,durum').eq('ders_kodu', kod).eq('hafta', hafta))
      : q(sb.from('teslimler').select('*').eq('ogrenci_id', S.ben.id).eq('ders_kodu', kod).eq('hafta', hafta)),
    o ? [] : q(sb.from('teslim_istisna').select('*').eq('ders_kodu', kod).eq('hafta', hafta)),
    q(sb.from('ek_gorevler').select('*').eq('ders_kodu', kod).eq('hafta', hafta).order('olusturma'))
  ]);
  if (!kayit) { el.innerHTML = '<div class="kart">Bu hafta için içerik yok.</div>'; return; }
  const ic = kayit.icerik, oi = (ogr && ogr.icerik) || {};
  const sonTeslim = haftaSonTeslim(kod, hafta, kayit.son_teslim);
  const ekSure = istisna.filter(i => new Date(i.bitis) > new Date()).map(i => new Date(i.bitis)).sort((a, b) => b - a)[0];
  const acik = o || new Date() <= sonTeslim || !!ekSure;
  const D = { kod, hafta, d, ic, oi, teslimler, acik, sonTeslim, ekSure, ek: ekler };
  S._ders = D;

  el.style.setProperty('--ders', d.renk);
  let h = '<div class="satir" style="margin-bottom:14px"><a class="btn kucuk" href="#/dersler">← Dersler</a>' +
    (o ? '<button class="btn kucuk" id="projBtn">⛶ Projeksiyon</button>' + (moderator(d) ? '<button class="btn kucuk" id="duzBtn">✏️ İçeriği düzenle</button>' : '') + '<button class="btn kucuk" id="matBtn">+ Örnek / dosya</button><button class="btn kucuk" id="odevBtn">+ Uygulama / ödev ekle</button>' + (moderator(d) ? '<button class="btn kucuk" id="sureBtn">⏰ Teslim süresi</button>' : '') + '<a class="btn kucuk" href="#/durum/' + kod + '/' + hafta + '">📊 Sınıf durumu</a>' : '') + '</div>';

  h += '<div class="ders-bas"><div class="ust-satir">' + esc(d.sinif) + ' · ' + esc(d.ad) + (ic.unite ? ' · ' + esc(ic.unite) : '') + '</div>' +
    '<h1>' + esc(ic.konu || '') + '</h1>' + (ic.hedef ? '<div class="hedef">🎯 ' + bicim(ic.hedef) + '</div>' : '') +
    (d.proje_aciklama ? '<div class="proje-rozet"><b>Yıl boyu proje:</b> ' + esc(d.proje_aciklama) + '</div>' : '') +
    '<div class="mini" style="color:#fff;opacity:.9;margin-top:8px">' + hafta + '. hafta' + (ic.tarih ? ' · ' + esc(ic.tarih) : '') + (ic.sure ? ' · ' + esc(ic.sure) : '') +
    ' · Son teslim: <b>' + tarihYaz(sonTeslim, true) + '</b>' + (ekSure ? ' (sana ek süre: ' + tarihYaz(ekSure, true) + ')' : '') + (kayit.yayinda ? '' : ' · TASLAK (öğrenciler görmüyor)') + '</div></div>';

  if (hs.length > 1) h += '<div class="hafta-sekme">' + hs.map(x => '<a class="' + (x.hafta === hafta ? 'secili' : '') + '" style="border:1px solid var(--cizgi);background:' + (x.hafta === hafta ? 'var(--yazi);color:#fff' : '#fff') + ';border-radius:99px;padding:5px 14px;font-weight:800;text-decoration:none;color:' + (x.hafta === hafta ? '#fff' : 'inherit') + '" href="#/dersler/' + kod + '/' + x.hafta + '">' + x.hafta + '. hafta</a>').join('') + '</div>';

  if (!acik) h += '<div class="kilit" style="margin-top:14px">🔒 Bu haftanın teslim süresi ' + tarihYaz(sonTeslim, true) + ' tarihinde doldu. Yine de içeriği çalışabilirsin. Ek süre için öğretmenine yaz.</div>';

  if (o && oi.akis) h += '<div class="ogretmen-not"><h3>Ders akışı (sadece öğretmenler görür)</h3><ul style="margin:6px 0 0;padding-left:20px">' + oi.akis.map(a => '<li>' + bicim(a) + '</li>').join('') + '</ul></div>';
  if (o && oi.ogretmen && oi.ogretmen.length) h += '<div class="ogretmen-not"><h3>Öğretmen yapılacakları</h3><ul style="margin:6px 0 0;padding-left:20px">' + oi.ogretmen.map(a => '<li>' + bicim(a.metin) + '</li>').join('') + '</ul></div>';

  // ödev kartları (içerikteki linkler + öğretmenin verdiği ödevler)
  (ic.odevler || []).filter(x => /^https?:\/\//i.test(String(x.link || ''))).forEach(x => {
    h += '<a class="odev-kart" href="' + esc(x.link) + '" target="_blank" rel="noopener"><span class="odev-ikon">📚</span><span class="odev-metin"><small>Bu haftanın ödevi</small><b>' + esc(x.baslik || 'Ödev') + '</b>' + (x.aciklama ? '<span>' + bicim(x.aciklama) + '</span>' : '') + (x.sonTarih ? '<span class="odev-tarih">Son teslim: ' + esc(x.sonTarih) + '</span>' : '') + '</span><span class="odev-ac">Aç →</span></a>';
  });
  odevler.forEach(x => {
    h += '<a class="odev-kart" href="#/islerim"><span class="odev-ikon">📌</span><span class="odev-metin"><small>' + (x.tur === 'odev' ? 'Ödev' : 'Görev') + '</small><b>' + esc(x.baslik) + '</b>' + (x.aciklama ? '<span>' + bicim(x.aciklama.slice(0, 200)) + '</span>' : '') + (x.son_tarih ? '<span class="odev-tarih">Son tarih: ' + tarihYaz(x.son_tarih, true) + ' · ' + kalanYaz(x.son_tarih) + '</span>' : '') + '</span><span class="odev-ac">' + (x.teslim_gerekli ? 'Teslim et →' : 'Aç →') + '</span></a>';
  });

  // materyaller
  if (materyal.length) {
    h += '<h2>Örnekler ve dosyalar</h2><div class="kart liste">' + materyal.map(m => '<div class="liste-satir"><span>' + ({ ornek: '🧩', dosya: '📎', link: '🔗', video: '🎬' }[m.tur] || '📎') + '</span><span class="ana-m"><b>' + esc(m.baslik) + '</b>' + (m.aciklama ? '<span class="mini">' + bicim(m.aciklama) + '</span>' : '') + '</span>' +
      (o && !m.ogrenci_gorur ? '<span class="cip bos">sadece öğretmen</span>' : '') +
      (m.dosya_yolu ? '<button class="btn kucuk" data-mat="' + esc(m.dosya_yolu) + '">İndir</button>' : '') + (m.link ? '<a class="btn kucuk" href="' + esc(m.link) + '" target="_blank" rel="noopener">Aç</a>' : '') +
      (o ? '<button class="btn kucuk hayalet" data-matsil="' + m.id + '" title="Sil">🗑</button>' : '') + '</div>').join('') + '</div>';
  }

  if (ic.isinma) h += '<div class="isinma"><b>💬 Isınma:</b><span>' + bicim(ic.isinma) + '</span></div>';

  if (ic.teori && ic.teori.length) {
    h += '<h2>Kısaca bilgi</h2><div class="izgara uc">';
    ic.teori.forEach((t, i) => {
      h += '<div class="kart teori-kart' + (t.sema || t.not ? ' sema-var' : '') + '"><h3><span class="no">' + (i + 1) + '</span>' + esc(t.baslik) + '</h3>' + (t.metin ? '<p>' + bicim(t.metin) + '</p>' : '') + semaHtml(t) + (t.kod ? '<pre>' + esc(t.kod) + '</pre>' : '') + '</div>';
    });
    h += '</div>';
  }

  const gl = gorevListesi(ic, D.ek);
  if (gl.length) {
    h += '<h2>Uygulamalar</h2>';
    gl.forEach((g, i) => {
      if (o && oi.goster && oi.goster[g.id]) h += gosterKart(oi.goster[g.id]);
      h += gorevKart(D, g, i);
    });
  }

  if (ic.test && ic.test.length) {
    h += '<h2>Kendini dene</h2><div class="kart" id="testKutu">' + ic.test.map((qq, qi) => '<div class="soru" data-q="' + qi + '"><b>' + (qi + 1) + '. ' + bicim(qq.soru) + '</b>' +
      qq.secenekler.map((s, si) => '<button class="secenek" data-qi="' + qi + '" data-si="' + si + '">' + esc(s) + '</button>').join('') + '<div class="aciklama"></div></div>').join('') + '<div id="testSonuc" class="mini"></div></div>';
  }
  el.innerHTML = h;
  baglaDers(el, D);
  if (odakGorev) { const g = document.getElementById('gorev-' + odakGorev); if (g) setTimeout(() => g.scrollIntoView({ behavior: 'smooth' }), 80); }
}

function gosterKart(g) {
  return '<details class="ogretmen-not goster-kart" style="margin:0 0 10px"><summary style="cursor:pointer;font-weight:800">🎬 Göster-yaptır: ' + esc(g.baslik) + (g.sure ? ' · ' + esc(g.sure) : '') + (g.dosya ? ' · <code>' + esc(g.dosya) + '</code>' : '') + '</summary>' +
    '<ol class="adimlar" style="margin-top:8px">' + (g.adimlar || []).map(a => '<li>' + bicim(a) + '</li>').join('') + '</ol>' + (g.kod ? '<pre>' + esc(g.kod) + '</pre><button class="btn kucuk" data-kopyala="' + esc(g.kod) + '">Kopyala</button>' : '') + '</details>';
}

function gorevKart(D, g, i) {
  const o = ogretmen(), anahtar = D.kod + '|' + D.hafta + '|' + g.id;
  const t = o ? null : D.teslimler.find(x => x.gorev_id === g.id);
  const durum = t ? t.durum : 'bos';
  let h = '<div class="kart gorev" id="gorev-' + esc(g.id) + '"><div class="gorev-bas"><div class="gno"' + (g.bonus ? ' style="background:#1f2328;color:#ffd166"' : '') + '>' + (g.bonus ? '⭐' : i + 1) + '</div><h3>' + esc(g.baslik) + '</h3>' +
    (g.sure ? '<span class="cip bos">⏱ ' + esc(g.sure) + '</span>' : '') + (g.tur === 'odev' ? '<span class="cip turuncu">Ödev</span>' : '') +
    (g.ek ? '<span class="cip bos" title="Öğretmen ekledi">👩‍🏫 ' + esc(adi(g.ek.olusturan)) + (g.ek.hedef_grup ? ' · ' + esc(g.ek.hedef_grup) + ' grubu' : '') + '</span>' : '');
  if (o && g.ek && (g.ek.olusturan === S.ben.id || yonetici())) h += '<button class="btn kucuk hayalet" data-ekduz="' + g.ek.id + '" title="Düzenle">✏️</button><button class="btn kucuk hayalet" data-eksil="' + g.ek.id + '" title="Sil">🗑</button>';
  if (o) {
    const ogr = sinifOgrencileri(D.d.sinif).filter(x => ekGorevKime(g, x)), c = { onaylandi: 0, bekliyor: 0, duzeltme: 0 };
    D.teslimler.filter(x => x.gorev_id === g.id).forEach(x => c[x.durum]++);
    h += '<span class="cip onaylandi">' + c.onaylandi + ' ✓</span><span class="cip bekliyor">' + c.bekliyor + ' bekliyor</span>' + (c.duzeltme ? '<span class="cip duzeltme">' + c.duzeltme + ' düzeltme</span>' : '') + '<span class="cip bos">' + ogr.length + ' öğrenci</span>';
  } else h += '<span class="cip ' + durum + '">' + DURUM_AD[durum] + '</span>';
  h += '</div>';
  const glink = g.link && /^https?:\/\//i.test(String(g.link.url || '')) ? g.link : null;
  h += '<div class="gorev-ic"><div>' + (glink ? '<a class="btn kucuk" style="margin-bottom:10px;background:#fff7e6;border-color:#f59e0b" href="' + esc(glink.url) + '" target="_blank" rel="noopener">▶ ' + esc(glink.baslik || 'Kaynağı aç') + '</a>' : '') +
    '<ol class="adimlar">' + (g.adimlar || []).map(a => '<li>' + bicim(a) + '</li>').join('') + '</ol>' + (g.kod ? '<pre>' + esc(g.kod) + '</pre>' : '') + (g.ipucu ? '<div class="ipucu">💡 ' + bicim(g.ipucu) + '</div>' : '') + '</div>';
  h += '<div class="birak-alan"><div class="kanit"><b>Ne yükleyeceksin?</b>' + bicim(g.kanit || 'Yaptığın çalışmanın ekran görüntüsü.') + '</div>';
  if (o) h += '<a class="btn kucuk" href="#/durum/' + D.kod + '/' + D.hafta + '">Sınıf durumunu gör →</a>';
  else if (durum === 'onaylandi') {
    h += '<div class="onay-kutu"><div class="tik">✓</div><b>Onaylandı!</b></div>' + (t.geri_bildirim ? '<div class="geri-bildirim onaylandi">💬 ' + esc(t.geri_bildirim) + '</div>' : '') + '<button class="btn kucuk" data-goster="' + t.id + '">Gönderdiğimi gör</button>';
  } else if (!D.acik) {
    h += (t ? '<div class="geri-bildirim" style="background:var(--sari-a)">Durum: ' + DURUM_AD[durum] + (t.geri_bildirim ? ' · ' + esc(t.geri_bildirim) : '') + '</div><button class="btn kucuk" data-goster="' + t.id + '">Gönderdiğimi gör</button>' : '') + '<div class="kilit">🔒 Teslim süresi doldu.</div>';
  } else {
    if (durum === 'duzeltme') h += '<div class="geri-bildirim duzeltme">✏️ Öğretmenin: ' + esc(t.geri_bildirim || 'Lütfen düzeltip yeniden gönder.') + '</div>';
    if (durum === 'bekliyor') h += '<div class="geri-bildirim" style="background:var(--sari-a);color:#713f12">Gönderdin, öğretmenin inceleyecek. İstersen yenisiyle değiştirebilirsin.</div>';
    const on = S.onizleme[anahtar], vid = g.medya === 'video';
    h += '<div class="birak" tabindex="0" data-anahtar="' + esc(anahtar) + '" data-gorev="' + esc(g.id) + '" data-medya="' + (vid ? 'video' : 'gorsel') + '">' +
      (on ? (on.tur === 'video' ? '<video src="' + on.url + '" controls muted playsinline></video>' : '<img src="' + on.url + '" alt="önizleme">') + '<div class="mini" style="margin-top:6px">Değiştirmek için tekrar tıkla ya da yeni dosya sürükle</div>'
        : vid ? '<div class="buyuk">🎬 Ekran videosunu buraya sürükle</div><div class="mini">ya da tıklayıp dosya seç · en fazla 25 MB (10-20 saniye yeter)</div>' +
          '<div class="satir" style="justify-content:center;margin-top:10px"><button type="button" class="btn kayit-btn" data-kayit="' + esc(g.id) + '">● Ekranı kaydet</button></div><div id="kbar-' + esc(g.id) + '" class="mini" style="margin-top:6px"></div>'
          : '<div class="buyuk">📸 Ekran görüntüsünü buraya yapıştır</div><div class="mini">Kutuya tıkla, <span class="kbd">Ctrl</span>+<span class="kbd">V</span> yap · ya da dosya seç / sürükle</div>') + '</div>' +
      '<textarea rows="2" placeholder="Açıklama ya da cevapların (isteğe bağlı)" id="ac-' + esc(g.id) + '" style="margin-top:10px">' + esc(t ? t.aciklama || '' : '') + '</textarea>' +
      '<div class="satir" style="margin-top:10px"><button class="btn ana" data-gonder="' + esc(g.id) + '" ' + (on ? '' : 'disabled') + '>' + (t ? 'Yeniden gönder' : 'Gönder') + '</button>' +
      (t ? '<button class="btn kucuk hayalet" data-goster="' + t.id + '">Önceki gönderim</button>' : '') + '</div>';
  }
  h += '</div></div></div>';
  return h;
}

function baglaDers(el, D) {
  const o = ogretmen();
  // test
  let dogru = 0, cev = 0;
  $$('.secenek', el).forEach(b => b.onclick = () => {
    const qi = Number(b.dataset.qi), si = Number(b.dataset.si), qq = D.ic.test[qi], kutu = b.closest('.soru');
    if (kutu.dataset.bitti) return; kutu.dataset.bitti = 1;
    $$('.secenek', kutu)[qq.dogru].classList.add('dogru'); if (si !== qq.dogru) b.classList.add('yanlis');
    $('.aciklama', kutu).innerHTML = (si === qq.dogru ? '✅ Doğru! ' : '❌ Doğru cevap işaretli. ') + bicim(qq.aciklama || '');
    cev++; if (si === qq.dogru) dogru++;
    if (cev === D.ic.test.length) $('#testSonuc').innerHTML = '<b>Sonuç: ' + dogru + '/' + cev + '</b>' + (dogru === cev ? ' · Harika!' : ' · Yanlışların açıklamasını oku.');
  });
  $$('[data-kopyala]', el).forEach(b => b.onclick = () => { navigator.clipboard.writeText(b.dataset.kopyala).then(() => tost('Kopyalandı')); });
  $$('[data-goster]', el).forEach(b => b.onclick = () => teslimGoster(b.dataset.goster));
  $$('[data-mat]', el).forEach(b => b.onclick = async () => { try { window.open(await imzaliUrl('materyal', b.dataset.mat), '_blank'); } catch (e) { hata(e); } });
  $$('[data-matsil]', el).forEach(b => b.onclick = async () => { if (!confirm('Bu materyal silinsin mi?')) return; try { await q(sb.from('materyaller').delete().eq('id', b.dataset.matsil)); yenidenCiz(); } catch (e) { hata(e); } });
  // yükleme
  $$('.birak', el).forEach(b => {
    b.onclick = e => {
      if (e.target.closest('[data-kayit]')) return;
      S.aktifGorev = b.dataset.anahtar;
      const dokunmatik = window.matchMedia && matchMedia('(pointer:coarse)').matches;
      if (b._tiklandi || dokunmatik) dosyaSec(b.dataset.medya === 'video' ? 'video/*,image/*' : 'image/*').then(f => f && dosyaIsle(f, b.dataset.anahtar));
      else { b.focus(); b._tiklandi = true; tost('Şimdi Ctrl+V ile yapıştırabilirsin. Dosya seçmek için tekrar tıkla.'); }
    };
    b.onfocus = () => { S.aktifGorev = b.dataset.anahtar; };
    b.ondragover = e => { e.preventDefault(); b.classList.add('ustte'); };
    b.ondragleave = () => b.classList.remove('ustte');
    b.ondrop = e => {
      e.preventDefault(); b.classList.remove('ustte');
      const f = e.dataTransfer.files[0];
      if (f && (f.type.indexOf('image') === 0 || (f.type.indexOf('video') === 0 && b.dataset.medya === 'video'))) dosyaIsle(f, b.dataset.anahtar);
      else tost(b.dataset.medya === 'video' ? 'Lütfen bir video ya da resim dosyası bırak.' : 'Lütfen bir resim dosyası bırak.', true);
    };
  });
  $$('[data-kayit]', el).forEach(b => b.onclick = e => { e.stopPropagation(); kayitBaslat(D.kod + '|' + D.hafta + '|' + b.dataset.kayit, b.dataset.kayit); });
  $$('[data-gonder]', el).forEach(b => b.onclick = () => gonder(D, b.dataset.gonder, b));
  if (o) {
    $('#projBtn').onclick = () => { document.body.classList.toggle('projeksiyon'); };
    if ($('#duzBtn')) $('#duzBtn').onclick = () => icerikDuzenle(D.kod, D.hafta, yenidenCiz);
    $('#matBtn').onclick = () => materyalEkle(D.kod, D.hafta, yenidenCiz);
    $('#odevBtn').onclick = () => ekGorevFormu(D, null, yenidenCiz);
    $$('[data-ekduz]', el).forEach(b => b.onclick = () => ekGorevFormu(D, D.ek.find(x => x.id === b.dataset.ekduz), yenidenCiz));
    $$('[data-eksil]', el).forEach(b => b.onclick = async () => {
      if (!confirm('Bu uygulama / ödev silinsin mi?')) return;
      try { await q(sb.from('ek_gorevler').delete().eq('id', b.dataset.eksil)); tost('Silindi'); yenidenCiz(); } catch (e) { hata(e); }
    });
    if ($('#sureBtn')) $('#sureBtn').onclick = () => sureAyarla(D, yenidenCiz);
  }
}
function yenidenCiz() { const y = window.scrollY; import('./app.js').then(m => m.git()).then(() => window.scrollTo(0, y)); }

/* yapıştırma */
document.addEventListener('paste', e => {
  if (!S.ben || ogretmen() || !location.hash.startsWith('#/dersler/')) return;
  const items = (e.clipboardData || {}).items || [];
  for (const it of items) {
    if (it.type.indexOf('image') === 0) {
      e.preventDefault();
      if (!S.aktifGorev) { tost('Önce hangi göreve yükleyeceğini seç: görevin yükleme kutusuna tıkla.', true); return; }
      dosyaIsle(it.getAsFile(), S.aktifGorev); return;
    }
  }
});

async function dosyaIsle(file, anahtar) {
  const kutu = document.querySelector('.birak[data-anahtar="' + anahtar + '"]');
  if (file.type.indexOf('video') === 0) {
    if (!kutu || kutu.dataset.medya !== 'video') return tost('Bu görev için ekran görüntüsü yükle.', true);
    if (file.size > 25 * 1024 * 1024) return tost('Video çok büyük (' + Math.round(file.size / 1048576) + ' MB). En fazla 25 MB: daha kısa kaydet.', true);
    S.onizleme[anahtar] = { tur: 'video', dosya: file, url: URL.createObjectURL(file) };
  } else if (file.type.indexOf('image') === 0) {
    const f = await gorselKucult(file);
    S.onizleme[anahtar] = { tur: 'gorsel', dosya: f, url: URL.createObjectURL(f) };
  } else return tost('Lütfen bir resim seç.', true);
  const gid = anahtar.split('|')[2], acik = ($('#ac-' + gid) || {}).value;
  const gl = gorevListesi(S._ders.ic, S._ders.ek), i = gl.findIndex(x => x.id === gid), g = gl[i];
  const eski = document.getElementById('gorev-' + gid), yeni = document.createElement('div');
  yeni.innerHTML = gorevKart(S._ders, g, i); eski.replaceWith(yeni.firstChild);
  baglaDers(document.getElementById('gorev-' + gid).parentNode, S._ders);
  if (acik != null && $('#ac-' + gid)) $('#ac-' + gid).value = acik;
  const b = document.querySelector('.birak[data-anahtar="' + anahtar + '"]'); if (b) { b.focus({ preventScroll: true }); b._tiklandi = true; }
  tost(S.onizleme[anahtar].tur === 'video' ? 'Video hazır. İzleyip kontrol et, sonra "Gönder"e bas.' : 'Görsel hazır. Şimdi "Gönder"e bas.');
}

async function gonder(D, gid, btn) {
  const anahtar = D.kod + '|' + D.hafta + '|' + gid, on = S.onizleme[anahtar];
  if (!on) return;
  btn.disabled = true; btn.textContent = on.tur === 'video' ? 'Video yükleniyor… (sayfayı kapatma)' : 'Gönderiliyor…';
  try {
    const uz = on.tur === 'video' ? ((on.dosya.name.match(/\.([a-z0-9]+)$/i) || [, 'webm'])[1].toLowerCase()) : 'jpg';
    const yol = S.ben.id + '/' + D.kod + '/H' + D.hafta + '_' + gid + '_' + Date.now() + '.' + uz;
    await dosyaYukle('teslimler', yol, on.dosya);
    const eski = D.teslimler.find(x => x.gorev_id === gid);
    const v = { dosya_yolu: yol, medya: on.tur, aciklama: ($('#ac-' + gid) || {}).value || null };
    let t;
    if (eski) {
      t = await q(sb.from('teslimler').update(v).eq('id', eski.id).select().single());
      if (eski.dosya_yolu && eski.dosya_yolu !== yol) sb.storage.from('teslimler').remove([eski.dosya_yolu]);
      Object.assign(eski, t);
    } else {
      t = await q(sb.from('teslimler').insert(Object.assign(v, { ogrenci_id: S.ben.id, ders_kodu: D.kod, hafta: D.hafta, gorev_id: gid })).select().single());
      D.teslimler.push(t);
    }
    delete S.onizleme[anahtar];
    const gl = gorevListesi(D.ic, D.ek), i = gl.findIndex(x => x.id === gid), g = gl[i];
    const el = document.getElementById('gorev-' + gid), y = document.createElement('div');
    y.innerHTML = gorevKart(D, g, i); el.replaceWith(y.firstChild); baglaDers(document.getElementById('gorev-' + gid).parentNode, D);
    tost('Gönderildi! Öğretmenin inceleyecek.');
  } catch (e) { btn.disabled = false; btn.textContent = 'Gönder'; hata(e); }
}

/* ekran kaydı */
let KAYIT = null;
function kayitBaslat(anahtar, gid) {
  if (KAYIT) return tost('Zaten bir kayıt sürüyor.', true);
  const bar = document.getElementById('kbar-' + gid), MAKS = 30;
  const yedek = neden => { if (bar) bar.innerHTML = esc(neden) + ' <a href="' + KAYIT_ADRESI + '" target="_blank" rel="noopener">Yedek kayıt aracını aç</a>, orada kaydet, indir ve bu kutuya sürükle.'; };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || !window.MediaRecorder) return yedek('Bu tarayıcı kayda izin vermiyor.');
  navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false }).then(akis => {
    const tur = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(akis, tur ? { mimeType: tur, videoBitsPerSecond: 1500000 } : {});
    const parcalar = []; let sn = 0;
    KAYIT = { rec };
    rec.ondataavailable = e => { if (e.data && e.data.size) parcalar.push(e.data); };
    rec.onstop = () => {
      clearInterval(KAYIT.z); akis.getTracks().forEach(t => t.stop()); KAYIT = null;
      const f = new File([new Blob(parcalar, { type: 'video/webm' })], 'ekran-kaydi.webm', { type: 'video/webm' });
      if (!f.size) return tost('Kayıt boş geldi, tekrar dene.', true);
      dosyaIsle(f, anahtar);
    };
    akis.getVideoTracks()[0].onended = () => { if (rec.state === 'recording') rec.stop(); };
    rec.start(1000);
    if (bar) { bar.innerHTML = '<span class="kayit-nokta"></span><b id="ksn">0</b> / ' + MAKS + ' sn <button class="btn kucuk ana" id="kDur">■ Durdur</button>'; $('#kDur').onclick = e => { e.stopPropagation(); rec.stop(); }; }
    KAYIT.z = setInterval(() => { sn++; const x = $('#ksn'); if (x) x.textContent = sn; if (sn >= MAKS && rec.state === 'recording') rec.stop(); }, 1000);
  }).catch(e => {
    if (e && e.name === 'NotAllowedError') tost('Kayıt iptal edildi. Tekrar dene ve açılan pencerede pencereyi seçip Paylaş\'a bas.', true);
    else yedek('Kayıt başlatılamadı.');
  });
}

/* teslim görüntüleme */
export async function medyaHtml(t, sinif) {
  if (t.medya === 'link' && t.link) return '<a class="btn" href="' + esc(t.link) + '" target="_blank" rel="noopener">🔗 Bağlantıyı aç</a>';
  if (!t.dosya_yolu) return '<span class="yer">Dosya yok</span>';
  const url = await imzaliUrl('teslimler', t.dosya_yolu);
  if (t.medya === 'video') return '<video class="' + (sinif || '') + '" src="' + url + '" controls playsinline></video>';
  if (t.medya === 'dosya' || /\.(pdf|docx?|pptx?|xlsx?|zip|mblock|sb3|py|html)$/i.test(t.dosya_yolu)) return '<a class="btn" href="' + url + '" target="_blank" rel="noopener">📎 Dosyayı aç</a>';
  return '<img class="' + (sinif || '') + '" src="' + url + '" alt="teslim">';
}
async function teslimGoster(id) {
  modal('<div style="color:#fff;text-align:center;padding:40px">Yükleniyor…</div>', true);
  try { const t = await q(sb.from('teslimler').select('*').eq('id', id).single()); modal('<div style="text-align:center">' + await medyaHtml(t, 'tam') + '</div>', true); }
  catch (e) { modalKapat(); hata(e); }
}

/* ================= İNCELEME ================= */
const HIZLI = ['Harika iş! 👏', 'Adın görünmüyor', 'Ekranın tamamı görünmüyor', 'Eksik adım var, tekrar kontrol et', 'Görüntü okunmuyor'];
export async function inceleme(el, p) {
  const filtre = p[0] || 'hepsi', durum = p[1] || 'bekliyor';
  let sorgu = sb.from('teslimler').select('*').order('guncelleme', { ascending: durum === 'bekliyor' }).limit(40);
  if (durum !== 'hepsi') sorgu = sorgu.eq('durum', durum);
  if (filtre === 'isler') sorgu = sorgu.not('is_id', 'is', null);
  else if (filtre !== 'hepsi') sorgu = sorgu.eq('ders_kodu', filtre);
  const [liste, sayac, icerik, isler, ekler] = await Promise.all([
    q(sorgu),
    q(sb.from('teslimler').select('ders_kodu,is_id').eq('durum', 'bekliyor')),
    q(sb.from('hafta_icerik').select('ders_kodu,hafta,icerik->gorevler,icerik->bonus')),
    q(sb.from('isler').select('id,baslik,tur')),
    q(sb.from('ek_gorevler').select('ders_kodu,hafta,kimlik,baslik,olusturan'))
  ]);
  const gorevAd = t => {
    const e = ekler.find(x => x.ders_kodu === t.ders_kodu && x.hafta === t.hafta && x.kimlik === t.gorev_id);
    if (e) return '👩‍🏫 ' + e.baslik + ' (' + adi(e.olusturan) + ')';
    if (t.is_id) { const i = isler.find(x => x.id === t.is_id); return '📌 ' + (i ? i.baslik : 'İş'); }
    if (t.gorev_id === 'BONUS') { const c = icerik.find(x => x.ders_kodu === t.ders_kodu && x.hafta === t.hafta); return '⭐ Bonus' + (c && c.bonus ? ' · ' + c.bonus.baslik : ''); }
    const c = icerik.find(x => x.ders_kodu === t.ders_kodu && x.hafta === t.hafta), g = c && (c.gorevler || []).find(x => x.id === t.gorev_id);
    return t.gorev_id + (g ? ' · ' + g.baslik : '');
  };
  const n = k => sayac.filter(x => k === 'isler' ? x.is_id : x.ders_kodu === k).length;
  let h = '<h1>İnceleme</h1><div class="filtre" style="margin-top:12px">' + [['hepsi', 'Tümü (' + sayac.length + ')']].concat(S.dersler.map(d => [d.kod, d.sinif + ' ' + d.ad + (n(d.kod) ? ' (' + n(d.kod) + ')' : '')]), [['isler', 'Ödev ve işler' + (n('isler') ? ' (' + n('isler') + ')' : '')]])
    .map(f => '<a class="btn kucuk ' + (filtre === f[0] ? 'ana' : '') + '" href="#/inceleme/' + f[0] + '/' + durum + '">' + esc(f[1]) + '</a>').join('') + '</div>';
  h += '<div class="filtre">' + [['bekliyor', 'Bekleyenler'], ['duzeltme', 'Düzeltme istenenler'], ['onaylandi', 'Onaylananlar'], ['hepsi', 'Hepsi']].map(f => '<a class="btn kucuk ' + (durum === f[0] ? 'ana' : '') + '" href="#/inceleme/' + filtre + '/' + f[0] + '">' + f[1] + '</a>').join('') + '</div>';
  if (!liste.length) h += '<div class="kart bos-kart">' + (durum === 'bekliyor' ? '🎉 İncelenecek teslim yok.' : 'Kayıt yok.') + '</div>';
  h += liste.map(t => incelemeKart(t, gorevAd(t))).join('');
  if (liste.length === 40) h += '<div class="alt" style="text-align:center">İlk 40 gösteriliyor. Onayladıkça sıradakiler gelir.</div>';
  el.innerHTML = h;
  incelemeBagla(el, liste, () => inceleme(el, p));
}

export function incelemeKart(t, gorevAdi) {
  const k = S.kisiMap[t.ogrenci_id] || {}, d = ders(t.ders_kodu) || { renk: '#5f6670', sinif: k.sinif || '', ad: 'Ödev / iş' };
  return '<div class="kart inceleme" id="inc-' + t.id + '"><div class="gorsel" data-medya="' + t.id + '"><span class="yer">' + (t.medya === 'video' ? '<button class="video-ac">▶ Videoyu aç</button>' : 'Yükleniyor…') + '</span></div>' +
    '<div class="bilgi"><div style="font-size:.78rem;font-weight:800;color:' + d.renk + '">' + esc(d.sinif) + ' · ' + esc(d.ad) + (t.hafta ? ' · ' + t.hafta + '. hafta' : '') + '</div>' +
    '<h3 style="margin:4px 0"><a href="#/kisi/' + t.ogrenci_id + '" style="color:inherit">' + esc(guzelAd((k.ad || '') + ' ' + (k.soyad || ''))) + '</a> <span class="mini">(' + esc(k.kullanici || '') + ')</span></h3>' +
    '<div><b>' + esc(gorevAdi || t.gorev_id) + '</b></div>' +
    '<div class="mini">' + once(t.guncelleme) + ' · <span class="cip ' + t.durum + '">' + DURUM_AD[t.durum] + '</span>' + (t.inceleyen_id ? ' · <b>' + esc(adi(t.inceleyen_id)) + '</b> ' + (t.durum === 'onaylandi' ? 'onayladı' : 'düzeltme istedi') : '') + '</div>' +
    (t.aciklama ? '<div class="kanit" style="margin-top:10px"><b>Öğrencinin notu</b>' + esc(t.aciklama) + '</div>' : '') +
    '<div class="hizli">' + HIZLI.map(x => '<button data-hizli="' + t.id + '">' + x + '</button>').join('') + '</div>' +
    '<textarea rows="2" id="gb-' + t.id + '" placeholder="Geri bildirim (düzeltme için zorunlu)">' + esc(t.geri_bildirim || '') + '</textarea>' +
    '<div class="satir" style="margin-top:10px"><button class="btn yesil" data-karar="onaylandi" data-id="' + t.id + '">✓ Onayla</button><button class="btn turuncu" data-karar="duzeltme" data-id="' + t.id + '">✏️ Düzeltme iste</button>' +
    (t.durum !== 'bekliyor' ? '<button class="btn kucuk hayalet" data-karar="bekliyor" data-id="' + t.id + '">Geri al</button>' : '') + '</div></div></div>';
}
export function incelemeBagla(el, liste, sonra) {
  $$('[data-hizli]', el).forEach(b => b.onclick = () => { const a = $('#gb-' + b.dataset.hizli); a.value = a.value ? a.value + ' ' + b.textContent : b.textContent; a.focus(); });
  $$('[data-karar]', el).forEach(b => b.onclick = async () => {
    const id = b.dataset.id, durum = b.dataset.karar, gb = $('#gb-' + id).value.trim();
    if (durum === 'duzeltme' && !gb) { tost('Düzeltme isterken ne yapması gerektiğini yaz.', true); $('#gb-' + id).focus(); return; }
    const kart = $('#inc-' + id); kart.style.opacity = .5;
    try {
      await q(sb.from('teslimler').update({ durum, geri_bildirim: gb || null }).eq('id', id));
      tost(durum === 'onaylandi' ? 'Onaylandı ✓' : durum === 'duzeltme' ? 'Düzeltme istendi' : 'Geri alındı');
      if (location.hash.startsWith('#/inceleme') && !/\/(hepsi)$/.test(location.hash) && durum !== (location.hash.split('/')[3] || 'bekliyor')) kart.remove(); else sonra();
      if (location.hash.startsWith('#/inceleme') && !$('.inceleme', el)) sonra();
    } catch (e) { kart.style.opacity = 1; hata(e); }
  });
  // medyaları sırayla yükle (ikişer)
  const kutular = $$('[data-medya]', el); let i = 0;
  const sonraki = async () => {
    if (i >= kutular.length) return;
    const k = kutular[i++], t = liste.find(x => x.id === k.dataset.medya);
    if (t && t.medya === 'video') { k.querySelector('.video-ac').onclick = async ev => { ev.stopPropagation(); k.innerHTML = await medyaHtml(t); }; return sonraki(); }
    try { k.innerHTML = await medyaHtml(t); k.onclick = () => teslimGoster(t.id); } catch (e) { k.innerHTML = '<span class="yer">Açılamadı</span>'; }
    sonraki();
  };
  sonraki(); sonraki();
}

/* ================= SINIF DURUMU ================= */
export async function durum(el, p) {
  const kod = p[0] || (S.dersler[0] || {}).kod, d = ders(kod);
  const hs = await q(sb.from('hafta_icerik').select('hafta,son_teslim,icerik').eq('ders_kodu', kod).order('hafta'));
  const hafta = p[1] ? Number(p[1]) : (hs.filter(x => x.hafta <= S.hafta).pop() || hs[hs.length - 1] || {}).hafta;
  let h = '<h1>Sınıf durumu</h1><div class="filtre" style="margin-top:12px">' + S.dersler.map(x => '<a class="btn kucuk ' + (x.kod === kod ? 'ana' : '') + '" href="#/durum/' + x.kod + '">' + esc(x.sinif + ' ' + x.ad) + '</a>').join('') + '</div>';
  if (hs.length) h += '<div class="filtre">' + hs.map(x => '<a class="btn kucuk ' + (x.hafta === hafta ? 'ana' : '') + '" href="#/durum/' + kod + '/' + x.hafta + '">' + x.hafta + '. hafta</a>').join('') + '<a class="btn kucuk" href="#/durum/' + kod + '/toplam">Dönem toplamı</a></div>';
  if (!hs.length) { el.innerHTML = h + '<div class="kart">Bu ders için içerik yok.</div>'; return; }
  if (p[1] === 'toplam') return donemToplam(el, h, kod, d, hs);
  const ic = (hs.find(x => x.hafta === hafta) || {}).icerik; if (!ic) { el.innerHTML = h; return; }
  const [ts, ist, ekler] = await Promise.all([
    q(sb.from('teslimler').select('*').eq('ders_kodu', kod).eq('hafta', hafta)),
    q(sb.from('teslim_istisna').select('*').eq('ders_kodu', kod).eq('hafta', hafta)),
    q(sb.from('ek_gorevler').select('*').eq('ders_kodu', kod).eq('hafta', hafta).order('olusturma'))
  ]);
  const gl = gorevListesi(ic, ekler), ogr = sinifOgrencileri(d.sinif);
  const son = haftaSonTeslim(kod, hafta, (hs.find(x => x.hafta === hafta) || {}).son_teslim);
  h += '<div class="bas-satir" style="margin-top:6px"><h2 style="margin:0;color:' + d.renk + ';flex:1">' + esc(d.sinif) + ' · ' + esc(ic.konu) + '</h2><span class="mini">Son teslim: <b>' + tarihYaz(son, true) + '</b></span><button class="btn kucuk" id="sinifSure">⏰ Sınıfa ek süre</button></div>';
  h += '<div class="alt" style="margin-bottom:10px">Hücreye tıkla: teslimi aç, onayla ya da düzeltme iste. İsme tıkla: öğrencinin sayfası. ⏰: öğrenciye ek süre.</div>';
  h += '<div class="tablo-sar"><table class="durum"><thead><tr><th>#</th><th>Öğrenci</th>' + gl.map(g => '<th title="' + esc(g.baslik) + (g.ek ? ' · ' + adi(g.ek.olusturan) + (g.ek.hedef_grup ? ' · ' + g.ek.hedef_grup + ' grubu' : '') : '') + '">' + (g.bonus ? '⭐' : esc(g.id)) + '</th>').join('') + '<th>Onay</th><th></th></tr></thead><tbody>';
  const sut = gl.map(() => 0);
  ogr.forEach((o, i) => {
    let onay = 0;
    const ek = ist.find(x => x.ogrenci_id === o.id && new Date(x.bitis) > new Date());
    h += '<tr><td class="mini">' + (i + 1) + '</td><td><a href="#/kisi/' + o.id + '" style="color:inherit"><b>' + esc(guzelAd(o.ad + ' ' + o.soyad)) + '</b></a> <span class="mini">' + esc(o.kullanici) + (o.grup ? ' · ' + esc(o.grup) : '') + '</span></td>';
    gl.forEach((g, gi) => {
      if (!ekGorevKime(g, o)) { h += '<td class="mini" style="text-align:center" title="Başka gruba verildi">—</td>'; return; }
      const t = ts.find(x => x.ogrenci_id === o.id && x.gorev_id === g.id), du = t ? t.durum : 'bos';
      if (t) sut[gi]++; if (du === 'onaylandi' && !g.bonus) onay++;
      h += '<td class="hucre" ' + (t ? 'data-t="' + t.id + '"' : '') + ' title="' + DURUM_AD[du] + '"><span class="ikon ' + du + '">' + DURUM_IKON[du] + '</span></td>';
    });
    h += '<td><b>' + onay + '/' + gl.filter(g => !g.bonus && ekGorevKime(g, o)).length + '</b></td><td><button class="btn kucuk hayalet" data-ek="' + o.id + '" title="Ek süre">⏰' + (ek ? ' ' + tarihYaz(ek.bitis) : '') + '</button></td></tr>';
  });
  h += '<tr><td></td><td class="mini"><b>Teslim eden</b></td>' + sut.map(s => '<td style="text-align:center" class="mini"><b>' + s + '/' + ogr.length + '</b></td>').join('') + '<td></td><td></td></tr></tbody></table></div>';
  h += '<div style="margin-top:12px"><button class="btn kucuk" id="csvBtn">⬇ Excel için indir (CSV)</button></div>';
  el.innerHTML = h;
  $$('[data-t]', el).forEach(c => c.onclick = () => {
    const t = ts.find(x => x.id === c.dataset.t), g = gl.find(x => x.id === t.gorev_id);
    const m = modal('<div style="padding:0">' + incelemeKart(t, t.gorev_id + ' · ' + (g ? g.baslik : '')) + '</div>');
    incelemeBagla(m, [t], () => { modalKapat(); durum(el, p); });
  });
  $$('[data-ek]', el).forEach(b => b.onclick = () => ekSure(kod, hafta, b.dataset.ek, () => durum(el, p)));
  $('#sinifSure').onclick = () => ekSure(kod, hafta, null, () => durum(el, p));
  $('#csvBtn').onclick = () => csvIndir(d.sinif + '_' + kod + '_H' + hafta + '.csv',
    [['No', 'Ad', 'Soyad'].concat(gl.map(g => g.id + ' ' + g.baslik))].concat(ogr.map(o => [o.kullanici, o.ad, o.soyad].concat(gl.map(g => { const t = ts.find(x => x.ogrenci_id === o.id && x.gorev_id === g.id); return DURUM_AD[t ? t.durum : 'bos']; })))));
}

async function donemToplam(el, h, kod, d, hs) {
  const [ts, ekler] = await Promise.all([
    q(sb.from('teslimler').select('ogrenci_id,hafta,gorev_id,durum').eq('ders_kodu', kod)),
    q(sb.from('ek_gorevler').select('*').eq('ders_kodu', kod))
  ]);
  const ogr = sinifOgrencileri(d.sinif), don = S.ayar.donem || { birinci: [1, 19], ikinci: [22, 41] };
  h += '<h2 style="color:' + d.renk + '">' + esc(d.sinif + ' ' + d.ad) + ' · Dönem toplamı</h2><div class="alt" style="margin-bottom:10px">Önerilen puan = onaylanan görev / toplam görev × 100 (bonus hariç). Son puan öğretmenin kanaatidir.</div>';
  const donemler = [['1. dönem', don.birinci], ['2. dönem', don.ikinci]];
  const satirlar = [['No', 'Ad Soyad'].concat(donemler.flatMap(x => [x[0] + ' onay', x[0] + ' önerilen', x[0] + ' bonus']))];
  h += '<div class="tablo-sar"><table class="durum"><thead><tr><th>Öğrenci</th>' + donemler.map(x => '<th>' + x[0] + ' onay</th><th>Önerilen</th><th>⭐</th>').join('') + '</tr></thead><tbody>';
  ogr.forEach(o => {
    const sat = [o.kullanici, guzelAd(o.ad + ' ' + o.soyad)];
    h += '<tr><td><b>' + esc(guzelAd(o.ad + ' ' + o.soyad)) + '</b> <span class="mini">' + esc(o.kullanici) + '</span></td>';
    donemler.forEach(([, ar]) => {
      const hh = hs.filter(x => x.hafta >= ar[0] && x.hafta <= ar[1]);
      const top = hh.reduce((s, x) => s + (x.icerik.gorevler || []).length, 0) +
        ekler.filter(e => e.hafta >= ar[0] && e.hafta <= ar[1] && (!e.hedef_grup || e.hedef_grup === o.grup)).length;
      const onay = ts.filter(t => t.ogrenci_id === o.id && t.durum === 'onaylandi' && t.gorev_id !== 'BONUS' && t.hafta >= ar[0] && t.hafta <= ar[1]).length;
      const bon = ts.filter(t => t.ogrenci_id === o.id && t.durum === 'onaylandi' && t.gorev_id === 'BONUS' && t.hafta >= ar[0] && t.hafta <= ar[1]).length;
      const bt = hh.filter(x => x.icerik.bonus).length, puan = top ? Math.round(onay / top * 100) : '';
      h += '<td>' + onay + '/' + top + '</td><td><b>' + puan + '</b></td><td class="mini">' + bon + '/' + bt + '</td>';
      sat.push(onay + '/' + top, puan, bon + '/' + bt);
    });
    h += '</tr>'; satirlar.push(sat);
  });
  h += '</tbody></table></div><div style="margin-top:12px"><button class="btn kucuk" id="csvBtn">⬇ Excel için indir (CSV)</button></div>';
  el.innerHTML = h;
  $('#csvBtn').onclick = () => csvIndir(d.sinif + '_' + kod + '_donem.csv', satirlar);
}

function ekSure(kod, hafta, ogrenci, sonra) {
  const yarin = new Date(Date.now() + 2 * 86400000); yarin.setHours(23, 59, 0, 0);
  const deger = new Date(yarin.getTime() - yarin.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  modal('<form style="padding:24px;max-width:460px" id="ekF"><h3>Ek süre: ' + esc(ogrenci ? adi(ogrenci) : 'tüm sınıf') + '</h3><p class="mini">' + esc(kod) + ' · ' + hafta + '. hafta. Bu tarihe kadar teslim edebilir.</p>' +
    '<label class="alan"><span>Ek süre bitişi</span><input type="datetime-local" name="bitis" value="' + deger + '" required></label><button class="btn ana">Ver</button></form>');
  $('#ekF').onsubmit = async e => {
    e.preventDefault();
    try { await q(sb.from('teslim_istisna').insert({ ogrenci_id: ogrenci, ders_kodu: kod, hafta, bitis: new Date(e.target.bitis.value).toISOString(), veren: S.ben.id })); modalKapat(); tost('Ek süre verildi'); sonra(); } catch (er) { hata(er); }
  };
}

function sureAyarla(D, sonra) {
  const t = D.sonTeslim, deger = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  modal('<form style="padding:24px;max-width:480px" id="sF"><h3>' + esc(D.d.ad) + ' · ' + D.hafta + '. hafta teslim süresi</h3>' +
    '<p class="mini">Varsayılan: 1-4. haftalar 9 Ekim 23:59, sonraki her hafta kendi Cuma 23:59. Buradan sadece bu haftayı değiştirirsin. Tek öğrenciye ek süre için Sınıf durumu sayfasındaki ⏰ düğmesini kullan.</p>' +
    '<label class="alan"><span>Son teslim</span><input type="datetime-local" name="son" value="' + deger + '" required></label>' +
    '<div class="satir"><button class="btn ana">Kaydet</button><button type="button" class="btn kucuk" id="sVars">Varsayılana dön</button></div></form>');
  $('#sF').onsubmit = async e => { e.preventDefault(); try { await q(sb.from('hafta_icerik').update({ son_teslim: new Date(e.target.son.value).toISOString() }).eq('ders_kodu', D.kod).eq('hafta', D.hafta)); modalKapat(); sonra(); } catch (er) { hata(er); } };
  $('#sVars').onclick = async () => { try { await q(sb.from('hafta_icerik').update({ son_teslim: null }).eq('ders_kodu', D.kod).eq('hafta', D.hafta)); modalKapat(); sonra(); } catch (er) { hata(er); } };
}

/* ================= MATERYAL ================= */
/* ================= ÖĞRETMENİN EKLEDİĞİ UYGULAMA / ÖDEV ================= */
function ekGorevFormu(D, e, sonra) {
  const gruplar = [...new Set(sinifOgrencileri(D.d.sinif).map(x => x.grup).filter(Boolean))].sort();
  const benimGrup = e ? e.hedef_grup : '';
  modal('<form style="padding:24px;max-width:600px" id="ekF"><h3>' + (e ? 'Uygulama / ödevi düzenle' : D.hafta + '. haftaya uygulama ya da ödev ekle') + '</h3>' +
    '<div class="alt" style="margin-bottom:10px">Haftanın görevlerinin sonuna eklenir; öğrenci aynı kutudan ekran görüntüsü yükler, sen İnceleme\'den onaylarsın.</div>' +
    '<div class="izgara iki"><label class="alan"><span>Tür</span><select name="tur">' + secenekler([['uygulama', 'Ders içi uygulama'], ['odev', 'Ödev']], e ? e.tur : 'uygulama') + '</select></label>' +
    '<label class="alan"><span>Kime</span><select name="hedef_grup">' + secenekler([['', 'Tüm sınıf (' + D.d.sinif + ')']].concat(gruplar.map(g => [g, g + ' grubu'])), benimGrup || '') + '</select></label></div>' +
    (gruplar.length ? '' : '<div class="mini" style="margin:-4px 0 8px">Öğrenci grupları henüz girilmedi; şimdilik tüm sınıfa gider.</div>') +
    '<label class="alan"><span>Başlık</span><input name="baslik" required maxlength="120" value="' + esc(e ? e.baslik : '') + '" placeholder="ör. Kitap s. 41 Sıra Sizde: Geometrik şekiller"></label>' +
    '<label class="alan"><span>Adımlar (her satır bir adım)</span><textarea name="adimlar" rows="6" required>' + esc(e ? (e.adimlar || []).join('\n') : '') + '</textarea></label>' +
    '<label class="alan"><span>Ne yükleyecek?</span><input name="kanit" value="' + esc(e ? e.kanit || '' : '') + '" placeholder="Çalışmanın ekran görüntüsü"></label>' +
    '<div class="izgara iki"><label class="alan"><span>Yükleme türü</span><select name="medya">' + secenekler([['gorsel', 'Ekran görüntüsü'], ['video', 'Kısa ekran videosu']], e ? e.medya : 'gorsel') + '</select></label>' +
    '<label class="alan"><span>Bağlantı (isteğe bağlı)</span><input name="link" value="' + esc(e ? e.link || '' : '') + '" placeholder="https://..."></label></div>' +
    '<label class="alan"><span>İpucu (isteğe bağlı)</span><input name="ipucu" value="' + esc(e ? e.ipucu || '' : '') + '"></label>' +
    '<button class="btn ana">' + (e ? 'Kaydet' : 'Ekle') + '</button></form>');
  $('#ekF').onsubmit = async ev => {
    ev.preventDefault();
    const v = formVeri(ev.target);
    const adimlar = v.adimlar.split('\n').map(x => x.trim()).filter(Boolean);
    if (!adimlar.length) return tost('En az bir adım yaz.', true);
    if (v.link && !/^https?:\/\//i.test(v.link)) return tost('Bağlantı https:// ile başlamalı.', true);
    const kayit = { tur: v.tur, baslik: v.baslik, adimlar, kanit: v.kanit || null, ipucu: v.ipucu || null, link: v.link || null, medya: v.medya, hedef_grup: v.hedef_grup || null };
    try {
      if (e) await q(sb.from('ek_gorevler').update(kayit).eq('id', e.id));
      else await q(sb.from('ek_gorevler').insert(Object.assign(kayit, { ders_kodu: D.kod, hafta: D.hafta, olusturan: S.ben.id })));
      modalKapat(); tost(e ? 'Kaydedildi' : 'Eklendi; öğrencilere bildirim gitti.'); sonra();
    } catch (er) { hata(er); }
  };
}

function materyalEkle(kod, hafta, sonra) {
  modal('<form style="padding:24px;max-width:560px" id="mF"><h3>Örnek uygulama, dosya ya da bağlantı ekle</h3>' +
    '<label class="alan"><span>Tür</span><select name="tur">' + secenekler([['ornek', '🧩 Örnek uygulama'], ['dosya', '📎 Dosya'], ['link', '🔗 Bağlantı'], ['video', '🎬 Video bağlantısı']], 'ornek') + '</select></label>' +
    '<label class="alan"><span>Başlık</span><input name="baslik" required></label>' +
    '<label class="alan"><span>Açıklama</span><textarea name="aciklama" rows="2"></textarea></label>' +
    '<label class="alan"><span>Dosya (isteğe bağlı, en fazla 50 MB)</span><input type="file" name="dosya"></label>' +
    '<label class="alan"><span>Bağlantı (isteğe bağlı)</span><input name="link" placeholder="https://..."></label>' +
    '<label class="satir" style="margin:8px 0 14px"><input type="checkbox" name="ogrenci_gorur" checked> Öğrenciler görsün</label>' +
    '<button class="btn ana">Ekle</button></form>');
  $('#mF').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, dosya = f.dosya.files[0];
    if (!dosya && !f.link.value.trim()) return tost('Dosya ya da bağlantı ekle.', true);
    if (f.link.value && !/^https?:\/\//i.test(f.link.value.trim())) return tost('Bağlantı https:// ile başlamalı.', true);
    try {
      let yol = null;
      if (dosya) yol = await dosyaYukle('materyal', kod + '/H' + hafta + '/' + Date.now() + '_' + guvenliAd(dosya.name), dosya);
      await q(sb.from('materyaller').insert({ ders_kodu: kod, hafta, tur: f.tur.value, baslik: f.baslik.value.trim(), aciklama: f.aciklama.value.trim() || null, dosya_yolu: yol, dosya_adi: dosya ? dosya.name : null, link: f.link.value.trim() || null, ogrenci_gorur: f.ogrenci_gorur.checked, yukleyen: S.ben.id }));
      modalKapat(); tost('Eklendi'); sonra();
    } catch (er) { hata(er); }
  };
}

/* ================= İÇERİK DÜZENLEME ================= */
async function icerikDuzenle(kod, hafta, sonra) {
  let ogr = { konu: '', hedef: '', teori: [], gorevler: [], test: [] }, ogrt = { akis: [], ogretmen: [], goster: {} }, yayinda = true, yeni = !kod;
  if (kod) {
    const [a, b] = await Promise.all([
      q(sb.from('hafta_icerik').select('*').eq('ders_kodu', kod).eq('hafta', hafta).maybeSingle()),
      q(sb.from('hafta_ogretmen').select('*').eq('ders_kodu', kod).eq('hafta', hafta).maybeSingle())
    ]);
    if (a) { ogr = a.icerik; yayinda = a.yayinda; } if (b) ogrt = b.icerik;
  }
  const eskiIdler = (ogr.gorevler || []).map(g => g.id);
  modal('<form style="padding:24px;width:min(1000px,94vw)" id="iF"><h3>' + (yeni ? 'Yeni hafta içeriği' : esc(kod) + ' · ' + hafta + '. hafta içeriği') + '</h3>' +
    '<div class="form-izgara"><label class="alan"><span>Ders</span><select name="kod" ' + (yeni ? '' : 'disabled') + '>' + secenekler(S.dersler.map(d => [d.kod, d.sinif + ' ' + d.ad]), kod) + '</select></label>' +
    '<label class="alan"><span>Hafta</span><input type="number" name="hafta" min="1" max="45" value="' + (hafta || S.hafta) + '" ' + (yeni ? '' : 'disabled') + '></label>' +
    '<label class="alan" style="align-self:end"><span></span><label class="satir"><input type="checkbox" name="yayinda" ' + (yayinda ? 'checked' : '') + '> Yayında (öğrenciler görür)</label></label></div>' +
    '<div class="kilit" style="background:#eef3ff;color:#1e3a8a">Görev kimlikleri (G1, G2…) <b>değiştirilmez ve silinmez</b>: öğrenci teslimleri bunlara bağlı. Metinleri serbestçe düzelt. Yeni görev = yeni kimlik.</div>' +
    '<div class="izgara iki"><label class="alan"><span>Öğrencinin gördüğü kısım (konu, hedef, teori, gorevler, bonus, test, odevler)</span><textarea class="json-alan" name="ogr">' + esc(JSON.stringify(ogr, null, 2)) + '</textarea></label>' +
    '<label class="alan"><span>Sadece öğretmen (akis, ogretmen, goster)</span><textarea class="json-alan" name="ogrt">' + esc(JSON.stringify(ogrt, null, 2)) + '</textarea></label></div>' +
    '<div class="satir"><button class="btn ana">Kaydet</button><span class="mini">Kayıt anında yayına girer.</span></div></form>');
  $('#iF').onsubmit = async e => {
    e.preventDefault();
    const f = e.target; let a, b;
    try { a = JSON.parse(f.ogr.value); } catch (er) { return tost('Öğrenci kısmında JSON hatası: ' + er.message, true); }
    try { b = JSON.parse(f.ogrt.value); } catch (er) { return tost('Öğretmen kısmında JSON hatası: ' + er.message, true); }
    if (!a.konu) return tost('"konu" boş olamaz.', true);
    a.gorevler = a.gorevler || [];
    const ids = a.gorevler.map(g => g.id);
    if (ids.some(x => !x)) return tost('Her görevin bir "id"si olmalı.', true);
    if (new Set(ids).size !== ids.length) return tost('Aynı görev kimliği iki kez kullanılmış.', true);
    const kayip = eskiIdler.filter(x => !ids.includes(x));
    if (kayip.length && !confirm('Şu görev kimlikleri kalkıyor: ' + kayip.join(', ') + '. Bu görevlere yapılmış teslimler panelde görünmez olur. Yine de kaydedilsin mi?')) return;
    const k = kod || f.kod.value, hh = hafta || Number(f.hafta.value);
    try {
      await q(sb.from('hafta_icerik').upsert({ ders_kodu: k, hafta: hh, icerik: a, yayinda: f.yayinda.checked, guncelleyen: S.ben.id, guncelleme: new Date().toISOString() }));
      await q(sb.from('hafta_ogretmen').upsert({ ders_kodu: k, hafta: hh, icerik: b, guncelleme: new Date().toISOString() }));
      modalKapat(); tost('Kaydedildi'); if (yeni) location.hash = '#/dersler/' + k + '/' + hh; else sonra();
    } catch (er) { hata(er); }
  };
}
