/* Projeler: liste, öneri, ekip, aşamalar, pano, evrak, haftalık notlar · Fikir havuzu */
import { sb, S, $, $$, esc, bicim, q, tost, hata, modal, modalKapat, ogretmen, ders, guzelAd, adi, tarihYaz, once, kalanYaz, imzaliUrl, dosyaYukle, dosyaSec, guvenliAd, secenekler, ogretmenler } from './ortak.js';
import { SABLONLAR, ASAMALAR, alanDolu, alanSorunu, kelimeSay } from './sablonlar.js';

const DURUM = { taslak: ['Öneri: inceleniyor', 'bekliyor'], netlestir: ['Netleştirilmeli', 'duzeltme'], basladi: ['Devam ediyor', 'mavi'], tamamlandi: ['Tamamlandı', 'onaylandi'], birakildi: ['Bırakıldı', 'bos'] };
const KATEGORI = [['ders', 'Ders projesi'], ['serbest', 'Serbest proje'], ['tubitak', 'TÜBİTAK'], ['teknofest', 'TEKNOFEST'], ['girisimcilik', 'Girişimcilik'], ['diger', 'Diğer yarışma']];
const IS_DURUM = [['yapilacak', 'Yapılacak'], ['yapiliyor', 'Yapılıyor'], ['incelemede', 'İncelemede'], ['bitti', 'Bitti']];

/* ================= LİSTE ================= */
export async function projeler(el, p) {
  if (p[0] === 'yeni') return projeFormu(el, null, p[1]);
  if (p[0] && p[0] !== 'f') return projeDetay(el, p[0], p[1] || 'genel');
  const o = ogretmen(), filtre = p[0] === 'f' ? p[1] : (o ? 'aktif' : 'hepsi');
  const [l, uye, evrak] = await Promise.all([
    q(sb.from('projeler').select('*').order('olusturma', { ascending: false })),
    q(sb.from('proje_uyeleri').select('*').is('ayrilma', null)),
    o ? q(sb.from('proje_evrak').select('proje_id,durum')) : []
  ]);
  const benim = x => uye.some(u => u.proje_id === x.id && u.ogrenci_id === S.ben.id);
  let liste = l;
  if (o) {
    if (filtre === 'aktif') liste = l.filter(x => ['taslak', 'netlestir', 'basladi'].includes(x.durum));
    else if (filtre === 'benim') liste = l.filter(x => x.danisman_id === S.ben.id);
    else if (filtre === 'taslak') liste = l.filter(x => x.durum === 'taslak');
    else if (filtre === 'evrak') liste = l.filter(x => evrak.some(e => e.proje_id === x.id && e.durum === 'gonderildi'));
    else if (filtre === 'bitti') liste = l.filter(x => ['tamamlandi', 'birakildi'].includes(x.durum));
  }
  const kendi = o ? [] : l.filter(benim), vitrin = o ? [] : l.filter(x => x.vitrinde && !benim(x));
  let h = '<div class="bas-satir"><h1>' + (o ? 'Projeler' : 'Projem') + '</h1><a class="btn ana" href="#/projeler/yeni">+ ' + (o ? 'Yeni proje' : 'Proje öner') + '</a></div>';
  if (o) {
    const say = f => ({ aktif: l.filter(x => ['taslak', 'netlestir', 'basladi'].includes(x.durum)).length, benim: l.filter(x => x.danisman_id === S.ben.id).length, taslak: l.filter(x => x.durum === 'taslak').length,
      evrak: new Set(evrak.filter(e => e.durum === 'gonderildi').map(e => e.proje_id)).size, bitti: l.filter(x => ['tamamlandi', 'birakildi'].includes(x.durum)).length, hepsi: l.length })[f];
    h += '<div class="filtre">' + [['aktif', 'Devam edenler'], ['benim', 'Danışmanı olduklarım'], ['taslak', 'Yeni öneriler'], ['evrak', 'Evrak onayı bekleyen'], ['bitti', 'Biten / bırakılan'], ['hepsi', 'Hepsi']]
      .map(f => '<a class="btn kucuk ' + (filtre === f[0] ? 'ana' : '') + '" href="#/projeler/f/' + f[0] + '">' + f[1] + ' (' + say(f[0]) + ')</a>').join('') + '</div>';
    h += projeTablo(liste, uye, evrak);
  } else {
    h += kendi.length ? '<div class="izgara iki">' + kendi.map(x => projeKart(x, uye)).join('') + '</div>' : '<div class="kart">Henüz bir projen yok. Kendi fikrini önerebilir ya da <a href="#/fikirler">fikir havuzundan</a> bir fikir seçebilirsin. Projeyi öneren kişi ekibine arkadaşlarını ekler; danışman öğretmen onaylayınca proje başlar.</div>';
    if (vitrin.length) h += '<h2>Vitrin: tamamlanmış projeler</h2><div class="izgara iki">' + vitrin.map(x => projeKart(x, uye)).join('') + '</div>';
  }
  el.innerHTML = h;
}
function ekipAdlari(id, uye) { return uye.filter(u => u.proje_id === id).map(u => adi(u.ogrenci_id)); }
function projeKart(x, uye) {
  const a = ASAMALAR.find(s => s.id === x.asama) || ASAMALAR[0];
  return '<a class="kart" style="text-decoration:none;color:inherit" href="#/projeler/' + x.id + '"><div class="satir"><span class="cip ' + DURUM[x.durum][1] + '">' + DURUM[x.durum][0] + '</span><span class="cip bos">' + a.ikon + ' ' + a.ad + '</span></div>' +
    '<h3 style="margin:8px 0 4px">' + esc(x.ad) + '</h3><div class="mini">' + esc(ekipAdlari(x.id, uye).join(', ')) + '</div>' + (x.ne ? '<div style="margin-top:6px">' + esc(x.ne.slice(0, 160)) + '</div>' : '') + '</a>';
}
function projeTablo(l, uye, evrak) {
  if (!l.length) return '<div class="kart bos-kart">Bu filtrede proje yok.</div>';
  return '<div class="tablo-sar"><table class="durum"><thead><tr><th>Proje</th><th>Ekip</th><th>Tür</th><th>Danışman</th><th>Aşama</th><th>Durum</th><th>Evrak</th></tr></thead><tbody>' + l.map(x => {
    const a = ASAMALAR.find(s => s.id === x.asama) || ASAMALAR[0], ev = evrak.filter(e => e.proje_id === x.id);
    const gon = ev.filter(e => e.durum === 'gonderildi').length, on = ev.filter(e => e.durum === 'onaylandi').length;
    return '<tr style="cursor:pointer" onclick="location.hash=\'#/projeler/' + x.id + '\'"><td><b>' + esc(x.ad) + '</b></td><td class="mini" style="white-space:normal;max-width:260px">' + esc(ekipAdlari(x.id, uye).join(', ')) + '</td><td class="mini">' + esc((KATEGORI.find(k => k[0] === x.kategori) || [, x.kategori])[1]) + '</td>' +
      '<td class="mini">' + (x.danisman_id ? esc(adi(x.danisman_id)) : '<span style="color:var(--turuncu)">atanmadı</span>') + '</td><td>' + a.ikon + ' ' + a.ad + '</td><td><span class="cip ' + DURUM[x.durum][1] + '">' + DURUM[x.durum][0] + '</span></td>' +
      '<td>' + (gon ? '<span class="cip bekliyor">' + gon + ' onay bekliyor</span> ' : '') + '<span class="mini">' + on + ' ✓</span></td></tr>';
  }).join('') + '</tbody></table></div>';
}

