// Deterministic demo data: shared by Home, search, daily and weekly calendars.
scheduleEquipment["管理職予定"] = [
  "山田院長",
  "佐藤副院長",
  "鈴木事務長",
  "田中看護部長",
  "高橋診療部長",
  "伊藤医局長",
  "渡辺薬剤部長",
  "小林リハビリテーション科長",
  "加藤医療安全管理室長",
  "中村総務部長",
].map((name) => ({ name, unit: 30, info: "会議・確認・相談の時間確保" }));
const managerDemoTopics = [
  ["経営会議の議題確認", "地域連携会議の事前説明", "設備更新の稟議内容確認"],
  ["診療体制見直しの相談", "医療連携会議の資料確認", "診療科間の連携調整"],
  ["来年度予算案の事前確認", "委託業務の契約内容確認", "病院運営会議の事前打合せ"],
  ["病棟の勤務体制について相談", "看護部研修計画の確認", "病棟師長会議の議題確認"],
  ["外来診療体制の確認", "診療部会議の資料説明", "診療実績の報告内容確認"],
  ["医局会議の日程調整", "研修医の受入計画確認", "当直体制について相談"],
  ["採用薬品の変更内容確認", "薬剤部研修の事前相談", "薬事委員会の議題確認"],
  ["リハビリ部門の人員配置相談", "地域連携カンファレンスの事前確認", "リハビリ機器更新の説明"],
  ["医療安全研修の資料確認", "安全対策の改善案相談", "医療安全委員会の事前打合せ"],
  ["職員研修の日程確認", "施設修繕の見積内容確認", "採用面接日程の調整"],
];
function denseDemoSlots(date, equipment, opening, closing, occupied = []) {
  const end = opening + Math.floor((closing - opening) / equipment.unit) * equipment.unit;
  let seed = demoMixScore(date + "|" + equipment.name + "|slots");
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const slots = [];
  for (let from = opening; from + equipment.unit <= end;) {
    if (random() % 100 < 15) {
      from += equipment.unit;
      continue;
    }
    const length = random() % 10;
    let to = Math.min(end, from + equipment.unit * (length < 7 ? 1 : length < 9 ? 2 : 3));
    const busy = (end) => occupied.some((b) => b.from < end && b.to > from);
    while (to - from > equipment.unit && busy(to)) to -= equipment.unit;
    if (!busy(to)) slots.push({ from, to });
    from = busy(to) ? from + equipment.unit : to;
  }
  return slots;
}
function managerOwnBookingLimit(date) {
  const limit = demoOwnBookingLimit(date);
  if (!limit || demoMixScore(date + "|manager-personal") % 4 === 0) return 0;
  return limit >= 4 ? 2 : 1;
}
function seedManagerDemo(date) {
  const closing = reservationClosingMinute(date);
  const entries = [];
  const departments = ["秘書室", "総務課", "診療支援課", "看護部", "地域連携室", "医事課"];
  scheduleEquipment["管理職予定"].forEach((e, index) => {
    if (closing < scheduleEnd)
      scheduleBlocked.push({
        category: "管理職予定",
        date,
        equipment: e.name,
        from: closing,
        to: scheduleEnd,
      });
    const topics = [
      ...managerDemoTopics[index],
      "決裁書類の確認",
      "担当部署からの進捗報告",
      "委員会運営の相談",
    ];
    denseDemoSlots(date, e, 480, closing).forEach(({ from, to }, part) => {
      const score = demoMixScore(date + e.name + from);
      const department = departments[score % departments.length];
      entries.push({
        category: "管理職予定",
        equipment: e.name,
        date,
        from,
        to,
        title: topics[(score + part) % topics.length],
        own: false,
        person: demoPeople[(score >>> 4) % demoPeople.length],
        department,
        notes: `${department}からの時間確保依頼。関連資料を持参し、内容の確認・承認をお願いします。場所：管理棟打合せ室。`,
      });
    });
  });
  const ranked = [...entries].sort(
    (a, b) => demoMixScore(date + a.equipment + a.from) - demoMixScore(date + b.equipment + b.from),
  );
  const ownEquipment = new Set();
  for (const entry of ranked) {
    if (ownEquipment.size >= managerOwnBookingLimit(date)) break;
    if (ownEquipment.has(entry.equipment)) continue;
    entry.own = true;
    entry.person = "自分";
    entry.department = "企画部";
    ownEquipment.add(entry.equipment);
  }
  entries.forEach(addDemoBooking);
}

