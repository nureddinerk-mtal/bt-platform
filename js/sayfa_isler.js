/* Tek iş havuzu: öğrencinin "İşlerim"i ve öğretmenin "İş ve ödev ver" sayfası */
import { sb, S, $, $$, esc, bicim, q, tost, hata, modal, modalKapat, ogretmen, ders, guzelAd, adi, DURUM_AD, tarihYaz, kalanYaz, kalan, gorevListesi, sinifOgrencileri, haftaSonTeslim, imzaliUrl, dosyaYukle, dosyaSec, gorselKucult, guvenliAd, secenekler } from './ortak.js';
import { incelemeKart, incelemeBagla } from './sayfa_ders.js';

const TUR_AD = { gorev: 'Görev', odev: 'Ödev', proje: 'Proje işi', okul: 'Okul işi', ders: 'Ders uygulaması' };
const TUR_RENK = { gorev: 'mavi', odev: 'turuncu', proje: 'mor', okul: 'bos', ders: 'bos' };

/* ================= ÖĞRENCİ: İŞLERİM ================= */
export async function islerim(el) {
  const [icerik, teslimler, isler, atamalar, istisna, ekler] = await Promise.all([
    q(sb.from('hafta_icerik').select('ders_kodu,hafta,son_teslim,icerik').order('hafta')),
    q(sb.from('teslimler').select('*').eq('ogrenci_id', S.ben.id)),
    q(sb.from('isler').select('*').order('son_tarih', { nullsFirst: false })),
    q(sb.from('is_atamalari').select('*')),
    q(sb.from('teslim_istisna').select('*')),
    q(sb.from('ek_gorevler').select('*').order('olusturma'))
  ]);
  const ogeler = [];
  // ders uygulamaları
  icerik.forEach(c => {
    const son = haftaSonTeslim(c.ders_kodu, c.hafta, c.son_teslim);
    const ek = istisna.filter(i => i.ders_kodu === c.ders_kodu && i.hafta === c.hafta).map(i => new Date(i.bitis)).sort((a, b) => b - a)[0];
    const bitis = ek && ek > son ? ek : son, acik = bitis >= new Date();
    gorevListesi(c.icerik, ekler.filter(e => e.ders_kodu === c.ders_kodu && e.hafta === c.hafta)).forEach(g => {
      const t = teslimler.find(x => x.ders_kodu === c.ders_kodu && x.hafta === c.hafta && x.gorev_id === g.id);
      const d = ders(c.ders_kodu);
      ogeler.push({ tur: 'ders', baslik: g.baslik, ust: (d ? d.ad : c.ders_kodu) + ' · ' + c.hafta + '. hafta', renk: d && d.renk, son: bitis, acik, bonus: g.bonus, durum: t ? t.durum : 'bos', t, link: '#/dersler/' + c.ders_kodu + '/' + c.hafta + '/' + g.id });
    });
  });
  // havuzdaki işler
  isler.forEach(i => {
    const atananlar = atamalar.filter(a => a.is_id === i.id);
    if (i.proje_id && atananlar.length && !atananlar.some(a => a.ogrenci_id === S.ben.id)) return;
    const t = teslimler.find(x => x.is_id === i.id);
    const durum = i.teslim_gerekli ? (t ? t.durum : 'bos') : (i.durum === 'bitti' ? 'onaylandi' : 'bos');
    ogeler.push({ tur: i.tur, baslik: i.baslik, ust: i.proje_id ? 'Proje işi · ' + ({ yapilacak: 'Yapılacak', yapiliyor: 'Yapılıyor', incelemede: 'İncelemede', bitti: 'Bitti' }[i.durum]) : (i.ders_kodu ? (ders(i.ders_kodu) || {}).ad : TUR_AD[i.tur]), son: i.son_tarih ? new Date(i.son_tarih) : null, acik: true, durum, t, is: i, link: i.proje_id ? '#/projeler/' + i.proje_id + '/pano' : null });
  });

  const gruplar = [
    ['duzeltme', '✏️ Düzeltmen gerekenler', x => x.durum === 'duzeltme' && x.acik],
    ['yap', '📌 Yapılacaklar', x => x.durum === 'bos' && x.acik && !x.bonus],
    ['bonus', '⭐ İstersen: bonuslar', x => x.durum === 'bos' && x.acik && x.bonus],
    ['bek', '⏳ Öğretmenin inceliyor', x => x.durum === 'bekliyor'],
    ['kacan', '🔒 Süresi geçenler', x => !x.acik && x.durum !== 'onaylandi' && !x.bonus],
    ['bitti', '✅ Tamamlananlar', x => x.durum === 'onaylandi']
  ];
  const yap = ogeler.filter(gruplar[1][2]).length;
  let h = '<h1>İşlerim</h1><div class="alt">Derslerdeki uygulamalar, ödevler ve proje işlerin tek listede. ' + (yap ? '<b>' + yap + '</b> iş seni bekliyor.' : 'Bekleyen işin yok. 🎉') + '</div>';
  gruplar.forEach(([k, ad, f]) => {
    let l = ogeler.filter(f);
    if (!l.length) return;
    l.sort((a, b) => (a.son ? a.son.getTime() : 9e15) - (b.son ? b.son.getTime() : 9e15));
    const kapali = k === 'bitti' || k === 'kacan';
    h += '<details ' + (kapali ? '' : 'open') + ' style="margin-top:18px"><summary style="cursor:pointer"><h2 style="display:inline;margin:0">' + ad + ' <span class="mini">(' + l.length + ')</span></h2></summary><div class="kart liste" style="margin-top:10px">';
    h += l.slice(0, k === 'bitti' ? 100 : 200).map(x => {
      const sure = x.son ? (x.acik ? kalanYaz(x.son) : 'süre doldu') : '';
      const acil = x.son && x.acik && kalan(x.son) <= 2;
      return '<div class="liste-satir"><span class="cip ' + TUR_RENK[x.tur] + '"' + (x.tur === 'ders' && x.renk ? ' style="background:' + x.renk + ';color:#fff"' : '') + '>' + TUR_AD[x.tur] + '</span>' +
        '<span class="ana-m"><b>' + esc(x.baslik) + '</b><span class="mini">' + esc(x.ust || '') + (x.t && x.t.geri_bildirim && x.durum !== 'bos' ? ' · 💬 ' + esc(x.t.geri_bildirim) : '') + '</span></span>' +
        (sure ? '<span class="mini" ' + (acil ? 'style="color:var(--turuncu);font-weight:800"' : '') + '>' + sure + '</span>' : '') +
        (x.link ? '<a class="btn kucuk" href="' + x.link + '">Aç</a>' : x.is ? '<button class="btn kucuk ' + (x.durum === 'bos' || x.durum === 'duzeltme' ? 'ana' : '') + '" data-is="' + x.is.id + '">' + (x.is.teslim_gerekli && (x.durum === 'bos' || x.durum === 'duzeltme') ? 'Teslim et' : 'Aç') + '</button>' : '') + '</div>';
    }).join('');
    h += '</div></details>';
  });
  el.innerHTML = h;
  $$('[data-is]', el).forEach(b => b.onclick = () => {
    const x = ogeler.find(o => o.is && o.is.id === b.dataset.is);
    isDetayOgrenci(x.is, x.t, () => islerim(el));
  });
}

