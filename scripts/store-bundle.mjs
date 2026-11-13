// Gathers everything a Chrome Web Store submission needs into release/auroreel-<version>-store/, checked against the
// store's limits:
//
//   0 - Hướng dẫn nộp từng bước.md        docs/PUBLISHING.md
//   1 - auroreel-<version>.zip             the package (npm run package)
//   2 - Ảnh/                               icon, screenshots (EN, VI) and promo tiles
//   3 - Điền từng ô trên Store.txt         every dashboard field with the text to paste (from docs/STORE_LISTING.md)
//   3a, 3b                                 the English and Vietnamese descriptions alone, to copy whole
//   4 - Chính sách quyền riêng tư.md       docs/PRIVACY.md, for the public privacy-policy page
//
//   npm run store        (= npm run package + this script)
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const problems = [];

// ---------- The package ----------
const zip = join(root, 'release', `auroreel-${version}.zip`);
if (!existsSync(zip)) {
  console.error(`${zip} not found. Run \`npm run package\` first.`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(join(root, 'dist/manifest.json'), 'utf8'));
if (manifest.version !== version) problems.push(`dist/manifest.json is ${manifest.version}, package.json ${version}`);

// ---------- Pictures: sizes the store accepts ----------
/** Width × height and colour type from a PNG header. */
const pngSize = (file) => {
  const b = readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: b[25] };
};
const store = join(root, 'brand/store');
const shots = readdirSync(join(store, 'screenshots')).filter((f) => f.endsWith('.png'));
const pictures = [
  { file: 'store-icon-128.png', w: 128, h: 128 },
  ...['', '-vi'].flatMap((s) => [
    { file: `promo-small-440x280${s}.png`, w: 440, h: 280 },
    { file: `promo-marquee-1400x560${s}.png`, w: 1400, h: 560 },
  ]),
  ...shots.map((f) => ({ file: `screenshots/${f}`, w: 1280, h: 800 })),
];
for (const p of pictures) {
  const size = existsSync(join(store, p.file)) ? pngSize(join(store, p.file)) : null;
  if (!size) problems.push(`brand/store/${p.file} is missing or not a PNG`);
  else if (size.w !== p.w || size.h !== p.h)
    problems.push(`brand/store/${p.file} is ${size.w}×${size.h}, not ${p.w}×${p.h}`);
  // Screenshots and promo tiles: JPEG or 24-bit PNG without alpha (PNG colour type 2).
  else if (p.file !== 'store-icon-128.png' && size.type !== 2)
    problems.push(`brand/store/${p.file} has an alpha channel (the store wants 24-bit PNG)`);
}
for (const lang of ['en', 'vi']) {
  const n = shots.filter((f) => f.startsWith(`${lang}-`)).length;
  if (n < 1 || n > 5) problems.push(`${n} ${lang} screenshots (the store takes 1–5)`);
}

// ---------- Texts from docs/STORE_LISTING.md ----------
const listing = readFileSync(join(root, 'docs/STORE_LISTING.md'), 'utf8');
const section = (title) => {
  const start = listing.indexOf(`\n## ${title}`);
  if (start < 0) throw new Error(`docs/STORE_LISTING.md has no "## ${title}"`);
  const body = listing.indexOf('\n', start + 1);
  const end = listing.indexOf('\n## ', body);
  return listing.slice(body + 1, end < 0 ? undefined : end).trim();
};
/** Markdown → the plain text the dashboard boxes take. */
const plain = (s) =>
  s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\\*/g, '*');
/**
 * Joins the lines Prettier wrapped. A new line starts at a bullet (• or 1.), at an emoji heading and after a heading
 * (a line without lower-case letters); blank lines stay.
 */
const unwrap = (s) =>
  s
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split('\n')
        .reduce((lines, raw) => {
          const line = raw.trim();
          const prev = lines.at(-1);
          if (prev === undefined || /^(•|\d+\.\s|\p{Extended_Pictographic})/u.test(line) || !/\p{Ll}/u.test(prev))
            lines.push(line);
          else lines[lines.length - 1] = `${prev} ${line}`;
          return lines;
        }, [])
        .join('\n'),
    )
    .join('\n\n');
/** "- **Label:** text" (or "- EN: text") items of a section, in order. */
const items = (s) =>
  s
    .split(/\n(?=- )/)
    .map((item) => /^- (?:\*\*(.+?):\*\*|(EN|VI):) ([\s\S]*)$/.exec(item.trim()))
    .filter(Boolean)
    .map((m) => ({ label: plain(m[1] ?? m[2]), text: plain(m[3]).split(/\s+/).join(' ') }));

