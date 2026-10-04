/* BT Platformu — açılış, giriş, menü, yönlendirme */
import { sb, S, EPOSTA_UZANTI, $, $$, esc, q, tost, hata, modal, modalKapat, ogretmen, yonetici, modulAcik, guzelAd, basHarf, once, hataMesaji } from './ortak.js';
import * as Panel from './sayfa_panel.js';
import * as Ders from './sayfa_ders.js';
import * as Is from './sayfa_isler.js';
import * as Proje from './sayfa_proje.js';
import * as Diger from './sayfa_diger.js';
import * as Yonetim from './sayfa_yonetim.js';

/* ---------- Yönlendirme: #/yol/parametre ---------- */
const YOLLAR = [
  ['panel', Panel.panel],
  ['program', Panel.program],
  ['dersler', Ders.dersler],
  ['inceleme', Ders.inceleme],
  ['durum', Ders.durum],
  ['islerim', Is.islerim],
  ['isler', Is.isler],
  ['projeler', Proje.projeler],
  ['fikirler', Proje.fikirler],
  ['duyurular', Diger.duyurular],
  ['etkinlikler', Diger.etkinlikler],
  ['belgeler', Diger.belgeler],
  ['erasmus', Diger.erasmus],
  ['asistan', Diger.asistan],
  ['kisi', Diger.kisi],
  ['profil', Diger.profil],
  ['yonetim', Yonetim.yonetim]
];

function menu() {
  const o = ogretmen(), n = S.sayaclar || {}, m = modulAcik;
  const a = (yol, ikon, ad, sayac) => '<a href="#/' + yol + '" data-yol="' + yol.split('/')[0] + '"><span class="i">' + ikon + '</span>' + ad + (sayac ? '<span class="sayac">' + sayac + '</span>' : '') + '</a>';
  let h = a('panel', '🏠', 'Ana sayfa');
  // Her modül kendi menü grubunu getirir; kapalı modülün menüsü görünmez (Yönetim → Modüller)
  if (o) {
    if (m('dersler')) h += '<div class="grup">Dersler</div>' + a('dersler', '📚', 'Dersler') + a('inceleme', '✅', 'İnceleme', n.inceleme) + a('durum', '📊', 'Sınıf durumu') + (m('okul') ? a('isler', '📌', 'İş ve ödev ver') : '');
    if (m('projeler')) h += '<div class="grup">Projeler</div>' + a('projeler', '🚀', 'Projeler', n.evrak) + a('fikirler', '💡', 'Fikir havuzu');
    if (m('okul') || m('erasmus')) h += '<div class="grup">Okul</div>' + (m('okul') ? a('duyurular', '📣', 'Duyurular') + a('etkinlikler', '🏆', 'Etkinlikler') + a('program', '🕘', 'Kim nerede') + a('belgeler', '🗂️', 'Belgeler') : '') + (m('erasmus') ? a('erasmus', '🇪🇺', 'Erasmus+') : '');
    h += '<div class="grup">Diğer</div>' + (m('asistan') ? a('asistan', '💬', 'Asistan') : '') + (yonetici() ? a('yonetim', '⚙️', 'Yönetim') : '') + a('profil', '👤', 'Profilim');
  } else {
    if (m('dersler')) h += a('islerim', '📌', 'İşlerim', n.islerim) + a('dersler', '📚', 'Derslerim');
    if (m('projeler')) h += a('projeler', '🚀', 'Projem') + a('fikirler', '💡', 'Fikir havuzu');
    if (m('okul')) h += '<div class="grup">Okul</div>' + a('duyurular', '📣', 'Duyurular') + a('etkinlikler', '🏆', 'Etkinlikler') + a('program', '🕘', 'Ders programım') + a('belgeler', '🗂️', 'Belgeler');
    if (m('asistan')) h += '<div class="grup">Diğer</div>' + a('asistan', '💬', 'Asistan');
    h += a('profil', '👤', 'Profilim');
  }
  return h;
}