/* ================= ÖNERİ / DÜZENLEME FORMU ================= */
async function projeFormu(el, proje, fikirId) {
  const o = ogretmen();
  let fikir = null;
  if (fikirId) fikir = await q(sb.from('fikirler').select('*').eq('id', fikirId).maybeSingle());
  const [etk, uye] = await Promise.all([
    q(sb.from('etkinlikler').select('id,baslik').in('tur', ['tubitak', 'teknofest', 'yarisma', 'girisimcilik', 'bilisim']).order('basvuru_bitis', { nullsFirst: false })),
    proje ? q(sb.from('proje_uyeleri').select('*').eq('proje_id', proje.id).is('ayrilma', null)) : []
  ]);
  const v = proje || { ad: fikir ? fikir.baslik : '', ne: fikir ? fikir.aciklama : '', kategori: 'serbest', fikir_id: fikirId || null, etkinlik_id: fikir ? fikir.etkinlik_id : null };
  const secili = uye.map(u => u.ogrenci_id);
  const ogrList = S.kisiler.filter(k => k.rol === 'ogrenci' && k.aktif && k.id !== S.ben.id);
  let h = '<a class="btn kucuk" href="#/projeler' + (proje ? '/' + proje.id : '') + '">← Geri</a><h1 style="margin-top:12px">' + (proje ? 'Projeyi düzenle' : o ? 'Yeni proje' : 'Proje öner') + '</h1>' +
    (!o && !proje ? '<div class="alt" style="margin-bottom:12px">Üç soruyu kısa ve net cevapla. Danışman öğretmen okuyup "Başlayabilirsiniz" ya da "Netleştirin" der.</div>' : '') +
    '<form class="kart" id="pF" style="max-width:860px">' +
    '<label class="alan"><span>Proje adı</span><input name="ad" required maxlength="120" value="' + esc(v.ad || '') + '" placeholder="Ör. Kantin Sipariş Uygulaması"></label>' +
    '<label class="alan"><span>1. Ne yapacaksınız?</span><textarea name="ne" rows="3" required placeholder="Ürün ne işe yarayacak? Hangi sorunu çözecek?">' + esc(v.ne || '') + '</textarea></label>' +
    '<label class="alan"><span>2. Kim kullanacak?</span><textarea name="kim_icin" rows="2" placeholder="Okuldaki öğrenciler, kantin görevlisi…">' + esc(v.kim_icin || '') + '</textarea></label>' +
    '<label class="alan"><span>3. Nasıl görünecek? (ekranlar, nasıl çalışacak)</span><textarea name="nasil_gorunecek" rows="3">' + esc(v.nasil_gorunecek || '') + '</textarea></label>' +
    '<div class="form-izgara"><label class="alan"><span>Proje türü</span><select name="kategori">' + secenekler(KATEGORI, v.kategori) + '</select></label>' +
    '<label class="alan"><span>Bağlı ders (isteğe bağlı)</span><select name="ders_kodu">' + secenekler(S.dersler.map(d => [d.kod, d.sinif + ' ' + d.ad]), v.ders_kodu, '—') + '</select></label>' +
    '<label class="alan"><span>Hedef yarışma / etkinlik</span><select name="etkinlik_id">' + secenekler(etk.map(e => [e.id, e.baslik]), v.etkinlik_id, '—') + '</select></label>' +
    (o ? '<label class="alan"><span>Danışman</span><select name="danisman_id">' + secenekler(ogretmenler().map(k => [k.id, k.ad + ' ' + k.soyad]), v.danisman_id || S.ben.id, '—') + '</select></label>' : '') + '</div>' +
    '<div class="form-izgara"><label class="alan"><span>GitHub bağlantısı</span><input name="github_url" value="' + esc(v.github_url || '') + '" placeholder="https://github.com/..."></label>' +
    '<label class="alan"><span>Demo / video bağlantısı</span><input name="demo_url" value="' + esc(v.demo_url || '') + '"></label></div>' +
    '<div class="alan"><span>Ekip arkadaşların ' + (o ? '' : '(sen otomatik eklenirsin)') + '</span><input id="kAra" placeholder="İsim ya da okul numarası yaz…" style="width:100%;padding:10px 12px;border:1px solid var(--cizgi);border-radius:10px"><div id="secilenler" style="margin:8px 0"></div>' +
    '<div id="kSonuc" style="max-height:200px;overflow:auto"></div></div>' +
    '<button class="btn ana">' + (proje ? 'Kaydet' : o ? 'Projeyi oluştur' : 'Öneriyi gönder') + '</button></form>';
  el.innerHTML = h;
  const sec = new Set(secili);
  const ciz = () => {
    $('#secilenler').innerHTML = [...sec].map(id => '<span class="dosya-cip">' + esc(adi(id)) + ' <button type="button" data-cik="' + id + '">×</button></span>').join('') || '<span class="mini">Henüz kimse seçilmedi.</span>';
    $$('[data-cik]').forEach(b => b.onclick = () => { sec.delete(b.dataset.cik); ciz(); });
  };
  $('#kAra').oninput = e => {
    const s = e.target.value.trim().toLocaleLowerCase('tr');
    $('#kSonuc').innerHTML = s.length < 2 ? '' : ogrList.filter(k => (k.ad + ' ' + k.soyad + ' ' + k.kullanici).toLocaleLowerCase('tr').includes(s) && !sec.has(k.id)).slice(0, 12)
      .map(k => '<button type="button" class="btn kucuk" style="margin:2px" data-ekle="' + k.id + '">+ ' + esc(guzelAd(k.ad + ' ' + k.soyad)) + ' <span class="mini">' + esc(k.sinif + ' · ' + k.kullanici) + '</span></button>').join('') || '<span class="mini">Bulunamadı.</span>';
    $$('[data-ekle]').forEach(b => b.onclick = () => { sec.add(b.dataset.ekle); $('#kAra').value = ''; $('#kSonuc').innerHTML = ''; ciz(); });
  };
  ciz();
  $('#pF').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, kayit = {};
    ['ad', 'ne', 'kim_icin', 'nasil_gorunecek', 'kategori', 'ders_kodu', 'etkinlik_id', 'github_url', 'demo_url'].forEach(k => { kayit[k] = f[k].value.trim() || null; });
    if (o) kayit.danisman_id = f.danisman_id.value || null;
    for (const k of ['github_url', 'demo_url']) if (kayit[k] && !/^https?:\/\//i.test(kayit[k])) return tost('Bağlantılar https:// ile başlamalı.', true);
    if (!proje && kayit.kategori) kayit.sablonlar = ['genel'].concat(kayit.kategori === 'tubitak' ? ['tubitak2204'] : kayit.kategori === 'teknofest' ? ['teknofest'] : []);
    if (fikirId) kayit.fikir_id = fikirId;
    const b = $('button.ana', f); b.disabled = true;
    try {
      let id = proje && proje.id;
      if (id) await q(sb.from('projeler').update(kayit).eq('id', id));
      else id = (await q(sb.from('projeler').insert(kayit).select('id').single())).id;
      const ekle = [...sec].filter(x => !secili.includes(x)), cikar = secili.filter(x => !sec.has(x) && x !== S.ben.id);
      if (ekle.length) await q(sb.from('proje_uyeleri').upsert(ekle.map(x => ({ proje_id: id, ogrenci_id: x, ayrilma: null }))));
      if (cikar.length && o) await q(sb.from('proje_uyeleri').update({ ayrilma: new Date().toISOString() }).eq('proje_id', id).in('ogrenci_id', cikar));
      if (fikirId && !proje) sb.from('fikirler').update({ durum: 'alindi' }).eq('id', fikirId).then(() => { });
      tost(proje ? 'Kaydedildi' : o ? 'Proje oluşturuldu' : 'Önerin gönderildi. Danışman öğretmen inceleyecek.');
      location.hash = '#/projeler/' + id;
    } catch (er) { b.disabled = false; hata(er); }
  };
}

