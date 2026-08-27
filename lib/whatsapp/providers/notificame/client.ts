const BASE_V1 = "https://api.notificame.com.br/v1";
const BASE_V2 = "https://api.notificame.com.br/v2";

export class NotificaMeApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "NotificaMeApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: unknown;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(
  base: string,
  path: string,
  accountToken: string,
  opts: RequestOptions = {},
): Promise<unknown> {
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Token": accountToken,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const json = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new NotificaMeApiError(
      `NotificaMe API respondeu ${res.status} em ${path}`,
      res.status,
      json ?? text,
    );
  }

  return json;
}

/** Cliente HTTP fino para a API da NotificaMe Hub (docs: app.notificame.com.br/docs/#/devs). */
export const notificameClient = {
  v1: (path: string, accountToken: string, opts?: RequestOptions) =>
    request(BASE_V1, path, accountToken, opts),
  v2: (path: string, accountToken: string, opts?: RequestOptions) =>
    request(BASE_V2, path, accountToken, opts),
};