async function eklerHtml(ekler) {
  if (!ekler || !ekler.length) return '';
  const l = await Promise.all(ekler.map(async e => '<a class="dosya-cip" href="' + await imzaliUrl('materyal', e.yol) + '" target="_blank" rel="noopener">📎 ' + esc(e.ad) + '</a>'));
  return '<div style="margin:8px 0">' + l.join('') + '</div>';
}

async function isDetayOgrenci(i, t, sonra) {
  const kapali = t && t.durum === 'onaylandi';
  let h = '<div style="padding:24px;max-width:640px"><span class="cip ' + TUR_RENK[i.tur] + '">' + TUR_AD[i.tur] + '</span><h2 style="margin:8px 0">' + esc(i.baslik) + '</h2>' +
    (i.son_tarih ? '<div class="mini">Son tarih: <b>' + tarihYaz(i.son_tarih, true) + '</b> · ' + kalanYaz(i.son_tarih) + '</div>' : '') +
    (i.aciklama ? '<div style="margin-top:10px">' + bicim(i.aciklama) + '</div>' : '') + await eklerHtml(i.ekler);
  if (t) h += '<div class="geri-bildirim ' + t.durum + '" style="background:var(--gri-a)">Durum: <b>' + DURUM_AD[t.durum] + '</b>' + (t.geri_bildirim ? ' · 💬 ' + esc(t.geri_bildirim) : '') + '</div>';
  if (i.teslim_gerekli && !kapali) {
    h += '<h3 style="margin-top:16px">Teslim et</h3><div class="birak" id="isBirak" tabindex="0"><div class="buyuk">📎 Dosya seç ya da ekran görüntüsünü yapıştır</div><div class="mini">Görsel, video, PDF, Word, PowerPoint, zip… (en fazla 25 MB)</div></div>' +
      '<label class="alan"><span>ya da bağlantı</span><input id="isLink" placeholder="https://github.com/..." value="' + esc(t && t.link || '') + '"></label>' +
      '<label class="alan"><span>Açıklama</span><textarea id="isAc" rows="2">' + esc(t && t.aciklama || '') + '</textarea></label><button class="btn ana" id="isGonder">' + (t ? 'Yeniden gönder' : 'Gönder') + '</button>';
  }
  h += '</div>';
  const m = modal(h);
  if (!i.teslim_gerekli || kapali) return;
  let secilen = null;
  const goster = f => { secilen = f; $('#isBirak').innerHTML = f.type.indexOf('image') === 0 ? '<img src="' + URL.createObjectURL(f) + '">' : '<div class="buyuk">📎 ' + esc(f.name) + '</div><div class="mini">' + Math.round(f.size / 1024) + ' KB · değiştirmek için tıkla</div>'; };
  $('#isBirak').onclick = () => dosyaSec('').then(f => f && goster(f));
  $('#isBirak').ondragover = e => e.preventDefault();
  $('#isBirak').ondrop = e => { e.preventDefault(); if (e.dataTransfer.files[0]) goster(e.dataTransfer.files[0]); };
  $('#isBirak').onpaste = e => { const it = Array.from(e.clipboardData.items).find(x => x.type.indexOf('image') === 0); if (it) { e.preventDefault(); gorselKucult(it.getAsFile()).then(goster); } };
  $('#isGonder').onclick = async () => {
    const link = $('#isLink').value.trim();
    if (!secilen && !link) return tost('Bir dosya seç ya da bağlantı yaz.', true);
    if (link && !/^https?:\/\//i.test(link)) return tost('Bağlantı https:// ile başlamalı.', true);
    if (secilen && secilen.size > 25 * 1024 * 1024) return tost('Dosya 25 MB\'tan büyük.', true);
    const b = $('#isGonder'); b.disabled = true; b.textContent = 'Gönderiliyor…';
    try {
      let yol = t ? t.dosya_yolu : null, medya = link && !secilen ? 'link' : 'dosya';
      if (secilen) {
        if (secilen.type.indexOf('image') === 0) { secilen = await gorselKucult(secilen); medya = 'gorsel'; }
        else if (secilen.type.indexOf('video') === 0) medya = 'video';
        yol = await dosyaYukle('teslimler', S.ben.id + '/isler/' + i.id + '_' + Date.now() + '_' + guvenliAd(secilen.name), secilen);
      }
      const v = { dosya_yolu: yol, medya, link: link || null, aciklama: $('#isAc').value.trim() || null };
      if (t) await q(sb.from('teslimler').update(v).eq('id', t.id));
      else await q(sb.from('teslimler').insert(Object.assign(v, { ogrenci_id: S.ben.id, is_id: i.id })));
      modalKapat(); tost('Gönderildi!'); sonra();
    } catch (e) { b.disabled = false; b.textContent = 'Gönder'; hata(e); }
  };
}

/* ================= ÖĞRETMEN: İŞ VE ÖDEV VER ================= */
export async function isler(el, p) {
  if (p[0]) return isDetay(el, p[0]);
  const [l, ts, at] = await Promise.all([
    q(sb.from('isler').select('*').is('proje_id', null).order('olusturma', { ascending: false }).limit(200)),
    q(sb.from('teslimler').select('is_id,durum').not('is_id', 'is', null)),
    q(sb.from('is_atamalari').select('is_id'))
  ]);
  let h = '<div class="bas-satir"><h1>İş ve ödev ver</h1><button class="btn ana" id="yeniIs">+ Yeni iş / ödev</button></div>' +
    '<div class="alt" style="margin-bottom:14px">Burada verdiğin her şey öğrencinin "İşlerim" listesine düşer ve bildirim gider. Bir derse ve haftaya bağlarsan o haftanın ders sayfasında da kart olarak görünür.</div>';
  if (!l.length) h += '<div class="kart bos-kart">Henüz iş verilmedi.</div>';
  else h += '<div class="kart liste">' + l.map(i => {
    const t = ts.filter(x => x.is_id === i.id), hedef = i.hedef_sinif ? i.hedef_sinif + ' sınıfı' : at.filter(a => a.is_id === i.id).length + ' öğrenci';
    return '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/isler/' + i.id + '"><span class="cip ' + TUR_RENK[i.tur] + '">' + TUR_AD[i.tur] + '</span><span class="ana-m"><b>' + esc(i.baslik) + '</b><span class="mini">' + esc(hedef) + (i.ders_kodu ? ' · ' + esc((ders(i.ders_kodu) || {}).ad || '') + (i.hafta ? ' ' + i.hafta + '. hafta' : '') : '') + ' · ' + esc(adi(i.olusturan)) + '</span></span>' +
      (i.son_tarih ? '<span class="mini">' + tarihYaz(i.son_tarih) + '</span>' : '') + (i.teslim_gerekli ? '<span class="cip bekliyor">' + t.filter(x => x.durum === 'bekliyor').length + ' bekliyor</span><span class="cip onaylandi">' + t.filter(x => x.durum === 'onaylandi').length + ' ✓</span>' : '') + '</a>';
  }).join('') + '</div>';
  el.innerHTML = h;
  $('#yeniIs').onclick = () => isFormu({ tur: 'odev', teslim_gerekli: true }, () => isler(el, []));
}

async function isDetay(el, id) {
  const [i, ts, at] = await Promise.all([
    q(sb.from('isler').select('*').eq('id', id).single()),
    q(sb.from('teslimler').select('*').eq('is_id', id)),
    q(sb.from('is_atamalari').select('ogrenci_id').eq('is_id', id))
  ]);
  const hedef = i.hedef_sinif ? sinifOgrencileri(i.hedef_sinif) : at.map(a => S.kisiMap[a.ogrenci_id]).filter(Boolean);
  let h = '<div class="satir" style="margin-bottom:12px"><a class="btn kucuk" href="#/isler">← İşler</a><button class="btn kucuk" id="isDuz">✏️ Düzenle</button><button class="btn kucuk hayalet" id="isSil" style="color:var(--kirmizi)">Sil</button></div>' +
    '<span class="cip ' + TUR_RENK[i.tur] + '">' + TUR_AD[i.tur] + '</span><h1 style="margin-top:6px">' + esc(i.baslik) + '</h1>' +
    '<div class="mini">' + (i.hedef_sinif ? esc(i.hedef_sinif) + ' sınıfı' : hedef.length + ' öğrenci') + (i.son_tarih ? ' · Son tarih ' + tarihYaz(i.son_tarih, true) : '') + ' · Veren: ' + esc(adi(i.olusturan)) + '</div>' +
    (i.aciklama ? '<div class="kart" style="margin-top:12px">' + bicim(i.aciklama) + await eklerHtml(i.ekler) + '</div>' : await eklerHtml(i.ekler));
  if (i.teslim_gerekli) {
    h += '<h2>Teslimler (' + ts.length + '/' + hedef.length + ')</h2><div class="kart liste">' + hedef.map(o => {
      const t = ts.find(x => x.ogrenci_id === o.id), du = t ? t.durum : 'bos';
      return '<div class="liste-satir"><span class="ana-m"><b>' + esc(guzelAd(o.ad + ' ' + o.soyad)) + '</b><span class="mini">' + esc(o.sinif || '') + ' · ' + esc(o.kullanici) + '</span></span><span class="cip ' + du + '">' + DURUM_AD[du] + '</span>' + (t ? '<button class="btn kucuk" data-t="' + t.id + '">Aç</button>' : '') + '</div>';
    }).join('') + '</div>';
  }
  el.innerHTML = h;
  $$('[data-t]', el).forEach(b => b.onclick = () => { const t = ts.find(x => x.id === b.dataset.t); const m = modal('<div>' + incelemeKart(t, '📌 ' + i.baslik) + '</div>'); incelemeBagla(m, [t], () => { modalKapat(); isDetay(el, id); }); });
  $('#isDuz').onclick = () => isFormu(Object.assign({}, i, { _atanan: at.map(a => a.ogrenci_id) }), () => isDetay(el, id));
  $('#isSil').onclick = async () => { if (!confirm('Bu iş ve teslimleri silinsin mi?')) return; try { await q(sb.from('isler').delete().eq('id', id)); location.hash = '#/isler'; } catch (e) { hata(e); } };
}

export function isFormu(v, sonra) {
  v = v || {};
  const yerel = t => { if (!t) return ''; const d = new Date(t); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const hedefTur = v._atanan && v._atanan.length ? 'kisi' : 'sinif';
  const ogrList = S.kisiler.filter(k => k.rol === 'ogrenci' && k.aktif);
  modal('<form style="padding:24px;width:min(760px,94vw)" id="isF"><h3>' + (v.id ? 'İşi düzenle' : 'Yeni iş / ödev') + '</h3>' +
    '<div class="form-izgara"><label class="alan"><span>Tür</span><select name="tur">' + secenekler([['odev', 'Ödev'], ['gorev', 'Görev'], ['okul', 'Okul işi']], v.tur || 'odev') + '</select></label>' +
    '<label class="alan"><span>Ders (isteğe bağlı)</span><select name="ders_kodu">' + secenekler(S.dersler.map(d => [d.kod, d.sinif + ' ' + d.ad]), v.ders_kodu, '—') + '</select></label>' +
    '<label class="alan"><span>Hafta (isteğe bağlı)</span><input type="number" name="hafta" min="1" max="45" value="' + (v.hafta || '') + '"></label>' +
    '<label class="alan"><span>Son tarih</span><input type="datetime-local" name="son_tarih" value="' + yerel(v.son_tarih) + '"></label></div>' +
    '<label class="alan"><span>Başlık</span><input name="baslik" required value="' + esc(v.baslik || '') + '"></label>' +
    '<label class="alan"><span>Açıklama / yönerge</span><textarea name="aciklama" rows="4">' + esc(v.aciklama || '') + '</textarea></label>' +
    '<label class="satir" style="margin:4px 0 12px"><input type="checkbox" name="teslim_gerekli" ' + (v.teslim_gerekli ? 'checked' : '') + '> Öğrenci dosya ya da bağlantı teslim etsin</label>' +
    '<div class="alan"><span>Kime?</span><div class="satir"><label><input type="radio" name="hedefTur" value="sinif" ' + (hedefTur === 'sinif' ? 'checked' : '') + '> Sınıfın tamamına</label><label><input type="radio" name="hedefTur" value="kisi" ' + (hedefTur === 'kisi' ? 'checked' : '') + '> Seçtiğim öğrencilere</label></div></div>' +
    '<div id="hSinif"><select name="hedef_sinif">' + secenekler(S.siniflar.map(s => s.ad), v.hedef_sinif || (ders(v.ders_kodu) || {}).sinif) + '</select></div>' +
    '<div id="hKisi" class="gizli"><input id="kAra" placeholder="İsim ya da numara yaz…" style="width:100%;padding:9px 12px;border:1px solid var(--cizgi);border-radius:10px;margin-bottom:6px"><div style="max-height:220px;overflow:auto;border:1px solid var(--cizgi);border-radius:10px;padding:6px">' +
    ogrList.map(o => '<label class="satir k-sat" style="padding:3px 6px" data-ara="' + esc((o.ad + ' ' + o.soyad + ' ' + o.kullanici + ' ' + o.sinif).toLocaleLowerCase('tr')) + '"><input type="checkbox" name="kisi" value="' + o.id + '" ' + ((v._atanan || []).includes(o.id) ? 'checked' : '') + '> ' + esc(guzelAd(o.ad + ' ' + o.soyad)) + ' <span class="mini">' + esc(o.sinif + ' · ' + o.kullanici) + '</span></label>').join('') + '</div></div>' +
    '<label class="alan" style="margin-top:12px"><span>Ek dosyalar (isteğe bağlı)</span><input type="file" name="ekler" multiple></label>' +
    ((v.ekler || []).length ? '<div class="mini">Mevcut ekler: ' + v.ekler.map(e => esc(e.ad)).join(', ') + '</div>' : '') +
    '<div class="satir" style="margin-top:14px"><button class="btn ana">' + (v.id ? 'Kaydet' : 'Ver ve bildir') + '</button></div></form>');
  const f = $('#isF');
  const hedefGoster = () => { const k = f.hedefTur.value === 'kisi'; $('#hKisi').classList.toggle('gizli', !k); $('#hSinif').classList.toggle('gizli', k); };
  $$('[name=hedefTur]', f).forEach(r => r.onchange = hedefGoster); hedefGoster();
  $('#kAra').oninput = e => { const s = e.target.value.toLocaleLowerCase('tr'); $$('.k-sat', f).forEach(l => l.classList.toggle('gizli', s && !l.dataset.ara.includes(s))); };
  f.onsubmit = async e => {
    e.preventDefault();
    const kisiler = $$('[name=kisi]:checked', f).map(x => x.value), kisi = f.hedefTur.value === 'kisi';
    if (kisi && !kisiler.length) return tost('En az bir öğrenci seç.', true);
    const b = $('button.ana', f); b.disabled = true;
    try {
      const ekler = (v.ekler || []).slice();
      for (const d of Array.from(f.ekler.files)) ekler.push({ ad: d.name, yol: await dosyaYukle('materyal', 'isler/' + Date.now() + '_' + guvenliAd(d.name), d) });
      const kayit = { baslik: f.baslik.value.trim(), aciklama: f.aciklama.value.trim() || null, tur: f.tur.value, ders_kodu: f.ders_kodu.value || null, hafta: f.hafta.value ? Number(f.hafta.value) : null,
        son_tarih: f.son_tarih.value ? new Date(f.son_tarih.value).toISOString() : null, teslim_gerekli: f.teslim_gerekli.checked, hedef_sinif: kisi ? null : f.hedef_sinif.value, ekler };
      let id = v.id;
      if (id) await q(sb.from('isler').update(kayit).eq('id', id));
      else id = (await q(sb.from('isler').insert(Object.assign(kayit, { olusturan: S.ben.id })).select('id').single())).id;
      if (kisi) {
        const eski = v._atanan || [];
        const ekle = kisiler.filter(x => !eski.includes(x)), cikar = eski.filter(x => !kisiler.includes(x));
        if (ekle.length) await q(sb.from('is_atamalari').insert(ekle.map(o => ({ is_id: id, ogrenci_id: o }))));
        if (cikar.length) await q(sb.from('is_atamalari').delete().eq('is_id', id).in('ogrenci_id', cikar));
      } else if (v._atanan && v._atanan.length) await q(sb.from('is_atamalari').delete().eq('is_id', id));
      modalKapat(); tost(v.id ? 'Kaydedildi' : 'İş verildi, öğrencilere bildirim gitti'); sonra && sonra();
    } catch (er) { b.disabled = false; hata(er); }
  };
}
