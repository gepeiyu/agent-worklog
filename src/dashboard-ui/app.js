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
    records: "工作项",
    totalDuration: "总耗时",
    totalPoints: "总点数",
    dailyPoints: "当日总点数",
    reallocate: "重新分摊",
    projectSubtotal: "项目小计",
    sessions: "会话",
    turns: "轮次",
    duration: "耗时",
    points: "点数",
    workRecords: "项目 / 会话汇总",
    dataFileTitle: "JSONL 数据文件",
    timeRange: "时间段",
    summary: "摘要",
    session: "会话 {session}",
    noSession: "无会话 ID",
    turnCount: "{count} 个轮次",
    summaryCount: "{count} 条摘要",
    moreSummaries: "另有 {count} 条，展开查看",
    turnLabel: "轮次 {count}",
    expandSession: "展开会话明细",
    collapseSession: "收起会话明细",
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
    errorNoRecords: "所选日期没有可分配点数的记录",
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
    records: "作業項目",
    totalDuration: "合計時間",
    totalPoints: "合計ポイント",
    dailyPoints: "当日の合計ポイント",
    reallocate: "再配分",
    projectSubtotal: "プロジェクト別小計",
    sessions: "セッション",
    turns: "タスク数",
    duration: "所要時間",
    points: "ポイント",
    workRecords: "プロジェクト / セッション集計",
    dataFileTitle: "JSONL データファイル",
    timeRange: "時間帯",
    summary: "概要",
    session: "セッション {session}",
    noSession: "セッション ID なし",
    turnCount: "{count} ターン",
    summaryCount: "概要 {count} 件",
    moreSummaries: "ほか {count} 件、展開して表示",
    turnLabel: "ターン {count}",
    expandSession: "セッション詳細を展開",
    collapseSession: "セッション詳細を閉じる",
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
    errorNoRecords: "選択した日付に配分可能な記録がありません",
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
    records: "Work items",
    totalDuration: "Total duration",
    totalPoints: "Total points",
    dailyPoints: "Daily total points",
    reallocate: "Reallocate",
    projectSubtotal: "Project subtotals",
    sessions: "Sessions",
    turns: "Tasks",
    duration: "Duration",
    points: "Points",
    workRecords: "Project / session summary",
    dataFileTitle: "JSONL data file",
    timeRange: "Time range",
    summary: "Summary",
    session: "Session {session}",
    noSession: "No session ID",
    turnCount: "{count} turns",
    summaryCount: "{count} summaries",
    moreSummaries: "{count} more, expand to view",
    turnLabel: "Turn {count}",
    expandSession: "Expand session details",
    collapseSession: "Collapse session details",
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
    errorNoRecords: "No records on the selected date can receive points",
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
  status: null,
  expandedWorkItems: new Set()
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
  const { filters, dataFile, records, workItems = legacyWorkItems(records), stats, dailyStats = stats } = result;
  elements.recordCount.textContent = String(workItems.length);
  elements.totalDuration.textContent = formatDuration(stats.totalDurationSeconds);
  elements.totalPoints.textContent = Number(stats.totalPoints).toFixed(1);
  if (document.activeElement !== elements.pointTotal) {
    elements.pointTotal.value = Number(dailyStats.totalPoints).toFixed(1);
  }
  elements.rangeCaption.textContent = filters.date;
  elements.dataFile.textContent = dataFile;
  elements.dataFile.title = dataFile;

  elements.projectRows.replaceChildren(
    ...stats.byProject.map((project) => {
      const projectWorkItems = workItems.filter(
        (workItem) => workItem.projectPath === project.projectPath
      );
      return projectRow(project, projectWorkItems);
    })
  );

  elements.recordRows.replaceChildren(...workItems.flatMap(workItemRows));
  const isEmpty = workItems.length === 0;
  elements.emptyState.hidden = !isEmpty;
  elements.tableWrap.hidden = isEmpty;
}

function workItemRows(workItem) {
  const expanded = state.expandedWorkItems.has(workItem.id);
  const rows = [workItemRow(workItem, expanded)];
  if (expanded) rows.push(...workItem.turns.map((turn, index) => turnRow(turn, index)));
  return rows;
}

function workItemRow(workItem, expanded) {
  const tr = document.createElement("tr");
  tr.className = "work-item-row";
  tr.append(
    workItemTimeCell(workItem, expanded),
    badgeCell(workItem.platform, "platform-badge", "platform"),
    projectCell(workItem.projectPath),
    workItemSummaryCell(workItem),
    cell(
      workItem.durationSeconds == null ? "-" : formatDuration(workItem.durationSeconds),
      "numeric",
      "duration"
    ),
    cell(
      workItem.points == null ? "-" : Number(workItem.points).toFixed(1),
      "numeric",
      "points"
    ),
    statusCell(workItem.status)
  );
  return tr;
}

