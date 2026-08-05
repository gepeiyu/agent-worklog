export const DEFAULT_LANGUAGE = "zh-CN";

export const LANGUAGE_CHOICES = [
  { name: "简体中文", value: "zh-CN", summaryLanguage: "Simplified Chinese" },
  { name: "日本語", value: "ja-JP", summaryLanguage: "Japanese" },
  { name: "English", value: "en", summaryLanguage: "English" }
];

const SUPPORTED_LANGUAGES = new Set(LANGUAGE_CHOICES.map(({ value }) => value));

const SUMMARY_INSTRUCTIONS = {
  "zh-CN": [
    "在结束本轮之前，用简体中文写一句简洁摘要，只描述本轮实际完成的工作。",
    "将摘要放在最终回复的最末尾，并严格使用以下 HTML 注释格式：",
    "<!-- agent-worklog-summary: 用简体中文写的摘要 -->",
    "不要让脚本编造摘要，也不要写入计划中但尚未完成的工作。"
  ].join(" "),
  "ja-JP": [
    "このターンを終了する前に、実際に完了した作業だけを簡潔な一文の日本語で要約してください。",
    "最終回答の末尾に、次の HTML コメント形式で記載してください：",
    "<!-- agent-worklog-summary: 日本語の要約 -->",
    "スクリプトに要約を作らせたり、未完了の予定を含めたりしないでください。"
  ].join(" "),
  en: [
    "Before finishing this turn, write a concise one-sentence summary in English of the work you actually completed.",
    "Place it at the very end of your final response in this exact HTML comment format:",
    "<!-- agent-worklog-summary: your English summary -->",
    "Do not ask a script to invent the summary, and do not include planned but unfinished work."
  ].join(" ")
};

export function validateLanguage(language) {
  if (!SUPPORTED_LANGUAGES.has(language)) {
    throw new Error(`Unsupported language: ${language}. Use zh-CN, ja-JP, or en`);
  }
  return language;
}

export function getSummaryInstruction(language = DEFAULT_LANGUAGE) {
  return SUMMARY_INSTRUCTIONS[validateLanguage(language)];
}

export function getSummaryLanguageName(language = DEFAULT_LANGUAGE) {
  const selected = LANGUAGE_CHOICES.find((choice) => choice.value === validateLanguage(language));
  return selected.summaryLanguage;
}
