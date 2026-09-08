import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Bot, Building2,
  CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Clock3, FileCheck2, FileText,
  Filter, Home, LayoutGrid, LogOut, Menu, MoreHorizontal, Package, Percent, Plus, RefreshCw,
  Search, Send, Settings, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, Truck, Users, WalletCards,
  X, Zap,
} from "lucide-react";
import {
  apiRequest, ApiRequestError, formatCurrency, type Alert, type Approval, type Customer,
  type CustomersResponse, type Finance, type Intelligence, type Overview, type Sales, type StockItem,
  type Supplier,
} from "@/lib/api";

type PageKey = "dashboard" | "intelligence" | "customers" | "sales" | "finance" | "more";
type Resource<T> = {
  data?: T;
  source?: "live" | "demo";
  lastUpdated?: string;
  loading: boolean;
  error?: ApiRequestError;
  reload: () => void;
};

const navItems: { key: PageKey; label: string; short: string; icon: typeof Home }[] = [
  { key: "dashboard", label: "Dashboard", short: "Início", icon: Home },
  { key: "intelligence", label: "IA", short: "IA", icon: Sparkles },
  { key: "customers", label: "Clientes", short: "Clientes", icon: Users },
  { key: "sales", label: "Vendas", short: "Vendas", icon: ShoppingBag },
  { key: "finance", label: "Finanças", short: "Finanças", icon: CircleDollarSign },
  { key: "more", label: "Mais", short: "Mais", icon: MoreHorizontal },
];

function useResource<T>(path: string, enabled = true): Resource<T> {
  const [resource, setResource] = useState<Omit<Resource<T>, "reload">>({ loading: enabled });
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setResource({ loading: false });
      return;
    }
    let active = true;
    setResource({ loading: true });
    apiRequest<T>(path)
      .then((payload) => {
        if (active) setResource({ data: payload.data, source: payload.source, lastUpdated: payload.lastUpdated, loading: false });
      })
      .catch((error: unknown) => {
        if (active) {
          setResource({
            loading: false,
            error: error instanceof ApiRequestError ? error : new ApiRequestError("Não foi possível ligar ao serviço.", 0),
          });
        }
      });
    return () => { active = false; };
  }, [enabled, path, refreshKey]);

  return { ...resource, reload };
}

function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiRequestError>();
  const run = useCallback(async <T,>(path: string, init: RequestInit) => {
    setPending(true);
    setError(undefined);
    try {
      return await apiRequest<T>(path, init);
    } catch (cause) {
      const failure = cause instanceof ApiRequestError ? cause : new ApiRequestError("Não foi possível concluir a ação.", 0);
      setError(failure);
      throw failure;
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, error, run };
}

function errorText(error?: ApiRequestError) {
  if (!error) return "";
  if (error.status === 503) return "A integração está indisponível. Verifique a configuração do backend.";
  return error.message;
}

function App() {
  const [location, setLocation] = useLocation();
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("nexora-session") === "true");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const overview = useResource<Overview>("/overview", loggedIn && location !== "/login");
  const page = (location === "/" ? "dashboard" : location.slice(1)) as PageKey;
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);
  const handleLogin = () => {
    localStorage.setItem("nexora-session", "true");
    setLoggedIn(true);
    setLocation("/");
  };
  const handleLogout = () => {
    localStorage.removeItem("nexora-session");
    setLoggedIn(false);
    setLocation("/login");
  };

  if (!loggedIn || location === "/login") return <LoginPage onLogin={handleLogin} />;
  const connected = overview.source === "live";
  const company = overview.data?.company;

  return (
    <div className="nexora-shell min-h-[100dvh]">
      <div className="grain" aria-hidden="true" />
      <div className="flex min-h-[100dvh]">
        <Sidebar page={page} onLogout={handleLogout} company={company} />
        <div className="min-w-0 flex-1">
          <Topbar onMenu={() => setMobileMenu(true)} onNotify={() => notify("As notificações estão disponíveis na área Mais.")} />
          <main className="shell-scroll mx-auto max-w-[1480px] px-4 pb-28 pt-5 sm:px-7 lg:px-10 lg:pb-10">
            <DemoBanner connected={connected} loading={overview.loading} />
            <Switch>
              <Route path="/"><DashboardPage resource={overview} onNavigate={setLocation} /></Route>
              <Route path="/intelligence"><IntelligencePage /></Route>
              <Route path="/customers"><CustomersPage notify={notify} /></Route>
              <Route path="/sales"><SalesPage /></Route>
              <Route path="/finance"><FinancePage /></Route>
              <Route path="/more"><MorePage notify={notify} onLogout={handleLogout} /></Route>
              <Route><DashboardPage resource={overview} onNavigate={setLocation} /></Route>
            </Switch>
          </main>
        </div>
      </div>
      <MobileNav page={page} onMenu={() => setMobileMenu(true)} />
      {mobileMenu && <MobileMenu page={page} onClose={() => setMobileMenu(false)} />}
      {toast && <div data-testid="status-toast" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#102a43] px-4 py-3 text-xs font-semibold text-[#eff8f5] shadow-xl lg:bottom-7"><CheckCircle2 size={15} className="text-[#75dec4]" />{toast}</div>}
    </div>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={`group flex items-center gap-2.5 ${compact ? "justify-center" : ""}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#75dec4] text-[#102a43] shadow-[0_5px_14px_rgba(51,174,145,.2)] transition-transform group-hover:rotate-6"><Zap size={18} fill="currentColor" /></span>{!compact && <span><span className="block text-[15px] font-extrabold tracking-[.14em] text-[#edf6f7]">NEXORA</span><span className="block font-mono-app text-[8px] tracking-[.24em] text-[#84a0b2]">BUSINESS OS</span></span>}</Link>;
}

function Sidebar({ page, onLogout, company }: { page: PageKey; onLogout: () => void; company?: Overview["company"] }) {
  return <aside className="hidden w-[244px] shrink-0 flex-col bg-[#102a43] px-4 py-5 text-[#dceaf0] lg:flex"><Logo /><div className="mt-11 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.055] p-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#d7eff0] text-xs font-bold text-[#102a43]">{company?.initials ?? "—"}</div><div className="min-w-0"><p className="truncate text-xs font-bold">{company?.name ?? "Empresa conectada"}</p><p className="mt-0.5 truncate text-[10px] text-[#86a2b1]">{company?.role ?? "Sessão"}</p></div><ChevronDown size={14} className="ml-auto text-[#7896a5]" /></div><p className="mb-2 mt-10 px-3 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#6f8da0]">Operação</p><nav className="space-y-1" aria-label="Navegação principal">{navItems.map((item) => { const Icon = item.icon; const active = page === item.key; return <Link key={item.key} href={item.key === "dashboard" ? "/" : `/${item.key}`} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-colors ${active ? "bg-[#75dec4] text-[#102a43]" : "text-[#a8bfca] hover:bg-white/[.07] hover:text-white"}`}><Icon size={17} strokeWidth={active ? 2.5 : 1.8} /><span>{item.label}</span></Link>; })}</nav><div className="mt-auto space-y-1"><Link href="/more" className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-[#a8bfca] hover:bg-white/[.07] hover:text-white"><Settings size={17} />Definições</Link><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-[#a8bfca] hover:bg-white/[.07] hover:text-white"><LogOut size={17} />Sair</button><div className="mt-4 border-t border-white/10 px-3 pt-4"><p className="font-mono-app text-[9px] leading-relaxed text-[#6f8da0]">NEXORA AI v0.2<br />Dados protegidos por servidor</p></div></div></aside>;
}