const names = items(section('Name (≤ 75)'));
const summaries = items(section('Summary (≤ 132)'));
const descEn = unwrap(section('Description — English'));
const descVi = unwrap(section('Mô tả — Tiếng Việt'));
const single = plain(section('Single purpose')).split(/\s+/).join(' ');
const permissions = items(section('Permission justifications'));
const test = unwrap(plain(section('Test instructions')));
const pick = (list, label) => list.find((i) => i.label === label)?.text ?? '';

for (const n of names) if ([...n.text].length > 75) problems.push(`name (${n.label}) > 75 characters`);
for (const s of summaries) if ([...s.text].length > 132) problems.push(`summary (${s.label}) > 132 characters`);
for (const [label, d] of [
  ['EN', descEn],
  ['VI', descVi],
])
  if ([...d].length > 16_000) problems.push(`${label} description > 16,000 characters`);
for (const [label, text] of [['Single purpose', single], ...permissions.map((p) => [p.label, p.text])])
  if ([...text].length > 1000) problems.push(`${label} is ${[...text].length} characters (the box takes 1000)`);
// Keyword spam: no more than five supported sites named, no brand five times or more.
const BRANDS = ['YouTube', 'Twitch', 'Netflix', 'Prime Video', 'Disney+', 'Vimeo', 'FPT Play', 'VieON'];
for (const [label, d] of [
  ['EN', descEn],
  ['VI', descVi],
]) {
  const named = BRANDS.filter((b) => d.includes(b));
  if (named.length > 5)
    problems.push(`${label} description names ${named.length} sites (${named.join(', ')}); keep it to 5`);
  for (const b of named) {
    const n = d.split(b).length - 1;
    if (n > 4) problems.push(`${label} description says "${b}" ${n} times; keep it to 4`);
  }
}
const locales = ['en', 'vi'].map((l) =>
  JSON.parse(readFileSync(join(root, `public/_locales/${l}/messages.json`), 'utf8')),
);
for (const [i, l] of ['en', 'vi'].entries()) {
  if (locales[i].extName.message !== pick(names, l.toUpperCase()))
    problems.push(`${l} name in STORE_LISTING.md differs from _locales/${l}/messages.json`);
  if (locales[i].extDescription.message !== pick(summaries, l.toUpperCase()))
    problems.push(`${l} summary in STORE_LISTING.md differs from _locales/${l}/messages.json`);
}

if (problems.length) {
  console.error(`Not ready for the store:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

// ---------- Copy ----------
const out = join(root, 'release', `auroreel-${version}-store`);
rmSync(out, { recursive: true, force: true });
const pics = join(out, '2 - Ảnh');
const dirs = {
  en: join(pics, 'Ảnh chụp - English'),
  vi: join(pics, 'Ảnh chụp - Tiếng Việt'),
  promo: join(pics, 'Quảng bá'),
};
for (const d of Object.values(dirs)) mkdirSync(d, { recursive: true });
copyFileSync(join(root, 'docs/PUBLISHING.md'), join(out, '0 - Hướng dẫn nộp từng bước.md'));
copyFileSync(zip, join(out, `1 - auroreel-${version}.zip`));
copyFileSync(join(store, 'store-icon-128.png'), join(pics, 'store-icon-128.png'));
for (const f of shots) copyFileSync(join(store, 'screenshots', f), join(f.startsWith('vi-') ? dirs.vi : dirs.en, f));
for (const f of readdirSync(store).filter((f) => f.startsWith('promo-')))
  copyFileSync(join(store, f), join(dirs.promo, f));
copyFileSync(join(root, 'docs/PRIVACY.md'), join(out, '4 - Chính sách quyền riêng tư.md'));

// ---------- The field-by-field guide ----------
const rule = '='.repeat(64);
const block = (title, text) => `${rule}\n${title}\n${rule}\n${text}\n`;
const guide = `AUROREEL ${version} — ĐIỀN TỪNG Ô TRÊN CHROME WEB STORE
Developer Dashboard: https://chrome.google.com/webstore/devconsole
Dán nguyên văn các khối chữ bên dưới vào đúng ô. Bấm "Save draft" sau mỗi thẻ.

1) PACKAGE
   New item → chọn "1 - auroreel-${version}.zip" trong thư mục này.

2) STORE LISTING — khi "Current editing language" là English – en (default)
   • Description: khối DESCRIPTION — ENGLISH bên dưới.
   • Category (cho mọi ngôn ngữ): Functionality & UI
   • Store icon: 2 - Ảnh/store-icon-128.png
   • Localized screenshots: để trống (bản tiếng Anh dùng ảnh Global).
   • Global screenshots — kéo 5 ảnh theo thứ tự 1 → 5: 2 - Ảnh/Ảnh chụp - English/
   • Small promo tile (bắt buộc): 2 - Ảnh/Quảng bá/promo-small-440x280.png
   • Marquee promo tile: 2 - Ảnh/Quảng bá/promo-marquee-1400x560.png
   • Promo video (Localized và Global): để trống.
   • Official URL: để trống (chỉ dành cho trang web bạn đã xác minh trong Google Search Console).
   • Homepage URL: https://github.com/Tanx-1811/auroreel
   • Support URL: https://github.com/Tanx-1811/auroreel/issues
     (hai địa chỉ này chỉ mở được khi repo công khai; repo còn riêng tư thì để trống)
   • Mature content: không bật.
   • Item support: giữ mặc định.

   Rồi đổi "Current editing language" sang Vietnamese – vi:
   • Description: khối MÔ TẢ — TIẾNG VIỆT bên dưới.
   • Localized screenshots — kéo 5 ảnh theo thứ tự 1 → 5: 2 - Ảnh/Ảnh chụp - Tiếng Việt/
   Tên và tóm tắt tự lấy từ gói. Ảnh quảng bá dùng chung cho mọi ngôn ngữ (Store không cho bản địa hoá);
   bộ đuôi -vi chỉ dùng khi muốn trang Store ưu tiên tiếng Việt.

