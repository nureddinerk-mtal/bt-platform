/* Yönetici paneli: kullanıcılar, şifre fişleri, dersler, ayarlar, işlem kaydı */
import { sb, S, $, $$, esc, q, tost, hata, modal, modalKapat, yonetici, guzelAd, adi, tarihYaz, once, secenekler, ogretmenler, GUNLER } from './ortak.js';

function sifreUret() {
  const h = 'abcdefghjkmnprstuvyz', r = '23456789'; let s = '';
  for (let i = 0; i < 3; i++) s += h[Math.floor(Math.random() * h.length)];
  for (let i = 0; i < 3; i++) s += r[Math.floor(Math.random() * r.length)];
  return s;
}
async function veriYenile() { const m = await import('./app.js'); await m.temelVeri(); }

export async function yonetim(el, p) {
  if (!yonetici()) { el.innerHTML = '<div class="kart">Bu bölüm yöneticiye özel.</div>'; return; }
  const sek = p[0] || 'kullanicilar';
  el.innerHTML = '<h1>Yönetim</h1><div class="sekmeler">' + [['kullanicilar', 'Kullanıcılar'], ['sifreler', 'Şifre fişleri'], ['dersler', 'Dersler ve öğretmenler'], ['ayarlar', 'Ayarlar'], ['kayit', 'İşlem kaydı']]
    .map(s => '<a class="' + (sek === s[0] ? 'secili' : '') + '" href="#/yonetim/' + s[0] + '">' + s[1] + '</a>').join('') + '</div><div id="yIc"></div>';
  const ic = $('#yIc');
  ({ kullanicilar, sifreler, dersler: dersYonetim, ayarlar, kayit })[sek](ic, p.slice(1));
}