function Topbar({ onMenu, onNotify }: { onMenu: () => void; onNotify: () => void }) {
  return <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#dbe5e9]/80 bg-[#eef3f7]/90 px-4 backdrop-blur-md sm:px-7 lg:px-10"><button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-xl text-[#3d5870] hover:bg-[#dfeaed] lg:hidden"><Menu size={20} /></button><div className="hidden items-center gap-2 text-xs text-[#668095] sm:flex"><span className="h-2 w-2 rounded-full bg-[#38b891]" />Dados da operação <span className="text-[#a0b1bc]">/</span> origem confirmada pelo servidor</div><div className="ml-auto flex items-center gap-2.5"><button onClick={() => document.getElementById("global-search")?.focus()} className="hidden h-9 items-center gap-2 rounded-xl border border-[#d8e3e8] bg-[#f7fafb] px-3 text-xs text-[#7890a0] sm:flex"><Search size={15} />Pesquisar</button><button onClick={onNotify} aria-label="Notificações" className="relative grid h-9 w-9 place-items-center rounded-xl border border-[#d8e3e8] bg-[#f7fafb] text-[#49677d] hover:border-[#abd6cb]"><Bell size={16} /></button><div className="grid h-9 w-9 place-items-center rounded-full bg-[#cfe7ea] text-[11px] font-bold text-[#17445b]">••</div></div></header>;
}

