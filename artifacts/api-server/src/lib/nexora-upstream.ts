import type { Request, Response } from "express";

type HttpMethod = "GET" | "POST";

export class IntegrationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationUnavailableError";
  }
}

type Envelope = {
  data: unknown;
  source: "live";
  lastUpdated: string;
  provider?: string;
};

function privateBaseUrl(name: string) {
  const value = process.env[name]?.trim().replace(/\/+$/, "");
  if (!value) {
    throw new IntegrationUnavailableError(
      `A integração ${name} ainda não está configurada no servidor.`,
    );
  }
  return value;
}

function bearerHeader(name: string) {
  const token = process.env[name]?.trim();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function readBody(response: globalThis.Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function callPrivateService(
  baseUrlEnv: string,
  tokenEnv: string,
  path: string,
  method: HttpMethod,
  body?: unknown,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${privateBaseUrl(baseUrlEnv)}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...bearerHeader(tokenEnv),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await readBody(response);

    if (!response.ok) {
      const detail =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: unknown }).message)
          : `O serviço respondeu com HTTP ${response.status}.`;
      const error = new Error(detail);
      Object.assign(error, { status: response.status });
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function envelope(data: unknown, provider?: string): Envelope {
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    "source" in data
  ) {
    const candidate = data as Record<string, unknown>;
    return {
      data: candidate.data,
      source: "live",
      lastUpdated:
        typeof candidate.lastUpdated === "string"
          ? candidate.lastUpdated
          : new Date().toISOString(),
      ...(provider ? { provider } : {}),
    };
  }

  return {
    data,
    source: "live",
    lastUpdated: new Date().toISOString(),
    ...(provider ? { provider } : {}),
  };
}

export async function proxyNexora(
  request: Request,
  response: Response,
  path: string,
  method: HttpMethod = "GET",
  body?: unknown,
) {
  try {
    const data = await callPrivateService(
      "NEXORA_BACKEND_URL",
      "NEXORA_BACKEND_TOKEN",
      path,
      method,
      body,
    );
    response.json(envelope(data, "nexora"));
  } catch (error) {
    if (error instanceof IntegrationUnavailableError) {
      response.status(503).json({
        code: "BACKEND_UNAVAILABLE",
        message: error.message,
      });
      return;
    }
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 502;
    response.status(status).json({
      code: "BACKEND_ERROR",
      message: error instanceof Error ? error.message : "Falha no backend NEXORA.",
    });
  }
}

export async function proxyIntelligence(
  request: Request,
  response: Response,
  body: unknown,
) {
  try {
    const data = await callPrivateService(
      "N8N_ORCHESTRATOR_URL",
      "N8N_ORCHESTRATOR_TOKEN",
      "",
      "POST",
      body,
    );
    const candidate =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : {};
    const nested =
      candidate.data && typeof candidate.data === "object"
        ? (candidate.data as Record<string, unknown>)
        : {};
    const answer =
      (typeof candidate.answer === "string" && candidate.answer) ||
      (typeof candidate.text === "string" && candidate.text) ||
      (typeof nested.answer === "string" && nested.answer) ||
      (typeof nested.text === "string" && nested.text) ||
      (typeof data === "string" && data);

    if (!answer) {
      response.status(502).json({
        code: "ORCHESTRATOR_INVALID_RESPONSE",
        message: "O Orquestrador Central não devolveu uma resposta legível.",
      });
      return;
    }

    response.json({
      data: {
        answer,
        metadata: candidate.metadata ?? nested.metadata ?? null,
      },
      source: "live",
      provider: "n8n",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof IntegrationUnavailableError) {
      response.status(503).json({
        code: "ORCHESTRATOR_UNAVAILABLE",
        message: "O Orquestrador Central de IA está indisponível.",
      });
      return;
    }
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 502;
    response.status(status).json({
      code: "ORCHESTRATOR_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Falha ao contactar o Orquestrador Central.",
    });
  }
}