/* ================= DETAY ================= */
async function projeDetay(el, id, sekme) {
  const o = ogretmen();
  const [p, uye] = await Promise.all([
    q(sb.from('projeler').select('*').eq('id', id).maybeSingle()),
    q(sb.from('proje_uyeleri').select('*').eq('proje_id', id))
  ]);
  if (!p) { el.innerHTML = '<div class="kart">Proje bulunamadı ya da görme yetkin yok.</div>'; return; }
  const aktifUye = uye.filter(u => !u.ayrilma), benim = aktifUye.some(u => u.ogrenci_id === S.ben.id);
  const P = { p, uye, aktifUye, benim, o, duzenler: o || benim };
  const ai = ASAMALAR.findIndex(a => a.id === p.asama);
  let h = '<div class="satir" style="margin-bottom:12px"><a class="btn kucuk" href="#/projeler">← Projeler</a>' + (P.duzenler && (o || ['taslak', 'netlestir'].includes(p.durum)) ? '<button class="btn kucuk" id="pDuz">✏️ Bilgileri düzenle</button>' : '') + '</div>' +
    '<div class="satir"><span class="cip ' + DURUM[p.durum][1] + '">' + DURUM[p.durum][0] + '</span><span class="cip bos">' + esc((KATEGORI.find(k => k[0] === p.kategori) || [, p.kategori])[1]) + '</span>' + (p.vitrinde ? '<span class="cip onaylandi">Vitrinde</span>' : '') + '</div>' +
    '<h1 style="margin:8px 0 4px">' + esc(p.ad) + '</h1><div class="mini">Ekip: <b>' + esc(aktifUye.map(u => adi(u.ogrenci_id)).join(', ') || '—') + '</b> · Danışman: <b>' + esc(p.danisman_id ? adi(p.danisman_id) : 'henüz atanmadı') + '</b></div>';
  h += '<div class="asamalar">' + ASAMALAR.map((a, i) => '<div class="asama ' + (i < ai ? 'gecti' : i === ai ? 'simdi' : '') + (o ? ' tik' : '') + '" data-asama="' + a.id + '"><div class="nokta">' + (i < ai ? '✓' : a.ikon) + '</div>' + a.ad + '</div>').join('') + '</div>';
  if (p.ogretmen_notu && ['netlestir', 'basladi', 'tamamlandi'].includes(p.durum)) h += '<div class="geri-bildirim ' + (p.durum === 'netlestir' ? 'duzeltme' : 'onaylandi') + '">💬 Danışman: ' + esc(p.ogretmen_notu) + '</div>';
  h += '<div class="sekmeler">' + [['genel', 'Genel'], ['pano', 'İş panosu'], ['evrak', 'Evrak'], ['notlar', 'Haftalık notlar']].map(s => '<a class="' + (sekme === s[0] ? 'secili' : '') + '" href="#/projeler/' + id + '/' + s[0] + '">' + s[1] + '</a>').join('') + '</div><div id="pIc"></div>';
  el.innerHTML = h;
  if ($('#pDuz')) $('#pDuz').onclick = () => projeFormu(el, p);
  if (o) $$('[data-asama]', el).forEach(a => a.onclick = async () => { try { await q(sb.from('projeler').update({ asama: a.dataset.asama }).eq('id', id)); projeDetay(el, id, sekme); } catch (e) { hata(e); } });
  const ic = $('#pIc');
  if (sekme === 'pano') return pano(ic, P, () => projeDetay(el, id, sekme));
  if (sekme === 'evrak') return evrak(ic, P, () => projeDetay(el, id, sekme));
  if (sekme === 'notlar') return notlar(ic, P, () => projeDetay(el, id, sekme));
  return genel(ic, P, () => projeDetay(el, id, sekme));
}

async function genel(ic, P, sonra) {
  const p = P.p, o = P.o;
  const etk = p.etkinlik_id ? await q(sb.from('etkinlikler').select('id,baslik,basvuru_bitis').eq('id', p.etkinlik_id).maybeSingle()) : null;
  let h = '<div class="izgara iki"><div class="kart"><h3>Proje önerisi</h3>' +
    '<div class="etiket-k" style="margin-top:10px">Ne yapacaklar?</div><div>' + bicim(p.ne || '—') + '</div>' +
    '<div class="etiket-k" style="margin-top:10px">Kim kullanacak?</div><div>' + bicim(p.kim_icin || '—') + '</div>' +
    '<div class="etiket-k" style="margin-top:10px">Nasıl görünecek?</div><div>' + bicim(p.nasil_gorunecek || '—') + '</div>' +
    (p.ders_kodu ? '<div class="etiket-k" style="margin-top:10px">Ders</div><div>' + esc((ders(p.ders_kodu) || {}).ad || p.ders_kodu) + '</div>' : '') +
    (etk ? '<div class="etiket-k" style="margin-top:10px">Hedef</div><div><a href="#/etkinlikler/' + etk.id + '">' + esc(etk.baslik) + '</a>' + (etk.basvuru_bitis ? ' · ' + kalanYaz(etk.basvuru_bitis) : '') + '</div>' : '') +
    (p.github_url ? '<div style="margin-top:10px"><a href="' + esc(p.github_url) + '" target="_blank" rel="noopener">🐙 GitHub</a></div>' : '') + (p.demo_url ? '<div><a href="' + esc(p.demo_url) + '" target="_blank" rel="noopener">▶ Demo</a></div>' : '') + '</div>';

  h += '<div><div class="kart"><h3>Ekip</h3>' + P.uye.map(u => '<div class="liste-satir" style="padding:8px 0"><span class="ana-m"><b>' + esc(adi(u.ogrenci_id)) + '</b><span class="mini">' + esc((S.kisiMap[u.ogrenci_id] || {}).sinif || '') + (u.ayrilma ? ' · ' + tarihYaz(u.ayrilma) + ' ayrıldı' : ' · ' + tarihYaz(u.katilma) + ' katıldı') + '</span></span>' +
    (!u.ayrilma && o ? '<button class="btn kucuk hayalet" data-cikar="' + u.ogrenci_id + '">Çıkar</button>' : '') + (!u.ayrilma && u.ogrenci_id === S.ben.id && !o ? '<button class="btn kucuk hayalet" id="ayril">Ekipten ayrıl</button>' : '') + '</div>').join('') + '</div>';

  if (o) {
    h += '<div class="kart" style="margin-top:14px"><h3>Danışman kararları</h3>' +
      '<label class="alan"><span>Danışman</span><select id="dSec">' + secenekler(ogretmenler().map(k => [k.id, k.ad + ' ' + k.soyad]), p.danisman_id, '— seç —') + '</select></label>' +
      '<label class="alan"><span>Not (netleştirin derken zorunlu, öğrenciye gider)</span><textarea id="dNot" rows="2">' + esc(p.ogretmen_notu || '') + '</textarea></label>' +
      '<div class="satir"><button class="btn yesil" data-durum="basladi">🚀 Başlayabilirsiniz</button><button class="btn turuncu" data-durum="netlestir">💬 Netleştirin</button></div>' +
      '<div class="satir" style="margin-top:8px"><button class="btn kucuk" data-durum="tamamlandi">🏁 Tamamlandı</button><button class="btn kucuk" data-durum="birakildi">Bırakıldı</button>' + (p.durum !== 'taslak' ? '<button class="btn kucuk hayalet" data-durum="taslak">Öneriye geri al</button>' : '') + '</div>' +
      '<div class="alan" style="margin-top:12px"><span>Doldurulacak evrak</span>' + Object.entries(SABLONLAR).map(([k, s]) => '<label class="satir"><input type="checkbox" data-sablon="' + k + '" ' + (p.sablonlar.includes(k) ? 'checked' : '') + '> ' + esc(s.ad) + ' <span class="mini">' + esc(s.kisa) + '</span></label>').join('') + '</div>' +
      '<label class="satir" style="margin-top:8px"><input type="checkbox" id="vitrin" ' + (p.vitrinde ? 'checked' : '') + '> Vitrinde göster (tüm öğrenciler görür)</label>' +
      '<div class="satir" style="margin-top:12px"><button class="btn kucuk hayalet" id="pSil" style="color:var(--kirmizi)">Projeyi sil</button></div></div>';
  } else if (p.durum === 'taslak') h += '<div class="kart" style="margin-top:14px;background:var(--sari-a)">⏳ Önerin danışman öğretmenin onayını bekliyor.</div>';
  else if (p.durum === 'netlestir') h += '<div class="kart" style="margin-top:14px;background:var(--turuncu-a)">✏️ Danışmanın notuna göre "Bilgileri düzenle" ile önerini güncelle. Kaydedince tekrar incelemeye gider.</div>';
  h += '</div></div>';
  ic.innerHTML = h;

  $$('[data-cikar]', ic).forEach(b => b.onclick = async () => { if (!confirm(adi(b.dataset.cikar) + ' ekipten çıkarılsın mı? (Kaydı silinmez)')) return; try { await q(sb.from('proje_uyeleri').update({ ayrilma: new Date().toISOString() }).eq('proje_id', p.id).eq('ogrenci_id', b.dataset.cikar)); sonra(); } catch (e) { hata(e); } });
  if ($('#ayril')) $('#ayril').onclick = async () => { if (!confirm('Ekipten ayrılmak istediğine emin misin?')) return; try { await q(sb.from('proje_uyeleri').update({ ayrilma: new Date().toISOString() }).eq('proje_id', p.id).eq('ogrenci_id', S.ben.id)); location.hash = '#/projeler'; } catch (e) { hata(e); } };
  if (!o) return;
  $('#dSec').onchange = async e => { try { await q(sb.from('projeler').update({ danisman_id: e.target.value || null }).eq('id', p.id)); tost('Danışman güncellendi'); } catch (er) { hata(er); } };
  $$('[data-durum]', ic).forEach(b => b.onclick = async () => {
    const d = b.dataset.durum, not = $('#dNot').value.trim();
    if (d === 'netlestir' && !not) return tost('Netleştirin derken ne yapmaları gerektiğini yaz.', true);
    const k = { durum: d, ogretmen_notu: not || null };
    if (d === 'basladi' && ['fikir', 'oneri'].includes(p.asama)) k.asama = 'planlama';
    if (d === 'basladi' && !p.danisman_id) k.danisman_id = S.ben.id;
    if (d === 'tamamlandi') k.asama = 'bitti';
    try { await q(sb.from('projeler').update(k).eq('id', p.id)); tost('Kaydedildi, ekibe bildirim gitti'); sonra(); } catch (e) { hata(e); }
  });
  $$('[data-sablon]', ic).forEach(c => c.onchange = async () => {
    const l = $$('[data-sablon]', ic).filter(x => x.checked).map(x => x.dataset.sablon);
    try { await q(sb.from('projeler').update({ sablonlar: l }).eq('id', p.id)); tost('Evrak listesi güncellendi'); } catch (e) { hata(e); }
  });
  $('#vitrin').onchange = async e => { try { await q(sb.from('projeler').update({ vitrinde: e.target.checked }).eq('id', p.id)); } catch (er) { hata(er); } };
  $('#pSil').onclick = async () => { if (!confirm('Proje, evrakı ve iş panosu tamamen silinsin mi? Bu geri alınamaz.')) return; try { await q(sb.from('projeler').delete().eq('id', p.id)); location.hash = '#/projeler'; } catch (e) { hata(e); } };
}