/* ---------- Kullanıcılar ---------- */
async function kullanicilar(ic, p) {
  const f = p[0] || 'hepsi';
  const l = await q(sb.from('profiller').select('*').order('rol').order('sinif').order('ad'));
  const liste = l.filter(k => f === 'hepsi' || (f === 'ogretmen' ? k.rol !== 'ogrenci' : f === 'pasif' ? !k.aktif : k.sinif === f));
  let h = '<div class="satir" style="margin-bottom:12px"><button class="btn ana kucuk" id="kEkle">+ Kişi ekle</button><button class="btn kucuk" id="kToplu">⬆ Toplu öğrenci ekle (Excel\'den yapıştır)</button></div>' +
    '<div class="filtre">' + [['hepsi', 'Hepsi (' + l.length + ')'], ['ogretmen', 'Öğretmenler']].concat(S.siniflar.map(s => [s.ad, s.ad]), [['pasif', 'Durdurulanlar']]).map(x => '<a class="btn kucuk ' + (f === x[0] ? 'ana' : '') + '" href="#/yonetim/kullanicilar/' + x[0] + '">' + x[1] + '</a>').join('') + '</div>';
  h += '<div class="tablo-sar"><table class="durum"><thead><tr><th>Kullanıcı</th><th>Ad Soyad</th><th>Rol</th><th>Sınıf</th><th>Grup</th><th>Danışman</th><th>KVKK</th><th></th></tr></thead><tbody>' + liste.map(k =>
    '<tr style="' + (k.aktif ? '' : 'opacity:.5') + '"><td><code>' + esc(k.kullanici) + '</code></td><td><a href="#/kisi/' + k.id + '" style="color:inherit"><b>' + esc(guzelAd(k.ad + ' ' + k.soyad)) + '</b></a></td><td>' + esc({ yonetici: 'Yönetici', ogretmen: 'Öğretmen', ogrenci: 'Öğrenci' }[k.rol]) + '</td><td>' + esc(k.sinif || '') + '</td><td>' + esc(k.grup || '') + '</td><td>' + (k.danisman ? '✓' : '') + '</td><td class="mini">' + (k.kvkk_onay ? tarihYaz(k.kvkk_onay) : '—') + '</td>' +
    '<td><button class="btn kucuk" data-duz="' + k.id + '">Düzenle</button></td></tr>').join('') + '</tbody></table></div>';
  ic.innerHTML = h;
  const yenile = () => kullanicilar(ic, p);
  $('#kEkle').onclick = () => kisiFormu(null, yenile);
  $('#kToplu').onclick = () => topluEkle(yenile);
  $$('[data-duz]', ic).forEach(b => b.onclick = () => kisiFormu(l.find(k => k.id === b.dataset.duz), yenile));
}
function kisiFormu(k, sonra) {
  const yeni = !k; k = k || { rol: 'ogrenci', aktif: true };
  modal('<form style="padding:24px;width:min(620px,94vw)" id="kF"><h3>' + (yeni ? 'Yeni kişi' : esc(guzelAd(k.ad + ' ' + k.soyad))) + '</h3><div class="form-izgara">' +
    '<label class="alan"><span>Kullanıcı adı / okul no</span><input name="kullanici" required value="' + esc(k.kullanici || '') + '" ' + (yeni ? '' : 'disabled') + '></label>' +
    '<label class="alan"><span>Rol</span><select name="rol">' + secenekler([['ogrenci', 'Öğrenci'], ['ogretmen', 'Öğretmen'], ['yonetici', 'Yönetici']], k.rol) + '</select></label>' +
    '<label class="alan"><span>Ad</span><input name="ad" required value="' + esc(k.ad || '') + '"></label><label class="alan"><span>Soyad</span><input name="soyad" value="' + esc(k.soyad || '') + '"></label>' +
    '<label class="alan"><span>Sınıf</span><select name="sinif">' + secenekler(S.siniflar.map(s => s.ad), k.sinif, '—') + '</select></label><label class="alan"><span>Grup</span><input name="grup" value="' + esc(k.grup || '') + '"></label>' +
    (yeni ? '<label class="alan"><span>Şifre</span><input name="sifre" value="' + sifreUret() + '" required minlength="6"></label>' : '') + '</div>' +
    '<label class="satir" style="margin:8px 0"><input type="checkbox" name="danisman" ' + (k.danisman ? 'checked' : '') + '> Proje danışmanı (product owner)</label>' +
    '<div class="satir" style="margin-top:12px"><button class="btn ana">Kaydet</button>' + (!yeni ? '<button type="button" class="btn kucuk" id="kSif">🔑 Yeni şifre</button><button type="button" class="btn kucuk" id="kDur">' + (k.aktif ? '⏸ Hesabı durdur' : '▶ Hesabı aç') + '</button>' : '') + '</div></form>');
  $('#kF').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    try {
      if (yeni) {
        const id = await q(sb.rpc('hesap_olustur', { p_kullanici: f.kullanici.value.trim(), p_sifre: f.sifre.value.trim(), p_ad: f.ad.value.trim(), p_soyad: f.soyad.value.trim(), p_rol: f.rol.value, p_sinif: f.sinif.value || null, p_grup: f.grup.value.trim() || null }));
        if (f.danisman.checked) await q(sb.from('profiller').update({ danisman: true }).eq('id', id));
        modal('<div style="padding:24px"><h3>Hesap açıldı</h3><p>Kullanıcı: <b>' + esc(f.kullanici.value.trim().toLowerCase()) + '</b> · Şifre: <code style="font-size:1.2rem">' + esc(f.rol.value === 'ogrenci' ? f.sifre.value.trim().toLowerCase() : f.sifre.value.trim()) + '</code></p></div>');
      } else {
        await q(sb.from('profiller').update({ ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), rol: f.rol.value, sinif: f.sinif.value || null, grup: f.grup.value.trim() || null, danisman: f.danisman.checked }).eq('id', k.id));
        modalKapat(); tost('Kaydedildi');
      }
      await veriYenile(); sonra();
    } catch (er) { hata(er); }
  };
  if (!yeni) {
    $('#kSif').onclick = async () => { if (!confirm('Yeni şifre verilsin mi?')) return; try { const s = await q(sb.rpc('sifre_sifirla', { p_kisi: k.id })); modal('<div style="padding:24px"><h3>Yeni şifre</h3><p>' + esc(k.kullanici) + ': <code style="font-size:1.3rem">' + esc(s) + '</code></p></div>'); } catch (er) { hata(er); } };
    $('#kDur').onclick = async () => { try { await q(sb.rpc('hesap_durdur', { p_kisi: k.id, p_aktif: !k.aktif })); modalKapat(); await veriYenile(); sonra(); } catch (er) { hata(er); } };
  }
}
function topluEkle(sonra) {
  modal('<form style="padding:24px;width:min(760px,94vw)" id="tF"><h3>Toplu öğrenci ekle</h3><p class="mini">Excel\'den şu sütunları seçip kopyala ve buraya yapıştır: <b>No · Ad · Soyad · Sınıf</b> (isteğe bağlı 5. sütun: Grup). Başlık satırı ve zaten kayıtlı numaralar atlanır. Her yeni öğrenciye otomatik şifre verilir.</p>' +
    '<textarea name="veri" rows="12" style="font-family:monospace" placeholder="2401\tALİ\tYILMAZ\t11E\tA"></textarea><div class="satir" style="margin-top:12px"><button class="btn ana">Ekle</button><span class="mini" id="tDurum"></span></div></form>');
  $('#tF').onsubmit = async e => {
    e.preventDefault();
    const satirlar = e.target.veri.value.split(/\r?\n/).map(s => s.split(/\t|;/).map(x => x.trim())).filter(r => r[0] && /^\d+$/.test(r[0]));
    if (!satirlar.length) return tost('Geçerli satır bulunamadı. İlk sütun okul numarası olmalı.', true);
    const mevcut = new Set(S.kisiler.map(k => k.kullanici)), yeni = satirlar.filter(r => !mevcut.has(r[0]));
    if (yeni.length < satirlar.length && !confirm((satirlar.length - yeni.length) + ' numara zaten kayıtlı, atlanacak. ' + yeni.length + ' yeni öğrenci eklensin mi?')) return;
    const sonuc = [];
    for (const [i, r] of yeni.entries()) {
      $('#tDurum').textContent = (i + 1) + '/' + yeni.length;
      const s = sifreUret();
      try { await q(sb.rpc('hesap_olustur', { p_kullanici: r[0], p_sifre: s, p_ad: r[1] || '', p_soyad: r[2] || '', p_rol: 'ogrenci', p_sinif: r[3] || null, p_grup: r[4] || null })); sonuc.push([r[0], r[1] + ' ' + r[2], r[3], s, '']); }
      catch (er) { sonuc.push([r[0], r[1] + ' ' + r[2], r[3], '', er.message]); }
    }
    await veriYenile();
    modal('<div style="padding:24px"><h3>' + sonuc.filter(x => x[3]).length + ' öğrenci eklendi</h3><p class="mini">Şifre fişlerini "Şifre fişleri" sekmesinden yazdırabilirsin.</p><div class="tablo-sar"><table class="durum"><tr><th>No</th><th>Ad</th><th>Sınıf</th><th>Şifre</th><th>Sorun</th></tr>' + sonuc.map(x => '<tr>' + x.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</table></div></div>');
    sonra();
  };
}

/* ---------- Şifre fişleri ---------- */
async function sifreler(ic, p) {
  const sinif = p[0] || (S.siniflar[0] || {}).ad;
  const l = await q(sb.from('ilk_sifreler').select('*'));
  const kisiler = S.kisiler.filter(k => k.rol === 'ogrenci' && k.sinif === sinif && k.aktif);
  let h = '<div class="filtre">' + S.siniflar.map(s => '<a class="btn kucuk ' + (s.ad === sinif ? 'ana' : '') + '" href="#/yonetim/sifreler/' + s.ad + '">' + s.ad + '</a>').join('') + '</div>' +
    '<p class="mini">Öğrenci kendi şifresini değiştirince ilk şifresi buradan silinir (artık sadece o bilir). Unutan öğrenciye "Yeni şifre" ver.</p>' +
    '<button class="btn ana kucuk" id="fis">🖨 ' + esc(sinif) + ' fişlerini yazdır</button><div class="tablo-sar" style="margin-top:12px"><table class="durum"><thead><tr><th>No</th><th>Ad Soyad</th><th>Şifre</th><th></th></tr></thead><tbody>' +
    kisiler.map(k => { const s = l.find(x => x.kisi_id === k.id); return '<tr><td>' + esc(k.kullanici) + '</td><td>' + esc(guzelAd(k.ad + ' ' + k.soyad)) + '</td><td>' + (s ? '<code>' + esc(s.sifre) + '</code>' : '<span class="mini">kendisi değiştirdi</span>') + '</td><td><button class="btn kucuk" data-sif="' + k.id + '">Yeni şifre</button></td></tr>'; }).join('') + '</tbody></table></div>';
  ic.innerHTML = h;
  $('#fis').onclick = () => {
    const adres = location.origin + location.pathname;
    $('#yazdir').innerHTML = kisiler.map(k => { const s = l.find(x => x.kisi_id === k.id); return s ? '<div class="fis"><b>BT Platformu</b> · ' + esc(adres) + '<br>' + esc(guzelAd(k.ad + ' ' + k.soyad)) + ' (' + esc(sinif) + ')<br>Kullanıcı: <b>' + esc(k.kullanici) + '</b> &nbsp; Şifre: <b>' + esc(s.sifre) + '</b></div>' : ''; }).join('');
    window.print();
  };
  $$('[data-sif]', ic).forEach(b => b.onclick = async () => { if (!confirm('Yeni şifre verilsin mi?')) return; try { await q(sb.rpc('sifre_sifirla', { p_kisi: b.dataset.sif })); sifreler(ic, p); } catch (e) { hata(e); } });
}

/* ---------- Dersler ve öğretmenler ---------- */
async function dersYonetim(ic) {
  const dog = await q(sb.from('ders_ogretmenleri').select('*'));
  let h = '<div class="satir" style="margin-bottom:12px"><button class="btn kucuk" id="dYeni">+ Ders</button><button class="btn kucuk" id="sYeni">+ Sınıf</button></div><div class="izgara iki">' + S.dersler.map(d =>
    '<div class="kart ders-kart" style="--ders:' + d.renk + ';cursor:default"><div class="etiket">' + esc(d.kod) + ' · ' + esc(d.sinif) + '</div><h3 style="margin-top:4px">' + esc(d.ad) + '</h3><div class="mini">' + esc(d.zaman || '') + '</div>' +
    '<div class="mini" style="margin-top:6px">Moderatör: <b>' + esc(d.moderator_id ? adi(d.moderator_id) : '—') + '</b></div><div class="mini">Öğretmenler: ' + (dog.filter(x => x.ders_kodu === d.kod).map(x => esc(adi(x.ogretmen_id)) + (x.gruplar ? ' (' + esc(x.gruplar) + ')' : '')).join(', ') || '—') + '</div>' +
    '<button class="btn kucuk" style="margin-top:10px" data-d="' + d.kod + '">Düzenle</button></div>').join('') + '</div>';
  ic.innerHTML = h;
  const yenile = async () => { await veriYenile(); dersYonetim(ic); };
  $$('[data-d]', ic).forEach(b => b.onclick = () => dersFormu(S.dersler.find(d => d.kod === b.dataset.d), dog, yenile));
  $('#dYeni').onclick = () => dersFormu(null, dog, yenile);
  $('#sYeni').onclick = async () => { const ad = prompt('Sınıf adı (ör. 10A):'); if (!ad) return; const dal = prompt('Dal (ör. Yazılım Geliştirme):') || null; try { await q(sb.from('siniflar').insert({ ad: ad.trim().toUpperCase(), dal, sira: S.siniflar.length + 1 })); yenile(); } catch (e) { hata(e); } };
}
function dersFormu(d, dog, sonra) {
  const yeni = !d; d = d || { renk: '#2f5bea' };
  const atanan = dog.filter(x => x.ders_kodu === d.kod);
  modal('<form style="padding:24px;width:min(680px,94vw)" id="dF"><h3>' + (yeni ? 'Yeni ders' : esc(d.ad)) + '</h3><div class="form-izgara">' +
    '<label class="alan"><span>Kod (değişmez)</span><input name="kod" required value="' + esc(d.kod || '') + '" ' + (yeni ? '' : 'disabled') + ' placeholder="WTUG"></label>' +
    '<label class="alan"><span>Ad</span><input name="ad" required value="' + esc(d.ad || '') + '"></label>' +
    '<label class="alan"><span>Sınıf</span><select name="sinif">' + secenekler(S.siniflar.map(s => s.ad), d.sinif) + '</select></label>' +
    '<label class="alan"><span>Renk</span><input type="color" name="renk" value="' + esc(d.renk) + '"></label>' +
    '<label class="alan"><span>Zaman</span><input name="zaman" value="' + esc(d.zaman || '') + '" placeholder="Çarşamba 1-9. ders"></label>' +
    '<label class="alan"><span>Moderatör öğretmen</span><select name="moderator_id">' + secenekler(ogretmenler().map(k => [k.id, k.ad + ' ' + k.soyad]), d.moderator_id, '—') + '</select></label></div>' +
    '<label class="alan"><span>Yıl boyu proje açıklaması</span><textarea name="proje_aciklama" rows="2">' + esc(d.proje_aciklama || '') + '</textarea></label>' +
    '<div class="alan"><span>Derse giren öğretmenler ve grupları</span>' + ogretmenler().map(k => { const a = atanan.find(x => x.ogretmen_id === k.id); return '<div class="satir" style="margin:4px 0"><label class="satir" style="min-width:220px"><input type="checkbox" name="ogrt" value="' + k.id + '" ' + (a ? 'checked' : '') + '> ' + esc(k.ad + ' ' + k.soyad) + '</label><input data-grup="' + k.id + '" value="' + esc(a && a.gruplar || '') + '" placeholder="Gruplar (ör. A, B)" style="flex:1;padding:6px 10px;border:1px solid var(--cizgi);border-radius:8px"></div>'; }).join('') + '</div>' +
    '<button class="btn ana">Kaydet</button></form>');
  $('#dF').onsubmit = async e => {
    e.preventDefault(); const f = e.target, kod = (d.kod || f.kod.value.trim().toUpperCase());
    const k = { ad: f.ad.value.trim(), sinif: f.sinif.value, renk: f.renk.value, zaman: f.zaman.value.trim() || null, moderator_id: f.moderator_id.value || null, proje_aciklama: f.proje_aciklama.value.trim() || null };
    try {
      if (yeni) await q(sb.from('dersler').insert(Object.assign(k, { kod, sira: S.dersler.length + 1 }))); else await q(sb.from('dersler').update(k).eq('kod', kod));
      const sec = $$('[name=ogrt]:checked', f).map(x => x.value);
      await q(sb.from('ders_ogretmenleri').delete().eq('ders_kodu', kod));
      if (sec.length) await q(sb.from('ders_ogretmenleri').insert(sec.map(id => ({ ders_kodu: kod, ogretmen_id: id, gruplar: $('[data-grup="' + id + '"]', f).value.trim() || null }))));
      modalKapat(); tost('Kaydedildi'); sonra();
    } catch (er) { hata(er); }
  };
}

/* ---------- Ayarlar ---------- */
async function ayarlar(ic) {
  const a = S.ayar, t = a.toplu_son_teslim || { hafta_kadar: 4, tarih: '2026-10-09T23:59:00+03:00' }, z = Array.isArray(a.zil) ? a.zil : [];
  const zil = Array.from({ length: 10 }, (_, i) => z.find(x => Number(x.no) === i + 1) || { no: i + 1, bas: '', bit: '' });
  const yerel = s => { const d = new Date(s); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  ic.innerHTML = '<form class="kart" id="aF" style="max-width:760px">' +
    '<h3>Öğretim yılı</h3><div class="form-izgara"><label class="alan"><span>1. haftanın pazartesisi</span><input type="date" name="birinci" value="' + esc(a.birinci_hafta || '2026-09-14') + '"></label>' +
    '<label class="alan"><span>Şu anki hafta</span><input disabled value="' + S.hafta + '. hafta"></label></div>' +
    '<h3>Toplu teslim süresi</h3><p class="mini">Bu haftaya kadar olan tüm haftaların uygulamaları aynı tarihte kapanır. Sonraki haftalar kendi Cuma 23:59\'unda kapanır.</p><div class="form-izgara">' +
    '<label class="alan"><span>Kaçıncı haftaya kadar</span><input type="number" name="hk" min="0" max="45" value="' + t.hafta_kadar + '"></label><label class="alan"><span>Kapanış</span><input type="datetime-local" name="ht" value="' + yerel(t.tarih) + '"></label></div>' +
    '<h3>Zil saatleri</h3><p class="mini">"Kim nerede" ve "şu an" bilgisi için. Boş bıraktığın ders saati kullanılmaz.</p><table class="tablo-alan"><tr><th>Ders</th><th>Başlangıç</th><th>Bitiş</th></tr>' +
    zil.map(x => '<tr><td><b>' + x.no + '.</b></td><td><input type="time" name="zb' + x.no + '" value="' + esc(x.bas) + '"></td><td><input type="time" name="ze' + x.no + '" value="' + esc(x.bit) + '"></td></tr>').join('') + '</table>' +
    '<button class="btn ana" style="margin-top:16px">Kaydet</button></form>' +
    '<div class="kart" style="max-width:760px;margin-top:16px"><h3>Modüller</h3><p class="mini">Açık modülün menüsü herkese görünür. Kapatınca veriler silinmez, sadece menüden kalkar.</p>' +
    (S.moduller || []).map(m => '<label class="satir" style="gap:8px;margin:6px 0"><input type="checkbox" data-modul="' + esc(m.kod) + '"' + (m.acik ? ' checked' : '') + (m.kod === 'dersler' ? ' disabled' : '') + '> <b>' + esc(m.ad) + '</b> <span class="mini">' + esc(m.kod) + '</span></label>').join('') + '</div>' +
    '<div class="kart" style="max-width:760px;margin-top:16px"><h3>Yeni öğretim yılı</h3><p class="mini">Haziran\'da: sınıflar bir üst sınıfa geçirilir, mezunların hesapları durdurulur, içerikler ve geçmiş kayıtlar saklanır. Bu işlem henüz el ile yapılıyor: zamanı gelince Claude\'dan "yeni yıl geçişi" iste.</p></div>';
  $$('[data-modul]', ic).forEach(k => k.onchange = async () => {
    try { await q(sb.from('moduller').update({ acik: k.checked }).eq('kod', k.dataset.modul)); await veriYenile(); (await import('./app.js')).menuYenile(); tost('Kaydedildi'); }
    catch (er) { k.checked = !k.checked; hata(er); }
  });
  $('#aF').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const zilYeni = zil.map(x => ({ no: x.no, bas: f['zb' + x.no].value, bit: f['ze' + x.no].value })).filter(x => x.bas && x.bit);
    try {
      await q(sb.from('ayarlar').upsert([
        { anahtar: 'birinci_hafta', deger: f.birinci.value },
        { anahtar: 'toplu_son_teslim', deger: { hafta_kadar: Number(f.hk.value), tarih: new Date(f.ht.value).toISOString() } },
        { anahtar: 'zil', deger: zilYeni }
      ]));
      await veriYenile(); tost('Kaydedildi');
    } catch (er) { hata(er); }
  };
}

/* ---------- İşlem kaydı ---------- */
async function kayit(ic) {
  const l = await q(sb.from('islem_kaydi').select('*').order('id', { ascending: false }).limit(300));
  ic.innerHTML = '<p class="mini">Son 300 işlem. Kayıtlar silinemez ve değiştirilemez.</p><div class="tablo-sar"><table class="durum"><thead><tr><th>Tarih</th><th>Kim</th><th>İşlem</th><th>Öğrenci</th><th>Ayrıntı</th></tr></thead><tbody>' +
    l.map(r => '<tr><td class="mini">' + tarihYaz(r.tarih, true) + '</td><td>' + esc(r.kim) + '</td><td><b>' + esc(r.islem) + '</b></td><td>' + esc(r.ogrenci || '') + '</td><td class="mini" style="white-space:normal;max-width:380px">' + esc(r.detay ? Object.entries(r.detay).filter(([k, v]) => v !== null && v !== '' && k !== 'eski').map(([k, v]) => k + ': ' + v).join(' · ') : '') + '</td></tr>').join('') + '</tbody></table></div>';
}
