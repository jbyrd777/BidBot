/**
 * The outside services the team runs on. Each is optional and switched on by its key, so a company
 * can start with chat and add computers, apps, email and phone as it grows. Keys never leave the server.
 */
export interface Provider {
  key: string;
  name: string;
  does: string;
  env: string[];
}

export const PROVIDERS: Provider[] = [
  { key: "model", name: "Language model", does: "Lets the bots hold a full conversation and choose their own tools. Any OpenAI compatible provider works.", env: ["MODEL_API_KEY", "MODEL_NAME"] },
  { key: "computers", name: "Cloud computers", does: "A computer for each bot, with screens you can watch live and take over.", env: ["COMPUTER_API_KEY"] },
  { key: "apps", name: "Connected apps", does: "Sign in to email, calendars, drives, CRMs, accounting and bid platforms, with several accounts each.", env: ["CONNECTOR_API_KEY"] },
  { key: "memory", name: "Long term memory", does: "Keeps what the bots learn across months, on every channel. Until it is set, memory lives in this app.", env: ["MEMORY_API_KEY"] },
  { key: "mail", name: "Bot email address", does: "Gives the main bot its own address. Email it a task and it emails back when done.", env: ["MAIL_API_KEY", "MAIL_DOMAIN"] },
  { key: "phone", name: "Phone number", does: "Text or call the main bot like a person. It texts you the results.", env: ["PHONE_API_KEY"] },
  { key: "slack", name: "Slack", does: "Add the team to your Slack. They answer when mentioned.", env: ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"] },
];

export function configured(p: Provider) {
  return p.env.every((e) => !!process.env[e]);
}

export function providerOn(key: string) {
  const p = PROVIDERS.find((x) => x.key === key);
  return p ? configured(p) : false;
}