/* ================= PANO ================= */
async function pano(ic, P, sonra) {
  const [isler, at] = await Promise.all([
    q(sb.from('isler').select('*').eq('proje_id', P.p.id).order('sira')),
    q(sb.from('is_atamalari').select('*'))
  ]);
  const kim = id => at.filter(a => a.is_id === id).map(a => adi(a.ogrenci_id).split(' ')[0]).join(', ');
  let h = '<div class="bas-satir"><div class="alt" style="flex:1">Kartı sürükleyerek taşı. "Bitti"ye sadece danışman öğretmen alır: işin bitince "İncelemede"ye koy.</div>' + (P.duzenler ? '<button class="btn ana kucuk" id="isEkle">+ İş ekle</button>' : '') + '</div><div class="pano">';
  IS_DURUM.forEach(([k, ad]) => {
    const l = isler.filter(i => i.durum === k);
    h += '<div class="sutun" data-sutun="' + k + '"><h3>' + ad + '<span class="mini">' + l.length + '</span></h3>' + l.map(i => '<div class="pkart ' + (k === 'bitti' ? 'bitti' : '') + '" draggable="' + (P.duzenler ? 'true' : 'false') + '" data-is="' + i.id + '"><b>' + esc(i.baslik) + '</b>' +
      '<div class="mini">' + (kim(i.id) ? '👤 ' + esc(kim(i.id)) : '') + (i.son_tarih ? ' · 📅 ' + tarihYaz(i.son_tarih) : '') + '</div></div>').join('') + '</div>';
  });
  h += '</div>';
  ic.innerHTML = h;
  if ($('#isEkle')) $('#isEkle').onclick = () => isPanoFormu(P, null, [], sonra);
  $$('.pkart', ic).forEach(k => {
    k.onclick = () => isPanoFormu(P, isler.find(i => i.id === k.dataset.is), at.filter(a => a.is_id === k.dataset.is).map(a => a.ogrenci_id), sonra);
    k.ondragstart = e => e.dataTransfer.setData('text', k.dataset.is);
  });
  $$('.sutun', ic).forEach(s => {
    s.ondragover = e => { e.preventDefault(); s.classList.add('ustte'); };
    s.ondragleave = () => s.classList.remove('ustte');
    s.ondrop = async e => {
      e.preventDefault(); s.classList.remove('ustte');
      const id = e.dataTransfer.getData('text'); if (!id) return;
      try { await q(sb.from('isler').update({ durum: s.dataset.sutun, sira: Date.now() / 1000 }).eq('id', id)); sonra(); } catch (er) { hata(er); }
    };
  });
}
function isPanoFormu(P, i, atanan, sonra) {
  i = i || {};
  const duz = P.duzenler && (P.o || i.durum !== 'bitti');
  modal('<form style="padding:24px;width:min(560px,94vw)" id="pi"><h3>' + (i.id ? 'İş' : 'Yeni iş') + '</h3>' +
    '<label class="alan"><span>Ne yapılacak?</span><input name="baslik" required value="' + esc(i.baslik || '') + '" ' + (duz ? '' : 'disabled') + '></label>' +
    '<label class="alan"><span>Ayrıntı</span><textarea name="aciklama" rows="3" ' + (duz ? '' : 'disabled') + '>' + esc(i.aciklama || '') + '</textarea></label>' +
    '<div class="form-izgara"><label class="alan"><span>Durum</span><select name="durum" ' + (duz ? '' : 'disabled') + '>' + secenekler(P.o ? IS_DURUM : IS_DURUM.filter(x => x[0] !== 'bitti' || i.durum === 'bitti'), i.durum || 'yapilacak') + '</select></label>' +
    '<label class="alan"><span>Son tarih</span><input type="date" name="son_tarih" value="' + (i.son_tarih ? i.son_tarih.slice(0, 10) : '') + '" ' + (duz ? '' : 'disabled') + '></label></div>' +
    '<div class="alan"><span>Kim yapacak?</span>' + P.aktifUye.map(u => '<label class="satir"><input type="checkbox" name="kim" value="' + u.ogrenci_id + '" ' + (atanan.includes(u.ogrenci_id) ? 'checked' : '') + ' ' + (duz ? '' : 'disabled') + '> ' + esc(adi(u.ogrenci_id)) + '</label>').join('') + '</div>' +
    (duz ? '<div class="satir"><button class="btn ana">Kaydet</button>' + (i.id ? '<button type="button" class="btn kucuk hayalet" id="piSil" style="color:var(--kirmizi)">Sil</button>' : '') + '</div>' : '<div class="mini">Bu iş bitti. Değişiklik için danışmanına yaz.</div>') + '</form>');
  if (!duz) return;
  $('#pi').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, kim = $$('[name=kim]:checked', f).map(x => x.value);
    const k = { baslik: f.baslik.value.trim(), aciklama: f.aciklama.value.trim() || null, durum: f.durum.value, son_tarih: f.son_tarih.value ? new Date(f.son_tarih.value + 'T23:59:00').toISOString() : null };
    try {
      let id = i.id;
      if (id) await q(sb.from('isler').update(k).eq('id', id));
      else id = (await q(sb.from('isler').insert(Object.assign(k, { proje_id: P.p.id, tur: 'proje', olusturan: S.ben.id })).select('id').single())).id;
      const ekle = kim.filter(x => !atanan.includes(x)), cikar = atanan.filter(x => !kim.includes(x));
      if (ekle.length) await q(sb.from('is_atamalari').insert(ekle.map(o => ({ is_id: id, ogrenci_id: o }))));
      if (cikar.length) await q(sb.from('is_atamalari').delete().eq('is_id', id).in('ogrenci_id', cikar));
      modalKapat(); sonra();
    } catch (er) { hata(er); }
  };
  if ($('#piSil')) $('#piSil').onclick = async () => { if (!confirm('İş silinsin mi?')) return; try { await q(sb.from('isler').delete().eq('id', i.id)); modalKapat(); sonra(); } catch (er) { hata(er); } };
}

