/* Ana sayfa ve "Kim nerede" (program) */
import { ASAMALAR } from './sablonlar.js';
import { sb, S, $, $$, esc, bicim, q, tost, hata, modal, modalKapat, ogretmen, yonetici, modulAcik, ders, guzelAd, basHarf, adi, GUNLER, tarihYaz, kalanYaz, kalan, gorevListesi, sinifOgrencileri, ogretmenler, secenekler, formVeri, once } from './ortak.js';

/* ---------- Zil saatleri ---------- */
function zil() { return Array.isArray(S.ayar.zil) ? S.ayar.zil : []; }
function dakika(s) { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; }
export function suankiDers() {
  const n = new Date(), gun = n.getDay(), dk = n.getHours() * 60 + n.getMinutes();
  const z = zil().find(x => dk >= dakika(x.bas) && dk < dakika(x.bit));
  return { gun, saat: z ? Number(z.no) : null };
}
function saatlerDizi(s) { return String(s || '').split(/[-,\s]+/).map(Number).filter(Boolean); }
function saatAraligi(p) {
  const s = saatlerDizi(p.saatler), z = zil();
  const ilk = z.find(x => Number(x.no) === s[0]), son = z.find(x => Number(x.no) === s[s.length - 1]);
  return ilk && son ? ilk.bas + '-' + son.bit : p.saatler + '. ders';
}

/* program satırı yardımcıları (atölye planı) */
const GRI = ['#475569', '#64748b', '#57534e', '#6b7280', '#52525b'];
export function prgDers(p) { return ders(p.ders_kodu); }
export function prgAd(p) { const d = prgDers(p); return d ? d.ad : (p.ders_adi || p.etiket || ''); }
export function prgSinif(p) { const d = prgDers(p); return p.sinif || (d && d.sinif) || ''; }
export function prgRenk(p) { const d = prgDers(p); if (d) return d.renk; let h = 0; for (const c of String(p.etiket || '')) h += c.charCodeAt(0); return GRI[h % GRI.length]; }
export function prgOgretmen(p) { return p.ogretmen_adlari || (p.ogretmen_id ? adi(p.ogretmen_id) : ''); }
export function benimMi(p) { return p.ogretmen_id === S.ben.id || String(p.ogretmen_adlari || '').split(', ').includes((S.ben.ad + ' ' + S.ben.soyad).trim()); }
function simdiMi(p, su) { return p.gun === su.gun && saatlerDizi(p.saatler).includes(su.saat); }

export async function panel(el) {
  if (ogretmen()) return ogretmenPanel(el);
  return ogrenciPanel(el);
}

