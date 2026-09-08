import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Check, ChevronRight, Circle, Feather, Lightbulb, ListTodo, Plus, Sparkles, Trash2, X } from 'lucide-react';

type View = 'focus' | 'ideas';
type Priority = { id: string; text: string; done: boolean };
type Idea = { id: string; text: string; createdAt: string };

const starterPriorities: Priority[] = [
  { id: 'p-1', text: 'Escrever a primeira página do projeto', done: false },
  { id: 'p-2', text: 'Marcar aquele café com a Marina', done: false },
  { id: 'p-3', text: 'Ler 20 páginas antes do almoço', done: true },
];
const starterIdeas: Idea[] = [
  { id: 'i-1', text: 'Uma coleção de pequenos rituais para dias mais leves.', createdAt: 'Hoje, 07:42' },
  { id: 'i-2', text: 'Perguntar ao avô sobre a casa amarela da infância.', createdAt: 'Ontem, 18:16' },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [view, setView] = useState<View>('focus');
  const [priorities, setPriorities] = useState<Priority[]>(() => readStorage('luma-priorities', starterPriorities));
  const [ideas, setIdeas] = useState<Idea[]>(() => readStorage('luma-ideas', starterIdeas));
  const [newPriority, setNewPriority] = useState('');
  const [newIdea, setNewIdea] = useState('');
  const [isAddingPriority, setIsAddingPriority] = useState(false);
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useEffect(() => localStorage.setItem('luma-priorities', JSON.stringify(priorities)), [priorities]);
  useEffect(() => localStorage.setItem('luma-ideas', JSON.stringify(ideas)), [ideas]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()), []);
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const completed = priorities.filter((item) => item.done).length;
  const openPriorities = priorities.filter((item) => !item.done);

  function addPriority(event: FormEvent) {
    event.preventDefault();
    const text = newPriority.trim();
    if (!text) return;
    setPriorities((items) => [...items, { id: `p-${Date.now()}`, text, done: false }]);
    setNewPriority('');
    setIsAddingPriority(false);
  }

  function togglePriority(id: string) {
    setPriorities((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
    setCelebrating(id);
    window.setTimeout(() => setCelebrating(null), 500);
  }

  function addIdea(event: FormEvent) {
    event.preventDefault();
    const text = newIdea.trim();
    if (!text) return;
    setIdeas((items) => [{ id: `i-${Date.now()}`, text, createdAt: 'Agora mesmo' }, ...items]);
    setNewIdea('');
    setIsAddingIdea(false);
  }

  return (
    <div className="luma-shell">
      <div className="grain" aria-hidden="true" />
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1380px] flex-col px-5 py-5 sm:px-8 lg:flex-row lg:gap-14 lg:px-12 lg:py-8">
        <aside className="flex shrink-0 items-center justify-between lg:sticky lg:top-8 lg:h-[calc(100dvh-4rem)] lg:w-52 lg:flex-col lg:items-stretch">
          <button data-testid="button-home" onClick={() => setView('focus')} className="focus-ring group flex items-center gap-3 rounded-xl text-left">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#203e40] text-[#f8f3e8] shadow-[4px_4px_0_#d4c4af] transition-transform group-hover:rotate-[-6deg]">
              <Feather size={19} strokeWidth={1.7} />
            </span>
            <span className="font-display text-[25px] leading-none tracking-[-.04em] text-[#203e40]">luma</span>
          </button>
          <nav className="hidden space-y-2 lg:block" aria-label="Navegação principal">
            <NavButton active={view === 'focus'} icon={<ListTodo size={17} />} label="Meu foco" onClick={() => setView('focus')} testId="nav-focus" />
            <NavButton active={view === 'ideas'} icon={<Lightbulb size={17} />} label="Ideias soltas" onClick={() => setView('ideas')} testId="nav-ideas" count={ideas.length} />
          </nav>
          <div className="hidden lg:block">
            <div className="mb-3 h-px w-8 bg-[#cbbfae]" />
            <p className="font-mono-app text-[10px] uppercase tracking-[.15em] text-[#74827e]">um espaço para</p>
            <p className="mt-2 max-w-[145px] font-display text-[17px] leading-[1.15] text-[#58706d]">fazer menos, com presença.</p>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <MobileNav active={view === 'focus'} onClick={() => setView('focus')} label="Foco" icon={<ListTodo size={16} />} testId="nav-mobile-focus" />
            <MobileNav active={view === 'ideas'} onClick={() => setView('ideas')} label="Ideias" icon={<Lightbulb size={16} />} testId="nav-mobile-ideas" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-10 pt-14 lg:pt-2">
          {view === 'focus' ? (
            <FocusView dateLabel={dateLabel} greeting={greeting} priorities={priorities} openPriorities={openPriorities} completed={completed} newPriority={newPriority} isAdding={isAddingPriority} setNewPriority={setNewPriority} setIsAdding={setIsAddingPriority} addPriority={addPriority} togglePriority={togglePriority} removePriority={(id) => setPriorities((items) => items.filter((item) => item.id !== id))} celebrating={celebrating} onIdeas={() => setView('ideas')} />
          ) : (
            <IdeasView ideas={ideas} newIdea={newIdea} isAdding={isAddingIdea} setNewIdea={setNewIdea} setIsAdding={setIsAddingIdea} addIdea={addIdea} removeIdea={(id) => setIdeas((items) => items.filter((item) => item.id !== id))} onFocus={() => setView('focus')} />
          )}
        </main>
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick, testId, count }: { active: boolean; icon: ReactNode; label: string; onClick: () => void; testId: string; count?: number }) {
  return <button data-testid={testId} onClick={onClick} className={`focus-ring soft-button flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-[#dce8dd] font-semibold text-[#203e40]' : 'text-[#70817c] hover:bg-[#e9e5db] hover:text-[#203e40]'}`}><span className={active ? 'text-[#e67e61]' : ''}>{icon}</span><span>{label}</span>{count !== undefined && <span className="ml-auto font-mono-app text-[10px] text-[#8b9990]">{count}</span>}</button>;
}

