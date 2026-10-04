/* Ortak yardımcılar, veritabanı bağlantısı ve uygulama durumu */
import { SUPABASE_URL, SUPABASE_ANON_KEY, EPOSTA_UZANTI } from './ayar.js';

const yerel = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);   // yerel deneme sunucusu
export const sb = window.supabase.createClient(yerel ? location.origin : SUPABASE_URL, yerel ? 'test' : SUPABASE_ANON_KEY, {
  auth: { persistSession: true, storage: window.sessionStorage, autoRefreshToken: true }
});
export { EPOSTA_UZANTI };

/* ---------- Durum ---------- */
export const S = {
  ben: null,            // profil
  dersler: [], siniflar: [], kisiler: [], kisiMap: {},
  ayar: {}, hafta: 1,
  onizleme: {}, aktifGorev: null, medyaOnbellek: {},
  bildirimSayisi: 0
};
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const DURUM_AD = { bos: 'Gönderilmedi', bekliyor: 'İnceleniyor', onaylandi: 'Onaylandı', duzeltme: 'Düzeltme istendi' };
export const DURUM_IKON = { bos: '·', bekliyor: '…', onaylandi: '✓', duzeltme: '!' };

export function ogretmen() { return S.ben && (S.ben.rol === 'ogretmen' || S.ben.rol === 'yonetici'); }
export function yonetici() { return S.ben && S.ben.rol === 'yonetici'; }
// Modül açık mı? (çekirdek: moduller tablosu). Yeni modül = tabloya bir satır + kendi sayfaları.
export function modulAcik(kod) { return !!(S.moduller || []).find(m => m.kod === kod && m.acik); }
// Dersin haftalık ortak içeriğini sadece moderatörü ve yönetici düzenler
export function moderator(d) { return yonetici() || !!(d && S.ben && d.moderator_id === S.ben.id); }

/* ---------- Metin ---------- */
export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function bicim(s) {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
}
export function basHarf(s) { s = String(s || ''); return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1).toLocaleLowerCase('tr'); }
export function guzelAd(s) { return String(s || '').split(' ').map(basHarf).join(' '); }
export function adi(id) { const k = S.kisiMap[id]; return k ? guzelAd(k.ad + ' ' + k.soyad) : '—'; }
export function $(s, kok) { return (kok || document).querySelector(s); }
export function $$(s, kok) { return Array.from((kok || document).querySelectorAll(s)); }
export function tarihYaz(t, saatli) {
  if (!t) return '';
  const d = new Date(t);
  const s = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  return saatli ? s + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : s;
}
export function once(t) {
  if (!t) return '';
  const ms = new Date(t).getTime(), d = Math.round((Date.now() - ms) / 60000);
  if (d < 1) return 'az önce'; if (d < 60) return d + ' dk önce';
  const s = Math.round(d / 60); if (s < 24) return s + ' saat önce';
  return tarihYaz(t, true);
}
export function kalan(t) {
  if (!t) return null;
  const g = Math.ceil((new Date(t).getTime() - Date.now()) / 86400000);
  return g;
}
export function kalanYaz(t) {
  const g = kalan(t); if (g === null) return '';
  if (g < 0) return 'süresi geçti'; if (g === 0) return 'bugün son gün'; if (g === 1) return 'yarın son gün';
  return g + ' gün kaldı';
}

/* ---------- Arayüz ---------- */
let bekleyen = 0;
export function yukleniyor(v) { bekleyen += v ? 1 : -1; if (bekleyen < 0) bekleyen = 0; $('#yukBar').classList.toggle('aktif', bekleyen > 0); }
export function tost(msg, hata) {
  const t = $('#tost'); t.textContent = msg; t.className = 'goster' + (hata ? ' hata' : '');
  clearTimeout(tost._z); tost._z = setTimeout(() => { t.className = ''; }, hata ? 5500 : 2800);
}
export function modal(ic, sade) {
  $('#modal').innerHTML = '<div class="perde" data-perde><button class="kapat" data-kapat>×</button>' + (sade ? ic : '<div class="ic">' + ic + '</div>') + '</div>';
  const p = $('#modal .perde');
  p.addEventListener('click', e => { if (e.target === p || e.target.hasAttribute('data-kapat')) modalKapat(); });
  return $('#modal .ic') || p;
}
export function modalKapat() { $('#modal').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalKapat(); });

