const LANGUAGE_STORAGE_KEY = "agent-worklog-language";
const SUPPORTED_LANGUAGES = new Set(["zh-CN", "ja-JP", "en"]);
const TIME_LOCALES = { "zh-CN": "zh-CN", "ja-JP": "ja-JP", en: "en-GB" };

const messages = {
  "zh-CN": {
    language: "语言",
    localWorklog: "本地工作记录",
    filterAria: "记录筛选",
    date: "日期",
    platform: "平台",
    allPlatforms: "全部平台",
    project: "项目",
    allProjects: "全部项目",
    applyFilters: "应用筛选",
    metricsAria: "汇总统计",
    records: "记录",
    totalDuration: "总耗时",
    totalPoints: "总点数",
    dailyPoints: "当日总点数",
    reallocate: "重新分摊",
    projectSubtotal: "项目小计",
    turns: "轮次",
    duration: "耗时",
    points: "点数",
    workRecords: "工作记录",
    dataFileTitle: "JSONL 数据文件",
    timeRange: "时间段",
    summary: "摘要",
    status: "状态",
    emptyState: "所选日期没有记录",
    missingSummary: "Agent 未提供摘要",
    "status.completed": "已完成",
    "status.completed-missing-summary": "缺少摘要",
    "status.running": "进行中",
    "status.interrupted": "已中断",
    "status.aborted": "已取消",
    "status.error": "失败",
    allocatedPoints: "已重新分配 {points} 点",
    requestFailed: "请求失败：{message}",
    errorTotalRequired: "请输入当日总点数",
    errorNoRecords: "当前筛选条件下没有可分配点数的记录",
    errorNonNegative: "总点数必须是非负数",
    errorHalfPoint: "总点数必须是 0.5 的倍数",
    errorTooLarge: "总点数过大",
    errorPositiveDuration: "记录耗时必须大于零",
    errorInvalidDate: "日期必须是有效的 YYYY-MM-DD 日期",
    hoursMinutes: "{hours}小时 {minutes}分钟",
    minutes: "{minutes}分钟",
    seconds: "{seconds}秒"
  },
  "ja-JP": {
    language: "言語",
    localWorklog: "ローカル作業記録",
    filterAria: "記録フィルター",
    date: "日付",
    platform: "プラットフォーム",
    allPlatforms: "すべてのプラットフォーム",
    project: "プロジェクト",
    allProjects: "すべてのプロジェクト",
    applyFilters: "フィルターを適用",
    metricsAria: "集計",
    records: "記録",
    totalDuration: "合計時間",
    totalPoints: "合計ポイント",
    dailyPoints: "当日の合計ポイント",
    reallocate: "再配分",
    projectSubtotal: "プロジェクト別小計",
    turns: "タスク数",
    duration: "所要時間",
    points: "ポイント",
    workRecords: "作業記録",
    dataFileTitle: "JSONL データファイル",
    timeRange: "時間帯",
    summary: "概要",
    status: "ステータス",
    emptyState: "選択した日付の記録はありません",
    missingSummary: "Agent による概要なし",
    "status.completed": "完了",
    "status.completed-missing-summary": "概要なし",
    "status.running": "進行中",
    "status.interrupted": "中断",
    "status.aborted": "キャンセル",
    "status.error": "失敗",
    allocatedPoints: "{points} ポイントを再配分しました",
    requestFailed: "リクエストに失敗しました：{message}",
    errorTotalRequired: "当日の合計ポイントを入力してください",
    errorNoRecords: "現在のフィルター条件に配分可能な記録がありません",
    errorNonNegative: "合計ポイントは 0 以上で入力してください",
    errorHalfPoint: "合計ポイントは 0.5 単位で入力してください",
    errorTooLarge: "合計ポイントが大きすぎます",
    errorPositiveDuration: "記録の所要時間は 0 より大きい必要があります",
    errorInvalidDate: "有効な YYYY-MM-DD 形式の日付を入力してください",
    hoursMinutes: "{hours}時間 {minutes}分",
    minutes: "{minutes}分",
    seconds: "{seconds}秒"
  },
  en: {
    language: "Language",
    localWorklog: "Local worklog",
    filterAria: "Record filters",
    date: "Date",
    platform: "Platform",
    allPlatforms: "All platforms",
    project: "Project",
    allProjects: "All projects",
    applyFilters: "Apply filters",
    metricsAria: "Summary metrics",
    records: "Records",
    totalDuration: "Total duration",
    totalPoints: "Total points",
    dailyPoints: "Daily total points",
    reallocate: "Reallocate",
    projectSubtotal: "Project subtotals",
    turns: "Tasks",
    duration: "Duration",
    points: "Points",
    workRecords: "Work records",
    dataFileTitle: "JSONL data file",
    timeRange: "Time range",
    summary: "Summary",
    status: "Status",
    emptyState: "No records for the selected date",
    missingSummary: "No summary provided by the agent",
    "status.completed": "Completed",
    "status.completed-missing-summary": "Missing summary",
    "status.running": "In progress",
    "status.interrupted": "Interrupted",
    "status.aborted": "Cancelled",
    "status.error": "Failed",
    allocatedPoints: "Reallocated {points} points",
    requestFailed: "Request failed: {message}",
    errorTotalRequired: "Enter the daily total points",
    errorNoRecords: "No records in the current filter can receive points",
    errorNonNegative: "Total points must be a non-negative number",
    errorHalfPoint: "Total points must be a multiple of 0.5",
    errorTooLarge: "Total points is too large",
    errorPositiveDuration: "Record duration must be greater than zero",
    errorInvalidDate: "Enter a valid date in YYYY-MM-DD format",
    hoursMinutes: "{hours}h {minutes}m",
    minutes: "{minutes}m",
    seconds: "{seconds}s"
  }
};