function workItemTimeCell(workItem, expanded) {
  const td = document.createElement("td");
  td.dataset.label = t("timeRange");
  const wrapper = document.createElement("div");
  wrapper.className = "work-item-time";
  const button = document.createElement("button");
  button.className = "disclosure-button";
  button.type = "button";
  const icon = document.createElement("span");
  icon.className = "disclosure-icon";
  icon.textContent = expanded ? "\u25be" : "\u25b8";
  const count = document.createElement("span");
  count.textContent = String(workItem.turnCount);
  button.append(icon, count);
  button.title = t(expanded ? "collapseSession" : "expandSession");
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-expanded", String(expanded));
  button.addEventListener("click", () => {
    if (expanded) state.expandedWorkItems.delete(workItem.id);
    else state.expandedWorkItems.add(workItem.id);
    render(state.result);
  });
  const range = document.createElement("span");
  range.textContent = timeRange(workItem);
  wrapper.append(button, range);
  td.append(wrapper);
  return td;
}

function workItemSummaryCell(workItem) {
  const td = document.createElement("td");
  td.className = "summary-text";
  td.dataset.label = t("summary");
  const summaries = workItem.summaries ?? (workItem.summary ? [workItem.summary] : []);
  if (summaries.length === 0) {
    const missing = document.createElement("div");
    missing.textContent = t("missingSummary");
    td.append(missing);
  } else {
    const list = document.createElement("ul");
    list.className = "summary-list";
    for (const summaryText of summaries.slice(-3).reverse()) {
      const item = document.createElement("li");
      item.textContent = summaryText;
      list.append(item);
    }
    td.append(list);
    if (summaries.length > 3) {
      const more = document.createElement("div");
      more.className = "secondary more-summaries";
      more.textContent = t("moreSummaries", { count: summaries.length - 3 });
      td.append(more);
    }
  }
  const metadata = document.createElement("div");
  metadata.className = "secondary session-meta";
  const session = workItem.sessionId
    ? t("session", { session: shortId(workItem.sessionId) })
    : t("noSession");
  metadata.textContent = [
    t("turnCount", { count: workItem.turnCount }),
    t("summaryCount", { count: summaries.length }),
    session
  ].join(" \u00b7 ");
  metadata.title = workItem.sessionId || t("noSession");
  td.append(metadata);
  return td;
}

function turnRow(record, index) {
  const tr = document.createElement("tr");
  tr.className = "turn-row";
  tr.append(
    cell(timeRange(record), "turn-time", "timeRange"),
    badgeCell(record.platform, "platform-badge", "platform"),
    turnCell(record, index),
    cell(record.summary || t("missingSummary"), "summary-text", "summary"),
    cell(
      record.durationSeconds == null ? "-" : formatDuration(record.durationSeconds),
      "numeric",
      "duration"
    ),
    cell(
      record.points == null ? "-" : Number(record.points).toFixed(1),
      "numeric",
      "points"
    ),
    statusCell(record.status)
  );
  return tr;
}

function turnCell(record, index) {
  const td = document.createElement("td");
  td.dataset.label = t("turns");
  const label = document.createElement("div");
  label.textContent = t("turnLabel", { count: index + 1 });
  const id = document.createElement("div");
  id.className = "secondary";
  id.textContent = record.turnId ? shortId(record.turnId) : "-";
  id.title = record.turnId || "";
  td.append(label, id);
  return td;
}

function projectSummaryCell(workItems) {
  const td = document.createElement("td");
  td.className = "project-summary-cell";
  td.dataset.label = t("summary");
  for (const workItem of workItems) {
    const item = document.createElement("div");
    item.className = "project-summary-item";
    const label = document.createElement("span");
    label.className = "project-summary-label";
    label.textContent = `${workItem.platform} \u00b7 ${shortId(workItem.sessionId || "-")}`;
    const summary = document.createElement("span");
    summary.textContent = workItem.summary || t("missingSummary");
    item.append(label, summary);
    td.append(item);
  }
  return td;
}

function projectRow(project, workItems) {
  const tr = document.createElement("tr");
  tr.className = "project-row";
  tr.append(
    projectCell(project.projectPath),
    cell(String(workItems.length), "numeric", "sessions"),
    cell(String(project.recordCount), "numeric", "turns"),
    projectSummaryCell(workItems),
    cell(formatDuration(project.durationSeconds), "numeric", "duration"),
    cell(Number(project.points).toFixed(1), "numeric", "points")
  );
  return tr;
}

function legacyWorkItems(records) {
  return records.map((record) => ({
    ...record,
    id: `record:${record.id}`,
    turnCount: 1,
    summaries: record.summary ? [record.summary] : [],
    summaryCount: record.summary ? 1 : 0,
    turns: [record]
  }));
}

function shortId(value) {
  return value.length > 8 ? `${value.slice(0, 8)}\u2026` : value;
}

function projectCell(projectPath) {
  const td = document.createElement("td");
  td.dataset.label = t("project");
  const name = document.createElement("div");
  name.textContent = projectName(projectPath);
  const fullPath = document.createElement("div");
  fullPath.className = "secondary";
  fullPath.textContent = projectPath;
  td.append(name, fullPath);
  return td;
}

function badgeCell(value, className, labelKey = null) {
  const td = document.createElement("td");
  if (labelKey) td.dataset.label = t(labelKey);
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
  return badgeCell(messages[state.language][key] ? t(key) : status, className, "status");
}

function cell(value, className = "", labelKey = null) {
  const td = document.createElement("td");
  td.className = className;
  if (labelKey) td.dataset.label = t(labelKey);
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
  return `${clock(start)}-${record.endedAt ? clock(new Date(record.endedAt)) : "\u2026"}`;
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
