export interface SelectOption {
  label: string;
  value: string;
}

export const CHECKLIST_GIF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/90e85308635064b3d0fdaa9c220b8547a9467a10affe3cf22f06ad6b26fbf0a1.gif";

export const DEFAULT_UPLOAD_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/67bba604a31cc7e116124f92179d8fe06317fcf70a3c62f071dff529362ebc25.png";

export const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { label: "DD MMM", value: "DD MMM" },
  { label: "MM-DD-YYYY", value: "MM-DD-YYYY" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "MMMM DD, YYYY", value: "MMMM DD, YYYY" },
  { label: "MMM DD, YYYY", value: "MMM DD, YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
  { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
  { label: "YYYY/MM/DD", value: "YYYY/MM/DD" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "YYYY.MM.DD", value: "YYYY.MM.DD" },
  { label: "DD.MM.YYYY", value: "DD.MM.YYYY" },
  { label: "MM.DD.YYYY", value: "MM.DD.YYYY" },
  { label: "DD MMMM YYYY", value: "DD MMMM YYYY" },
  { label: "DD MMM YYYY", value: "DD MMM YYYY" },
  { label: "YYYYMMDD", value: "YYYYMMDD" },
  { label: "DDMMYYYY", value: "DDMMYYYY" },
  { label: "MMDDYYYY", value: "MMDDYYYY" },
  { label: "MMM - DD - YYYY", value: "DEFAULT" },
  { label: "MMMM DD", value: "MMMM DD" },
  { label: "DD MMMM", value: "DD MMMM" },
  { label: "MMM DD", value: "MMM DD" },
];

export const PROMPT_OPTIONS: SelectOption[] = [
  { label: "Prompt", value: "prompt" },
  { label: "System Prompt", value: "system-prompt" },
];

export const AI_OPTIONS: SelectOption[] = [
  { value: "openai/gpt/4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "openai/gpt/o1-mini", label: "OpenAI GPT-o1 Mini" },
  { value: "openai/gpt/o3-mini", label: "OpenAI GPT-o3 Mini" },
  { value: "meta/llama3.1/405b", label: "Meta LLaMA 3.1 405B" },
  { value: "01ai/yi/large", label: "01.AI Yi Large" },
  { value: "xai/grok/2", label: "xAI Grok 2" },
  { value: "openai/gpt/4o", label: "OpenAI GPT-4o" },
  { value: "anthropic/claude3.5/sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "anthropic/claude3.5/haiku", label: "Anthropic Claude 3.5 Haiku" },
  { value: "anthropic/claude3.7/sonnet", label: "Anthropic Claude 3.7 Sonnet" },
  { value: "apologist/aquinas/v4", label: "Apologist Aquinas v4" },
  { value: "mistral/mixtral/8x22b", label: "Mistral Mixtral 8x22B" },
  { value: "mistral/mixtral/8x7b", label: "Mistral Mixtral 8x7B" },
  { value: "mistral/small/24b", label: "Mistral Small 24B" },
  { value: "alibaba/qwen2.5/72b", label: "Alibaba Qwen 2.5 72B" },
  { value: "alibaba/qwen2.5/32b", label: "Alibaba Qwen 2.5 32B" },
  { value: "microsoft/wizardlm/8x22b", label: "Microsoft WizardLM 8x22B" },
  { value: "deepseek/deepseek/v3", label: "DeepSeek v3" },
  { value: "deepseek/deepseek/r1", label: "DeepSeek R1" },
  { value: "google/gemma/9b", label: "Google Gemma 9B" },
  { value: "meta/llama3.3/70b-specdec", label: "Meta LLaMA 3.3 70B SpecDec" },
  {
    value: "meta/llama3.3/70b-versatile",
    label: "Meta LLaMA 3.3 70B Versatile",
  },
];