const elements = {
  filterForm: document.querySelector("#filter-form"),
  pointsForm: document.querySelector("#points-form"),
  language: document.querySelector("#language"),
  date: document.querySelector("#date"),
  platform: document.querySelector("#platform"),
  project: document.querySelector("#project"),
  pointTotal: document.querySelector("#point-total"),
  recordCount: document.querySelector("#record-count"),
  totalDuration: document.querySelector("#total-duration"),
  totalPoints: document.querySelector("#total-points"),
  projectRows: document.querySelector("#project-rows"),
  recordRows: document.querySelector("#record-rows"),
  emptyState: document.querySelector("#empty-state"),
  tableWrap: document.querySelector(".records-section .table-wrap"),
  dataFile: document.querySelector("#data-file"),
  rangeCaption: document.querySelector("#range-caption"),
  statusMessage: document.querySelector("#status-message")
};

const state = {
  language: "zh-CN",
  metadata: null,
  result: null,
  status: null
};

elements.language.addEventListener("change", () => {
  state.language = elements.language.value;
  saveLanguage(state.language, state.metadata?.languageUpdatedAt ?? null);
  applyLanguage();
});

elements.filterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await refreshRecords();
});

elements.pointsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await allocatePoints();
});

applyLanguage();
await initialize();

async function initialize() {
  try {
    state.metadata = await fetchJson("/api/meta");
    state.language = initialLanguage(state.metadata);
    applyLanguage();
    const today = localDate(new Date());
    elements.date.value = state.metadata.lastDate || today;
    elements.dataFile.textContent = state.metadata.dataDirectory;
    elements.dataFile.title = state.metadata.dataDirectory;
    await refreshRecords();
  } catch (error) {
    showRequestError(error);
  }
}

async function refreshRecords() {
  setBusy(true);
  try {
    const query = new URLSearchParams(currentFilters());
    const result = await fetchJson(`/api/records?${query}`);
    render(result);
    clearStatus();
  } catch (error) {
    showRequestError(error);
  } finally {
    setBusy(false);
  }
}

async function allocatePoints() {
  setBusy(true);
  try {
    const result = await fetchJson("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...currentFilters(), total: elements.pointTotal.value })
    });
    render(result);
    showStatus("allocatedPoints", {
      points: Number(result.allocation.totalPoints).toFixed(1)
    });
  } catch (error) {
    showRequestError(error);
  } finally {
    setBusy(false);
  }
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  elements.language.value = state.language;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  for (const element of document.querySelectorAll("[data-i18n-title]")) {
    element.title = t(element.dataset.i18nTitle);
  }

  if (state.metadata) refreshSelectLabels();
  if (state.result) {
    render(state.result);
  } else {
    elements.totalDuration.textContent = formatDuration(0);
  }
  renderStatus();
}

function refreshSelectLabels() {
  fillSelect(elements.platform, state.metadata.platforms, t("allPlatforms"));
  fillSelect(elements.project, state.metadata.projects, t("allProjects"), projectName);
}

function render(result) {
  state.result = result;
  const { filters, dataFile, records, stats } = result;
  elements.recordCount.textContent = String(stats.completedCount);
  elements.totalDuration.textContent = formatDuration(stats.totalDurationSeconds);
  elements.totalPoints.textContent = Number(stats.totalPoints).toFixed(1);
  if (document.activeElement !== elements.pointTotal) {
    elements.pointTotal.value = Number(stats.totalPoints).toFixed(1);
  }
  elements.rangeCaption.textContent = filters.date;
  elements.dataFile.textContent = dataFile;
  elements.dataFile.title = dataFile;

  elements.projectRows.replaceChildren(
    ...stats.byProject.map((project) => row([
      projectCell(project.projectPath),
      String(project.recordCount),
      formatDuration(project.durationSeconds),
      Number(project.points).toFixed(1)
    ]))
  );

  elements.recordRows.replaceChildren(...records.map(recordRow));
  const isEmpty = records.length === 0;
  elements.emptyState.hidden = !isEmpty;
  elements.tableWrap.hidden = isEmpty;
}