function iskelet() {
  const b = S.ben;
  const kim = ogretmen() ? '<b>' + esc(b.ad + ' ' + b.soyad) + '</b>' + (yonetici() ? 'Yönetici' : 'Öğretmen') + (b.danisman ? ' · Danışman' : '')
    : '<b>' + esc(guzelAd(b.ad + ' ' + b.soyad)) + '</b>' + esc(b.sinif || '') + ' · ' + esc(b.kullanici);
  $('#uygulama').innerHTML =
    '<div class="ust"><div class="ust-ic">' +
    '<button class="btn kucuk menu-btn" id="menuBtn">☰</button>' +
    '<a class="logo" href="#/panel" style="text-decoration:none;color:inherit"><span class="kutu">BT</span>Platform</a><div class="bosluk"></div>' +
    '<div class="kim">' + kim + '</div>' +
    '<button class="zil" id="zilBtn" title="Bildirimler">🔔<b id="zilSay" class="gizli"></b></button>' +
    '<button class="btn kucuk" id="cikisBtn">Çıkış</button></div></div>' +
    '<div class="duzen"><nav class="yan" id="yan">' + menu() + '</nav><main class="sayfa" id="sayfa"></main></div><div id="acilir"></div>';
  $('#cikisBtn').onclick = cikis;
  $('#zilBtn').onclick = bildirimAc;
  $('#menuBtn').onclick = () => $('#yan').classList.toggle('acik');
}
export function menuYenile() { const y = $('#yan'); if (y) { y.innerHTML = menu(); seciliMenu(); } }
function seciliMenu() {
  const yol = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'panel';
  $$('#yan a').forEach(a => a.classList.toggle('secili', a.dataset.yol === yol));
}

let sonYol = null;
// Hangi sayfa hangi modülün (modül kapalıysa sayfa açılmaz)
const SAYFA_MODUL = { dersler: 'dersler', inceleme: 'dersler', durum: 'dersler', islerim: 'dersler', projeler: 'projeler', fikirler: 'projeler',
  isler: 'okul', duyurular: 'okul', etkinlikler: 'okul', program: 'okul', belgeler: 'okul', erasmus: 'erasmus', asistan: 'asistan' };
export async function git() {
  if (!S.ben) return;
  const parca = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const yol = parca[0] || 'panel';
  const r = YOLLAR.find(x => x[0] === yol) || YOLLAR[0];
  $('#yan') && $('#yan').classList.remove('acik');
  seciliMenu();
  const el = $('#sayfa');
  if (sonYol !== location.hash) { window.scrollTo(0, 0); }
  sonYol = location.hash;
  const mk = SAYFA_MODUL[yol];
  if (mk && !modulAcik(mk)) { el.innerHTML = '<div class="kart">Bu bölüm henüz açılmadı. <a href="#/panel">Ana sayfa</a></div>'; return; }
  try { await r[1](el, parca.slice(1)); } catch (e) { el.innerHTML = '<div class="kart">' + esc(e.message || e) + '</div>'; console.error(e); }
  sayaclar();
}
window.addEventListener('hashchange', git);
export function yenile() { const y = window.scrollY; git().then(() => window.scrollTo(0, y)); }

/* ---------- Sayaçlar ve bildirimler ---------- */
async function sayaclar() {
  try {
    const n = {};
    const bl = await sb.from('bildirimler').select('id', { count: 'exact', head: true }).eq('okundu', false);
    S.bildirimSayisi = bl.count || 0;
    if (ogretmen()) {
      const t = await sb.from('teslimler').select('id', { count: 'exact', head: true }).eq('durum', 'bekliyor');
      n.inceleme = t.count || 0;
      const e = await sb.from('proje_evrak').select('proje_id', { count: 'exact', head: true }).eq('durum', 'gonderildi');
      n.evrak = e.count || 0;
    }
    const eski = JSON.stringify(S.sayaclar || {}); S.sayaclar = n;
    if (eski !== JSON.stringify(n)) menuYenile();
    const z = $('#zilSay'); if (z) { z.textContent = S.bildirimSayisi; z.classList.toggle('gizli', !S.bildirimSayisi); }
  } catch (e) { /* sessiz */ }
}
setInterval(() => { if (S.ben && document.visibilityState === 'visible') sayaclar(); }, 60000);

