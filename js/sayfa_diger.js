/* Duyurular, etkinlikler, belgeler, Erasmus+, asistan, kişi sayfası, profil */
import { sb, S, $, $$, esc, bicim, q, tost, hata, modal, modalKapat, ogretmen, yonetici, ders, guzelAd, adi, tarihYaz, once, kalan, kalanYaz, imzaliUrl, dosyaYukle, guvenliAd, secenekler, ogretmenler, DURUM_AD, gorevListesi } from './ortak.js';

const yerelTarih = t => { if (!t) return ''; const d = new Date(t); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

/* ================= DUYURULAR ================= */
export async function duyurular(el) {
  const o = ogretmen();
  const l = await q(sb.from('duyurular').select('*').order('sabit', { ascending: false }).order('olusturma', { ascending: false }).limit(100));
  const HEDEF = [['herkes', 'Herkes'], ['ogrenciler', 'Tüm öğrenciler'], ['ogretmenler', 'Sadece öğretmenler']].concat(S.siniflar.map(s => [s.ad, s.ad + ' sınıfı']));
  let h = '<div class="bas-satir"><h1>Duyurular</h1>' + (o ? '<button class="btn ana" id="dEkle">+ Duyuru</button>' : '') + '</div>';
  h += l.length ? l.map(d => '<div class="kart" style="margin-bottom:12px"><div class="satir">' + (d.sabit ? '<span class="cip koyu">📌 Sabit</span>' : '') + (o ? '<span class="cip bos">' + esc((HEDEF.find(x => x[0] === d.hedef) || [, d.hedef])[1]) + '</span>' : '') +
    '<span class="mini">' + esc(adi(d.yazan_id)) + ' · ' + once(d.olusturma) + (d.bitis ? ' · ' + tarihYaz(d.bitis) + '\'e kadar' : '') + '</span>' + (o ? '<button class="btn kucuk hayalet sag" data-d="' + d.id + '">✏️</button>' : '') + '</div>' +
    '<h3 style="margin:8px 0 4px">' + esc(d.baslik) + '</h3>' + (d.metin ? '<div>' + bicim(d.metin) + '</div>' : '') + '</div>').join('') : '<div class="kart bos-kart">Duyuru yok.</div>';
  el.innerHTML = h;
  if (!o) return;
  const form = d => {
    d = d || { hedef: 'herkes' };
    modal('<form style="padding:24px;width:min(620px,94vw)" id="dF"><h3>' + (d.id ? 'Duyuruyu düzenle' : 'Yeni duyuru') + '</h3>' +
      '<label class="alan"><span>Başlık</span><input name="baslik" required value="' + esc(d.baslik || '') + '"></label>' +
      '<label class="alan"><span>Metin</span><textarea name="metin" rows="5">' + esc(d.metin || '') + '</textarea></label>' +
      '<div class="form-izgara"><label class="alan"><span>Kime</span><select name="hedef">' + secenekler(HEDEF, d.hedef) + '</select></label>' +
      '<label class="alan"><span>Son gösterim tarihi</span><input type="date" name="bitis" value="' + esc(d.bitis || '') + '"></label></div>' +
      '<label class="satir" style="margin-bottom:12px"><input type="checkbox" name="sabit" ' + (d.sabit ? 'checked' : '') + '> En üstte sabit dursun</label>' +
      '<div class="satir"><button class="btn ana">Yayınla</button>' + (d.id ? '<button type="button" class="btn kucuk hayalet" id="dSil" style="color:var(--kirmizi)">Sil</button>' : '') + '</div></form>');
    $('#dF').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      const k = { baslik: f.baslik.value.trim(), metin: f.metin.value.trim() || null, hedef: f.hedef.value, bitis: f.bitis.value || null, sabit: f.sabit.checked };
      try {
        if (d.id) await q(sb.from('duyurular').update(k).eq('id', d.id));
        else {
          await q(sb.from('duyurular').insert(Object.assign(k, { yazan_id: S.ben.id })));
          const alici = S.kisiler.filter(x => x.aktif && x.id !== S.ben.id && (k.hedef === 'herkes' || (k.hedef === 'ogrenciler' && x.rol === 'ogrenci') || (k.hedef === 'ogretmenler' && x.rol !== 'ogrenci') || x.sinif === k.hedef));
          if (alici.length) await q(sb.from('bildirimler').insert(alici.map(x => ({ kisi_id: x.id, baslik: '📣 ' + k.baslik, link: '#/duyurular' }))));
        }
        modalKapat(); tost('Yayınlandı'); duyurular(el);
      } catch (er) { hata(er); }
    };
    if ($('#dSil')) $('#dSil').onclick = async () => { if (!confirm('Silinsin mi?')) return; try { await q(sb.from('duyurular').delete().eq('id', d.id)); modalKapat(); duyurular(el); } catch (er) { hata(er); } };
  };
  $('#dEkle').onclick = () => form();
  $$('[data-d]', el).forEach(b => b.onclick = () => form(l.find(x => x.id === b.dataset.d)));
}