/* ================= EVRAK ================= */
const DURUM_EVRAK = { taslak: 'Taslak', gonderildi: 'Onay bekliyor', onaylandi: 'Onaylandı', duzeltme: 'Düzeltme istendi' };
async function evrak(ic, P, sonra, sablonSec, adimSec) {
  const p = P.p, o = P.o;
  const kayitlar = await q(sb.from('proje_evrak').select('*').eq('proje_id', p.id));
  const sablonlar = (p.sablonlar || ['genel']).filter(k => SABLONLAR[k]);
  if (!sablonlar.length) { ic.innerHTML = '<div class="kart">Bu proje için evrak seçilmedi.</div>'; return; }
  const sk = sablonSec && sablonlar.includes(sablonSec) ? sablonSec : (ic.dataset.sablon && sablonlar.includes(ic.dataset.sablon) ? ic.dataset.sablon : sablonlar[0]);
  ic.dataset.sablon = sk;
  const s = SABLONLAR[sk], kayit = a => kayitlar.find(k => k.sablon === sk && k.adim === a);
  const ilkAcik = s.adimlar.find(a => { const k = kayit(a.id); return !k || k.durum !== 'onaylandi'; }) || s.adimlar[0];
  const adim = s.adimlar.find(a => a.id === (adimSec || ic.dataset.adim)) || ilkAcik;
  ic.dataset.adim = adim.id;
  const k = kayit(adim.id) || { veriler: {}, durum: 'taslak' };
  const veri = JSON.parse(JSON.stringify(k.veriler || {}));
  // ekip tablosunu otomatik doldur
  if (sk === 'genel' && adim.id === 'kunye') {
    if (!veri.ad) veri.ad = p.ad;
    if (!veri.ekip || !veri.ekip.length) veri.ekip = P.aktifUye.map(u => [adi(u.ogrenci_id), (S.kisiMap[u.ogrenci_id] || {}).sinif || '', '']);
    if (!veri.github && p.github_url) veri.github = p.github_url;
  }
  if (sk !== 'genel' && adim.id === 'basvuru' && !veri.ad) veri.ad = p.ad;
  const kilitli = !o && (k.durum === 'onaylandi' || !P.benim);
  const onayli = s.adimlar.filter(a => (kayit(a.id) || {}).durum === 'onaylandi').length;

  let h = '<div class="sablon-sec">' + sablonlar.map(x => { const ss = SABLONLAR[x], n = ss.adimlar.filter(a => (kayitlar.find(kk => kk.sablon === x && kk.adim === a.id) || {}).durum === 'onaylandi').length;
    return '<button class="' + (x === sk ? 'secili' : '') + '" style="--sbl:' + ss.renk + '" data-sbl="' + x + '">' + esc(ss.ad) + '<small>' + n + '/' + ss.adimlar.length + ' adım onaylı</small></button>'; }).join('') +
    '<button class="sag" id="yazdirBtn">🖨 Yazdır / PDF</button></div>';
  h += '<div class="kart" style="margin-bottom:14px;border-left:5px solid ' + s.renk + '"><b>' + esc(s.ad) + '</b> · ' + esc(s.kisa) + '<div class="mini" style="margin-top:4px">' + bicim(s.aciklama) + (s.kaynak ? ' <a href="' + esc(s.kaynak) + '" target="_blank" rel="noopener">Resmî sayfa →</a>' : '') + '</div>' +
    '<div class="ilerleme" style="--ders:' + s.renk + '"><i style="width:' + Math.round(onayli / s.adimlar.length * 100) + '%"></i></div></div>';
  h += '<div class="evrak"><nav class="adim-liste kart" style="padding:8px">' + s.adimlar.map(a => {
    const kk = kayit(a.id), d = kk ? kk.durum : null, yazildi = kk && Object.keys(kk.veriler || {}).length;
    return '<a href="#" data-adim="' + a.id + '" class="' + (a.id === adim.id ? 'secili' : '') + '"><span class="d ' + (d && d !== 'taslak' ? d : yazildi ? 'yazildi' : '') + '">' + (d === 'onaylandi' ? '✓' : d === 'gonderildi' ? '…' : d === 'duzeltme' ? '!' : '') + '</span>' + esc(a.baslik) + '</a>';
  }).join('') + '</nav>';
  h += '<div class="kart" id="evrakForm"><div class="satir"><h2 style="margin:0;flex:1">' + esc(adim.baslik) + '</h2><span class="cip ' + k.durum + '">' + DURUM_EVRAK[k.durum] + '</span></div>' +
    (adim.aciklama ? '<div class="alt" style="margin-top:6px">' + bicim(adim.aciklama) + '</div>' : '') +
    (k.danisman_notu ? '<div class="geri-bildirim ' + (k.durum === 'onaylandi' ? 'onaylandi' : 'duzeltme') + '">💬 Danışman: ' + esc(k.danisman_notu) + '</div>' : '') +
    (k.guncelleme && k.guncelleyen ? '<div class="mini" style="margin-top:4px">Son değişiklik: ' + esc(adi(k.guncelleyen)) + ' · ' + once(k.guncelleme) + (k.onaylayan ? ' · Onaylayan: ' + esc(adi(k.onaylayan)) : '') + '</div>' : '') +
    adim.alanlar.map(a => alanHtml(a, veri[a.id], kilitli)).join('');
  if (!kilitli) h += '<div class="satir" style="margin-top:16px"><button class="btn" id="evKaydet">💾 Taslak kaydet</button>' + (!o ? '<button class="btn ana" id="evGonder">📤 Danışmana gönder</button>' : '') + '</div>';
  if (o) h += '<div class="danisman-kutu"><b>Danışman</b><textarea id="evNot" rows="2" placeholder="Not (düzeltme isterken zorunlu)" style="margin-top:6px">' + esc(k.danisman_notu || '') + '</textarea>' +
    '<div class="satir" style="margin-top:8px"><button class="btn yesil" id="evOnay">✓ Bu adımı onayla</button><button class="btn turuncu" id="evDuz">✏️ Düzeltme iste</button>' + (k.durum === 'onaylandi' ? '<button class="btn kucuk hayalet" id="evGeri">Onayı kaldır</button>' : '') + '</div></div>';
  else if (k.durum === 'onaylandi') h += '<div class="mini" style="margin-top:12px">🔒 Bu adım onaylandı. Değişiklik gerekirse danışmanına yaz.</div>';
  h += '</div></div>';
  ic.innerHTML = h;

  // olaylar
  $$('[data-sbl]', ic).forEach(b => b.onclick = () => { ic.dataset.adim = ''; evrak(ic, P, sonra, b.dataset.sbl); });
  $$('[data-adim]', ic).forEach(a => a.onclick = e => { e.preventDefault(); evrak(ic, P, sonra, sk, a.dataset.adim); window.scrollTo({ top: ic.offsetTop - 70, behavior: 'smooth' }); });
  $('#yazdirBtn').onclick = () => yazdir(P, sk, kayitlar);
  alanBagla(ic, adim, veri, p, sk);
  const kaydet = async durum => {
    const v = alanOku(ic, adim, veri);
    const kayitObj = { proje_id: p.id, sablon: sk, adim: adim.id, veriler: v, dosyalar: [] };
    if (durum) kayitObj.durum = durum;
    if (o && $('#evNot')) kayitObj.danisman_notu = $('#evNot').value.trim() || null;
    await q(sb.from('proje_evrak').upsert(kayitObj));
    // künye adını projeye yansıt
    if (sk === 'genel' && adim.id === 'kunye' && v.ad && v.ad !== p.ad && (o || ['taslak', 'netlestir'].includes(p.durum))) { await q(sb.from('projeler').update({ ad: v.ad }).eq('id', p.id)); p.ad = v.ad; }
  };
  if ($('#evKaydet')) $('#evKaydet').onclick = async () => { try { await kaydet(o ? undefined : (k.durum === 'gonderildi' ? 'gonderildi' : 'taslak')); tost('Kaydedildi'); evrak(ic, P, sonra, sk, adim.id); } catch (e) { hata(e); } };
  if ($('#evGonder')) $('#evGonder').onclick = async () => {
    const v = alanOku(ic, adim, veri), sorun = adim.alanlar.map(a => [a, alanSorunu(a, v[a.id])]).filter(x => x[1]);
    if (sorun.length) { tost('Göndermeden önce: ' + sorun.map(x => '"' + x[0].etiket.slice(0, 40) + '" ' + x[1]).join(' · '), true); return; }
    try { await kaydet('gonderildi'); tost('Danışmanına gönderildi'); const sira = s.adimlar.indexOf(adim); evrak(ic, P, sonra, sk, (s.adimlar[sira + 1] || adim).id); } catch (e) { hata(e); }
  };
  if (o) {
    $('#evOnay').onclick = async () => { try { await kaydet('onaylandi'); tost('Onaylandı'); evrak(ic, P, sonra, sk, adim.id); } catch (e) { hata(e); } };
    $('#evDuz').onclick = async () => { if (!$('#evNot').value.trim()) return tost('Düzeltme isterken not yaz.', true); try { await kaydet('duzeltme'); tost('Düzeltme istendi'); evrak(ic, P, sonra, sk, adim.id); } catch (e) { hata(e); } };
    if ($('#evGeri')) $('#evGeri').onclick = async () => { try { await kaydet('gonderildi'); evrak(ic, P, sonra, sk, adim.id); } catch (e) { hata(e); } };
  }
}