function recordRow(record) {
  const tr = document.createElement("tr");
  tr.append(
    cell(timeRange(record)),
    badgeCell(record.platform, "platform-badge"),
    projectCell(record.projectPath),
    cell(record.summary || t("missingSummary"), "summary-text"),
    cell(record.durationSeconds == null ? "-" : formatDuration(record.durationSeconds), "numeric"),
    cell(record.points == null ? "-" : Number(record.points).toFixed(1), "numeric"),
    statusCell(record.status)
  );
  return tr;
}

function row(values) {
  const tr = document.createElement("tr");
  for (const value of values) {
    tr.append(value instanceof Node ? value : cell(value, "numeric"));
  }
  return tr;
}

function projectCell(projectPath) {
  const td = document.createElement("td");
  const name = document.createElement("div");
  name.textContent = projectName(projectPath);
  const fullPath = document.createElement("div");
  fullPath.className = "secondary";
  fullPath.textContent = projectPath;
  td.append(name, fullPath);
  return td;
}

function badgeCell(value, className) {
  const td = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = value;
  td.append(badge);
  return td;
}

function statusCell(status) {
  const className = status === "completed"
    ? "status-badge"
    : status === "error" || status === "aborted"
      ? "status-badge error"
      : "status-badge warning";
  const key = `status.${status}`;
  return badgeCell(messages[state.language][key] ? t(key) : status, className);
}

function cell(value, className = "") {
  const td = document.createElement("td");
  td.className = className;
  td.textContent = value;
  return td;
}

function currentFilters() {
  return cleanObject({
    date: elements.date.value,
    platform: elements.platform.value,
    project: elements.project.value
  });
}

function fillSelect(select, values, emptyLabel, label = (value) => value) {
  const current = select.value;
  select.replaceChildren(option("", emptyLabel), ...values.map((value) => option(value, label(value))));
  if (values.includes(current)) select.value = current;
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function timeRange(record) {
  const start = new Date(record.startedAt);
  return `${record.date} ${clock(start)}-${record.endedAt ? clock(new Date(record.endedAt)) : "--:--"}`;
}

function clock(date) {
  return new Intl.DateTimeFormat(TIME_LOCALES[state.language], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours) return t("hoursMinutes", { hours, minutes });
  if (minutes) return t("minutes", { minutes });
  return t("seconds", { seconds: total });
}

function projectName(projectPath) {
  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || projectPath;
}

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== ""));
}

function setBusy(busy) {
  for (const element of elements.filterForm.elements) element.disabled = busy;
  for (const element of elements.pointsForm.elements) element.disabled = busy;
}

function showStatus(key, values = {}) {
  state.status = { key, values, error: false };
  renderStatus();
}

function showRequestError(error) {
  state.status = { rawError: error.message, error: true };
  renderStatus();
}

function clearStatus() {
  state.status = null;
  renderStatus();
}

function renderStatus() {
  const status = state.status;
  const message = !status
    ? ""
    : status.rawError
      ? t("requestFailed", { message: localizeApiError(status.rawError) })
      : t(status.key, status.values);
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("error", Boolean(status?.error));
}

function localizeApiError(message) {
  const exactKeys = {
    "total is required": "errorTotalRequired",
    "At least one record is required for point allocation": "errorNoRecords",
    "total points must be a non-negative number": "errorNonNegative",
    "total points must be a multiple of 0.5": "errorHalfPoint",
    "total points is too large": "errorTooLarge"
  };
  if (exactKeys[message]) return t(exactKeys[message]);
  if (/^Record .+ must have a positive duration$/.test(message)) {
    return t("errorPositiveDuration");
  }
  if (/^--date (must use YYYY-MM-DD format|is not a valid calendar date)$/.test(message)) {
    return t("errorInvalidDate");
  }
  return message;
}

function t(key, values = {}) {
  const template = messages[state.language][key] ?? messages.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

function initialLanguage(metadata) {
  const installedLanguage = SUPPORTED_LANGUAGES.has(metadata?.language)
    ? metadata.language
    : "zh-CN";
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return installedLanguage;

    let preference;
    try {
      preference = JSON.parse(raw);
    } catch {
      preference = { language: raw, languageUpdatedAt: null };
    }
    const sameInstallation = !metadata?.languageUpdatedAt ||
      preference.languageUpdatedAt === metadata.languageUpdatedAt;
    if (sameInstallation && SUPPORTED_LANGUAGES.has(preference.language)) {
      return preference.language;
    }
  } catch {
    // Storage can be disabled without preventing the dashboard from loading.
  }
  return installedLanguage;
}

function saveLanguage(language, languageUpdatedAt) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify({
      language,
      languageUpdatedAt
    }));
  } catch {
    // The active page still changes language when persistence is unavailable.
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}