/* ================= ETKİNLİKLER ================= */
const ETK_TUR = [['tubitak', 'TÜBİTAK'], ['teknofest', 'TEKNOFEST'], ['yarisma', 'Yarışma'], ['girisimcilik', 'Girişimcilik'], ['bilisim', 'Bilişim'], ['okul_ici', 'Okul içi'], ['diger', 'Diğer']];
const ETK_RENK = { tubitak: 'kirmizi', teknofest: 'mavi', yarisma: 'mor', girisimcilik: 'turuncu', bilisim: 'mavi', okul_ici: 'onaylandi', diger: 'bos' };
export async function etkinlikler(el, p) {
  const o = ogretmen(), tur = p[0] && !/^[0-9a-f-]{36}$/.test(p[0]) ? p[0] : 'hepsi';
  const [l, kat, prj] = await Promise.all([
    q(sb.from('etkinlikler').select('*').order('basvuru_bitis', { nullsFirst: false })),
    q(sb.from('etkinlik_katilim').select('*')),
    q(sb.from('projeler').select('id,ad,etkinlik_id').not('etkinlik_id', 'is', null))
  ]);
  if (p[0] && /^[0-9a-f-]{36}$/.test(p[0])) return etkinlikDetay(el, l.find(x => x.id === p[0]), kat, prj);
  const bugun = new Date().toISOString().slice(0, 10);
  const gelecek = e => e.tekrar || (e.basvuru_bitis && e.basvuru_bitis >= bugun) || (e.bitis && e.bitis.slice(0, 10) >= bugun) || (e.baslangic && e.baslangic.slice(0, 10) >= bugun) || (!e.basvuru_bitis && !e.baslangic);
  const liste = l.filter(e => tur === 'hepsi' || e.tur === tur);
  let h = '<div class="bas-satir"><h1>Etkinlikler ve yarışmalar</h1>' + (o ? '<button class="btn ana" id="eEkle">+ Etkinlik</button>' : '') + '</div>' +
    '<div class="filtre">' + [['hepsi', 'Hepsi']].concat(ETK_TUR).map(t => '<a class="btn kucuk ' + (tur === t[0] ? 'ana' : '') + '" href="#/etkinlikler/' + t[0] + '">' + t[1] + '</a>').join('') + '</div>';
  const kart = e => {
    const tarih = e.basvuru_bitis || (e.baslangic && e.baslangic.slice(0, 10)), g = tarih ? kalan(tarih) : null, d = tarih ? new Date(tarih) : null;
    const ilg = kat.filter(k => k.etkinlik_id === e.id), ben = ilg.find(k => k.kisi_id === S.ben.id);
    return '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/etkinlikler/' + e.id + '"><div class="tarih-kutu ' + (g !== null && g >= 0 && g <= 14 ? 'yakin' : '') + '">' + (d ? '<div class="geri-sayim">' + d.getDate() + '<small>' + d.toLocaleDateString('tr-TR', { month: 'short' }) + '</small></div>' : '<div class="geri-sayim">∞<small>düzenli</small></div>') + '</div>' +
      '<span class="ana-m"><b>' + esc(e.baslik) + '</b><span class="mini">' + esc(e.kurum || '') + (e.tekrar ? ' · ' + esc(e.tekrar) : '') + (e.basvuru_bitis ? ' · Başvuru: ' + kalanYaz(e.basvuru_bitis) : '') + (e.hedef_kitle ? ' · ' + esc(e.hedef_kitle) : '') + '</span></span>' +
      '<span class="cip ' + ETK_RENK[e.tur] + '">' + esc((ETK_TUR.find(t => t[0] === e.tur) || [, e.tur])[1]) + '</span>' + (e.ogretmenlere ? '<span class="cip bos">öğretmenlere</span>' : '') +
      (o ? (ilg.length ? '<span class="cip mavi">' + ilg.length + ' öğrenci ilgili</span>' : '') : ben ? '<span class="cip onaylandi">' + (ben.durum === 'katiliyorum' ? 'Katılıyorum' : 'İlgileniyorum') + '</span>' : '') + '</a>';
  };
  const yak = liste.filter(gelecek), gec = liste.filter(e => !gelecek(e));
  h += yak.length ? '<div class="kart liste">' + yak.map(kart).join('') + '</div>' : '<div class="kart bos-kart">Yaklaşan etkinlik yok.</div>';
  if (gec.length) h += '<details style="margin-top:16px"><summary style="cursor:pointer;font-weight:800">Geçmiş etkinlikler (' + gec.length + ')</summary><div class="kart liste" style="margin-top:8px">' + gec.reverse().map(kart).join('') + '</div></details>';
  el.innerHTML = h;
  if (o) $('#eEkle').onclick = () => etkinlikFormu(null, () => etkinlikler(el, p));
}
async function etkinlikDetay(el, e, kat, prj) {
  if (!e) { el.innerHTML = '<div class="kart">Etkinlik bulunamadı.</div>'; return; }
  const o = ogretmen(), ilg = kat.filter(k => k.etkinlik_id === e.id), ben = ilg.find(k => k.kisi_id === S.ben.id), p = prj.filter(x => x.etkinlik_id === e.id);
  let h = '<div class="satir" style="margin-bottom:12px"><a class="btn kucuk" href="#/etkinlikler">← Etkinlikler</a>' + (o ? '<button class="btn kucuk" id="eDuz">✏️ Düzenle</button>' : '') + '</div>' +
    '<span class="cip ' + ETK_RENK[e.tur] + '">' + esc((ETK_TUR.find(t => t[0] === e.tur) || [, e.tur])[1]) + '</span><h1 style="margin:8px 0 4px">' + esc(e.baslik) + '</h1><div class="mini">' + esc(e.kurum || '') + (e.hedef_kitle ? ' · ' + esc(e.hedef_kitle) : '') + '</div>' +
    '<div class="istatistik">' + (e.basvuru_bitis ? '<div class="kart"><span class="mini">Başvuru son gün</span><b style="font-size:1.1rem">' + tarihYaz(e.basvuru_bitis) + '</b><span class="mini">' + kalanYaz(e.basvuru_bitis) + '</span></div>' : '') +
    (e.baslangic ? '<div class="kart"><span class="mini">Etkinlik</span><b style="font-size:1.1rem">' + tarihYaz(e.baslangic, true) + '</b>' + (e.bitis ? '<span class="mini">→ ' + tarihYaz(e.bitis, true) + '</span>' : '') + '</div>' : '') +
    (e.tekrar ? '<div class="kart"><span class="mini">Ne zaman</span><b style="font-size:1.1rem">' + esc(e.tekrar) + '</b></div>' : '') + (e.yer ? '<div class="kart"><span class="mini">Yer</span><b style="font-size:1.1rem">' + esc(e.yer) + '</b></div>' : '') + '</div>' +
    (e.aciklama ? '<div class="kart">' + bicim(e.aciklama) + '</div>' : '') + (e.link ? '<p><a class="btn" href="' + esc(e.link) + '" target="_blank" rel="noopener">Resmî sayfa →</a></p>' : '');
  if (!o) h += '<div class="satir" style="margin-top:14px"><button class="btn ' + (ben && ben.durum === 'ilgileniyorum' ? 'ana' : '') + '" data-k="ilgileniyorum">⭐ İlgileniyorum</button><button class="btn ' + (ben && ben.durum === 'katiliyorum' ? 'ana' : '') + '" data-k="katiliyorum">✋ Katılmak istiyorum</button>' + (ben ? '<button class="btn kucuk hayalet" data-k="">Vazgeç</button>' : '') + '</div>' +
    (['tubitak', 'teknofest', 'yarisma', 'girisimcilik'].includes(e.tur) ? '<p class="mini">Bu yarışmaya proje ile katılmak istiyorsan <a href="#/projeler/yeni">proje öner</a> ve hedef olarak bu etkinliği seç.</p>' : '');
  else {
    h += '<h2>İlgilenen öğrenciler (' + ilg.length + ')</h2>' + (ilg.length ? '<div class="kart liste">' + ilg.map(k => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/kisi/' + k.kisi_id + '"><span class="ana-m"><b>' + esc(adi(k.kisi_id)) + '</b><span class="mini">' + esc((S.kisiMap[k.kisi_id] || {}).sinif || '') + '</span></span><span class="cip ' + (k.durum === 'katiliyorum' ? 'onaylandi' : 'bos') + '">' + (k.durum === 'katiliyorum' ? 'Katılmak istiyor' : 'İlgileniyor') + '</span></a>').join('') + '</div>' : '<div class="kart alt">Henüz yok.</div>');
    h += '<h2>Bu etkinliği hedefleyen projeler (' + p.length + ')</h2>' + (p.length ? '<div class="kart liste">' + p.map(x => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/projeler/' + x.id + '"><b>' + esc(x.ad) + '</b></a>').join('') + '</div>' : '<div class="kart alt">Henüz yok.</div>');
  }
  el.innerHTML = h;
  if (o) $('#eDuz').onclick = () => etkinlikFormu(e, () => import('./app.js').then(m => m.git()));
  $$('[data-k]', el).forEach(b => b.onclick = async () => {
    try {
      if (!b.dataset.k) await q(sb.from('etkinlik_katilim').delete().eq('etkinlik_id', e.id).eq('kisi_id', S.ben.id));
      else await q(sb.from('etkinlik_katilim').upsert({ etkinlik_id: e.id, kisi_id: S.ben.id, durum: b.dataset.k }));
      import('./app.js').then(m => m.git());
    } catch (er) { hata(er); }
  });
}
function etkinlikFormu(e, sonra) {
  e = e || { tur: 'yarisma' };
  modal('<form style="padding:24px;width:min(720px,94vw)" id="eF"><h3>' + (e.id ? 'Etkinliği düzenle' : 'Yeni etkinlik') + '</h3>' +
    '<label class="alan"><span>Başlık</span><input name="baslik" required value="' + esc(e.baslik || '') + '"></label>' +
    '<div class="form-izgara"><label class="alan"><span>Tür</span><select name="tur">' + secenekler(ETK_TUR, e.tur) + '</select></label>' +
    '<label class="alan"><span>Düzenleyen kurum</span><input name="kurum" value="' + esc(e.kurum || '') + '"></label>' +
    '<label class="alan"><span>Başvuru son gün</span><input type="date" name="basvuru_bitis" value="' + esc(e.basvuru_bitis || '') + '"></label>' +
    '<label class="alan"><span>Başlangıç</span><input type="datetime-local" name="baslangic" value="' + yerelTarih(e.baslangic) + '"></label>' +
    '<label class="alan"><span>Bitiş</span><input type="datetime-local" name="bitis" value="' + yerelTarih(e.bitis) + '"></label>' +
    '<label class="alan"><span>Düzenli ise ne zaman?</span><input name="tekrar" value="' + esc(e.tekrar || '') + '" placeholder="Her Çarşamba 7. ders"></label>' +
    '<label class="alan"><span>Yer</span><input name="yer" value="' + esc(e.yer || '') + '"></label>' +
    '<label class="alan"><span>Kimler katılabilir?</span><input name="hedef_kitle" value="' + esc(e.hedef_kitle || '') + '" placeholder="9-12. sınıf"></label></div>' +
    '<label class="alan"><span>Açıklama</span><textarea name="aciklama" rows="4">' + esc(e.aciklama || '') + '</textarea></label>' +
    '<label class="alan"><span>Resmî bağlantı</span><input name="link" value="' + esc(e.link || '') + '" placeholder="https://..."></label>' +
    '<label class="satir" style="margin-bottom:12px"><input type="checkbox" name="ogretmenlere" ' + (e.ogretmenlere ? 'checked' : '') + '> Sadece öğretmenler görsün</label>' +
    '<label class="satir" style="margin-bottom:12px"><input type="checkbox" name="bildir" ' + (e.id ? '' : 'checked') + '> Kaydedince bildirim gönder</label>' +
    '<div class="satir"><button class="btn ana">Kaydet</button>' + (e.id ? '<button type="button" class="btn kucuk hayalet" id="eSil" style="color:var(--kirmizi)">Sil</button>' : '') + '</div></form>');
  $('#eF').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target;
    const k = {}; ['baslik', 'tur', 'kurum', 'basvuru_bitis', 'tekrar', 'yer', 'hedef_kitle', 'aciklama', 'link'].forEach(x => { k[x] = f[x].value.trim() || null; });
    k.baslangic = f.baslangic.value ? new Date(f.baslangic.value).toISOString() : null; k.bitis = f.bitis.value ? new Date(f.bitis.value).toISOString() : null; k.ogretmenlere = f.ogretmenlere.checked;
    if (k.link && !/^https?:\/\//i.test(k.link)) return tost('Bağlantı https:// ile başlamalı.', true);
    try {
      if (e.id) await q(sb.from('etkinlikler').update(k).eq('id', e.id)); else await q(sb.from('etkinlikler').insert(Object.assign(k, { ekleyen: S.ben.id })));
      if (f.bildir.checked) {
        const alici = S.kisiler.filter(x => x.aktif && x.id !== S.ben.id && (!k.ogretmenlere || x.rol !== 'ogrenci'));
        await q(sb.from('bildirimler').insert(alici.map(x => ({ kisi_id: x.id, baslik: '🏆 ' + k.baslik, metin: k.basvuru_bitis ? 'Başvuru son gün: ' + tarihYaz(k.basvuru_bitis) : null, link: '#/etkinlikler' }))));
      }
      modalKapat(); tost('Kaydedildi'); sonra();
    } catch (er) { hata(er); }
  };
  if ($('#eSil')) $('#eSil').onclick = async () => { if (!confirm('Silinsin mi?')) return; try { await q(sb.from('etkinlikler').delete().eq('id', e.id)); modalKapat(); location.hash = '#/etkinlikler'; } catch (er) { hata(er); } };
}

/* ================= BELGELER ================= */
export async function belgeler(el, p, erasmusId) {
  const o = ogretmen();
  let sorgu = sb.from('belgeler').select('*').order('klasor').order('olusturma', { ascending: false });
  if (erasmusId) sorgu = sorgu.eq('erasmus_id', erasmusId);
  const l = await q(sorgu);
  const klasorler = [...new Set(l.map(b => b.klasor))];
  const k = !erasmusId && p && p[0] ? p[0] : 'hepsi';
  let h = erasmusId ? '<div class="bas-satir"><h2 style="margin:0;flex:1">Belgeler</h2>' + (o ? '<button class="btn kucuk" id="bEkle">+ Belge yükle</button>' : '') + '</div>'
    : '<div class="bas-satir"><h1>Belgeler</h1>' + (o ? '<button class="btn ana" id="bEkle">+ Belge yükle</button>' : '') + '</div>' +
      '<div class="alt" style="margin-bottom:12px">' + (o ? 'Öğretmenlere özel belgeler, formlar, şablonlar. "Öğrenciler de görsün" işaretlediklerin öğrencilere açılır.' : 'Öğretmenlerinin paylaştığı formlar ve belgeler.') + '</div>' +
      (klasorler.length > 1 ? '<div class="filtre">' + ['hepsi'].concat(klasorler).map(x => '<a class="btn kucuk ' + (k === x ? 'ana' : '') + '" href="#/belgeler/' + encodeURIComponent(x) + '">' + (x === 'hepsi' ? 'Hepsi' : '🗂️ ' + esc(x)) + '</a>').join('') + '</div>' : '');
  const liste = l.filter(b => k === 'hepsi' || b.klasor === k);
  h += liste.length ? '<div class="kart liste">' + liste.map(b => '<div class="liste-satir"><span>📄</span><span class="ana-m"><b>' + esc(b.baslik) + '</b><span class="mini">' + esc(b.klasor) + ' · ' + esc(adi(b.yukleyen)) + ' · ' + tarihYaz(b.olusturma) + (b.boyut ? ' · ' + Math.max(1, Math.round(b.boyut / 1024)) + ' KB' : '') + (b.aciklama ? ' · ' + esc(b.aciklama) : '') + '</span></span>' +
    (o && b.herkese ? '<span class="cip onaylandi">öğrenciler görür</span>' : '') + '<button class="btn kucuk" data-indir="' + esc(b.dosya_yolu) + '">İndir</button>' + (o ? '<button class="btn kucuk hayalet" data-sil="' + b.id + '">🗑</button>' : '') + '</div>').join('') + '</div>' : '<div class="kart bos-kart">Belge yok.</div>';
  el.innerHTML = h;
  $$('[data-indir]', el).forEach(b => b.onclick = async () => { try { window.open(await imzaliUrl('belgeler', b.dataset.indir), '_blank'); } catch (e) { hata(e); } });
  $$('[data-sil]', el).forEach(b => b.onclick = async () => {
    if (!confirm('Belge silinsin mi?')) return;
    const x = l.find(y => y.id === b.dataset.sil);
    try { await q(sb.from('belgeler').delete().eq('id', x.id)); sb.storage.from('belgeler').remove([x.dosya_yolu]); belgeler(el, p, erasmusId); } catch (e) { hata(e); }
  });
  if (o && $('#bEkle', el)) $('#bEkle', el).onclick = () => {
    modal('<form style="padding:24px;width:min(560px,94vw)" id="bF"><h3>Belge yükle</h3><label class="alan"><span>Dosya(lar) (en fazla 50 MB)</span><input type="file" name="dosya" multiple required></label>' +
      '<label class="alan"><span>Başlık (tek dosyada; boşsa dosya adı)</span><input name="baslik"></label>' +
      '<label class="alan"><span>Klasör</span><input name="klasor" list="kl" value="' + esc(erasmusId ? 'Erasmus+' : (k !== 'hepsi' ? k : 'Genel')) + '"><datalist id="kl">' + klasorler.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></label>' +
      '<label class="alan"><span>Açıklama</span><input name="aciklama"></label>' +
      '<label class="satir" style="margin-bottom:12px"><input type="checkbox" name="herkese"> Öğrenciler de görsün</label><button class="btn ana">Yükle</button></form>');
    $('#bF').onsubmit = async e => {
      e.preventDefault(); const f = e.target, dosyalar = Array.from(f.dosya.files), btn = $('button.ana', f); btn.disabled = true; btn.textContent = 'Yükleniyor…';
      try {
        for (const d of dosyalar) {
          const yol = (f.herkese.checked ? 'herkes/' : 'ogretmen/') + guvenliAd(f.klasor.value || 'Genel') + '/' + Date.now() + '_' + guvenliAd(d.name);
          await dosyaYukle('belgeler', yol, d);
          await q(sb.from('belgeler').insert({ baslik: (dosyalar.length === 1 && f.baslik.value.trim()) || d.name.replace(/\.[^.]+$/, ''), aciklama: f.aciklama.value.trim() || null, klasor: f.klasor.value.trim() || 'Genel', dosya_yolu: yol, dosya_adi: d.name, boyut: d.size, herkese: f.herkese.checked, erasmus_id: erasmusId || null, yukleyen: S.ben.id }));
        }
        modalKapat(); tost('Yüklendi'); belgeler(el, p, erasmusId);
      } catch (er) { btn.disabled = false; btn.textContent = 'Yükle'; hata(er); }
    };
  };
}

/* ================= ERASMUS+ ================= */
const ER_DURUM = [['hazirlik', 'Hazırlık'], ['basvuruldu', 'Başvuruldu'], ['kabul', 'Kabul edildi'], ['red', 'Reddedildi'], ['yurutuluyor', 'Yürütülüyor'], ['tamamlandi', 'Tamamlandı']];
const ER_SABLON = ['Ortak arama / ortaklık mektupları', 'Başvuru formu taslağı', 'Bütçe hesabı', 'Okul müdürü onayı ve yasal temsilci beyanı', 'Başvurunun gönderilmesi', 'Sonuç bildirimi', 'Hibe sözleşmesinin imzalanması', 'Katılımcı seçimi ve duyurusu', 'Hareketlilik öncesi hazırlık (sigorta, ulaşım, OLS)', 'Hareketliliğin gerçekleşmesi', 'Yaygınlaştırma faaliyetleri', 'Katılımcı raporları', 'Nihai rapor'];
export async function erasmus(el, p) {
  if (!ogretmen()) { el.innerHTML = '<div class="kart">Bu bölüm öğretmenlere özel.</div>'; return; }
  if (p[0]) return erasmusDetay(el, p[0]);
  const [l, as] = await Promise.all([q(sb.from('erasmus_projeler').select('*').order('olusturma', { ascending: false })), q(sb.from('erasmus_asamalar').select('proje_id,tamam,son_tarih'))]);
  let h = '<div class="bas-satir"><h1>Erasmus+ projeleri</h1><button class="btn ana" id="erEkle">+ Proje</button></div><div class="alt" style="margin-bottom:12px">Başvuru ve yürütme süreçlerini adım adım takip et. Sadece öğretmenler görür.</div>';
  h += l.length ? '<div class="izgara iki">' + l.map(x => {
    const a = as.filter(y => y.proje_id === x.id), t = a.filter(y => y.tamam).length, sonraki = a.filter(y => !y.tamam && y.son_tarih).sort((m, n) => m.son_tarih.localeCompare(n.son_tarih))[0];
    return '<a class="kart" style="text-decoration:none;color:inherit" href="#/erasmus/' + x.id + '"><div class="satir"><span class="cip mavi">' + esc(x.program || 'Erasmus+') + '</span><span class="cip bos">' + esc((ER_DURUM.find(d => d[0] === x.durum) || [, x.durum])[1]) + '</span></div><h3 style="margin:8px 0 4px">' + esc(x.ad) + '</h3>' +
      '<div class="mini">' + esc(x.donem || '') + (x.sorumlu_id ? ' · ' + esc(adi(x.sorumlu_id)) : '') + '</div><div class="ilerleme"><i style="width:' + (a.length ? Math.round(t / a.length * 100) : 0) + '%"></i></div><div class="mini">' + t + '/' + a.length + ' adım' + (sonraki ? ' · sıradaki: ' + tarihYaz(sonraki.son_tarih) + ' (' + kalanYaz(sonraki.son_tarih) + ')' : '') + '</div></a>';
  }).join('') + '</div>' : '<div class="kart bos-kart">Henüz Erasmus+ projesi yok.</div>';
  el.innerHTML = h;
  $('#erEkle').onclick = () => erFormu(null, id => { location.hash = '#/erasmus/' + id; });
}
function erFormu(x, sonra) {
  x = x || { durum: 'hazirlik', program: 'KA210-SCH', donem: '2026-2027' };
  modal('<form style="padding:24px;width:min(600px,94vw)" id="erF"><h3>' + (x.id ? 'Projeyi düzenle' : 'Yeni Erasmus+ projesi') + '</h3>' +
    '<label class="alan"><span>Proje adı</span><input name="ad" required value="' + esc(x.ad || '') + '"></label>' +
    '<div class="form-izgara"><label class="alan"><span>Program / eylem</span><input name="program" list="erp" value="' + esc(x.program || '') + '"><datalist id="erp"><option value="KA1 Akreditasyon"><option value="KA121-SCH"><option value="KA122-SCH"><option value="KA122-VET"><option value="KA210-SCH"><option value="KA210-VET"><option value="KA220-SCH"><option value="KA220-VET"><option value="eTwinning"></datalist></label>' +
    '<label class="alan"><span>Dönem</span><input name="donem" value="' + esc(x.donem || '') + '"></label>' +
    '<label class="alan"><span>Durum</span><select name="durum">' + secenekler(ER_DURUM, x.durum) + '</select></label>' +
    '<label class="alan"><span>Sorumlu</span><select name="sorumlu_id">' + secenekler(ogretmenler().map(k => [k.id, k.ad + ' ' + k.soyad]), x.sorumlu_id || S.ben.id, '—') + '</select></label></div>' +
    '<label class="alan"><span>Açıklama / notlar</span><textarea name="aciklama" rows="4">' + esc(x.aciklama || '') + '</textarea></label>' +
    (x.id ? '' : '<label class="satir" style="margin-bottom:12px"><input type="checkbox" name="sablon" checked> Standart adım listesini ekle (başvurudan nihai rapora 13 adım)</label>') +
    '<button class="btn ana">Kaydet</button></form>');
  $('#erF').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const k = { ad: f.ad.value.trim(), program: f.program.value.trim() || null, donem: f.donem.value.trim() || null, durum: f.durum.value, sorumlu_id: f.sorumlu_id.value || null, aciklama: f.aciklama.value.trim() || null };
    try {
      let id = x.id;
      if (id) await q(sb.from('erasmus_projeler').update(k).eq('id', id));
      else {
        id = (await q(sb.from('erasmus_projeler').insert(k).select('id').single())).id;
        if (f.sablon.checked) await q(sb.from('erasmus_asamalar').insert(ER_SABLON.map((b, i) => ({ proje_id: id, baslik: b, sira: i + 1 }))));
      }
      modalKapat(); sonra(id);
    } catch (er) { hata(er); }
  };
}
async function erasmusDetay(el, id) {
  const [x, as] = await Promise.all([q(sb.from('erasmus_projeler').select('*').eq('id', id).single()), q(sb.from('erasmus_asamalar').select('*').eq('proje_id', id).order('sira'))]);
  const t = as.filter(a => a.tamam).length;
  let h = '<div class="satir" style="margin-bottom:12px"><a class="btn kucuk" href="#/erasmus">← Erasmus+</a><button class="btn kucuk" id="erDuz">✏️ Düzenle</button><button class="btn kucuk hayalet" id="erSil" style="color:var(--kirmizi)">Sil</button></div>' +
    '<div class="satir"><span class="cip mavi">' + esc(x.program || 'Erasmus+') + '</span><span class="cip bos">' + esc((ER_DURUM.find(d => d[0] === x.durum) || [, x.durum])[1]) + '</span></div><h1 style="margin:8px 0 4px">' + esc(x.ad) + '</h1>' +
    '<div class="mini">' + esc(x.donem || '') + (x.sorumlu_id ? ' · Sorumlu: ' + esc(adi(x.sorumlu_id)) : '') + '</div>' + (x.aciklama ? '<div class="kart" style="margin-top:12px">' + bicim(x.aciklama) + '</div>' : '') +
    '<div class="bas-satir" style="margin-top:18px"><h2 style="margin:0;flex:1">Adımlar (' + t + '/' + as.length + ')</h2><button class="btn kucuk" id="asEkle">+ Adım</button></div><div class="kart liste">' +
    (as.length ? as.map(a => '<div class="liste-satir"><input type="checkbox" data-tamam="' + a.id + '" ' + (a.tamam ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--yesil)"><span class="ana-m" style="' + (a.tamam ? 'text-decoration:line-through;color:var(--soluk)' : '') + '"><b>' + esc(a.baslik) + '</b><span class="mini">' + (a.sorumlu_id ? esc(adi(a.sorumlu_id)) + ' · ' : '') + (a.notu ? esc(a.notu) : '') + '</span></span>' +
      (a.son_tarih ? '<span class="mini" style="' + (!a.tamam && kalan(a.son_tarih) <= 7 ? 'color:var(--turuncu);font-weight:800' : '') + '">' + tarihYaz(a.son_tarih) + (a.tamam ? '' : ' · ' + kalanYaz(a.son_tarih)) + '</span>' : '') + '<button class="btn kucuk hayalet" data-as="' + a.id + '">✏️</button></div>').join('') : '<div class="liste-satir alt">Adım yok.</div>') + '</div><div id="erBelge" style="margin-top:20px"></div>';
  el.innerHTML = h;
  belgeler($('#erBelge'), [], id);
  $('#erDuz').onclick = () => erFormu(x, () => erasmusDetay(el, id));
  $('#erSil').onclick = async () => { if (!confirm('Proje ve adımları silinsin mi? (Belgeler kalır)')) return; try { await q(sb.from('erasmus_projeler').delete().eq('id', id)); location.hash = '#/erasmus'; } catch (e) { hata(e); } };
  $$('[data-tamam]', el).forEach(c => c.onchange = async () => { try { await q(sb.from('erasmus_asamalar').update({ tamam: c.checked }).eq('id', c.dataset.tamam)); erasmusDetay(el, id); } catch (e) { hata(e); } });
  const asForm = a => {
    a = a || {};
    modal('<form style="padding:24px;width:min(520px,94vw)" id="asF"><h3>' + (a.id ? 'Adımı düzenle' : 'Yeni adım') + '</h3><label class="alan"><span>Adım</span><input name="baslik" required value="' + esc(a.baslik || '') + '"></label>' +
      '<div class="form-izgara"><label class="alan"><span>Son tarih</span><input type="date" name="son_tarih" value="' + esc(a.son_tarih || '') + '"></label><label class="alan"><span>Sorumlu</span><select name="sorumlu_id">' + secenekler(ogretmenler().map(k => [k.id, k.ad + ' ' + k.soyad]), a.sorumlu_id, '—') + '</select></label></div>' +
      '<label class="alan"><span>Not</span><textarea name="notu" rows="2">' + esc(a.notu || '') + '</textarea></label><div class="satir"><button class="btn ana">Kaydet</button>' + (a.id ? '<button type="button" class="btn kucuk hayalet" id="asSil" style="color:var(--kirmizi)">Sil</button>' : '') + '</div></form>');
    $('#asF').onsubmit = async e => {
      e.preventDefault(); const f = e.target, k = { baslik: f.baslik.value.trim(), son_tarih: f.son_tarih.value || null, sorumlu_id: f.sorumlu_id.value || null, notu: f.notu.value.trim() || null };
      try { if (a.id) await q(sb.from('erasmus_asamalar').update(k).eq('id', a.id)); else await q(sb.from('erasmus_asamalar').insert(Object.assign(k, { proje_id: id }))); modalKapat(); erasmusDetay(el, id); } catch (er) { hata(er); }
    };
    if ($('#asSil')) $('#asSil').onclick = async () => { try { await q(sb.from('erasmus_asamalar').delete().eq('id', a.id)); modalKapat(); erasmusDetay(el, id); } catch (er) { hata(er); } };
  };
  $('#asEkle').onclick = () => asForm();
  $$('[data-as]', el).forEach(b => b.onclick = () => asForm(as.find(a => a.id === b.dataset.as)));
}

/* ================= ASİSTAN (sohbet tarzı arama) ================= */
const TUR_IKON = { ders: '📚', duyuru: '📣', etkinlik: '🏆', fikir: '💡', proje: '🚀', 'iş': '📌', materyal: '🧩', belge: '🗂️', 'kişi': '👤', erasmus: '🇪🇺' };
const sohbet = [];
export async function asistan(el) {
  const o = ogretmen();
  const oneriler = o ? ['Bekleyen teslimler', 'Onay bekleyen evraklar', 'Yaklaşan son tarihler', 'TÜBİTAK', 'Bu haftanın dersleri'] : ['Bu hafta ne yapmalıyım?', 'Ödevlerim', 'Teslim süresi', 'Yaklaşan yarışmalar', 'Projem'];
  el.innerHTML = '<h1>Asistan</h1><div class="alt" style="margin-bottom:14px">Platformda aradığın her şeyi yaz: ders konusu, ödev, proje, yarışma, belge, kişi… Sadece görmeye yetkili olduğun bilgiler gelir.</div>' +
    '<div class="sohbet" id="sohbet"></div><div class="oneriler" id="oneri" style="margin:12px 0">' + oneriler.map(x => '<button>' + esc(x) + '</button>').join('') + '</div>' +
    '<form class="sohbet-giris" id="sF"><input id="sQ" placeholder="Bir şey sor ya da ara…" autocomplete="off"><button class="btn ana">Gönder</button></form>';
  const ciz = () => { $('#sohbet').innerHTML = sohbet.map(m => '<div class="mesaj ' + m.kim + '">' + m.html + '</div>').join('') || '<div class="mesaj o">Merhaba ' + esc(guzelAd(S.ben.ad.split(' ')[0])) + '! Ne arıyorsun?</div>'; window.scrollTo(0, document.body.scrollHeight); };
  const sor = async metin => {
    metin = metin.trim(); if (!metin) return;
    sohbet.push({ kim: 'ben', html: esc(metin) }); ciz();
    try { sohbet.push({ kim: 'o', html: await cevapla(metin) }); } catch (e) { sohbet.push({ kim: 'o', html: 'Bir sorun oldu: ' + esc(e.message) }); }
    ciz();
  };
  ciz();
  $('#sF').onsubmit = e => { e.preventDefault(); const v = $('#sQ').value; $('#sQ').value = ''; sor(v); };
  $$('#oneri button').forEach(b => b.onclick = () => sor(b.textContent));
  $('#sQ').focus();
}
function kucuk(s) { return String(s).toLocaleLowerCase('tr').replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim(); }
async function cevapla(metin) {
  const k = kucuk(metin), o = ogretmen();
  const sonucHtml = l => l.map(r => '<a class="sonuc" href="' + esc(r.link) + '">' + (TUR_IKON[r.tur] || '•') + ' <b>' + esc(r.baslik) + '</b>' + (r.ozet ? '<div class="mini">' + esc(String(r.ozet).slice(0, 120)) + '</div>' : '') + '</a>').join('');
  // hazır niyetler
  if (/(bekleyen teslim|incele)/.test(k) && o) { const { count } = await sb.from('teslimler').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor'); return '<b>' + (count || 0) + '</b> teslim onay bekliyor. <a href="#/inceleme">İncelemeye git →</a>'; }
  if (/(evrak|onay bekleyen)/.test(k) && o) { const l = await q(sb.from('proje_evrak').select('proje_id,sablon,adim').eq('durum', 'gonderildi')); const pr = l.length ? await q(sb.from('projeler').select('id,ad').in('id', [...new Set(l.map(x => x.proje_id))])) : []; return l.length ? '<b>' + l.length + '</b> evrak adımı onay bekliyor:' + pr.map(p => '<a class="sonuc" href="#/projeler/' + p.id + '/evrak">🚀 <b>' + esc(p.ad) + '</b> <span class="mini">' + l.filter(x => x.proje_id === p.id).length + ' adım</span></a>').join('') : 'Onay bekleyen evrak yok. 🎉'; }
  if (/(son tarih|yaklaşan|yarışma)/.test(k)) { const l = await q(sb.from('etkinlikler').select('id,baslik,basvuru_bitis').gte('basvuru_bitis', new Date().toISOString().slice(0, 10)).order('basvuru_bitis').limit(6)); return l.length ? 'Yaklaşan başvuru son tarihleri:' + l.map(e => '<a class="sonuc" href="#/etkinlikler/' + e.id + '">🏆 <b>' + esc(e.baslik) + '</b> <span class="mini">' + tarihYaz(e.basvuru_bitis) + ' · ' + kalanYaz(e.basvuru_bitis) + '</span></a>').join('') : 'Şu an yaklaşan bir başvuru tarihi yok. <a href="#/etkinlikler">Tüm etkinlikler →</a>'; }
  if (/(teslim süre|ne zamana kadar|son teslim|süre)/.test(k)) { const t = S.ayar.toplu_son_teslim; return (t ? '1-' + t.hafta_kadar + '. haftaların uygulamaları <b>' + tarihYaz(t.tarih, true) + '</b>\'a kadar açık. ' : '') + 'Sonraki her haftanın uygulamaları o haftanın <b>Cuma 23:59</b>\'unda kapanır. Ek süre için öğretmenine yaz.'; }
  if (!o && /(bu hafta|ne yapmalı|ödev|işlerim|yapacak)/.test(k)) return 'Tüm ders uygulamaların, ödevlerin ve proje işlerin "İşlerim" sayfasında tek listede, son tarihe göre sıralı. <a href="#/islerim">İşlerim →</a>';
  if (/(projem|proje)/.test(k) && k.split(' ').length <= 2) return '<a href="#/projeler">Projeler sayfasına git →</a>';
  if (/bu haftanın dersleri/.test(k)) return S.dersler.filter(d => o || d.sinif === S.ben.sinif).map(d => '<a class="sonuc" href="#/dersler/' + d.kod + '/' + S.hafta + '">📚 <b>' + esc(d.sinif + ' ' + d.ad) + '</b></a>').join('');
  // genel arama
  const kelimeler = k.split(' ').filter(w => w.length >= 3 && !['nerede', 'nasıl', 'neler', 'hangi', 'için', 'bana', 'göster', 'bul', 'var', 'mı', 'mi', 'ile', 'olan'].includes(w));
  const aranan = kelimeler.length ? kelimeler : [k];
  let sonuc = await q(sb.rpc('ara', { q: aranan.join(' ') }));
  if (!sonuc.length && aranan.length > 1) {
    const hepsi = await Promise.all(aranan.map(w => q(sb.rpc('ara', { q: w }))));
    const map = {}; hepsi.flat().forEach(r => { const a = r.link + r.baslik; map[a] = map[a] || Object.assign({ puan: 0 }, r); map[a].puan++; });
    sonuc = Object.values(map).sort((a, b) => b.puan - a.puan).slice(0, 12);
  }
  if (!sonuc.length) return '"' + esc(metin) + '" ile ilgili bir şey bulamadım. Daha kısa bir kelimeyle dene (ör. "tablo", "TÜBİTAK", "ödev").';
  return '<b>' + sonuc.length + '</b> sonuç:' + sonucHtml(sonuc.slice(0, 12));
}

/* ================= KİŞİ SAYFASI ================= */
export async function kisi(el, p) {
  const id = p[0], k = S.kisiMap[id];
  if (!k) { el.innerHTML = '<div class="kart">Kişi bulunamadı.</div>'; return; }
  const o = ogretmen(), kendim = id === S.ben.id;
  if (!o && !kendim) { el.innerHTML = '<div class="kart"><h2>' + esc(guzelAd(k.ad + ' ' + k.soyad)) + '</h2><div class="mini">' + esc(k.sinif || 'Öğretmen') + '</div></div>'; return; }
  const [ts, gor, uye] = await Promise.all([
    k.rol === 'ogrenci' ? q(sb.from('teslimler').select('ders_kodu,hafta,gorev_id,durum,is_id').eq('ogrenci_id', id)) : [],
    q(sb.from('okul_gorevleri').select('*').eq('ogrenci_id', id).order('baslangic', { ascending: false })),
    k.rol === 'ogrenci' ? q(sb.from('proje_uyeleri').select('proje_id,ayrilma').eq('ogrenci_id', id)) : []
  ]);
  const pr = uye.length ? await q(sb.from('projeler').select('id,ad,durum,asama').in('id', uye.map(u => u.proje_id))) : [];
  let h = '<h1>' + esc(guzelAd(k.ad + ' ' + k.soyad)) + '</h1><div class="alt">' + esc(k.rol === 'ogrenci' ? k.sinif + ' · ' + k.kullanici + (k.grup ? ' · ' + k.grup + ' grubu' : '') : 'Öğretmen') + '</div>';
  if (k.rol === 'ogrenci') {
    h += '<div class="istatistik">' + [['onaylandi', 'onaylanan'], ['bekliyor', 'inceleniyor'], ['duzeltme', 'düzeltme']].map(([d, a]) => '<div class="kart"><b>' + ts.filter(t => t.durum === d).length + '</b><span class="mini">' + a + '</span></div>').join('') + '</div>';
    h += '<h2>Derslere göre</h2><div class="kart liste">' + S.dersler.filter(d => d.sinif === k.sinif).map(d => { const t = ts.filter(x => x.ders_kodu === d.kod); return '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/durum/' + d.kod + '/toplam"><span class="ana-m"><b style="color:' + d.renk + '">' + esc(d.ad) + '</b></span><span class="cip onaylandi">' + t.filter(x => x.durum === 'onaylandi').length + ' ✓</span><span class="cip bekliyor">' + t.filter(x => x.durum === 'bekliyor').length + ' bekliyor</span></a>'; }).join('') + '</div>';
    h += '<h2>Projeler</h2>' + (pr.length ? '<div class="kart liste">' + pr.map(x => '<a class="liste-satir" style="text-decoration:none;color:inherit" href="#/projeler/' + x.id + '"><b>' + esc(x.ad) + '</b><span class="mini sag">' + esc(x.durum) + ' · ' + esc(x.asama) + '</span></a>').join('') + '</div>' : '<div class="kart alt">Proje yok.</div>');
  }
  h += '<div class="bas-satir" style="margin-top:20px"><h2 style="margin:0;flex:1">Okul görevleri</h2>' + (o && k.rol === 'ogrenci' ? '<button class="btn kucuk" id="ogEkle">+ Görev ekle</button>' : '') + '</div>' +
    (gor.length ? '<div class="kart liste">' + gor.map(g => '<div class="liste-satir"><span class="ana-m"><b>' + esc(g.gorev) + '</b><span class="mini">' + (g.aciklama ? esc(g.aciklama) + ' · ' : '') + tarihYaz(g.baslangic) + (g.bitis ? ' → ' + tarihYaz(g.bitis) : ' → devam ediyor') + '</span></span>' + (o ? '<button class="btn kucuk hayalet" data-ogsil="' + g.id + '">🗑</button>' : '') + '</div>').join('') + '</div>' : '<div class="kart alt">Okul görevi yok (lab sorumlusu, kulüp başkanı, sınıf temsilcisi…).</div>');
  if (o && k.rol === 'ogrenci') h += '<div class="satir" style="margin-top:14px"><button class="btn kucuk" id="sfBtn">🔑 Yeni şifre ver</button></div>';
  el.innerHTML = h;
  if ($('#ogEkle')) $('#ogEkle').onclick = () => {
    modal('<form style="padding:24px;width:min(480px,94vw)" id="ogF"><h3>Okul görevi</h3><label class="alan"><span>Görev</span><input name="gorev" required list="ogl" placeholder="Lab 2 sorumlusu"><datalist id="ogl"><option value="Lab sorumlusu"><option value="Sınıf temsilcisi"><option value="Kulüp başkanı"><option value="Nöbetçi öğrenci"><option value="Teknik destek ekibi"><option value="Sosyal medya ekibi"></datalist></label>' +
      '<label class="alan"><span>Açıklama</span><input name="aciklama"></label><div class="form-izgara"><label class="alan"><span>Başlangıç</span><input type="date" name="baslangic" value="' + new Date().toISOString().slice(0, 10) + '"></label><label class="alan"><span>Bitiş</span><input type="date" name="bitis"></label></div><button class="btn ana">Ekle</button></form>');
    $('#ogF').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await q(sb.from('okul_gorevleri').insert({ ogrenci_id: id, gorev: f.gorev.value.trim(), aciklama: f.aciklama.value.trim() || null, baslangic: f.baslangic.value || null, bitis: f.bitis.value || null, ekleyen: S.ben.id })); await q(sb.from('bildirimler').insert({ kisi_id: id, baslik: '🎖️ Yeni okul görevin: ' + f.gorev.value.trim(), link: '#/profil' })); modalKapat(); kisi(el, p); } catch (er) { hata(er); } };
  };
  $$('[data-ogsil]', el).forEach(b => b.onclick = async () => { try { await q(sb.from('okul_gorevleri').delete().eq('id', b.dataset.ogsil)); kisi(el, p); } catch (e) { hata(e); } });
  if ($('#sfBtn')) $('#sfBtn').onclick = async () => { if (!confirm('Yeni şifre verilsin mi? Eski şifre çalışmaz.')) return; try { const s = await q(sb.rpc('sifre_sifirla', { p_kisi: id })); modal('<div style="padding:24px"><h3>Yeni şifre</h3><p>' + esc(guzelAd(k.ad + ' ' + k.soyad)) + ': kullanıcı <b>' + esc(k.kullanici) + '</b> · şifre <code style="font-size:1.3rem">' + esc(s) + '</code></p></div>'); } catch (e) { hata(e); } };
}

/* ================= PROFİL ================= */
export async function profil(el) {
  await kisi(el, [S.ben.id]);
  el.insertAdjacentHTML('beforeend', '<h2>Şifremi değiştir</h2><form class="kart" id="sfF" style="max-width:420px"><label class="alan"><span>Yeni şifre (en az 6 karakter)</span><input type="password" name="s1" minlength="6" required autocomplete="new-password"></label>' +
    '<label class="alan"><span>Yeni şifre (tekrar)</span><input type="password" name="s2" minlength="6" required autocomplete="new-password"></label><button class="btn ana">Değiştir</button>' +
    (S.ben.rol === 'ogrenci' ? '<p class="mini">Şifren büyük/küçük harf ayırmaz: küçük harfle kaydedilir.</p>' : '') + '</form>');
  $('#sfF').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    let s1 = f.s1.value, s2 = f.s2.value;
    if (S.ben.rol === 'ogrenci') { s1 = s1.toLowerCase(); s2 = s2.toLowerCase(); }
    if (s1 !== s2) return tost('Şifreler aynı değil.', true);
    try { await q(sb.auth.updateUser({ password: s1 })); f.reset(); tost('Şifren değişti'); } catch (er) { hata(er); }
  };
}