function alanHtml(a, v, kilitli) {
  const dis = kilitli ? ' disabled' : '', id = 'f_' + a.id;
  const bas = '<div class="alan" data-alan="' + a.id + '"><span>' + esc(a.etiket) + (a.zorunlu ? ' <b style="color:var(--turuncu)">*</b>' : '') + '</span>';
  const ipucu = a.ipucu ? '<small>' + bicim(a.ipucu) + '</small>' : '';
  const kel = a.kelime ? '<div class="kelime" data-kelime="' + a.id + '">' + kelimeSay(v) + ' kelime' + (a.kelime[0] || a.kelime[1] ? ' · ' + (a.kelime[0] ? 'en az ' + a.kelime[0] : '') + (a.kelime[0] && a.kelime[1] ? ', ' : '') + (a.kelime[1] ? 'en çok ' + a.kelime[1] : '') : '') + '</div>' : '';
  switch (a.tur) {
    case 'metin': return bas + '<input id="' + id + '" value="' + esc(v || '') + '"' + dis + '>' + kel + ipucu + '</div>';
    case 'uzun': return bas + '<textarea id="' + id + '" rows="' + (a.kelime && a.kelime[1] > 400 ? 10 : 5) + '"' + dis + '>' + esc(v || '') + '</textarea>' + kel + ipucu + '</div>';
    case 'tarih': return bas + '<input type="date" id="' + id + '" value="' + esc(v || '') + '"' + dis + '>' + ipucu + '</div>';
    case 'secim': return bas + '<select id="' + id + '"' + dis + '>' + secenekler(a.secenekler, v, '— seç —') + '</select>' + ipucu + '</div>';
    case 'coklu': return bas + a.secenekler.map(s => '<label class="satir" style="font-weight:600"><input type="checkbox" name="' + id + '" value="' + esc(s) + '" ' + ((v || []).includes(s) ? 'checked' : '') + dis + '> ' + esc(s) + '</label>').join('') + ipucu + '</div>';
    case 'onay': return '<label class="satir" data-alan="' + a.id + '" style="margin:14px 0;font-weight:700;align-items:flex-start"><input type="checkbox" id="' + id + '" ' + (v ? 'checked' : '') + dis + ' style="margin-top:4px"> <span>' + esc(a.etiket) + (a.zorunlu ? ' <b style="color:var(--turuncu)">*</b>' : '') + '</span></label>';
    case 'liste': {
      const l = (v && v.length ? v : ['']).concat(kilitli ? [] : ['']);
      return bas + ipucu + '<div class="liste-alan" id="' + id + '">' + l.map(x => '<input value="' + esc(x) + '"' + dis + ' placeholder="• madde">').join('') + '</div></div>';
    }
    case 'tablo': {
      const satir = (v && v.length ? v : Array.from({ length: Math.min(a.ornekSatir || 3, 3) }, () => a.sutunlar.map(() => '')));
      return bas + ipucu + '<div class="tablo-sar" style="border:none;background:none"><table class="tablo-alan" id="' + id + '"><thead><tr>' + a.sutunlar.map(s => '<th>' + esc(s) + '</th>').join('') + (kilitli ? '' : '<th></th>') + '</tr></thead><tbody>' +
        satir.map(r => '<tr>' + a.sutunlar.map((_, i) => '<td><input value="' + esc(r[i] || '') + '"' + dis + '></td>').join('') + (kilitli ? '' : '<td><button type="button" class="btn kucuk hayalet" data-satirsil>×</button></td>') + '</tr>').join('') +
        '</tbody></table></div>' + (kilitli ? '' : '<button type="button" class="btn kucuk" data-satirekle="' + a.id + '">+ Satır</button>') + '</div>';
    }
    case 'dosya': return bas + ipucu + '<div id="' + id + '">' + (v || []).map((d, i) => '<span class="dosya-cip"><a href="#" data-dosyaac="' + esc(d.yol) + '">📎 ' + esc(d.ad) + '</a>' + (kilitli ? '' : '<button type="button" data-dosyasil="' + a.id + '|' + i + '">×</button>') + '</span>').join('') + '</div>' +
      (kilitli ? '' : '<button type="button" class="btn kucuk" data-dosyaekle="' + a.id + '">+ Dosya yükle</button>') + '</div>';
    default: return bas + ipucu + '</div>';
  }
}
function alanBagla(ic, adim, veri, p, sk) {
  adim.alanlar.filter(a => a.kelime).forEach(a => {
    const el = $('#f_' + a.id, ic); if (!el) return;
    el.oninput = () => { const n = kelimeSay(el.value), k = $('[data-kelime="' + a.id + '"]', ic); k.textContent = n + ' kelime · ' + (a.kelime[0] ? 'en az ' + a.kelime[0] + ', ' : '') + 'en çok ' + a.kelime[1]; k.classList.toggle('kotu', (a.kelime[0] && n && n < a.kelime[0]) || n > a.kelime[1]); };
    el.oninput();
  });
  $$('.liste-alan', ic).forEach(l => l.addEventListener('input', e => { const inp = $$('input', l); if (e.target === inp[inp.length - 1] && e.target.value) { const y = document.createElement('input'); y.placeholder = '• madde'; l.appendChild(y); } }));
  $$('[data-satirekle]', ic).forEach(b => b.onclick = () => { const t = $('#f_' + b.dataset.satirekle + ' tbody', ic), r = t.rows[0].cloneNode(true); $$('input', r).forEach(i => { i.value = ''; }); t.appendChild(r); satirSilBagla(ic); });
  satirSilBagla(ic);
  $$('[data-dosyaac]', ic).forEach(a => a.onclick = async e => { e.preventDefault(); try { window.open(await imzaliUrl('teslimler', a.dataset.dosyaac), '_blank'); } catch (er) { hata(er); } });
  $$('[data-dosyasil]', ic).forEach(b => b.onclick = () => { const [aid, i] = b.dataset.dosyasil.split('|'); veri[aid] = (veri[aid] || []).filter((_, j) => j !== Number(i)); b.closest('.dosya-cip').remove(); tost('Kaydetmeyi unutma'); });
  $$('[data-dosyaekle]', ic).forEach(b => b.onclick = async () => {
    const dosyalar = await dosyaSec('', true); if (!dosyalar || !dosyalar.length) return;
    try {
      for (const d of dosyalar) {
        if (d.size > 25 * 1024 * 1024) { tost(d.name + ' 25 MB\'tan büyük.', true); continue; }
        const yol = 'projeler/' + p.id + '/' + sk + '_' + adim.id + '_' + Date.now() + '_' + guvenliAd(d.name);
        await dosyaYukle('teslimler', yol, d);
        (veri[b.dataset.dosyaekle] = veri[b.dataset.dosyaekle] || []).push({ ad: d.name, yol });
        $('#f_' + b.dataset.dosyaekle, ic).insertAdjacentHTML('beforeend', '<span class="dosya-cip">📎 ' + esc(d.name) + '</span>');
      }
      tost('Yüklendi. "Taslak kaydet" ya da "Danışmana gönder" ile kaydet.');
    } catch (e) { hata(e); }
  });
}
function satirSilBagla(ic) { $$('[data-satirsil]', ic).forEach(b => b.onclick = () => { const t = b.closest('tbody'); if (t.rows.length > 1) b.closest('tr').remove(); else $$('input', b.closest('tr')).forEach(i => { i.value = ''; }); }); }
function alanOku(ic, adim, veri) {
  const v = {};
  adim.alanlar.forEach(a => {
    const el = $('#f_' + a.id, ic);
    if (a.tur === 'dosya') { v[a.id] = veri[a.id] || []; return; }
    if (a.tur === 'coklu') { v[a.id] = $$('[name="f_' + a.id + '"]:checked', ic).map(x => x.value); return; }
    if (!el) return;
    if (a.tur === 'onay') v[a.id] = el.checked;
    else if (a.tur === 'liste') v[a.id] = $$('input', el).map(i => i.value.trim()).filter(Boolean);
    else if (a.tur === 'tablo') v[a.id] = Array.from(el.tBodies[0].rows).map(r => $$('input', r).map(i => i.value.trim())).filter(r => r.some(Boolean));
    else v[a.id] = el.value.trim();
  });
  return v;
}