/* ================= ÖĞRENCİ ================= */
async function ogrenciPanel(el) {
  const b = S.ben;
  const [icerik, teslimler, isler, duyurular, etkinlik, projeler, program] = await Promise.all([
    q(sb.from('hafta_icerik').select('ders_kodu,hafta,icerik,son_teslim').order('hafta')),
    q(sb.from('teslimler').select('id,ders_kodu,hafta,gorev_id,is_id,durum,geri_bildirim').eq('ogrenci_id', b.id)),
    q(sb.from('isler').select('id,baslik,tur,son_tarih,durum,proje_id,teslim_gerekli').neq('durum', 'bitti').order('son_tarih', { nullsFirst: false })),
    q(sb.from('duyurular').select('*').order('sabit', { ascending: false }).order('olusturma', { ascending: false }).limit(4)),
    q(sb.from('etkinlikler').select('id,baslik,tur,basvuru_bitis,baslangic,tekrar').order('basvuru_bitis', { nullsFirst: false }).limit(30)),
    q(sb.from('projeler').select('id,ad,durum,asama').order('olusturma', { ascending: false })),
    q(sb.from('program').select('*'))
  ]);
  const t = (k, h, g) => teslimler.find(x => x.ders_kodu === k && x.hafta === h && x.gorev_id === g);
  const benimDersler = S.dersler.filter(d => d.sinif === b.sinif);

  let h = '<h1>Merhaba ' + esc(basHarf(String(b.ad).split(' ')[0])) + '!</h1><div class="alt">' + S.hafta + '. hafta · ' + esc(b.sinif) + '</div>';

  // şu an
  const su = suankiDers(), simdi = program.filter(p => simdiMi(p, su) && prgSinif(p) === b.sinif);
  if (simdi.length) {
    h += '<a class="simdi-kutu" href="#/program" style="display:block;margin-top:14px;text-decoration:none;color:inherit"><div class="etiket-k">Şu an · ' + su.saat + '. ders</div>' + simdi.map(p => '<div style="margin-top:4px"><b>' + esc(prgAd(p)) + '</b>' +
      (p.yer ? ' · 📍 <b>' + esc(p.yer) + '</b>' : '') + ' · ' + esc(prgOgretmen(p)) + '</div>').join('') + (simdi.length > 1 ? '<div class="mini" style="margin-top:4px">Sınıf gruplara bölünüyor: kendi grubunun labına git.</div>' : '') + '</a>';
  }

  // düzeltme
  const duz = teslimler.filter(x => x.durum === 'duzeltme');
  if (duz.length) {
    h += '<h2>Düzeltmen gerekenler</h2>';
    duz.forEach(x => {
      const link = x.is_id ? '#/islerim' : '#/dersler/' + x.ders_kodu + '/' + x.hafta + '/' + x.gorev_id;
      h += '<a class="bildirim" style="display:block;text-decoration:none;color:inherit" href="' + link + '"><b>' + esc(x.ders_kodu ? (ders(x.ders_kodu) || {}).ad + ' · ' + x.hafta + '. hafta · ' + x.gorev_id : 'İş') + '</b><br><span>' + esc(x.geri_bildirim || 'Öğretmenin düzeltme istedi.') + '</span></a>';
    });
  }

  // açık işler (ödev / görev / proje)
  const acik = isler.filter(i => !(i.teslim_gerekli && teslimler.some(x => x.is_id === i.id && x.durum === 'onaylandi')));
  if (acik.length) {
    h += '<h2>Yaklaşan işler</h2><div class="kart liste">' + acik.slice(0, 6).map(i => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="' + (i.proje_id ? '#/projeler/' + i.proje_id + '/pano' : '#/islerim') + '">' +
      '<span class="cip ' + (i.tur === 'odev' ? 'turuncu' : i.tur === 'proje' ? 'mor' : 'mavi') + '">' + ({ odev: 'Ödev', gorev: 'Görev', proje: 'Proje', okul: 'Okul' }[i.tur]) + '</span>' +
      '<span class="ana-m"><b>' + esc(i.baslik) + '</b></span>' + (i.son_tarih ? '<span class="mini' + (kalan(i.son_tarih) <= 2 ? '" style="color:var(--turuncu);font-weight:800' : '') + '">' + kalanYaz(i.son_tarih) + '</span>' : '') + '</a>').join('') +
      '<a class="liste-satir" href="#/islerim" style="justify-content:center;font-weight:800">Tüm işlerim →</a></div>';
  }

  // dersler
  h += '<h2>Derslerim</h2><div class="izgara iki">';
  benimDersler.forEach(d => {
    const hs = icerik.filter(x => x.ders_kodu === d.kod);
    let top = 0, onay = 0, bek = 0, dz = 0;
    hs.forEach(x => (x.icerik.gorevler || []).forEach(g => { top++; const s = t(d.kod, x.hafta, g.id); if (s) { if (s.durum === 'onaylandi') onay++; else if (s.durum === 'duzeltme') dz++; else bek++; } }));
    const son = hs[hs.length - 1], yz = top ? Math.round(onay / top * 100) : 0;
    h += '<a class="kart ders-kart" style="--ders:' + d.renk + ';text-decoration:none;color:inherit" href="#/dersler/' + d.kod + (son ? '/' + son.hafta : '') + '">' +
      '<div class="etiket">' + esc(d.zaman || '') + '</div><h3 style="margin-top:4px">' + esc(d.ad) + '</h3>' +
      (son ? '<div><b>' + son.hafta + '. hafta:</b> ' + esc(son.icerik.konu) + '</div>' : '<div class="alt">İçerik henüz yok.</div>') +
      '<div class="ilerleme"><i style="width:' + yz + '%"></i></div><div class="mini"><b>' + onay + '/' + top + '</b> görev onaylandı' +
      (bek ? ' · ' + bek + ' inceleniyor' : '') + (dz ? ' · <span style="color:var(--turuncu);font-weight:800">' + dz + ' düzeltme</span>' : '') + '</div></a>';
  });
  h += '</div>';

  if (modulAcik('projeler')) {
  // proje
  h += '<h2>Projem</h2>';
  if (projeler.filter(p => p.durum !== 'birakildi').length) {
    h += '<div class="izgara iki">' + projeler.filter(p => p.durum !== 'birakildi').map(p => '<a class="kart" style="text-decoration:none;color:inherit" href="#/projeler/' + p.id + '"><h3>🚀 ' + esc(p.ad) + '</h3><div class="mini">Aşama: <b>' + esc(((ASAMALAR.find(a => a.id === p.asama) || {}).ad) || p.asama) + '</b> · ' + esc({ taslak: 'Öneri inceleniyor', netlestir: 'Netleştirilmeli', basladi: 'Devam ediyor', tamamlandi: 'Tamamlandı', birakildi: 'Bırakıldı' }[p.durum]) + '</div></a>').join('') + '</div>';
  } else h += '<div class="kart">Henüz bir projen yok. <a href="#/fikirler">Fikir havuzuna göz at</a> ya da <a href="#/projeler/yeni">kendi projeni öner</a>.</div>';
  }
  if (modulAcik('okul')) {
  // duyuru + etkinlik
  h += '<div class="izgara iki" style="margin-top:8px"><div><h2>Duyurular</h2>' + (duyurular.length ? duyurular.map(dy => '<div class="kart" style="margin-bottom:10px">' + (dy.sabit ? '📌 ' : '') + '<b>' + esc(dy.baslik) + '</b><div class="mini">' + once(dy.olusturma) + '</div>' + (dy.metin ? '<div style="margin-top:6px">' + bicim(dy.metin.slice(0, 280)) + '</div>' : '') + '</div>').join('') : '<div class="kart alt">Duyuru yok.</div>') + '</div>';
  const yak = etkinlik.filter(e => (e.basvuru_bitis && kalan(e.basvuru_bitis) >= 0) || (e.baslangic && kalan(e.baslangic) >= 0) || e.tekrar).slice(0, 5);
  h += '<div><h2>Yaklaşan etkinlikler</h2>' + (yak.length ? '<div class="kart liste">' + yak.map(e => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/etkinlikler/' + e.id + '"><span class="ana-m"><b>' + esc(e.baslik) + '</b><span class="mini">' + esc(e.tekrar || (e.basvuru_bitis ? 'Başvuru: ' + tarihYaz(e.basvuru_bitis) : tarihYaz(e.baslangic))) + '</span></span>' + (e.basvuru_bitis ? '<span class="mini">' + kalanYaz(e.basvuru_bitis) + '</span>' : '') + '</a>').join('') + '</div>' : '<div class="kart alt">Yaklaşan etkinlik yok.</div>') + '</div></div>';

  }
  h += '<div class="kart" style="margin-top:22px"><h3>Ekran görüntüsü nasıl alınır?</h3><div><span class="kbd">Windows</span> + <span class="kbd">Shift</span> + <span class="kbd">S</span> ile ekranın bir bölümünü seç. Sonra görevdeki yükleme kutusuna tıkla ve <span class="kbd">Ctrl</span> + <span class="kbd">V</span> ile yapıştır.</div></div>';
  el.innerHTML = h;
}

/* ================= ÖĞRETMEN ================= */
async function ogretmenPanel(el) {
  const bugun = new Date().getDay(), hg = (bugun === 0 || bugun === 6) ? 1 : bugun;
  const [program, icerik, ogrtIcerik, isaret, bekleyen, evrak, etkinlik, duyurular, projeler] = await Promise.all([
    q(sb.from('program').select('*')),
    q(sb.from('hafta_icerik').select('ders_kodu,hafta,icerik').eq('hafta', S.hafta)),
    q(sb.from('hafta_ogretmen').select('ders_kodu,hafta,icerik').eq('hafta', S.hafta)),
    q(sb.from('ogretmen_yapilacak').select('*').eq('ogretmen_id', S.ben.id)),
    q(sb.from('teslimler').select('id,ders_kodu', { count: 'exact' }).eq('durum', 'bekliyor')),
    q(sb.from('proje_evrak').select('proje_id,sablon,adim,guncelleme').eq('durum', 'gonderildi')),
    q(sb.from('etkinlikler').select('id,baslik,tur,basvuru_bitis').not('basvuru_bitis', 'is', null).gte('basvuru_bitis', new Date().toISOString().slice(0, 10)).order('basvuru_bitis').limit(5)),
    q(sb.from('duyurular').select('id,baslik,olusturma,sabit').order('olusturma', { ascending: false }).limit(3)),
    q(sb.from('projeler').select('id,ad,durum,asama,danisman_id').in('durum', ['taslak', 'netlestir', 'basladi']))
  ]);
  const ic = k => icerik.find(x => x.ders_kodu === k), oi = k => ogrtIcerik.find(x => x.ders_kodu === k);
  let h = '<h1>' + ((bugun === 0 || bugun === 6) ? 'Hafta başı: Pazartesi' : 'Bugün: ' + GUNLER[bugun]) + '</h1><div class="alt">' + S.hafta + '. hafta</div>';

  const benimProje = projeler.filter(p => p.danisman_id === S.ben.id);
  h += '<div class="istatistik">' +
    '<a class="kart" href="#/inceleme" style="text-decoration:none;color:inherit"><b>' + bekleyen.length + '</b><span class="mini">teslim onay bekliyor</span></a>' +
    '<a class="kart" href="#/projeler" style="text-decoration:none;color:inherit"><b>' + evrak.length + '</b><span class="mini">evrak adımı onay bekliyor</span></a>' +
    '<a class="kart" href="#/projeler" style="text-decoration:none;color:inherit"><b>' + benimProje.length + '</b><span class="mini">danışmanı olduğun proje</span></a>' +
    '<a class="kart" href="#/projeler/f/taslak" style="text-decoration:none;color:inherit"><b>' + projeler.filter(p => p.durum === 'taslak').length + '</b><span class="mini">yeni proje önerisi</span></a></div>';

  const bd = program.filter(p => p.gun === hg && benimMi(p)).sort((a, b) => saatlerDizi(a.saatler)[0] - saatlerDizi(b.saatler)[0]);
  h += '<h2>Dersler</h2>';
  if (!bd.length) h += '<div class="kart alt">Bu gün ders yok.</div>';
  else {
    h += '<div class="izgara iki">';
    bd.forEach(p => {
      const d = ders(p.ders_kodu);
      if (!d) { h += '<div class="kart ders-kart" style="--ders:' + prgRenk(p) + ';cursor:default"><div class="etiket">' + esc(prgSinif(p)) + ' · ' + esc(saatAraligi(p)) + (p.yer ? ' · 📍 ' + esc(p.yer) : '') + '</div><h3 style="margin-top:4px">' + esc(prgAd(p)) + '</h3><div class="mini">Platformda içeriği yok</div></div>'; return; }
      const c = ic(p.ders_kodu), bek = bekleyen.filter(x => x.ders_kodu === p.ders_kodu).length;
      h += '<div class="kart ders-kart" style="--ders:' + d.renk + ';cursor:default"><div class="etiket">' + esc(d.sinif) + ' · ' + esc(saatAraligi(p)) + (p.yer ? ' · 📍 ' + esc(p.yer) : '') + '</div>' +
        '<h3 style="margin-top:4px">' + esc(d.ad) + '</h3>' + (c ? '<div>' + esc(c.icerik.konu) + '</div>' : '<div class="alt">Bu hafta içerik yok</div>') +
        '<div class="satir" style="margin-top:12px">' + (c ? '<a class="btn kucuk ana" href="#/dersler/' + d.kod + '/' + S.hafta + '">Dersi aç</a>' : '') +
        '<a class="btn kucuk" href="#/durum/' + d.kod + '/' + S.hafta + '">Sınıf durumu</a>' + (bek ? '<a class="btn kucuk" href="#/inceleme/' + d.kod + '">İncele (' + bek + ')</a>' : '') + '</div></div>';
    });
    h += '</div>';
  }

  // yapılacaklar
  const isaretli = {}; isaret.forEach(x => { isaretli[x.is_kimligi] = x.tamam; });
  let yap = '';
  S.dersler.forEach(d => {
    const o = oi(d.kod); if (!o || !o.icerik.ogretmen) return;
    o.icerik.ogretmen.forEach(it => {
      const tm = !!isaretli[it.id];
      yap += '<label class="is ' + (tm ? 'tamam' : '') + '"><input type="checkbox" data-is="' + esc(it.id) + '" ' + (tm ? 'checked' : '') + '><span><b style="color:' + d.renk + '">' + esc(d.sinif + ' ' + d.ad) + ':</b> ' + bicim(it.metin) + '</span></label>';
    });
  });
  h += '<h2>Bu haftanın yapılacakları</h2><div class="kart">' + (yap || '<div class="alt">Bu hafta için yapılacak bir şey yok.</div>') + '</div>';

  if (modulAcik('okul')) h += '<div class="izgara iki" style="margin-top:8px"><div><h2>Yaklaşan son tarihler</h2>' + (etkinlik.length ? '<div class="kart liste">' + etkinlik.map(e => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/etkinlikler/' + e.id + '"><span class="ana-m"><b>' + esc(e.baslik) + '</b><span class="mini">' + tarihYaz(e.basvuru_bitis) + '</span></span><span class="mini">' + kalanYaz(e.basvuru_bitis) + '</span></a>').join('') + '</div>' : '<div class="kart alt">Yok.</div>') + '</div>' +
    '<div><h2>Son duyurular</h2>' + (duyurular.length ? '<div class="kart liste">' + duyurular.map(d => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/duyurular"><span class="ana-m"><b>' + (d.sabit ? '📌 ' : '') + esc(d.baslik) + '</b><span class="mini">' + once(d.olusturma) + '</span></span></a>').join('') + '</div>' : '<div class="kart alt">Yok.</div>') + '</div></div>';

  // haftalık program
  h += '<h2>Haftalık program</h2><div class="program">';
  for (let g = 1; g <= 5; g++) {
    h += '<div class="gun ' + (g === bugun ? 'bugun' : '') + '"><b>' + GUNLER[g] + '</b>';
    program.filter(p => p.gun === g && benimMi(p)).sort((a, b) => saatlerDizi(a.saatler)[0] - saatlerDizi(b.saatler)[0]).forEach(p => {
      const d = ders(p.ders_kodu);
      h += '<a class="blok" style="background:' + prgRenk(p) + ';display:block;text-decoration:none" href="' + (d ? '#/dersler/' + d.kod + '/' + S.hafta : '#/program') + '">' + esc(prgSinif(p) + ' ' + prgAd(p)) + '<br><span style="opacity:.85;font-weight:600">' + esc(p.saatler) + (p.yer ? ' · ' + esc(p.yer) : '') + '</span></a>';
    });
    h += '</div>';
  }
  h += '</div>';
  el.innerHTML = h;
  $$('[data-is]', el).forEach(cb => cb.onchange = async () => {
    const l = cb.closest('.is'); l.classList.toggle('tamam', cb.checked);
    try { await q(sb.from('ogretmen_yapilacak').upsert({ is_kimligi: cb.dataset.is, ogretmen_id: S.ben.id, tamam: cb.checked, tarih: new Date().toISOString() })); }
    catch (e) { cb.checked = !cb.checked; l.classList.toggle('tamam', cb.checked); hata(e); }
  });
}

/* ================= KİM NEREDE / PROGRAM ================= */
export async function program(el, p) {
  const prg = await q(sb.from('program').select('*'));
  const o = ogretmen(), su = suankiDers();
  const z = zil(), saatler = z.length ? z.map(x => Number(x.no)) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ogrtAdlari = [...new Set(prg.flatMap(x => String(x.ogretmen_adlari || '').split(', ')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const yerler = [...new Set(prg.map(x => x.yer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const siniflar = [...new Set(prg.map(prgSinif).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  const benimAd = (S.ben.ad + ' ' + S.ben.soyad).trim();
  // görünüm: #/program/ogretmen/<ad> · /atolye/<yer> · /sinif/<sinif>
  let tur = p[0] || (o ? 'ogretmen' : 'sinif'), secim = p[1] || (tur === 'ogretmen' ? benimAd : tur === 'sinif' ? S.ben.sinif : yerler[0]);
  if (!o && tur === 'sinif') secim = S.ben.sinif;
  const filtre = x => tur === 'ogretmen' ? String(x.ogretmen_adlari || '').split(', ').includes(secim) || (secim === benimAd && x.ogretmen_id === S.ben.id)
    : tur === 'atolye' ? x.yer === secim : prgSinif(x) === secim;
  const gorunen = prg.filter(filtre);

  let h = '<h1>' + (o ? 'Kim nerede?' : 'Ders programım') + '</h1><div class="alt" style="margin-bottom:12px">Bilişim Teknolojileri alanı atölye planı' + (z.length ? '' : ' · zil saatleri girilmedi') + '</div>';

  // şu an: tüm atölyeler
  if (su.saat) {
    const simdi = prg.filter(x => simdiMi(x, su) && (o || prgSinif(x) === S.ben.sinif));
    h += '<div class="simdi-kutu" style="margin-bottom:16px"><div class="etiket-k">Şu an · ' + GUNLER[su.gun] + ' ' + su.saat + '. ders</div>' +
      (simdi.length ? '<div class="tablo-sar" style="border:none;margin-top:6px"><table class="durum"><tbody>' + simdi.sort((a, b) => String(a.yer).localeCompare(String(b.yer))).map(x =>
        '<tr><td><b>📍 ' + esc(x.yer || '?') + '</b></td><td><span class="cip" style="background:' + prgRenk(x) + ';color:#fff">' + esc(prgSinif(x)) + '</span> ' + esc(prgAd(x)) + '</td><td>' + esc(prgOgretmen(x)) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="alt" style="margin-top:4px">Şu an ' + (o ? 'atölyelerde' : 'sınıfının') + ' dersi yok.</div>') + '</div>';
  } else if (z.length) h += '<div class="kart alt" style="margin-bottom:16px">Şu an ders saati değil.</div>';

  if (o) {
    h += '<div class="satir" style="margin-bottom:12px"><select id="pTur">' + secenekler([['ogretmen', 'Öğretmene göre'], ['atolye', 'Atölyeye göre'], ['sinif', 'Sınıfa göre']], tur) + '</select>' +
      '<select id="pSec">' + secenekler(tur === 'ogretmen' ? ogrtAdlari : tur === 'atolye' ? yerler : siniflar, secim) + '</select>' +
      (yonetici() ? '<button class="btn kucuk sag" id="prgEkle">+ Program satırı</button>' : '') + '</div>';
  } else {
    // öğrenci: öğretmenlerim şu an nerede
    const ogrt = [...new Set(gorunen.flatMap(x => String(x.ogretmen_adlari || '').split(', ')).filter(Boolean))];
    if (ogrt.length) {
      h += '<h2>Öğretmenlerim ' + (su.saat ? 'şu an' : 'bugün') + '</h2><div class="kart liste">' + ogrt.map(ad => {
        const l = prg.filter(x => String(x.ogretmen_adlari || '').split(', ').includes(ad) && x.gun === su.gun);
        const s = su.saat ? l.find(x => saatlerDizi(x.saatler).includes(su.saat)) : null;
        return '<div class="liste-satir"><span class="ana-m"><b>' + esc(ad) + '</b><span class="mini">' + (l.length ? 'Bugün: ' + l.map(x => esc(x.yer) + ' (' + esc(x.saatler) + ')').join(', ') : 'Bugün atölyede dersi yok') + '</span></span>' +
          (su.saat ? (s ? '<span class="cip onaylandi">📍 ' + esc(s.yer) + '</span>' : '<span class="cip bos">derste değil</span>') : '') + '</div>';
      }).join('') + '</div>';
    }
  }

  // haftalık tablo
  h += '<h2>' + esc(tur === 'atolye' ? '📍 ' + secim : tur === 'sinif' ? secim + ' sınıfı' : secim) + ' · haftalık</h2><div class="tablo-sar"><table class="prg"><thead><tr><th></th>' + [1, 2, 3, 4, 5].map(g => '<th>' + GUNLER[g] + '</th>').join('') + '</tr></thead><tbody>';
  saatler.forEach(s => {
    const zz = z.find(x => Number(x.no) === s);
    h += '<tr><th>' + s + '.' + (zz ? '<br><span style="font-weight:600">' + esc(zz.bas) + '</span>' : '') + '</th>';
    for (let g = 1; g <= 5; g++) {
      const l = gorunen.filter(x => x.gun === g && saatlerDizi(x.saatler).includes(s));
      h += '<td' + (g === su.gun && s === su.saat ? ' style="outline:3px solid var(--yazi)"' : '') + '>' + l.map(x =>
        '<div class="blok" style="background:' + prgRenk(x) + ';cursor:' + (yonetici() ? 'pointer' : 'default') + '" data-p="' + x.id + '" title="' + esc(prgAd(x) + ' · ' + prgOgretmen(x)) + '">' + esc(prgSinif(x) + ' ' + (x.etiket || (prgDers(x) || {}).kod || '')) +
        '<br><span style="font-weight:600;opacity:.9">' + esc(tur === 'atolye' ? prgOgretmen(x).split(', ').map(n => n.split(' ')[0]).join(', ') : (x.yer || '') + (tur !== 'ogretmen' ? ' · ' + prgOgretmen(x).split(', ').map(n => n.split(' ')[0]).join(', ') : '')) + '</span></div>').join('') + '</td>';
    }
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  el.innerHTML = h;

  if (o) {
    $('#pTur').onchange = e => { location.hash = '#/program/' + e.target.value; };
    $('#pSec').onchange = e => { location.hash = '#/program/' + tur + '/' + encodeURIComponent(e.target.value); };
  }
  if (yonetici()) {
    $$('[data-p]', el).forEach(b => b.onclick = () => prgDuzenle(prg.find(x => x.id === b.dataset.p), () => program(el, p)));
    $('#prgEkle').onclick = () => prgDuzenle(null, () => program(el, p));
  }
}

function prgDuzenle(p, sonra) {
  p = p || { gun: 1, saatler: '' };
  modal('<form style="padding:24px;max-width:600px" id="prgF"><h3>' + (p.id ? 'Program satırını düzenle' : 'Yeni program satırı') + '</h3>' +
    '<div class="form-izgara">' +
    '<label class="alan"><span>Platformdaki ders</span><select name="ders_kodu">' + secenekler(S.dersler.map(d => [d.kod, d.sinif + ' ' + d.ad]), p.ders_kodu, '— platformda değil —') + '</select></label>' +
    '<label class="alan"><span>Sınıf</span><input name="sinif" value="' + esc(p.sinif || '') + '" placeholder="11E"></label>' +
    '<label class="alan"><span>Ders kısa adı</span><input name="etiket" value="' + esc(p.etiket || '') + '" placeholder="MOB"></label>' +
    '<label class="alan"><span>Ders adı</span><input name="ders_adi" value="' + esc(p.ders_adi || '') + '"></label>' +
    '<label class="alan"><span>Gün</span><select name="gun">' + secenekler([1, 2, 3, 4, 5].map(g => [g, GUNLER[g]]), p.gun) + '</select></label>' +
    '<label class="alan"><span>Ders saatleri</span><input name="saatler" value="' + esc(p.saatler) + '" placeholder="7-8-9" required></label>' +
    '<label class="alan"><span>Atölye / derslik</span><input name="yer" value="' + esc(p.yer || '') + '" placeholder="B313"></label>' +
    '<label class="alan"><span>Öğretmen(ler)</span><input name="ogretmen_adlari" value="' + esc(p.ogretmen_adlari || '') + '" placeholder="Ad Soyad, Ad Soyad"></label></div>' +
    '<div class="satir"><button class="btn ana">Kaydet</button>' + (p.id ? '<button type="button" class="btn kucuk hayalet" id="prgSil" style="color:var(--kirmizi)">Sil</button>' : '') + '</div></form>');
  $('#prgF').onsubmit = async e => {
    e.preventDefault();
    const v = formVeri(e.target); v.gun = Number(v.gun);
    ['ders_kodu', 'sinif', 'etiket', 'ders_adi', 'yer', 'ogretmen_adlari'].forEach(k => { v[k] = v[k] || null; });
    const ilk = (v.ogretmen_adlari || '').split(',')[0].trim(), k = ogretmenler().find(x => (x.ad + ' ' + x.soyad).trim() === ilk);
    v.ogretmen_id = k ? k.id : null;
    try { if (p.id) await q(sb.from('program').update(v).eq('id', p.id)); else await q(sb.from('program').insert(v)); modalKapat(); tost('Kaydedildi'); sonra(); } catch (er) { hata(er); }
  };
  const sil = $('#prgSil'); if (sil) sil.onclick = async () => { if (!confirm('Bu program satırı silinsin mi?')) return; try { await q(sb.from('program').delete().eq('id', p.id)); modalKapat(); sonra(); } catch (er) { hata(er); } };
}