3) PRIVACY PRACTICES
   • Single purpose description:
     ${single}

   • Permission justification — mỗi ô một đoạn bên dưới:
${permissions.map((p) => `\n     [${p.label} justification]\n     ${p.text}`).join('\n')}

   • Data usage: KHÔNG tích mục nào (Auroreel không thu thập dữ liệu).
     Tích cả 3 cam kết ở cuối (không bán dữ liệu; không dùng ngoài mục đích chính; không dùng để xét tín dụng).
   • Privacy policy URL: https://github.com/Tanx-1811/auroreel/blob/main/docs/PRIVACY.md
     (chỉ mở được khi repo công khai — xem "0 - Hướng dẫn", mục 2)

4) TEST INSTRUCTIONS (để người duyệt thử)
${test
  .split('\n')
  .map((l) => `   ${l}`)
  .join('\n')}

5) DISTRIBUTION
   • Payments: Free · Visibility: Public · Regions: All regions

6) ACCOUNT (chỉ làm một lần, trước khi gửi duyệt)
   • Bật xác minh 2 bước cho tài khoản Google đứng tên — Store bắt buộc.
   • Contact email: điền và xác minh — email này hiện công khai trên trang Store.
   • Trader status: phát hành miễn phí với tư cách cá nhân thì thường chọn "non-trader" (Google để bạn tự quyết
     về mặt pháp lý). Trang Store sẽ hiện tên nhà phát triển, email liên hệ và dòng "chưa tự xác định là
     thương nhân" cho người dùng ở EU. Chọn "trader" thì phải công khai tên, địa chỉ và số điện thoại.

7) SAU KHI GỬI
   Thường duyệt trong vài ngày, có khi vài tuần (lần đầu và xin quyền trên nhiều trang thì lâu hơn).
   Quá 3 tuần chưa có kết quả thì liên hệ hỗ trợ của Chrome Web Store.

${block('DESCRIPTION — ENGLISH', descEn)}
${block('MÔ TẢ — TIẾNG VIỆT', descVi)}
${block('TÊN & TÓM TẮT (Store tự đọc từ gói — chỉ để đối chiếu)', [...names.map((i) => `Tên ${i.label}: ${i.text}`), ...summaries.map((i) => `Tóm tắt ${i.label}: ${i.text}`)].join('\n'))}`;
writeFileSync(join(out, '3 - Điền từng ô trên Store.txt'), guide);
// The two long descriptions on their own, to open and copy whole (⌘A, ⌘C).
writeFileSync(join(out, '3a - Description (English).txt'), `${descEn}\n`);
writeFileSync(join(out, '3b - Mô tả (Tiếng Việt).txt'), `${descVi}\n`);
console.log(`Store bundle: ${out}`);