function yazdir(P, sk, kayitlar) {
  const s = SABLONLAR[sk], p = P.p;
  let h = '<div class="evrak-cikti"><h1>' + esc(s.ad) + ': ' + esc(p.ad) + '</h1><p>Ekip: ' + esc(P.aktifUye.map(u => adi(u.ogrenci_id)).join(', ')) + ' · Danışman: ' + esc(p.danisman_id ? adi(p.danisman_id) : '—') + ' · Tarih: ' + tarihYaz(new Date()) + '</p>';
  s.adimlar.forEach(a => {
    const k = kayitlar.find(x => x.sablon === sk && x.adim === a.id), v = (k && k.veriler) || {};
    h += '<h2>' + esc(a.baslik) + (k && k.durum === 'onaylandi' ? ' ✓' : '') + '</h2>';
    a.alanlar.forEach(al => {
      const d = v[al.id];
      if (al.tur === 'onay') { h += '<div>' + (d ? '☑' : '☐') + ' ' + esc(al.etiket) + '</div>'; return; }
      h += '<div class="alan-b">' + esc(al.etiket) + '</div>';
      if (al.tur === 'tablo') h += '<table><tr>' + al.sutunlar.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr>' + (d || []).map(r => '<tr>' + al.sutunlar.map((_, i) => '<td>' + esc(r[i] || '') + '</td>').join('') + '</tr>').join('') + '</table>';
      else if (al.tur === 'liste' || al.tur === 'coklu') h += '<ul>' + (d || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
      else if (al.tur === 'dosya') h += '<div>' + ((d || []).map(x => esc(x.ad)).join(', ') || '—') + '</div>';
      else h += '<div>' + (d ? esc(d).replace(/\n/g, '<br>') : '—') + '</div>';
    });
  });
  h += '</div>';
  $('#yazdir').innerHTML = h;
  window.print();
}

/* ================= HAFTALIK NOTLAR ================= */
async function notlar(ic, P, sonra) {
  const l = await q(sb.from('proje_notlari').select('*').eq('proje_id', P.p.id).order('olusturma', { ascending: false }));
  let h = '';
  if (P.duzenler) h += '<form class="kart" id="nF"><h3>Bu haftanın notu</h3><div class="izgara uc">' +
    '<label class="alan"><span>Ne yaptım?</span><textarea name="yaptim" rows="3" required></textarea></label>' +
    '<label class="alan"><span>Neyi sevdim?</span><textarea name="sevdim" rows="3"></textarea></label>' +
    '<label class="alan"><span>Nerede zorlandım?</span><textarea name="zorlandim" rows="3"></textarea></label></div><button class="btn ana">Notu ekle</button></form>';
  h += '<h2>Notlar</h2>' + (l.length ? l.map(n => '<div class="kart" style="margin-bottom:10px"><div class="mini"><b>' + esc(adi(n.yazan_id)) + '</b> · ' + tarihYaz(n.olusturma, true) + '</div>' +
    (n.yaptim ? '<div style="margin-top:6px"><b>Yaptım:</b> ' + bicim(n.yaptim) + '</div>' : '') + (n.sevdim ? '<div><b>Sevdim:</b> ' + bicim(n.sevdim) + '</div>' : '') + (n.zorlandim ? '<div><b>Zorlandım:</b> ' + bicim(n.zorlandim) + '</div>' : '') + '</div>').join('') : '<div class="kart alt">Henüz not yok. Her hafta kısa bir not yazmak, sonunda sonuç raporunu ve öz değerlendirmeyi kolaylaştırır.</div>');
  ic.innerHTML = h;
  if ($('#nF')) $('#nF').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    try { await q(sb.from('proje_notlari').insert({ proje_id: P.p.id, yazan_id: S.ben.id, yaptim: f.yaptim.value.trim(), sevdim: f.sevdim.value.trim() || null, zorlandim: f.zorlandim.value.trim() || null })); tost('Not eklendi'); sonra(); } catch (er) { hata(er); }
  };
}