export function hataMesaji(e) {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Kullanıcı adı / numara veya şifre hatalı.';
  if (/JWT|expired/i.test(m)) return 'Oturumun sona erdi, lütfen tekrar giriş yap.';
  if (/row-level security|permission denied/i.test(m)) return 'Bu işlem için yetkin yok.';
  if (/duplicate key/i.test(m)) return 'Bu kayıt zaten var.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Bağlantı kurulamadı. İnternetini kontrol et.';
  return m;
}
/* Veritabanı çağrısı: hata varsa fırlatır, yükleniyor çubuğunu yönetir */
export async function q(istek) {
  yukleniyor(true);
  try {
    const { data, error } = await istek;
    if (error) throw error;
    return data;
  } catch (e) { throw new Error(hataMesaji(e)); }
  finally { yukleniyor(false); }
}
export function hata(e) { tost(e.message || String(e), true); console.error(e); }

/* Form verisini nesneye çevir */
export function formVeri(form) {
  const o = {};
  $$('[name]', form).forEach(el => {
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.multiple) o[el.name] = Array.from(el.selectedOptions).map(x => x.value);
    else o[el.name] = el.value.trim();
  });
  return o;
}
export function secenekler(liste, secili, bosEtiket) {
  return (bosEtiket !== undefined ? '<option value="">' + esc(bosEtiket) + '</option>' : '') +
    liste.map(x => { const [v, e] = Array.isArray(x) ? x : [x, x]; return '<option value="' + esc(v) + '"' + (String(v) === String(secili ?? '') ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('');
}

/* ---------- Dosya ---------- */
export async function imzaliUrl(kova, yol, sure) {
  const k = kova + '|' + yol;
  const o = S.medyaOnbellek[k];
  if (o && o.bitis > Date.now()) return o.url;
  const d = await q(sb.storage.from(kova).createSignedUrl(yol, sure || 3600));
  const url = d.signedUrl || d.signedURL;
  S.medyaOnbellek[k] = { url, bitis: Date.now() + ((sure || 3600) - 60) * 1000 };
  return url;
}
export function guvenliAd(s) {
  return String(s || 'dosya').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80);
}
export async function dosyaYukle(kova, yol, dosya) {
  await q(sb.storage.from(kova).upload(yol, dosya, { upsert: true, contentType: dosya.type || undefined }));
  return yol;
}
export function dosyaSec(kabul, coklu) {
  return new Promise(coz => {
    const i = document.createElement('input'); i.type = 'file'; if (kabul) i.accept = kabul; if (coklu) i.multiple = true;
    i.onchange = () => coz(coklu ? Array.from(i.files) : i.files[0]); i.click();
  });
}
/* Görseli küçült (en fazla 1800 px, JPEG) */
export function gorselKucult(file) {
  return new Promise((coz, red) => {
    if (!file || file.type.indexOf('image') !== 0 || file.type === 'image/gif') return coz(file);
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1800; let w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        c.toBlob(b => coz(new File([b], 'gorsel.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85);
      };
      img.onerror = red; img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

/* ---------- Ders / içerik yardımcıları ---------- */
export function ders(kod) { return S.dersler.find(d => d.kod === kod); }
export function sinifOgrencileri(sinif) { return S.kisiler.filter(k => k.rol === 'ogrenci' && k.sinif === sinif && k.aktif); }
export function ogretmenler() { return S.kisiler.filter(k => k.rol !== 'ogrenci' && k.aktif); }
export function haftaSonTeslim(dersKodu, hafta, icerikSonTeslim) {
  if (icerikSonTeslim) return new Date(icerikSonTeslim);
  const t = S.ayar.toplu_son_teslim;
  if (t && hafta <= t.hafta_kadar) return new Date(t.tarih);
  const bas = new Date((S.ayar.birinci_hafta || '2026-09-14') + 'T23:59:00+03:00');
  return new Date(bas.getTime() + ((hafta - 1) * 7 + 4) * 86400000);
}
// Öğretmenin haftaya eklediği uygulama / ödev → görev biçimi
export function ekGorev(e) {
  return { id: e.kimlik, baslik: e.baslik, adimlar: e.adimlar || [], kanit: e.kanit, ipucu: e.ipucu,
    link: e.link ? { url: e.link, baslik: 'Kaynağı aç' } : null, medya: e.medya === 'video' ? 'video' : undefined,
    tur: e.tur === 'odev' ? 'odev' : undefined, ek: e };
}
// Ek görev bu öğrenciye mi? (grup verilmişse sadece o grup)
export function ekGorevKime(g, ogr) { return !g.ek || !g.ek.hedef_grup || (ogr && ogr.grup === g.ek.hedef_grup); }
// Görev kimliği kalıcıdır ve kitaba bağlıdır (U1.2, SS-s24, BONUS-H04, EK-xxxxxx).
// Öğrencinin gördüğü etiket (G1, Ö1, EK1, ⭐) sayfadaki sıraya göre burada verilir.
export const bonusMu = id => /^BONUS/.test(String(id || ''));
export function gorevListesi(ic, ekler) {
  const l = (ic && ic.gorevler ? ic.gorevler.map(g => Object.assign({}, g)) : []);
  (ekler || []).forEach(e => l.push(ekGorev(e)));
  if (ic && ic.bonus) {
    const b = ic.bonus, adim = b.adimlar && b.adimlar.length;
    l.push({ id: b.id || 'BONUS', baslik: b.baslik, aciklama: adim ? b.metin : '', adimlar: adim ? b.adimlar : [b.metin], kaynak: b.kaynak,
      kanit: b.kanit || 'Yaptığın çalışmanın ekran görüntüsü.', medya: b.medya, bonus: true });
  }
  let gn = 0, on = 0, en = 0;
  l.forEach(g => { g.etiket = g.bonus ? '⭐' : g.ek ? 'EK' + (++en) : g.tur === 'odev' ? 'Ö' + (++on) : 'G' + (++gn); });
  return l;
}

/* ---------- Şema (renkli bilgi kartları) ---------- */
const r = renk => ' r-' + (renk || 'gri');
const k = x => '<code>' + esc(x) + '</code>';
const CIZ = {
  etiketler: s => '<div class="s-etiketler">' + s.ogeler.map(o => {
    const uzun = String(o.k).length > 9 || String(o.v || '').length > 12;
    return '<div class="s-cip' + r(o.renk) + (uzun ? ' uzun' : '') + '">' + k(o.k) + '<span>' + bicim(o.v || '') + '</span></div>';
  }).join('') + '</div>',
  agac: s => {
    const kutu = o => '<div class="s-kutu' + r(o.renk) + '"><div class="s-bas">' + k(o.k) + (o.v ? '<small>' + bicim(o.v) + '</small>' : '') + '</div>' +
      (o.cocuk && o.cocuk.length ? '<div class="s-ic' + (o.yan ? ' yan' : '') + '">' + o.cocuk.map(kutu).join('') + '</div>' : '') + '</div>';
    return kutu(s.kok);
  },
  parca: s => '<div class="s-parca">' + s.ogeler.map(o => '<div class="' + r(o.renk).trim() + '">' + k(o.k) + '<small>' + esc(o.v || '') + '</small></div>').join('') + '</div>',
  sutunlar: s => '<div class="s-sutunlar">' + s.ogeler.map(o => '<div class="s-sutun' + r(o.renk) + '">' + k(o.k) +
    '<div class="s-on">' + (o.satirlar || []).map(esc).join('<br>') + '</div><small>' + esc(o.v || '') + '</small></div>').join('') + '</div>',
  izgara: s => {
    let h = '<table class="s-izgara">' + (s.baslik ? '<caption>' + esc(s.baslik) + '</caption>' : '');
    s.satirlar.forEach(sat => {
      h += '<tr>' + sat.map(c => '<td class="' + r(c.renk).trim() + '"' + (c.rs > 1 ? ' rowspan="' + c.rs + '"' : '') + (c.cs > 1 ? ' colspan="' + c.cs + '"' : '') + '>' + esc(c.t) + '</td>').join('') + '</tr>';
    });
    h += '</table>';
    if (s.lejant) h += '<div class="s-lejant">' + s.lejant.map(l => '<span class="' + r(l.renk).trim() + '"><i></i>' + k(l.k) + ' ' + esc(l.v) + '</span>').join('') + '</div>';
    return h;
  }
};
export function semaHtml(t) {
  const l = t.sema ? (Array.isArray(t.sema) ? t.sema : [t.sema]) : [];
  let h = l.map(s => CIZ[s.tur] ? '<div class="sema">' + CIZ[s.tur](s) + '</div>' : '').join('');
  if (t.not) h += '<div class="sema-not">✏️ Deftere yaz: ' + bicim(String(t.not).replace(/^Deftere yaz:\s*/i, '')) + '</div>';
  return h;
}

/* ---------- CSV ---------- */
export function csvIndir(ad, satirlar) {
  const csv = '﻿' + satirlar.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = ad; document.body.appendChild(a); a.click(); a.remove();
}