function MobileNav({ page, onMenu }: { page: PageKey; onMenu: () => void }) {
  return <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-[#d6e3e7] bg-[#f7fafb]/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">{navItems.map((item) => { const Icon = item.icon; const active = page === item.key; return <Link key={item.key} href={item.key === "dashboard" ? "/" : `/${item.key}`} className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] font-bold transition-colors ${active ? "text-[#16866f]" : "text-[#7890a0]"}`}><Icon size={18} strokeWidth={active ? 2.5 : 1.7} /><span>{item.short}</span></Link>; })}</nav>;
}

function MobileMenu({ page, onClose }: { page: PageKey; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 bg-[#102a43]/40 backdrop-blur-sm lg:hidden" onClick={onClose}><aside className="h-full w-[82%] max-w-[320px] bg-[#102a43] p-5 text-[#e9f3f4]" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><Logo /><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><X size={17} /></button></div><p className="mb-2 mt-12 px-2 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#6f8da0]">Operação</p><nav className="space-y-1">{navItems.map((item) => { const Icon = item.icon; return <Link onClick={onClose} key={item.key} href={item.key === "dashboard" ? "/" : `/${item.key}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${page === item.key ? "bg-[#75dec4] text-[#102a43]" : "text-[#a8bfca]"}`}><Icon size={18} />{item.label}</Link>; })}</nav></aside></div>;
}

function DemoBanner({ connected, loading }: { connected: boolean; loading: boolean }) {
  if (connected) return null;
  return <div data-testid="status-demo-mode" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f0d5a8] bg-[#fff6e8] px-3.5 py-2.5 text-[11px] text-[#8b612c]"><span className="flex items-center gap-2 font-semibold"><span className={`h-1.5 w-1.5 rounded-full bg-[#df954d] ${loading ? "pulse-soft" : ""}`} />{loading ? "A confirmar origem dos dados…" : "Integração indisponível · valores não apresentados"}</span><span className="flex items-center gap-1.5 text-[#a1784b]"><ShieldCheck size={13} />Nenhuma ação é executada sem resposta real</span></div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="stagger-in mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono-app text-[10px] font-bold uppercase tracking-[.18em] text-[#229278]">{eyebrow}</p><h1 className="mt-2 text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold tracking-[-.05em] text-[#142d46]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#668095]">{subtitle}</p></div>{action}</div>;
}

function DataState({ resource, label = "dados" }: { resource: { loading: boolean; error?: ApiRequestError }; label?: string }) {
  if (resource.loading) return <div className="flex items-center gap-2 rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] px-5 py-10 text-xs text-[#78909d]"><RefreshCw size={15} className="animate-spin text-[#29977d]" />A carregar {label}…</div>;
  if (resource.error) return <div role="alert" className="rounded-2xl border border-[#efd2cf] bg-[#fff5f3] px-5 py-10 text-center"><AlertCircle className="mx-auto text-[#b25855]" size={22} /><p className="mt-3 text-sm font-bold text-[#8c4d4b]">Não foi possível carregar {label}</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#a56d69]">{errorText(resource.error)}</p></div>;
  return null;
}

function MetricCard({ metric, icon: Icon, accent = "teal" }: { metric: Overview["metrics"][number]; icon: typeof TrendingUp; accent?: "teal" | "amber" | "blue" | "coral" }) {
  const colors = { teal: "bg-[#e1f4ed] text-[#21816c]", amber: "bg-[#fff0d8] text-[#a86d24]", blue: "bg-[#e4eff9] text-[#38739e]", coral: "bg-[#fbe7e5] text-[#b25855]" };
  return <article className="card-hover rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-4 shadow-[0_2px_8px_rgba(31,70,90,.025)] sm:p-5"><div className="flex items-start justify-between"><div className={`grid h-9 w-9 place-items-center rounded-xl ${colors[accent]}`}><Icon size={17} /></div><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${metric.trend === "down" ? "bg-[#fbe7e5] text-[#bb625d]" : "bg-[#e4f3ed] text-[#27816d]"}`}>{metric.trend === "down" ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}{metric.change}</span></div><p className="mt-5 text-xs font-semibold text-[#668095]">{metric.label}</p><p className="mt-1 text-[clamp(1.3rem,2vw,1.75rem)] font-extrabold tracking-[-.045em] text-[#142d46]">{metric.value}</p><p className="mt-1 text-[10px] text-[#91a3ad]">{metric.note}</p></article>;
}

function DashboardPage({ resource, onNavigate }: { resource: Resource<Overview>; onNavigate: (path: string) => void }) {
  if (resource.loading || resource.error || !resource.data) return <><PageHeading eyebrow="Visão executiva" title="A ligar à sua operação." subtitle="A visão executiva só mostra informação depois de confirmar a origem real dos dados." /><DataState resource={resource} label="a visão executiva" /></>;
  const data = resource.data;
  return <div><PageHeading eyebrow="Visão executiva" title={`Bom dia, ${data.company.userName}.`} subtitle={`O pulso de ${data.company.name}, com dados confirmados pelo backend.`} action={<button onClick={resource.reload} className="soft-button flex items-center gap-2 rounded-xl border border-[#d4e1e6] bg-[#fbfcfc] px-3.5 py-2.5 text-xs font-bold text-[#45657a]"><RefreshCw size={14} />Atualizar visão</button>} /><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} icon={[TrendingUp, ShoppingBag, ArrowDownRight, Percent][index % 4]} accent={["teal", "blue", "amber", "teal"][index % 4] as "teal" | "blue" | "amber"} />)}</section><div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,.8fr)]"><RevenueChart points={data.revenue} /><ExecutiveSummary summary={data.summary} onOpen={() => onNavigate("/intelligence")} /></div><div className="mt-5 grid gap-5 lg:grid-cols-3"><ReceivablesCard value={data.receivables} onOpen={() => onNavigate("/finance")} /><StockCard value={data.stockCritical} onOpen={() => onNavigate("/more")} /><AlertsCard alerts={data.alerts} onOpen={() => onNavigate("/more")} /></div></div>;
}

function RevenueChart({ points }: { points: Overview["revenue"] }) {
  if (!points.length) return <EmptyState title="Sem série financeira" text="O backend não devolveu pontos para este período." />;
  const max = Math.max(...points.flatMap((point) => [point.revenue, point.expenses]), 1);
  const polyline = (key: "revenue" | "expenses") => points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 495},${145 - (point[key] / max) * 125}`).join(" ");
  return <section className="card-hover rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="font-mono-app text-[9px] uppercase tracking-[.16em] text-[#7d96a3]">Performance financeira</p><h2 className="mt-1 text-base font-extrabold text-[#193650]">Receita & despesas</h2></div><div className="flex items-center gap-3 text-[10px] text-[#6f8795]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#2eb18e]" />Receita</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#aec7d7]" />Despesas</span></div></div><svg viewBox="0 0 520 155" className="mt-7 h-[180px] w-full" role="img" aria-label="Gráfico real de receita e despesas"><path d="M0 145H520M0 108H520M0 71H520M0 34H520" stroke="#e4ecef" /><polyline points={polyline("revenue")} fill="none" stroke="#2eb18e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><polyline points={polyline("expenses")} fill="none" stroke="#aec7d7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><g fill="#8da3ae" fontSize="9" fontFamily="Space Mono">{points.slice(0, 5).map((point, index) => <text key={point.label} x={index * 120} y="153">{point.label}</text>)}</g></svg></section>;
}

function ExecutiveSummary({ summary, onOpen }: { summary: Overview["summary"]; onOpen: () => void }) {
  return <section className="relative overflow-hidden rounded-2xl bg-[#163b58] p-5 text-[#eaf6f5] shadow-[0_12px_30px_rgba(20,59,88,.12)] sm:p-6"><p className="flex items-center gap-2 font-mono-app text-[9px] uppercase tracking-[.15em] text-[#75dec4]"><Bot size={15} />NEXORA Intelligence</p><h2 className="relative mt-8 text-xl font-extrabold leading-tight tracking-[-.04em]">{summary.title}</h2><p className="relative mt-4 text-sm leading-relaxed text-[#b8d0d5]">{summary.text} {summary.emphasis && <strong className="font-bold text-[#f7c77e]">{summary.emphasis}</strong>}</p><div className="relative mt-6 border-t border-white/15 pt-4"><p className="flex items-center gap-2 text-[11px] text-[#a9c5cc]"><ShieldCheck size={14} className="text-[#75dec4]" />Sugestão, não execução automática</p><button onClick={onOpen} className="soft-button mt-4 flex items-center gap-2 text-xs font-bold text-[#75dec4]">Explorar com a IA <ChevronRight size={15} /></button></div></section>;
}

function ReceivablesCard({ value, onOpen }: { value: Overview["receivables"]; onOpen: () => void }) {
  return <MiniPanel title="A receber" icon={<WalletCards size={16} />} action="Ver finanças" onOpen={onOpen}><div className="flex items-end justify-between"><div><p className="text-2xl font-extrabold tracking-[-.05em] text-[#193650]">{formatCurrency(value.total)}</p><p className="mt-1 text-[10px] text-[#8a9da7]">em {value.openTitles} títulos abertos</p></div><span className="flex items-center gap-1 text-[10px] font-bold text-[#c26d4e]"><Clock3 size={12} />{value.dueToday} vencem hoje</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#edf1f3]"><div className="h-full rounded-full bg-[#f0b56a]" style={{ width: `${value.onTimePercent}%` }} /></div><div className="mt-2 flex justify-between text-[9px] text-[#8b9ea8]"><span>Em dia {value.onTimePercent}%</span><span>Por acompanhar {100 - value.onTimePercent}%</span></div></MiniPanel>;
}

function StockCard({ value, onOpen }: { value: Overview["stockCritical"]; onOpen: () => void }) {
  return <MiniPanel title="Stock crítico" icon={<Package size={16} />} action="Abrir stock" onOpen={onOpen}><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full border-[5px] border-[#f6c97f] text-xs font-extrabold text-[#9b6b2d]">{value.count}</div><div><p className="text-sm font-bold text-[#193650]">Itens pedem reposição</p><p className="mt-1 text-[10px] text-[#8a9da7]">{value.lastReview ?? "Revisão disponível no backend"}</p></div></div></MiniPanel>;
}

function AlertsCard({ alerts, onOpen }: { alerts: Overview["alerts"]; onOpen: () => void }) {
  return <MiniPanel title="Sinais relevantes" icon={<Activity size={16} />} action="Ver alertas" onOpen={onOpen}><div className="space-y-3">{alerts.slice(0, 3).map((alert) => <div key={alert.id} className="flex items-start gap-2.5"><span className={`mt-1.5 h-2 w-2 rounded-full ${alert.severity === "critical" ? "bg-[#c85f58]" : alert.severity === "warning" ? "bg-[#efa76b]" : "bg-[#35ad8d]"}`} /><p className="text-xs leading-relaxed text-[#536f81]"><strong className="text-[#193650]">{alert.title}</strong> {alert.detail}</p></div>)}</div></MiniPanel>;
}

function MiniPanel({ title, icon, action, onOpen, children }: { title: string; icon: ReactNode; action: string; onOpen: () => void; children: ReactNode }) {
  return <section className="card-hover rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-extrabold text-[#193650]"><span className="text-[#24917a]">{icon}</span>{title}</h2><button onClick={onOpen} className="text-[10px] font-bold text-[#2b9b81] hover:underline">{action}</button></div>{children}</section>;
}

function IntelligencePage() {
  const [messages, setMessages] = useState<{ from: "user" | "ai"; text: string; meta?: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const prompts = ["Como está a saúde financeira?", "O que está a crescer este mês?", "Quais clientes merecem atenção?", "Onde posso proteger a margem?"];
  const submit = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const question = (preset ?? input).trim();
    if (!question || sending) return;
    setMessages((items) => [...items, { from: "user", text: question }]);
    setInput("");
    setSending(true);
    setError("");
    try {
      const result = await apiRequest<Intelligence>("/intelligence", { method: "POST", body: JSON.stringify({ question }) });
      setMessages((items) => [...items, { from: "ai", text: result.data.answer, meta: `Resposta real · ${result.provider ?? "Orquestrador Central"}` }]);
    } catch (cause) {
      setError(errorText(cause instanceof ApiRequestError ? cause : undefined) || "O Orquestrador Central está indisponível.");
    } finally {
      setSending(false);
    }
  };
  return <div><PageHeading eyebrow="NEXORA Intelligence" title="Pergunte ao seu negócio." subtitle="As perguntas seguem para o Orquestrador Central de IA. Nenhuma ação é executada sem a sua aprovação." action={<div className="flex items-center gap-2 rounded-xl border border-[#cce6df] bg-[#e9f7f3] px-3 py-2 text-[10px] font-bold text-[#287867]"><ShieldCheck size={14} />Sempre com aprovação</div>} /><div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#d7e4e8] bg-[#fafdfe] shadow-[0_14px_40px_rgba(38,74,94,.07)]"><div className="flex items-center gap-3 border-b border-[#e1ebee] bg-[#f3f8f9] px-5 py-4"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d4f2e9] text-[#21856e]"><Bot size={18} /></div><div><p className="text-xs font-extrabold text-[#193650]">NEXORA Intelligence</p><p className="font-mono-app text-[9px] text-[#7d97a3]">ligação segura ao Orquestrador Central</p></div><span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-[#289379]"><span className="h-1.5 w-1.5 rounded-full bg-[#2cb28e]" />Pronto</span></div><div className="min-h-[360px] space-y-5 p-5 sm:p-7">{messages.length === 0 && <div className="flex gap-3"><div className="max-w-[88%] rounded-2xl rounded-bl-md border border-[#e0eaed] bg-[#f3f7f8] px-4 py-3.5 text-sm leading-relaxed text-[#456579]">Faça uma pergunta sobre a sua operação. A resposta será obtida através do backend ligado ao Orquestrador Central.</div></div>}{messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex gap-3 ${message.from === "user" ? "justify-end" : ""}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${message.from === "user" ? "rounded-br-md bg-[#d9f0eb] text-[#205e56]" : "rounded-bl-md border border-[#e0eaed] bg-[#f3f7f8] text-[#456579]"}`}>{message.text}{message.meta && <p className="mt-3 border-t border-[#d8e4e7] pt-2 font-mono-app text-[9px] text-[#7e9aa4]">{message.meta}</p>}</div></div>)}{sending && <div data-testid="status-chat-loading" className="flex items-center gap-2 text-xs text-[#7e99a4]"><RefreshCw size={14} className="animate-spin" />A analisar a sua pergunta…</div>}{error && <div role="alert" className="rounded-xl border border-[#efd2cf] bg-[#fff5f3] p-3 text-xs font-semibold text-[#a25855]">{error}</div>}</div><div className="border-t border-[#e1ebee] bg-[#f8fbfb] p-4 sm:p-5"><p className="mb-3 font-mono-app text-[9px] uppercase tracking-[.14em] text-[#8aa0aa]">Comece por uma pergunta</p><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{prompts.map((prompt) => <button key={prompt} onClick={() => void submit(undefined, prompt)} className="shrink-0 rounded-full border border-[#d7e5e8] bg-[#fff] px-3 py-2 text-[11px] font-semibold text-[#557486] hover:border-[#9ed6c8] hover:text-[#20866f]">{prompt}</button>)}</div><form onSubmit={(event) => void submit(event)} className="flex items-center gap-2 rounded-xl border border-[#cadde2] bg-[#fff] p-2 pl-4 focus-within:border-[#64bca7] focus-within:ring-2 focus-within:ring-[#bcecdf]"><input id="global-search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escreva uma pergunta sobre a sua operação…" className="min-w-0 flex-1 bg-transparent text-sm text-[#193650] outline-none placeholder:text-[#9db0b9]" /><button type="submit" aria-label="Enviar pergunta" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#163b58] text-[#75dec4] disabled:cursor-not-allowed disabled:opacity-40" disabled={!input.trim() || sending}><Send size={16} /></button></form></div></div></div>;
}

function CustomersPage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState("Todos");
  const [search, setSearch] = useState("");
  const path = `/customers?search=${encodeURIComponent(search)}&status=${encodeURIComponent(tab === "Todos" ? "" : tab)}`;
  const resource = useResource<CustomersResponse>(path);
  const mutation = useMutation();
  const addCustomer = async () => {
    const name = window.prompt("Nome do cliente");
    if (!name?.trim()) return;
    try { await mutation.run<Customer>("/customers", { method: "POST", body: JSON.stringify({ name: name.trim() }) }); resource.reload(); notify("Cliente criado no backend."); } catch { /* error is rendered below */ }
  };
  const customers = resource.data?.items ?? [];
  return <div><PageHeading eyebrow="Relacionamento" title="Clientes & leads" subtitle="Acompanhe o valor de cada relação e o próximo contexto comercial, com dados do backend." action={<button onClick={() => void addCustomer()} disabled={mutation.pending} className="soft-button flex items-center gap-2 rounded-xl bg-[#163b58] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Plus size={15} />Adicionar cliente</button>} />{mutation.error && <p role="alert" className="mb-4 text-xs font-semibold text-[#a25855]">{errorText(mutation.error)}</p>}<section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1eaed] p-4"><div className="flex gap-1 overflow-x-auto">{["Todos", "Ativo", "Oportunidade", "Lead", "Em atenção"].map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${tab === item ? "bg-[#d9f0eb] text-[#207d69]" : "text-[#78909d]"}`}>{item}</button>)}</div><label className="flex min-w-[180px] items-center gap-2 rounded-lg border border-[#dbe5e9] bg-[#f7fafb] px-3 py-2 text-xs text-[#91a4ad]"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Procurar cliente" className="w-full bg-transparent outline-none placeholder:text-[#9fb0b7]" /></label></div><DataState resource={resource} label="clientes" />{!resource.loading && !resource.error && <div>{customers.map((customer) => <CustomerRow key={customer.id} customer={customer} notify={notify} />)}{customers.length === 0 && <EmptyState icon={<Users size={22} />} title="Nenhum cliente encontrado" text="O backend não devolveu clientes para este filtro." />}</div>}</section></div>;
}

function CustomerRow({ customer, notify }: { customer: Customer; notify: (message: string) => void }) {
  return <div className="card-hover flex flex-wrap items-center gap-3 border-b border-[#e9eff1] px-4 py-4 last:border-0 sm:grid sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:gap-4 sm:px-5"><div className="flex min-w-[45%] items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e1f1ed] text-[10px] font-extrabold text-[#315b6c]">{customer.initials}</div><div><p className="text-xs font-extrabold text-[#193650]">{customer.name}</p><p className="mt-0.5 text-[10px] text-[#91a3ad]">{customer.since ?? "Cliente"}</p></div></div><span className="w-fit rounded-full bg-[#e0f3ed] px-2.5 py-1 text-[10px] font-bold text-[#27816e]">{customer.status}</span><p className="text-xs font-bold text-[#42637a]">{formatCurrency(customer.opportunity)}</p><p className="text-[11px] text-[#6e8795]">{customer.next}</p><button onClick={() => notify(`Detalhe de ${customer.name} disponível no backend.`)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-[#7b94a0] hover:bg-[#e9f4f2]"><ChevronRight size={16} /></button></div>;
}

function SalesPage() {
  const [tab, setTab] = useState("Resumo");
  const [openOnly, setOpenOnly] = useState(false);
  const resource = useResource<Sales>(`/sales?period=30d&openOnly=${openOnly}`);
  if (resource.loading || resource.error || !resource.data) return <><PageHeading eyebrow="Performance comercial" title="Vendas em contexto." subtitle="Dados comerciais fornecidos pelo backend NEXORA." /><DataState resource={resource} label="vendas" /></>;
  const data = resource.data;
  return <div><PageHeading eyebrow="Performance comercial" title="Vendas em contexto." subtitle="Do primeiro interesse ao pedido confirmado, uma leitura comercial sem ruído." action={<button onClick={resource.reload} className="flex items-center gap-2 rounded-xl border border-[#dbe5e9] bg-[#fbfcfc] px-3 py-2 text-[10px] font-bold text-[#637f8e]"><RefreshCw size={13} />Atualizar</button>} /><div className="mb-5 flex gap-1 rounded-xl border border-[#dbe5e9] bg-[#f7fafb] p-1">{["Resumo", "Pedidos", "Produtos"].map((item) => <button key={item} onClick={() => setTab(item)} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold ${tab === item ? "bg-[#fff] text-[#207e69] shadow-sm" : "text-[#78909d]"}`}>{item}</button>)}</div>{tab === "Resumo" && <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]"><section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><p className="font-mono-app text-[9px] uppercase tracking-[.15em] text-[#7e98a4]">Conversão do funil</p><h2 className="mt-1 text-base font-extrabold text-[#193650]">Cada etapa conta</h2><div className="mt-7 space-y-4">{data.funnel.map((step) => <div key={step.label}><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold text-[#557283]">{step.label}</span><span className="font-mono-app text-[10px] text-[#8097a3]">{step.value} · {step.percent}%</span></div><div className="h-2 rounded-full bg-[#edf1f3]"><div className="h-full rounded-full bg-[#2a8f78]" style={{ width: `${Math.min(step.percent, 100)}%` }} /></div></div>)}</div></section><ProductList products={data.products} /></div>}{tab === "Pedidos" && <OrdersTable orders={data.orders} openOnly={openOnly} onToggle={() => setOpenOnly((value) => !value)} />}{tab === "Produtos" && <ProductList products={data.products} />}</div>;
}

function ProductList({ products }: { products: Sales["products"] }) {
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><div className="flex items-center justify-between"><div><p className="font-mono-app text-[9px] uppercase tracking-[.15em] text-[#7e98a4]">Produtos</p><h2 className="mt-1 text-base font-extrabold text-[#193650]">Mais procurados</h2></div><BarChart3 size={18} className="text-[#29977d]" /></div><div className="mt-6 space-y-4">{products.map((product) => <div key={product.name}><div className="mb-1.5 flex justify-between"><span className="text-xs font-bold text-[#47657a]">{product.name}</span><span className="text-[10px] text-[#8aa0aa]">{product.orders} pedidos</span></div><div className="h-1.5 rounded-full bg-[#edf1f3]"><div className="h-full rounded-full bg-[#2eae8c]" style={{ width: `${Math.min(product.sharePercent, 100)}%` }} /></div></div>)}{!products.length && <EmptyState title="Sem produtos" text="O backend não devolveu produtos para este período." />}</div></section>;
}

function OrdersTable({ orders, openOnly, onToggle }: { orders: Sales["orders"]; openOnly: boolean; onToggle: () => void }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc]"><div className="flex items-center justify-between border-b border-[#e3ecef] p-5"><h2 className="text-sm font-extrabold text-[#193650]">Pedidos recentes</h2><button onClick={onToggle} className="flex items-center gap-1.5 text-[10px] font-bold text-[#2d927a]"><Filter size={13} />{openOnly ? "Todos" : "Só em aberto"}</button></div><div className="overflow-x-auto"><div className="min-w-[650px]"><div className="grid grid-cols-[.55fr_1.2fr_1.4fr_1fr_1fr] gap-4 border-b border-[#e9eff1] px-5 py-3 font-mono-app text-[9px] uppercase tracking-[.12em] text-[#8da0aa]"><span>Pedido</span><span>Cliente</span><span>Item</span><span>Valor</span><span>Estado</span></div>{orders.map((order) => <div key={order.id} className="grid grid-cols-[.55fr_1.2fr_1.4fr_1fr_1fr] items-center gap-4 border-b border-[#e9eff1] px-5 py-4 text-xs last:border-0"><span className="font-mono-app text-[10px] text-[#6b8795]">{order.id}</span><span className="font-bold text-[#35556a]">{order.customer}</span><span className="text-[#6f8795]">{order.item}</span><span className="font-bold text-[#35556a]">{formatCurrency(order.amount)}</span><span className="w-fit rounded-full bg-[#e0f3ed] px-2 py-1 text-[10px] font-bold text-[#27816e]">{order.status}</span></div>)}</div></div>{!orders.length && <EmptyState title="Sem pedidos" text="O backend não devolveu pedidos para este filtro." />}</section>;
}

function FinancePage() {
  const [tab, setTab] = useState("Visão geral");
  const resource = useResource<Finance>(`/finance?period=30d&tab=${encodeURIComponent(tab)}`);
  if (resource.loading || resource.error || !resource.data) return <><PageHeading eyebrow="Controlo financeiro" title="Finanças sem surpresas." subtitle="Informação financeira fornecida pelo backend NEXORA." /><DataState resource={resource} label="finanças" /></>;
  const data = resource.data;
  return <div><PageHeading eyebrow="Controlo financeiro" title="Finanças sem surpresas." subtitle="Veja o movimento do dinheiro e os compromissos próximos, com origem confirmada." action={<button onClick={resource.reload} className="flex items-center gap-2 rounded-xl border border-[#d4e1e6] bg-[#fbfcfc] px-3.5 py-2.5 text-xs font-bold text-[#45657a]"><RefreshCw size={14} />Atualizar</button>} /><div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[#dbe5e9] bg-[#f7fafb] p-1">{["Visão geral", "Receitas", "Despesas", "Recebíveis"].map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold ${tab === item ? "bg-[#fff] text-[#207e69] shadow-sm" : "text-[#78909d]"}`}>{item}</button>)}</div>{tab === "Visão geral" ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} icon={[WalletCards, ArrowUpRight, ArrowDownRight, Percent][index % 4]} accent={["blue", "teal", "amber", "teal"][index % 4] as "blue" | "teal" | "amber"} />)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><CashFlow points={data.cashFlow} /><FinancialAlerts alerts={data.alerts} /></div></> : <FinanceList entries={data.entries} title={tab} />}</div>;
}

function CashFlow({ points }: { points: Finance["cashFlow"] }) {
  const max = Math.max(...points.flatMap((point) => [point.income, point.expenses]), 1);
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><div><p className="font-mono-app text-[9px] uppercase tracking-[.15em] text-[#7e98a4]">Fluxo devolvido pelo backend</p><h2 className="mt-1 text-base font-extrabold text-[#193650]">Entradas & saídas</h2></div><div className="mt-6 grid grid-cols-6 items-end gap-2 sm:gap-4">{points.map((point) => <div key={point.label} className="text-center"><div className="flex h-36 items-end justify-center gap-1.5"><span className="w-2.5 rounded-t bg-[#63bda8]" style={{ height: `${(point.income / max) * 100}%` }} /><span className="w-2.5 rounded-t bg-[#c6d9e2]" style={{ height: `${(point.expenses / max) * 100}%` }} /></div><p className="mt-2 text-[10px] font-bold text-[#91a3ad]">{point.label}</p></div>)}</div></section>;
}

function FinancialAlerts({ alerts }: { alerts: Finance["alerts"] }) {
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><div className="flex items-center justify-between"><div><p className="font-mono-app text-[9px] uppercase tracking-[.15em] text-[#7e98a4]">Risco & contexto</p><h2 className="mt-1 text-base font-extrabold text-[#193650]">Alertas financeiras</h2></div><AlertCircle size={18} className="text-[#e29a57]" /></div><div className="mt-5 space-y-3">{alerts.map((alert) => <div key={alert.title} className="rounded-xl border border-[#f2dfc4] bg-[#fff8ec] p-3.5"><p className="flex items-center gap-2 text-xs font-bold text-[#94652d]"><Clock3 size={14} />{alert.title}</p><p className="mt-1.5 text-[10px] leading-relaxed text-[#a18158]">{alert.detail}</p></div>)}</div></section>;
}

function FinanceList({ entries, title }: { entries: Finance["entries"]; title: string }) {
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc]"><div className="border-b border-[#e3ecef] p-5"><h2 className="text-sm font-extrabold text-[#193650]">{title}</h2><p className="mt-1 text-xs text-[#8197a2]">Registos devolvidos pelo backend.</p></div>{entries.map((entry) => <div key={`${entry.date}-${entry.description}`} className="flex items-center justify-between gap-3 border-b border-[#e9eff1] px-5 py-4 last:border-0"><div><p className="text-[10px] text-[#91a3ad]">{entry.date}</p><p className="mt-1 text-xs font-bold text-[#42637a]">{entry.description}</p></div><div className="text-right"><p className="text-xs font-extrabold text-[#27816e]">{formatCurrency(entry.amount)}</p><span className="text-[10px] text-[#8ba0aa]">{entry.status || entry.type}</span></div></div>)}{!entries.length && <EmptyState title="Sem registos" text="O backend não devolveu movimentos para esta área." />}</section>;
}

function MorePage({ notify, onLogout }: { notify: (message: string) => void; onLogout: () => void }) {
  const [section, setSection] = useState("Hub");
  return <div><PageHeading eyebrow="Centro de operação" title="Mais controlo, no mesmo lugar." subtitle="Stock, fornecedores, alertas e aprovações ligados ao backend NEXORA." /><div className="grid gap-5 lg:grid-cols-[230px_1fr]"><aside className="flex gap-1 overflow-x-auto rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-2 lg:block lg:h-fit lg:space-y-1">{[["Hub", LayoutGrid], ["Stock", Package], ["Fornecedores", Truck], ["Alertas", Bell], ["Aprovações", FileCheck2], ["Definições", Settings]].map(([label, Icon]) => <button key={label as string} onClick={() => setSection(label as string)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-xs font-bold lg:w-full ${section === label ? "bg-[#d9f0eb] text-[#207d69]" : "text-[#718895]"}`}>{Icon && <Icon size={16} />}{label as string}</button>)}</aside><div>{section === "Hub" && <HubCards onSection={setSection} onLogout={onLogout} />}{section === "Stock" && <StockView notify={notify} />}{section === "Fornecedores" && <SuppliersView />}{section === "Alertas" && <AlertsView notify={notify} />}{section === "Aprovações" && <ApprovalQueue notify={notify} />}{section === "Definições" && <SettingsView onLogout={onLogout} />}</div></div></div>;
}

function HubCards({ onSection, onLogout }: { onSection: (section: string) => void; onLogout: () => void }) {
  const cards: [string, string, typeof Package, string][] = [["Stock", "Consultar inventário real", Package, "bg-[#fff0d8] text-[#a86d24]"], ["Fornecedores", "Consultar relações comerciais", Truck, "bg-[#e4eff9] text-[#38739e]"], ["Alertas", "Rever sinais operacionais", Bell, "bg-[#fbe7e5] text-[#b25855]"], ["Aprovações", "Decidir ações pendentes", FileCheck2, "bg-[#e1f4ed] text-[#21816c]"]]; return <div className="grid gap-3 sm:grid-cols-2">{cards.map(([title, detail, Icon, color]) => <button key={title} onClick={() => onSection(title)} className="card-hover flex items-center gap-4 rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5 text-left"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={19} /></span><span><strong className="block text-sm font-extrabold text-[#193650]">{title}</strong><span className="mt-1 block text-[11px] text-[#8198a4]">{detail}</span></span><ChevronRight size={16} className="ml-auto text-[#9ab0ba]" /></button>)}<div className="col-span-full mt-2 flex items-center justify-between rounded-2xl border border-[#cde5df] bg-[#e7f5f1] p-5"><p className="flex items-center gap-2 text-sm font-extrabold text-[#236e5d]"><ShieldCheck size={17} />Cada ação exige aprovação explícita.</p><button onClick={() => onSection("Definições")} className="hidden rounded-lg bg-[#267b68] px-3 py-2 text-[10px] font-bold text-white sm:block">Definições</button></div><button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-[#8a6b73]"><LogOut size={14} />Sair</button></div>;
}

function StockView({ notify }: { notify: (message: string) => void }) {
  const resource = useResource<{ items: StockItem[] }>("/stock");
  const mutation = useMutation();
  const restock = async (id: string) => { try { await mutation.run(`/stock/${id}/restock`, { method: "POST", body: JSON.stringify({ requestedBy: "current-user" }) }); resource.reload(); notify("Pedido de reposição enviado para aprovação."); } catch { /* mutation error is displayed */ } };
  if (resource.loading || resource.error || !resource.data) return <DataState resource={resource} label="stock" />;
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><h2 className="text-base font-extrabold text-[#193650]">Stock crítico</h2><p className="mt-1 text-xs text-[#8198a4]">Quantidade e mínimos devolvidos pelo backend.</p>{mutation.error && <p role="alert" className="mt-3 text-xs text-[#a25855]">{errorText(mutation.error)}</p>}<div className="mt-5 space-y-3">{resource.data.items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#e3ecef] p-3.5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff0d8] text-[#a86d24]"><Package size={16} /></div><div><p className="text-xs font-bold text-[#42637a]">{item.name}</p><p className="mt-1 text-[10px] text-[#8ca1aa]">{item.quantity} {item.unit} · mínimo {item.minimum}</p></div></div><button disabled={mutation.pending || Boolean(item.approvalId)} onClick={() => void restock(item.id)} className="rounded-lg border border-[#cce3dc] px-2.5 py-2 text-[10px] font-bold text-[#2b927a] disabled:opacity-50">{item.approvalId ? "Em aprovação" : "Preparar compra"}</button></div>)}{!resource.data.items.length && <EmptyState title="Stock regularizado" text="O backend não devolveu itens abaixo do mínimo." />}</div></section>;
}

function SuppliersView() {
  const resource = useResource<{ items: Supplier[] }>("/suppliers");
  if (resource.loading || resource.error || !resource.data) return <DataState resource={resource} label="fornecedores" />;
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><h2 className="text-base font-extrabold text-[#193650]">Fornecedores</h2><p className="mt-1 text-xs text-[#8198a4]">Relações comerciais devolvidas pelo backend.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{resource.data.items.map((supplier) => <div key={supplier.id} className="rounded-xl border border-[#e3ecef] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#e4eff9] text-[#38739e]"><Building2 size={16} /></div><div><p className="text-xs font-bold text-[#42637a]">{supplier.name}</p><p className="mt-1 text-[10px] text-[#8ca1aa]">{supplier.category} · {supplier.orders} pedidos</p></div></div><span className="mt-4 inline-block rounded-full bg-[#e1f4ed] px-2 py-1 text-[9px] font-bold text-[#27816e]">{supplier.status}</span></div>)}{!resource.data.items.length && <EmptyState title="Sem fornecedores" text="O backend não devolveu fornecedores." />}</div></section>;
}

function AlertsView({ notify }: { notify: (message: string) => void }) {
  const resource = useResource<{ items: Alert[] }>("/alerts");
  const mutation = useMutation();
  const acknowledge = async (id: string) => { try { await mutation.run(`/alerts/${id}/acknowledge`, { method: "POST" }); resource.reload(); notify("Alerta atualizado no backend."); } catch { /* mutation error is displayed */ } };
  if (resource.loading || resource.error || !resource.data) return <DataState resource={resource} label="alertas" />;
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5"><h2 className="text-base font-extrabold text-[#193650]">Alertas operacionais</h2>{mutation.error && <p role="alert" className="mt-3 text-xs text-[#a25855]">{errorText(mutation.error)}</p>}<div className="mt-5 space-y-3">{resource.data.items.map((alert) => <div key={alert.id} className="flex items-start justify-between gap-4 rounded-xl border border-[#e3ecef] p-4"><div><p className="flex items-center gap-2 text-xs font-bold text-[#42637a]"><span className={`h-2 w-2 rounded-full ${alert.severity === "critical" ? "bg-[#c85f58]" : alert.severity === "warning" ? "bg-[#efa76b]" : "bg-[#35ad8d]"}`} />{alert.title}</p><p className="mt-1.5 text-[11px] leading-relaxed text-[#8198a4]">{alert.detail}</p></div>{!alert.acknowledged && <button disabled={mutation.pending} onClick={() => void acknowledge(alert.id)} className="shrink-0 rounded-lg border border-[#cce3dc] px-2.5 py-2 text-[10px] font-bold text-[#2b927a]">Marcar visto</button>}</div>)}{!resource.data.items.length && <EmptyState title="Sem alertas ativos" text="O backend não devolveu alertas por acompanhar." />}</div></section>;
}

function ApprovalQueue({ notify }: { notify: (message: string) => void }) {
  const resource = useResource<{ items: Approval[] }>("/approvals");
  const mutation = useMutation();
  const decide = async (id: string, decision: "approved" | "rejected") => { try { await mutation.run(`/approvals/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) }); resource.reload(); notify("Decisão registada no backend."); } catch { /* mutation error is displayed */ } };
  if (resource.loading || resource.error || !resource.data) return <DataState resource={resource} label="aprovações" />;
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono-app text-[9px] uppercase tracking-[.15em] text-[#7e98a4]">Governança</p><h2 className="mt-1 text-base font-extrabold text-[#193650]">Aprovações</h2><p className="mt-1 text-xs text-[#8198a4]">As decisões são persistidas pelo backend.</p></div><span className="flex items-center gap-1.5 rounded-full bg-[#fff0dc] px-2.5 py-1 text-[10px] font-bold text-[#a36d2e]"><ShieldCheck size={13} />Ação manual obrigatória</span></div>{mutation.error && <p role="alert" className="mt-4 text-xs text-[#a25855]">{errorText(mutation.error)}</p>}<div className="mt-6 space-y-3">{resource.data.items.map((item) => <div key={item.id} className="rounded-xl border border-[#e0e9ec] bg-[#f8fbfb] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-md bg-[#e5edf0] px-2 py-1 font-mono-app text-[9px] font-bold text-[#6d8795]">{item.kind}</span><p className="mt-3 text-sm font-extrabold text-[#193650]">{item.title}</p><p className="mt-1 text-xs text-[#7f96a2]">{item.detail}</p></div><p className="text-lg font-extrabold tracking-[-.04em] text-[#31566e]">{item.amount}</p></div>{item.status === "pending" ? <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#e0eaed] pt-3"><button disabled={mutation.pending} onClick={() => void decide(item.id, "rejected")} className="rounded-lg border border-[#eccfce] px-3 py-2 text-[10px] font-bold text-[#b25855]">Rejeitar</button><button disabled={mutation.pending} onClick={() => void decide(item.id, "approved")} className="rounded-lg bg-[#267d69] px-3 py-2 text-[10px] font-bold text-white">Aprovar</button></div> : <p className="mt-3 border-t border-[#e0eaed] pt-3 text-[10px] text-[#7b929e]">Estado: {item.status} · {item.decidedAt ?? "data devolvida pelo backend"}</p>}</div>)}{!resource.data.items.length && <EmptyState title="Sem decisões pendentes" text="O backend não devolveu aprovações abertas." />}</div></section>;
}

function SettingsView({ onLogout }: { onLogout: () => void }) {
  return <section className="rounded-2xl border border-[#dbe5e9] bg-[#fbfcfc] p-5 sm:p-6"><h2 className="text-base font-extrabold text-[#193650]">Perfil & definições</h2><p className="mt-2 text-xs leading-relaxed text-[#78909d]">As definições de conta e permissões são geridas pelo backend NEXORA. Este cliente não guarda credenciais.</p><div className="mt-6 rounded-xl border border-[#e1eaed] bg-[#f0f6f7] p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#42637a]"><ShieldCheck size={15} className="text-[#2d9c81]" />Sessão protegida pelo servidor</p><p className="mt-1 text-[10px] text-[#8ba0aa]">A origem e as permissões são confirmadas em cada operação.</p></div><button onClick={onLogout} className="mt-5 flex items-center gap-2 text-xs font-bold text-[#b25855]"><LogOut size={14} />Sair</button></section>;
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className="flex min-h-[100dvh] bg-[#102a43]"><div className="relative hidden flex-1 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"><div className="relative"><Logo /></div><div className="relative max-w-xl"><p className="font-mono-app text-[10px] uppercase tracking-[.2em] text-[#75dec4]">Sistema operativo para negócios</p><h1 className="mt-5 text-[clamp(3.5rem,6vw,6.2rem)] font-extrabold leading-[.92] tracking-[-.07em] text-[#eff8f5]">Inteligência<br /><span className="font-serif-app font-normal italic text-[#75dec4]">que move</span><br />o seu negócio.</h1><p className="mt-8 max-w-md text-base leading-relaxed text-[#9bb8c1]">Uma visão mais clara para decidir melhor, todos os dias.</p></div><div className="relative text-[10px] text-[#6f8da0]">NEXORA AI · acesso seguro</div></div><div className="flex w-full items-center bg-[#f3f8f9] px-5 py-10 sm:px-10 lg:w-[48%] lg:px-16"><div className="mx-auto w-full max-w-[420px]"><div className="lg:hidden"><Logo compact /></div><div className="mt-12 lg:mt-0"><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#229278]">Bem-vindo</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.06em] text-[#142d46]">Entre na sua operação.</h2><p className="mt-3 text-sm leading-relaxed text-[#668095]">Aceda à visão executiva da sua empresa.</p></div><form onSubmit={(event) => { event.preventDefault(); onLogin(); }} className="mt-9 space-y-4"><label className="block"><span className="mb-2 block text-xs font-bold text-[#49677d]">Email profissional</span><input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@empresa.pt" className="focus-ring w-full rounded-xl border border-[#cfdfe4] bg-[#fff] px-4 py-3.5 text-sm text-[#193650] outline-none placeholder:text-[#a4b3bb]" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-[#49677d]">Palavra-passe</span><input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Introduza a sua palavra-passe" className="focus-ring w-full rounded-xl border border-[#cfdfe4] bg-[#fff] px-4 py-3.5 text-sm text-[#193650] outline-none placeholder:text-[#a4b3bb]" /></label><button type="submit" className="soft-button flex w-full items-center justify-center gap-2 rounded-xl bg-[#163b58] py-3.5 text-sm font-bold text-white hover:bg-[#1c496b]">Entrar <ChevronRight size={16} /></button></form><p className="mt-8 flex items-start gap-2 text-[10px] leading-relaxed text-[#8da1aa]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#38a88c]" />A autenticação é validada pelo ambiente seguro do servidor.</p></div></div></div>;
}

function EmptyState({ icon, title, text }: { icon?: ReactNode; title: string; text: string }) {
  return <div className="flex flex-col items-center justify-center px-5 py-16 text-center">{icon && <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f2ef] text-[#2e957c]">{icon}</div>}<h3 className="mt-4 text-base font-extrabold text-[#31556b]">{title}</h3><p className="mt-2 max-w-xs text-xs leading-relaxed text-[#8ba0aa]">{text}</p></div>;
}

export default App;