/* ================= FİKİR HAVUZU ================= */
const FIKIR_KAT = ['Web', 'Mobil', 'Oyun', 'Yapay zekâ / veri', 'Donanım / robotik / IoT', 'Ağ / siber güvenlik', 'Sosyal medya / pazarlama', 'Okul için', 'Toplum yararına', 'Girişimcilik', 'Diğer'];
export async function fikirler(el, p) {
  const o = ogretmen(), kat = p[0] || 'hepsi';
  const [l, beg, etk] = await Promise.all([
    q(sb.from('fikirler').select('*').neq('durum', o ? '___' : 'arsiv').order('olusturma', { ascending: false })),
    q(sb.from('fikir_begeni').select('*')),
    q(sb.from('etkinlikler').select('id,baslik').in('tur', ['tubitak', 'teknofest', 'yarisma', 'girisimcilik', 'bilisim']))
  ]);
  const liste = l.filter(f => kat === 'hepsi' || f.kategori === kat);
  let h = '<div class="bas-satir"><h1>Fikir havuzu</h1><button class="btn ana" id="fEkle">+ Fikir ekle</button></div>' +
    '<div class="alt" style="margin-bottom:12px">Herkes fikir ekleyebilir. Beğendiğin bir fikirle proje başlatabilirsin: fikir projeye dönüşür, ekibini kurarsın.</div>' +
    '<div class="filtre">' + ['hepsi'].concat(FIKIR_KAT).map(k => '<a class="btn kucuk ' + (kat === k ? 'ana' : '') + '" href="#/fikirler/' + encodeURIComponent(k) + '">' + (k === 'hepsi' ? 'Hepsi' : esc(k)) + '</a>').join('') + '</div>';
  h += liste.length ? '<div class="izgara iki">' + liste.map(f => {
    const n = beg.filter(b => b.fikir_id === f.id).length, ben = beg.some(b => b.fikir_id === f.id && b.kisi_id === S.ben.id), e = etk.find(x => x.id === f.etkinlik_id);
    return '<div class="kart" style="' + (f.durum !== 'acik' ? 'opacity:.7' : '') + '"><div class="satir"><span class="cip mavi">' + esc(f.kategori) + '</span><span class="cip bos">' + esc(f.zorluk) + '</span>' + (f.durum === 'alindi' ? '<span class="cip onaylandi">Projeye dönüştü</span>' : '') + (f.durum === 'arsiv' ? '<span class="cip bos">Arşiv</span>' : '') + '</div>' +
      '<h3 style="margin:8px 0 4px">' + esc(f.baslik) + '</h3>' + (f.aciklama ? '<div>' + bicim(f.aciklama) + '</div>' : '') + (e ? '<div class="mini" style="margin-top:6px">🏆 ' + esc(e.baslik) + '</div>' : '') +
      '<div class="mini" style="margin-top:6px">' + esc(adi(f.ekleyen)) + ' · ' + once(f.olusturma) + '</div>' +
      '<div class="satir" style="margin-top:10px"><button class="btn kucuk" data-beg="' + f.id + '" data-ben="' + (ben ? 1 : 0) + '">' + (ben ? '❤️' : '🤍') + ' ' + n + '</button>' +
      (f.durum === 'acik' ? '<a class="btn kucuk ana" href="#/projeler/yeni/' + f.id + '">🚀 Bu fikirle proje başlat</a>' : '') +
      (o || f.ekleyen === S.ben.id ? '<button class="btn kucuk hayalet" data-fduz="' + f.id + '">✏️</button>' : '') + '</div></div>';
  }).join('') + '</div>' : '<div class="kart bos-kart">Bu kategoride henüz fikir yok. İlk fikri sen ekle!</div>';
  el.innerHTML = h;
  $('#fEkle').onclick = () => fikirFormu(null, etk, () => fikirler(el, p));
  $$('[data-fduz]', el).forEach(b => b.onclick = () => fikirFormu(l.find(f => f.id === b.dataset.fduz), etk, () => fikirler(el, p)));
  $$('[data-beg]', el).forEach(b => b.onclick = async () => {
    try {
      if (b.dataset.ben === '1') await q(sb.from('fikir_begeni').delete().eq('fikir_id', b.dataset.beg).eq('kisi_id', S.ben.id));
      else await q(sb.from('fikir_begeni').insert({ fikir_id: b.dataset.beg, kisi_id: S.ben.id }));
      fikirler(el, p);
    } catch (e) { hata(e); }
  });
}
function fikirFormu(f, etk, sonra) {
  f = f || {};
  const o = ogretmen();
  modal('<form style="padding:24px;width:min(620px,94vw)" id="fF"><h3>' + (f.id ? 'Fikri düzenle' : 'Yeni fikir') + '</h3>' +
    '<label class="alan"><span>Fikir</span><input name="baslik" required maxlength="140" value="' + esc(f.baslik || '') + '" placeholder="Ör. Okulda kayıp eşya bulma sitesi"></label>' +
    '<label class="alan"><span>Kısaca anlat: hangi sorunu çözer, kim kullanır?</span><textarea name="aciklama" rows="4">' + esc(f.aciklama || '') + '</textarea></label>' +
    '<div class="form-izgara"><label class="alan"><span>Kategori</span><select name="kategori">' + secenekler(FIKIR_KAT, f.kategori || 'Web') + '</select></label>' +
    '<label class="alan"><span>Zorluk</span><select name="zorluk">' + secenekler([['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']], f.zorluk || 'orta') + '</select></label>' +
    '<label class="alan"><span>Uygun yarışma</span><select name="etkinlik_id">' + secenekler(etk.map(e => [e.id, e.baslik]), f.etkinlik_id, '—') + '</select></label>' +
    (o && f.id ? '<label class="alan"><span>Durum</span><select name="durum">' + secenekler([['acik', 'Açık'], ['alindi', 'Projeye dönüştü'], ['arsiv', 'Arşiv']], f.durum) + '</select></label>' : '') + '</div>' +
    '<div class="satir"><button class="btn ana">Kaydet</button>' + (f.id ? '<button type="button" class="btn kucuk hayalet" id="fSil" style="color:var(--kirmizi)">Sil</button>' : '') + '</div></form>');
  $('#fF').onsubmit = async e => {
    e.preventDefault(); const x = e.target;
    const k = { baslik: x.baslik.value.trim(), aciklama: x.aciklama.value.trim() || null, kategori: x.kategori.value, zorluk: x.zorluk.value, etkinlik_id: x.etkinlik_id.value || null };
    if (x.durum) k.durum = x.durum.value;
    try { if (f.id) await q(sb.from('fikirler').update(k).eq('id', f.id)); else await q(sb.from('fikirler').insert(Object.assign(k, { ekleyen: S.ben.id }))); modalKapat(); tost('Kaydedildi'); sonra(); } catch (er) { hata(er); }
  };
  if ($('#fSil')) $('#fSil').onclick = async () => { if (!confirm('Fikir silinsin mi?')) return; try { await q(sb.from('fikirler').delete().eq('id', f.id)); modalKapat(); sonra(); } catch (er) { hata(er); } };
}