scheduleEquipment["会議室"].push({
  name: "大会議室",
  unit: 60,
  info: "大型モニター・オンライン会議対応",
  capacity: 20,
});
scheduleEquipment["プロジェクター"].push({
  name: "レーザープロジェクター",
  unit: 60,
  info: "4K対応・大会議室向け",
});
scheduleEquipment["車両"].push({ name: "配送用バン", unit: 120, info: "荷物運搬用・定員2名" });
scheduleEquipment["モニター"].push({ name: "モニターC", unit: 30, info: "32インチ・USB-C対応" });
const demoPeople = [
  "佐藤 太郎",
  "田中 一郎",
  "山田 花子",
  "鈴木 健一",
  "高橋 美咲",
  "伊藤 彩",
  "渡辺 翔太",
  "小林 美穂",
];
scheduleEquipment["会議室"].push(
  { name: "第3会議室", unit: 30, info: "モニター・Web会議用カメラ有り", capacity: 6 },
  { name: "第4会議室", unit: 60, info: "ホワイトボード・電源有り", capacity: 10 },
  { name: "役員会議室", unit: 60, info: "大型モニター・防音仕様", capacity: 12 },
  {
    name: "ワークショップルーム",
    unit: 60,
    info: "可動式テーブル・ホワイトボード有り",
    capacity: 24,
  },
);
scheduleEquipment["プロジェクター"].push(
  { name: "プロジェクターC", unit: 30, info: "フルHD・HDMI対応" },
  { name: "プロジェクターD", unit: 60, info: "高輝度・無線接続対応" },
  { name: "モバイルプロジェクターA", unit: 30, info: "バッテリー内蔵・持ち運び用" },
  { name: "モバイルプロジェクターB", unit: 30, info: "小型・USB-C対応" },
  { name: "短焦点プロジェクター", unit: 60, info: "狭い会場向け・壁面投影対応" },
  { name: "イベント用プロジェクター", unit: 120, info: "大ホール向け・スクリーン付属" },
);
scheduleEquipment["車両"].push(
  { name: "営業車C", unit: 60, info: "ハイブリッド車・定員5名" },
  { name: "営業車D", unit: 60, info: "電気自動車・定員5名" },
  { name: "営業車E", unit: 120, info: "ミニバン・定員7名" },
  { name: "軽自動車B", unit: 60, info: "市内移動用・定員4名" },
  { name: "配送用バンB", unit: 120, info: "荷物運搬用・定員3名" },
  { name: "送迎用ワゴン", unit: 120, info: "イベント送迎用・定員10名" },
);
scheduleEquipment["モニター"].push(
  { name: "モニターD", unit: 30, info: "24インチ・HDMI対応" },
  { name: "モニターE", unit: 30, info: "27インチ・4K対応" },
  { name: "モニターF", unit: 60, info: "43インチ・移動式" },
  { name: "モニターG", unit: 60, info: "65インチ・会議用" },
  { name: "ポータブルモニターA", unit: 30, info: "15.6インチ・USB-C対応" },
  { name: "ポータブルモニターB", unit: 30, info: "17インチ・持ち運び用" },
  { name: "タッチパネルモニター", unit: 60, info: "55インチ・電子ホワイトボード対応" },
);
scheduleEquipment["面談室"].push(
  { name: "面談室D", unit: 30, info: "防音・オンライン面談対応", capacity: 2 },
  { name: "面談室E", unit: 30, info: "採用面談向け・モニター有り", capacity: 3 },
  { name: "面談室F", unit: 60, info: "テーブル・ホワイトボード有り", capacity: 4 },
  { name: "面談室G", unit: 30, info: "1on1向け・電源有り", capacity: 2 },
  { name: "面談室H", unit: 60, info: "グループ面談向け", capacity: 6 },
  {
    name: "オンライン面談ブースA",
    unit: 30,
    info: "個室・Webカメラとヘッドセット付属",
    capacity: 1,
  },
  { name: "オンライン面談ブースB", unit: 30, info: "個室・モニターとマイク付属", capacity: 1 },
);
// Uneven inventory sizes for a more realistic category list.
scheduleEquipment["会議室"].push(
  { name: "ブレストルーム", unit: 30, info: "可動式ホワイトボード・ソファ有り", capacity: 6 },
  { name: "多目的ホール", unit: 120, info: "ステージ・音響設備有り", capacity: 50 },
);
scheduleEquipment["プロジェクター"].splice(7);
scheduleEquipment["車両"].splice(6);
scheduleEquipment["モニター"].splice(9);
scheduleEquipment["面談室"].splice(8);
scheduleEquipment["プロジェクター"].push({
  name: "ミニプロジェクター（15分単位）",
  unit: 15,
  info: "短時間の資料確認・動作テスト用",
});
const demoTitles = {
  会議室: [
    "企画会議",
    "営業定例会議",
    "新サービスの要件確認",
    "プロジェクト進捗共有",
    "新人研修",
    "四半期レビュー",
    "デザインレビュー",
    "オンライン商談",
  ],
  プロジェクター: [
    "研修資料の投影",
    "製品デモの準備",
    "社内勉強会",
    "提案資料のレビュー",
    "採用説明会",
    "顧客向けプレゼンテーション",
  ],
  車両: [
    "お客様先への訪問",
    "展示会備品の搬入",
    "営業同行",
    "支店への資料配送",
    "取引先との打ち合わせ",
  ],
  モニター: [
    "資料レビュー",
    "ダッシュボードの確認",
    "オンライン研修",
    "デザイン確認",
    "開発チームの画面共有",
  ],
  面談室: ["採用面談", "キャリア相談", "1on1ミーティング", "入社前面談", "目標設定の振り返り"],
};
function demoHash(value) {
  let n = 0;
  for (const c of value) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n;
}
const demoOwnBookingCandidates = new Map();
function demoOwnBookingLimit(date) {
  const day = new Date(date + "T00:00:00");
  const index = (day.getDay() + 6) % 7;
  const monday = new Date(day);
  monday.setDate(day.getDate() - index);
  let seed = demoHash(key(monday) + "|quiet-days");
  const days = Array.from({ length: 7 }, (_, i) => i);
  for (let i = days.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [days[i], days[j]] = [days[j], days[i]];
  }
  if (days.slice(0, 3).includes(index)) return 0;
  return 1 + (demoHash(date + "|personal-booking-limit") % 5);
}
function addDemoBooking(b) {
  if (b.own) {
    if (!demoOwnBookingLimit(b.date)) {
      appendDemoBooking(otherDemoBooking(b));
      return;
    }
    if (!demoOwnBookingCandidates.has(b.date)) demoOwnBookingCandidates.set(b.date, []);
    demoOwnBookingCandidates.get(b.date).push(b);
    return;
  }
  appendDemoBooking(b);
}
function otherDemoBooking(b) {
  return {
    ...b,
    own: false,
    person: demoPeople[demoMixScore(b.date + b.equipment + b.from) % demoPeople.length],
  };
}
function appendDemoBooking(b) {
  // Thin individual demo events, independently of weekday, category and time band.
  // Stable scores keep the same scattered gaps after reloading or changing views.
  if (!b.own && demoMixScore(`${b.date}|${b.equipment}|${b.from}|${b.to}|sparse`) % 100 < 50)
    return;
  scheduleBookings.push(b);
  const r = {
    name: b.equipment,
    date: b.date,
    from: scheduleTime(b.from),
    to: scheduleTime(b.to),
    title: b.title,
    person: b.person,
    notes: b.notes,
    booking: b,
  };
  b.row = r;
  reservations.push(r);
  if (b.own) mine.push(r);
}
mine.length = 0;
reservations.length = 0;
scheduleBookings.length = 0;
scheduleBlocked.length = 0;
seededScheduleDays.clear();
seedSchedule = function (category, date) {
  if (date < reservationMinimumDate) return;
  const seedKey = category + "|" + date;
  if (seededScheduleDays.has(seedKey)) return;
  seededScheduleDays.add(seedKey);
  const day = new Date(date + "T00:00:00"),
    weekday = day.getDay();
  if (category === "管理職予定") {
    seedManagerDemo(date, weekday);
    return;
  }
  if (weekday === 0 || weekday === 6) {
    for (const e of scheduleEquipment[category])
      scheduleBlocked.push({
        category,
        date,
        equipment: e.name,
        from: reservationClosingMinute(date),
        to: scheduleEnd,
      });
  }
  const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
  let tuesdayCount = 0;
  for (
    let d = new Date(monthStart);
    d.getMonth() === monthStart.getMonth();
    d.setDate(d.getDate() + 1)
  )
    if (d.getDay() === 2 && demoOwnBookingLimit(key(d)) > 0) tuesdayCount++;
  scheduleEquipment[category].forEach((e, index) => {
    const hash = demoHash(date + "|" + e.name);
    const planned = [];
    if (hash % 7 === 0)
      scheduleBlocked.push({
        category,
        date,
        equipment: e.name,
        from: scheduleStart,
        to: scheduleStart + e.unit,
      });
    if (e.name === "第1会議室" && weekday === 2) {
      const b = {
        category,
        date,
        equipment: e.name,
        from: 780,
        to: 840,
        title: "企画チーム定例会議",
        own: true,
        person: "自分",
        department: "企画部",
        notes: "進捗共有と次週のタスク確認。オンライン参加あり。",
        seriesId: "demo-weekly-" + date.slice(0, 7),
        repeat: {
          frequency: "weekly",
          interval: 1,
          days: [1],
          mode: "count",
          count: tuesdayCount,
          end: key(new Date(day.getFullYear(), day.getMonth() + 1, 0)),
        },
      };
      addDemoBooking(b);
      planned.push(b);
    }
    const blocked = scheduleBlocked.filter((b) => b.date === date && b.equipment === e.name);
    denseDemoSlots(date, e, scheduleStart, reservationClosingMinute(date), [
      ...planned,
      ...blocked,
    ]).forEach(({ from, to }, part) => {
      const score = demoMixScore(date + e.name + from);
      const own = score % 5 === 0;
      const titles = demoTitles[category];
      const b = {
        category,
        date,
        equipment: e.name,
        from,
        to,
        title: titles[(score + part + index) % titles.length],
        own,
        person: own ? "自分" : demoPeople[(score >>> 4) % demoPeople.length],
        department: own ? "企画部" : ["営業部", "開発部", "人事部", "総務部"][score % 4],
        notes: [
          "資料は共有フォルダーにあります。",
          "開始10分前に準備します。",
          "オンライン参加者あり。",
          "",
        ][score % 4],
      };
      addDemoBooking(b);
      planned.push(b);
    });
  });
};
// Seed all categories before choosing personal bookings, so inventory order cannot bias the day.
const seedDemoCategory = seedSchedule;
const seededDemoDates = new Set();
function demoMixScore(value) {
  let n = demoHash(value);
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return (n ^ (n >>> 16)) >>> 0;
}
seedSchedule = function (category, date) {
  if (date < reservationMinimumDate || seededDemoDates.has(date)) return;
  for (const name of Object.keys(scheduleEquipment)) seedDemoCategory(name, date);
  const candidates = demoOwnBookingCandidates.get(date) || [];
  const categories = [...new Set(candidates.map((b) => b.category))].sort(
    (a, b) => demoMixScore(date + "|" + a) - demoMixScore(date + "|" + b),
  );
  // Occasional personal management bookings stay within the existing daily limit.
  if (categories.includes("管理職予定")) {
    categories.splice(categories.indexOf("管理職予定"), 1);
    categories.unshift("管理職予定");
  }
  const ranked = candidates.sort(
    (a, b) =>
      demoMixScore(date + "|" + a.equipment + "|" + a.from) -
      demoMixScore(date + "|" + b.equipment + "|" + b.from),
  );
  const selected = [];
  const limit = demoOwnBookingLimit(date);
  for (const booking of ranked.filter((b) => b.category === "管理職予定")) {
    if (selected.length >= managerOwnBookingLimit(date)) break;
    selected.push(booking);
  }
  // First distribute across categories, then fill any remaining places from the shuffled candidates.
  for (const name of categories) {
    if (selected.length >= limit) break;
    if (selected.some((b) => b.category === name)) continue;
    selected.push(ranked.find((b) => b.category === name));
  }
  for (const booking of ranked) {
    if (selected.length >= limit) break;
    if (!selected.includes(booking)) selected.push(booking);
  }
  selected.forEach(appendDemoBooking);
  for (const booking of ranked) {
    if (!selected.includes(booking)) appendDemoBooking(otherDemoBooking(booking));
  }
  demoOwnBookingCandidates.delete(date);
  seededDemoDates.add(date);
};
const demoMonths = new Set(["2026-09", "2026-10", "2026-11"]);
const demoToday = new Date();
for (let offset = -1; offset <= 1; offset++) {
  const d = new Date(demoToday.getFullYear(), demoToday.getMonth() + offset, 1);
  demoMonths.add(key(d).slice(0, 7));
}
for (const value of [...demoMonths].sort()) {
  const [y, m] = value.split("-").map(Number),
    last = new Date(y, m, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const date = value + "-" + String(day).padStart(2, "0");
    for (const category of Object.keys(scheduleEquipment)) seedSchedule(category, date);
  }
}
reservations.sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
mine.sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
render();
search();