async function bildirimAc(e) {
  e.stopPropagation();
  const kutu = $('#acilir');
  if (kutu.innerHTML) { kutu.innerHTML = ''; return; }
  const l = await q(sb.from('bildirimler').select('*').order('olusturma', { ascending: false }).limit(40));
  kutu.innerHTML = '<div class="acilir"><div class="satir" style="padding:10px 14px;border-bottom:1px solid var(--cizgi)"><b>Bildirimler</b>' +
    (l.some(b => !b.okundu) ? '<button class="btn kucuk sag" id="hepsiOkundu">Hepsini okundu yap</button>' : '') + '</div>' +
    (l.length ? l.map(b => '<div class="bld ' + (b.okundu ? '' : 'yeni') + '" data-id="' + b.id + '" data-link="' + esc(b.link || '') + '"><b>' + esc(b.baslik) + '</b>' +
      (b.metin ? '<div class="mini">' + esc(b.metin) + '</div>' : '') + '<small>' + once(b.olusturma) + '</small></div>').join('')
      : '<div class="bos-kart">Bildirim yok.</div>') + '</div>';
  $$('.bld', kutu).forEach(el => el.onclick = async () => {
    kutu.innerHTML = '';
    sb.from('bildirimler').update({ okundu: true }).eq('id', el.dataset.id).then(sayaclar);
    if (el.dataset.link) location.hash = el.dataset.link;
  });
  const ho = $('#hepsiOkundu'); if (ho) ho.onclick = async ev => { ev.stopPropagation(); await q(sb.from('bildirimler').update({ okundu: true }).eq('okundu', false)); kutu.innerHTML = ''; sayaclar(); };
}
document.addEventListener('click', e => { const k = $('#acilir'); if (k && k.innerHTML && !e.target.closest('.acilir')) k.innerHTML = ''; });

/* ---------- Temel veriler ---------- */
export async function temelVeri() {
  const [dersler, siniflar, kisiler, ayarlar, hafta, moduller] = await Promise.all([
    q(sb.from('dersler').select('*').order('sira')),
    q(sb.from('siniflar').select('*').order('sira')),
    q(sb.from('profiller').select('id,kullanici,ad,soyad,rol,sinif,grup,danisman,aktif').order('sinif').order('ad')),
    q(sb.from('ayarlar').select('*')),
    q(sb.rpc('bu_hafta')),
    q(sb.from('moduller').select('*').order('sira'))
  ]);
  S.moduller = moduller;
  S.dersler = dersler; S.siniflar = siniflar; S.kisiler = kisiler;
  S.kisiMap = {}; kisiler.forEach(k => { S.kisiMap[k.id] = k; });
  S.ayar = {}; ayarlar.forEach(a => { S.ayar[a.anahtar] = a.deger; });
  S.hafta = hafta || 1;
}

/* ---------- Açılış ---------- */
async function baslat() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return girisEkrani();
  try {
    const p = await q(sb.from('profiller').select('*').eq('id', data.session.user.id).maybeSingle());
    if (!p || !p.aktif) { await sb.auth.signOut(); return girisEkrani('Hesabın etkin değil. Öğretmenine başvur.'); }
    S.ben = p;
    await temelVeri();
    iskelet();
    if (!p.kvkk_onay) kvkk();
    if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/panel';
    else git();
  } catch (e) { girisEkrani(e.message); }
}