function MobileNav({ active, onClick, label, icon, testId }: { active: boolean; onClick: () => void; label: string; icon: ReactNode; testId: string }) {
  return <button data-testid={testId} onClick={onClick} className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-xs ${active ? 'bg-[#dce8dd] font-semibold text-[#203e40]' : 'text-[#70817c]'}`}>{icon}{label}</button>;
}

function FocusView({ dateLabel, greeting, priorities, openPriorities, completed, newPriority, isAdding, setNewPriority, setIsAdding, addPriority, togglePriority, removePriority, celebrating, onIdeas }: { dateLabel: string; greeting: string; priorities: Priority[]; openPriorities: Priority[]; completed: number; newPriority: string; isAdding: boolean; setNewPriority: (v: string) => void; setIsAdding: (v: boolean) => void; addPriority: (e: FormEvent) => void; togglePriority: (id: string) => void; removePriority: (id: string) => void; celebrating: string | null; onIdeas: () => void }) {
  return <div className="view-in">
    <header className="stagger-in max-w-3xl">
      <p data-testid="text-date" className="font-mono-app text-[11px] uppercase tracking-[.2em] text-[#e67e61]">{dateLabel}</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 data-testid="text-greeting" className="font-display text-[clamp(3.3rem,8vw,6.6rem)] leading-[.86] tracking-[-.065em] text-[#203e40]">{greeting},<br /><span className="text-[#6f8a83]">Inês.</span></h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#6c7b77]">Antes de tudo começar, escolha onde pousar a sua atenção.</p>
        </div>
        <div className="mb-1 hidden h-20 w-20 rotate-3 items-center justify-center rounded-[48%_52%_46%_54%] bg-[#f2d27b] text-center sm:flex">
          <Sparkles size={24} className="text-[#826b39]" strokeWidth={1.5} />
        </div>
      </div>
    </header>

    <section className="stagger-in stagger-2 mt-14 grid max-w-5xl gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="mb-5 flex items-end justify-between border-b border-[#d5cabb] pb-3">
          <div>
            <p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#88938c]">o essencial</p>
            <h2 className="mt-1 font-display text-[31px] tracking-[-.035em] text-[#203e40]">Suas prioridades</h2>
          </div>
          <span data-testid="text-priority-progress" className="font-mono-app text-[11px] text-[#7b8983]">{completed}/{priorities.length} feitas</span>
        </div>
        <div className="space-y-2.5">
          {priorities.map((item, index) => <PriorityRow key={item.id} item={item} index={index} celebrating={celebrating === item.id} onToggle={() => togglePriority(item.id)} onRemove={() => removePriority(item.id)} />)}
        </div>
        {isAdding ? <form onSubmit={addPriority} className="stagger-in mt-3 flex items-center gap-2 rounded-2xl border border-[#c8bdae] bg-[#fbf8f1] p-2 pl-4 shadow-[0_8px_20px_rgba(63,71,58,.06)]"><input autoFocus data-testid="input-new-priority" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} placeholder="O que merece espaço hoje?" className="focus-ring min-w-0 flex-1 bg-transparent text-sm text-[#203e40] outline-none placeholder:text-[#a5aaa1]" /><button data-testid="button-save-priority" type="submit" aria-label="Salvar prioridade" className="soft-button focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e67e61] text-white hover:bg-[#d96f55]"><Check size={17} /></button><button data-testid="button-cancel-priority" type="button" aria-label="Cancelar" onClick={() => { setIsAdding(false); setNewPriority(''); }} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#8b9690] hover:bg-[#e9e5db]"><X size={17} /></button></form> : <button data-testid="button-add-priority" onClick={() => setIsAdding(true)} className="focus-ring soft-button mt-4 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-[#e67e61] hover:bg-[#f0e8dc]"><Plus size={17} />Adicionar prioridade</button>}
        {priorities.length === 0 && <EmptyPriorities onAdd={() => setIsAdding(true)} />}
        {priorities.length > 0 && openPriorities.length === 0 && <div data-testid="status-all-complete" className="stagger-in mt-5 flex items-center gap-3 rounded-2xl border border-[#bfd5c5] bg-[#e3eee5] px-4 py-3 text-sm text-[#4e7064]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#9fc5ad] text-[#244e47]"><Check size={15} /></span>Por hoje, o essencial está cuidado.</div>}
      </div>

      <aside className="stagger-in stagger-3 relative overflow-hidden rounded-[24px] bg-[#203e40] p-6 text-[#e9eee6] shadow-[8px_10px_0_rgba(182,158,129,.27)]">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-[#ef8a6b]/25" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full border-[18px] border-[#b4d3c4]/15" />
        <p className="relative font-mono-app text-[10px] uppercase tracking-[.18em] text-[#a9cbb8]">uma pausa para lembrar</p>
        <p data-testid="text-daily-note" className="relative mt-10 font-display text-[27px] leading-[1.08] tracking-[-.03em]">A atenção é uma forma de carinho.</p>
        <div className="relative mt-9 flex items-center justify-between border-t border-white/15 pt-4"><span className="font-mono-app text-[10px] text-[#9eb9ad]">01 — presença</span><span className="h-2 w-2 rounded-full bg-[#ef8a6b]" /></div>
      </aside>
    </section>

    <section className="stagger-in stagger-4 mt-16 max-w-5xl border-t border-[#d5cabb] pt-5">
      <button data-testid="button-open-ideas" onClick={onIdeas} className="focus-ring soft-button group flex w-full items-center justify-between rounded-xl py-2 text-left">
        <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0d88d]/60 text-[#806b3c]"><Lightbulb size={17} strokeWidth={1.8} /></span><span><span className="block text-sm font-semibold text-[#203e40]">Ideias soltas</span><span className="mt-0.5 block text-xs text-[#89938b]">Guarde o que não precisa de resposta agora.</span></span></span>
        <span className="flex items-center gap-2 text-xs font-semibold text-[#80908a] group-hover:text-[#e67e61]">Abrir espaço <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
      </button>
    </section>
  </div>;
}

function PriorityRow({ item, index, celebrating, onToggle, onRemove }: { item: Priority; index: number; celebrating: boolean; onToggle: () => void; onRemove: () => void }) {
  return <div data-testid={`row-priority-${item.id}`} className={`priority-row group stagger-in flex items-center gap-3 rounded-2xl border border-[#ddd3c6] bg-[#f9f5ed]/75 px-3 py-3.5 sm:px-4 ${item.done ? 'completed opacity-65' : ''}`} style={{ animationDelay: `${index * 70 + 300}ms` }}>
    <button data-testid={`button-toggle-priority-${item.id}`} onClick={onToggle} aria-label={item.done ? 'Reabrir prioridade' : 'Concluir prioridade'} className={`focus-ring grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all ${item.done ? 'border-[#9fc5ad] bg-[#9fc5ad] text-[#29564d]' : 'border-[#b9bdb2] text-transparent hover:border-[#e67e61] hover:bg-[#fae2d9]'}`}>{item.done ? <Check size={14} className={celebrating ? 'check-pop' : ''} strokeWidth={2.5} /> : <Circle size={7} fill="currentColor" />}</button>
    <span className={`min-w-0 flex-1 text-sm ${item.done ? 'text-[#80918a] line-through decoration-[#b7c7bd]' : 'text-[#344e4d]'}`}>{item.text}</span>
    <button data-testid={`button-remove-priority-${item.id}`} onClick={onRemove} aria-label="Remover prioridade" className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#abb0a8] opacity-0 transition-opacity hover:bg-[#f2ddd4] hover:text-[#c8614e] group-hover:opacity-100 focus:opacity-100 sm:opacity-0"><Trash2 size={15} /></button>
  </div>;
}

function EmptyPriorities({ onAdd }: { onAdd: () => void }) {
  return <div data-testid="empty-priorities" className="stagger-in mt-4 rounded-2xl border border-dashed border-[#c9bda9] bg-[#f8f3e9]/70 px-6 py-8 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#e2ece2] text-[#668777]"><Feather size={20} /></div><p className="mt-3 font-display text-[21px] text-[#496560]">Um espaço em branco.</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#89938b]">Escolha uma pequena coisa para dar vida a este dia.</p><button data-testid="button-empty-add-priority" onClick={onAdd} className="focus-ring mt-4 text-xs font-semibold text-[#e67e61] underline decoration-[#e67e61]/30 underline-offset-4">Começar por uma prioridade</button></div>;
}

function IdeasView({ ideas, newIdea, isAdding, setNewIdea, setIsAdding, addIdea, removeIdea, onFocus }: { ideas: Idea[]; newIdea: string; isAdding: boolean; setNewIdea: (v: string) => void; setIsAdding: (v: boolean) => void; addIdea: (e: FormEvent) => void; removeIdea: (id: string) => void; onFocus: () => void }) {
  return <div className="view-in max-w-4xl">
    <header className="stagger-in flex flex-wrap items-start justify-between gap-5">
      <div><button data-testid="button-back-focus" onClick={onFocus} className="focus-ring mb-8 flex items-center gap-1 text-xs font-semibold text-[#7b8983] hover:text-[#e67e61]"><ChevronRight size={15} className="rotate-180" />Voltar ao foco</button><p className="font-mono-app text-[11px] uppercase tracking-[.2em] text-[#e67e61]">caderno aberto</p><h1 data-testid="text-ideas-title" className="mt-4 font-display text-[clamp(3.2rem,8vw,6rem)] leading-[.88] tracking-[-.06em] text-[#203e40]">Ideias<br /><span className="text-[#6f8a83]">soltas.</span></h1><p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#6c7b77]">Nem tudo precisa virar tarefa. Deixe aqui o que quer continuar consigo.</p></div>
      <div className="mt-2 grid h-20 w-20 place-items-center rounded-[55%_45%_52%_48%] bg-[#f2d27b] text-[#826b39] sm:mt-14"><Lightbulb size={28} strokeWidth={1.4} /></div>
    </header>
    <section className="stagger-in stagger-2 mt-14">
      <div className="mb-5 flex items-end justify-between border-b border-[#d5cabb] pb-3"><div><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#88938c]">fragmentos guardados</p><h2 className="mt-1 font-display text-[31px] tracking-[-.035em] text-[#203e40]">{ideas.length === 0 ? 'Ainda em branco' : `${ideas.length} ${ideas.length === 1 ? 'ideia' : 'ideias'}`}</h2></div><span className="font-mono-app text-[10px] uppercase tracking-[.12em] text-[#9ba39c]">sem pressa</span></div>
      {ideas.length === 0 ? <EmptyIdeas onAdd={() => setIsAdding(true)} /> : <div className="grid gap-3 sm:grid-cols-2">{ideas.map((idea, index) => <article data-testid={`card-idea-${idea.id}`} key={idea.id} className="stagger-in group relative min-h-[150px] rounded-[22px] border border-[#ddd3c6] bg-[#f9f5ed]/80 p-5 transition-transform hover:-translate-y-1" style={{ animationDelay: `${index * 80 + 200}ms` }}><span className="font-mono-app text-[10px] uppercase tracking-[.15em] text-[#e67e61]">{idea.createdAt}</span><p className="mt-5 pr-4 font-display text-[22px] leading-[1.1] tracking-[-.02em] text-[#385655]">{idea.text}</p><button data-testid={`button-remove-idea-${idea.id}`} onClick={() => removeIdea(idea.id)} aria-label="Remover ideia" className="focus-ring absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-[#b3b2a9] opacity-0 transition-opacity hover:bg-[#f2ddd4] hover:text-[#c8614e] group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button></article>)}</div>}
      {isAdding ? <form onSubmit={addIdea} className="stagger-in mt-4 rounded-[22px] border border-[#c8bdae] bg-[#fbf8f1] p-4 shadow-[0_8px_20px_rgba(63,71,58,.06)]"><textarea autoFocus data-testid="input-new-idea" value={newIdea} onChange={(e) => setNewIdea(e.target.value)} rows={3} placeholder="Uma frase, uma pergunta, uma faísca..." className="focus-ring w-full resize-none bg-transparent text-[17px] leading-relaxed text-[#203e40] outline-none placeholder:text-[#a5aaa1]" /><div className="mt-3 flex justify-end gap-2"><button data-testid="button-cancel-idea" type="button" onClick={() => { setIsAdding(false); setNewIdea(''); }} className="focus-ring rounded-xl px-3 py-2 text-xs font-semibold text-[#82908a] hover:bg-[#e9e5db]">Cancelar</button><button data-testid="button-save-idea" type="submit" className="soft-button focus-ring rounded-xl bg-[#203e40] px-4 py-2 text-xs font-semibold text-[#f8f3e8] hover:bg-[#315757]">Guardar ideia</button></div></form> : <button data-testid="button-add-idea" onClick={() => setIsAdding(true)} className="focus-ring soft-button mt-5 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-[#e67e61] hover:bg-[#f0e8dc]"><Plus size={17} />Capturar uma ideia</button>}
    </section>
  </div>;
}

function EmptyIdeas({ onAdd }: { onAdd: () => void }) {
  return <div data-testid="empty-ideas" className="rounded-[24px] border border-dashed border-[#c9bda9] bg-[#f8f3e9]/70 px-6 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-[45%_55%_52%_48%] bg-[#f2d27b]/70 text-[#806b3c]"><Lightbulb size={23} strokeWidth={1.5} /></div><p className="mt-5 font-display text-[25px] text-[#496560]">O silêncio também é um começo.</p><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#89938b]">Quando uma ideia aparecer, não precisa segurá-la. Traga-a para cá.</p><button data-testid="button-empty-add-idea" onClick={onAdd} className="focus-ring mt-5 rounded-xl bg-[#e67e61] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#d96f55]">Escrever a primeira</button></div>;
}

export default App;
