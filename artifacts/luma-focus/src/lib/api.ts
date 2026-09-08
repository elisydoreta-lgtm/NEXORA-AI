export type ApiEnvelope<T> = {
  data: T;
  source: "live" | "demo";
  lastUpdated: string;
  provider?: string;
};

export type ApiFailure = {
  code?: string;
  message?: string;
};

export type Metric = {
  label: string;
  value: string;
  change: string;
  trend?: "up" | "down" | "neutral";
  note: string;
};

export type Overview = {
  company: { name: string; userName: string; initials: string; role: string };
  metrics: Metric[];
  revenue: { label: string; revenue: number; expenses: number }[];
  summary: { title: string; text: string; emphasis?: string };
  receivables: { total: number; openTitles: number; dueToday: number; onTimePercent: number };
  stockCritical: { count: number; lastReview?: string };
  alerts: { id: string; severity: "info" | "warning" | "critical"; title: string; detail: string }[];
};

export type Customer = {
  id: string;
  name: string;
  initials: string;
  status: string;
  opportunity: number;
  next: string;
  since?: string;
};

export type CustomersResponse = { items: Customer[]; total: number };

export type Sales = {
  funnel: { label: string; value: number; percent: number }[];
  products: { name: string; orders: number; sharePercent: number }[];
  orders: { id: string; customer: string; item: string; amount: number; status: string }[];
};

export type Finance = {
  metrics: Metric[];
  cashFlow: { label: string; income: number; expenses: number }[];
  alerts: { severity: "info" | "warning" | "critical"; title: string; detail: string }[];
  entries: { date: string; description: string; amount: number; type: string; status: string }[];
};

export type StockItem = { id: string; name: string; quantity: number; minimum: number; unit: string; approvalId?: string };
export type Supplier = { id: string; name: string; category: string; orders: number; status: string };
export type Alert = { id: string; severity: "info" | "warning" | "critical"; title: string; detail: string; acknowledged: boolean };
export type Approval = { id: string; title: string; detail: string; amount: string; kind: string; status: "pending" | "approved" | "rejected"; createdAt?: string; decidedAt?: string };
export type Intelligence = { answer: string; metadata?: unknown };

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/nexora${path}`, {
    credentials: "include",
    headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
    ...init,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiFailure | null;
  if (!response.ok) {
    const error = payload as ApiFailure | null;
    throw new ApiRequestError(
      error?.message ?? "Não foi possível obter dados da operação.",
      response.status,
      error?.code,
    );
  }
  return payload as ApiEnvelope<T>;
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}