function girisEkrani(mesaj) {
  S.ben = null;
  $('#uygulama').innerHTML =
    '<div class="giris"><form class="kart" id="girisForm" autocomplete="on">' +
    '<div class="renk-serit"><i style="background:#7c3aed"></i><i style="background:#0e7490"></i><i style="background:#c2410c"></i><i style="background:#15803d"></i><i style="background:#be185d"></i><i style="background:#1d4ed8"></i></div>' +
    '<h1>BT Platformu</h1><div class="alt">Bilişim Teknolojileri Alanı · 2026-2027</div>' +
    '<label class="alan"><span>Okul numaran</span><input id="gKul" name="username" autocomplete="username" placeholder="Örnek: 1234 (öğretmenler: kullanıcı adı)" required></label>' +
    '<label class="alan"><span>Şifre</span><input id="gSif" type="password" autocomplete="current-password" placeholder="Öğretmeninden aldığın şifre" required></label>' +
    '<div class="hata" id="gHata">' + esc(mesaj || '') + '</div>' +
    '<button class="btn ana" style="width:100%;justify-content:center;margin-top:6px" id="gBtn">Giriş yap</button>' +
    '<p class="mini" style="margin:16px 0 0">Ortak bilgisayardaysan işin bitince <b>Çıkış</b>\'a basmayı unutma. Şifreni unuttuysan öğretmenine söyle.</p>' +
    '</form></div>';
  $('#gKul').focus();
  $('#girisForm').onsubmit = async e => {
    e.preventDefault();
    const btn = $('#gBtn'); btn.disabled = true; btn.textContent = 'Kontrol ediliyor…'; $('#gHata').textContent = '';
    const kul = $('#gKul').value.trim().toLowerCase();
    let sif = $('#gSif').value.trim();
    if (/^\d+$/.test(kul)) sif = sif.toLowerCase();  // öğrenci şifrelerinde büyük/küçük harf fark etmez
    const { error } = await sb.auth.signInWithPassword({ email: kul + EPOSTA_UZANTI, password: sif });
    if (error) { $('#gHata').textContent = hataMesaji(error); btn.disabled = false; btn.textContent = 'Giriş yap'; return; }
    baslat();
  };
}

async function cikis() {
  await sb.auth.signOut();
  S.ben = null; S.onizleme = {}; S.medyaOnbellek = {};
  location.hash = '';
  girisEkrani();
}

function kvkk() {
  const ic = modal('<div style="padding:26px;max-width:640px"><h2 style="margin-top:0">Kişisel verilerin korunması</h2>' +
    '<p>Bu platform Bilişim Teknolojileri Alanı derslerinin ve projelerinin yürütülmesi için kullanılır. Platformda <b>adın, soyadın, okul numaran, sınıfın</b>, derslerde yüklediğin <b>ekran görüntüleri ve videolar</b>, proje çalışmaların ve öğretmenlerinin geri bildirimleri tutulur.</p>' +
    '<p>Bu bilgileri sadece senin derslerine giren öğretmenler ve proje danışmanların görür. Proje ekibindeki arkadaşların ortak proje çalışmalarını görür. Veriler eğitim-öğretim amacı dışında kullanılmaz ve üçüncü kişilerle paylaşılmaz.</p>' +
    '<p><b>Yüklediğin görüntülerde</b> kendinin ya da başkasının yüzü, kimlik bilgisi, adresi, telefon numarası olmamasına dikkat et.</p>' +
    '<p class="mini">Sorun ve talepleriniz için alan şefliğine başvurabilirsiniz. Veliler bilgi almak için okula başvurabilir.</p>' +
    '<button class="btn ana" id="kvkkTamam">Okudum, anladım</button></div>');
  $('.kapat').remove();
  $('[data-perde]').replaceWith($('[data-perde]').cloneNode(true));  // dışarı tıklayınca kapanmasın
  $('#kvkkTamam').onclick = async () => { try { await q(sb.rpc('kvkk_onayla')); S.ben.kvkk_onay = new Date().toISOString(); modalKapat(); } catch (e) { hata(e); } };
}

sb.auth.onAuthStateChange((olay) => { if (olay === 'SIGNED_OUT' && S.ben) { S.ben = null; girisEkrani('Oturumun sona erdi, lütfen tekrar giriş yap.'); } });
baslat();
