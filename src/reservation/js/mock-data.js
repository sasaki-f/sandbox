// Deterministic demo data: shared by Home, search, daily and weekly calendars.
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
function addDemoBooking(b) {
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
  if (weekday === 0 || weekday === 6) {
    scheduleEquipment[category].forEach((e) =>
      scheduleBlocked.push({
        category,
        date,
        equipment: e.name,
        from: reservationClosingMinute(date),
        to: scheduleEnd,
      }),
    );
    return;
  }
  const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
  let tuesdayCount = 0;
  for (
    let d = new Date(monthStart);
    d.getMonth() === monthStart.getMonth();
    d.setDate(d.getDate() + 1)
  )
    if (d.getDay() === 2) tuesdayCount++;
  scheduleEquipment[category].forEach((e, index) => {
    const hash = demoHash(date + "|" + e.name);
    const planned = [];
    if (e.unit === 15) {
      for (const [from, to, title, own] of [
        [615, 630, "投影テスト", false],
        [795, 825, "提案資料のレビュー", true],
      ]) {
        addDemoBooking({
          category,
          date,
          equipment: e.name,
          from,
          to,
          title,
          own,
          person: own ? "自分" : "佐藤 太郎",
          department: "企画部",
          notes: "15分単位の設備の表示確認用です。",
        });
      }
      return;
    }
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
    if (hash % 4 === 0) return;
    const windows = [
      { start: 540, end: 720 },
      { start: 780, end: 1020 },
    ];
    windows.forEach((window, part) => {
      if ((hash + part) % 3 === 0) return;
      const possible = [];
      for (let t = scheduleStart; t + e.unit <= window.end; t += e.unit)
        if (t >= window.start) possible.push(t);
      if (!possible.length) return;
      const from = possible[(hash + part * 3) % possible.length];
      const duration = e.unit * (e.unit <= 60 && (hash + part) % 4 === 0 ? 2 : 1);
      const to = Math.min(from + duration, window.end);
      if (to - from < e.unit || planned.some((b) => b.from < to && b.to > from)) return;
      const own = (hash + part) % 5 === 0;
      const titles = demoTitles[category];
      const b = {
        category,
        date,
        equipment: e.name,
        from,
        to,
        title: titles[(hash + part + index) % titles.length],
        own,
        person: own ? "自分" : demoPeople[(hash + part) % demoPeople.length],
        department: own ? "企画部" : ["営業部", "開発部", "人事部", "総務部"][hash % 4],
        notes: [
          "資料は共有フォルダーにあります。",
          "開始10分前に準備します。",
          "オンライン参加者あり。",
          "",
        ][hash % 4],
      };
      addDemoBooking(b);
      planned.push(b);
    });
  });
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
