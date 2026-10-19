import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    FileDown,
    FileText,
    Layers,
    LoaderCircle,
    MapPin,
    Printer,
    ReceiptText,
    Search,
    UserRound,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
type DocumentAction = {
    label: string;
    url: string;
    kind: 'print_receipts' | 'download_receipts' | 'print_statement' | 'download_statement';
};
type Group = { label: string; items: Array<{ id: number; title: string; detail: string | null; url: string; documents?: DocumentAction[] }> };
const resultColors: Record<string, string> = {
    Clients: 'bg-blue-100 text-blue-700',
    Stands: 'bg-emerald-100 text-emerald-700',
    Allocations: 'bg-violet-100 text-violet-700',
    Users: 'bg-amber-100 text-amber-700',
    Branches: 'bg-cyan-100 text-cyan-700',
    Developments: 'bg-rose-100 text-rose-700',
};

export default function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);
    useEffect(() => {
        if (!open || query.trim().length < 2) {
            setGroups([]);
            setBusy(false);
            return;
        }
        const controller = new AbortController();
        setGroups([]);
        setBusy(true);
        setError('');
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(`/global-search?q=${encodeURIComponent(query.trim())}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('Search is unavailable. Please try again.');
                const data = await response.json();
                if (!controller.signal.aborted) setGroups(data.groups);
            } catch (error) {
                if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Search failed.');
            } finally {
                if (!controller.signal.aborted) setBusy(false);
            }
        }, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, open]);
    const icons: Record<string, typeof Users> = {
        Clients: Users,
        Stands: MapPin,
        Allocations: Layers,
        Users: UserRound,
        Branches: Building2,
        Developments: Building2,
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border bg-background text-foreground hover:bg-muted gap-2">
                    <Search data-icon="inline-start" />
                    <span className="hidden sm:inline">Search anything</span>
                    <kbd className="text-muted-foreground hidden rounded border px-1 text-xs md:inline">Ctrl K</kbd>
                    <span className="sr-only sm:hidden">Global search</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Search across Alpha Land</DialogTitle>
                    <DialogDescription>
                        Find clients by name, number or phone, plus stands, allocations, users, branches and developments you can access.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search aria-hidden="true" className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2" />
                    <Input
                        autoFocus
                        aria-label="Global search"
                        className="h-12 pl-11 text-base"
                        placeholder="Search clients, stand numbers and more..."
                        value={query}
                        maxLength={120}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div aria-live="polite" className="min-h-40 overflow-y-auto pr-1">
                    {busy ? (
                        <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                            Searching...
                        </p>
                    ) : error ? (
                        <p role="alert" className="text-destructive py-6">
                            {error}
                        </p>
                    ) : query.trim().length < 2 ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">Enter at least 2 characters. Client results appear first.</p>
                    ) : groups.every((g) => !g.items.length) ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">
                            No matching records. Try a name, phone number or stand number.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {groups
                                .filter((g) => g.items.length)
                                .map((group) => {
                                    const Icon = icons[group.label] ?? Search;
                                    return (
                                        <section key={group.label}>
                                            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                                <Icon aria-hidden="true" className="size-4" />
                                                {group.label}
                                                <span className="text-muted-foreground text-xs">{group.items.length}</span>
                                            </h3>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                {group.items.map((item) => (
                                                    <div key={item.id} className="overflow-hidden rounded-lg border">
                                                        <Link
                                                            href={item.url}
                                                            onClick={() => setOpen(false)}
                                                            className="hover:bg-accent focus-visible:outline-ring flex items-center justify-between gap-3 p-3 transition-colors"
                                                        >
                                                            <span
                                                                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${resultColors[group.label] ?? 'bg-muted text-muted-foreground'}`}
                                                            >
                                                                <Icon aria-hidden="true" className="size-5" />
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-medium">{item.title}</p>
                                                                <p className="text-muted-foreground truncate text-xs">{item.detail}</p>
                                                            </div>
                                                            <ArrowUpRight aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                                        </Link>
                                                        {item.documents && item.documents.length > 0 && (
                                                            <div className="bg-muted/35 flex flex-wrap gap-1 border-t p-2">
                                                                {item.documents.map((document) => {
                                                                    const isPrint = document.kind.startsWith('print');
                                                                    const isReceipt = document.kind.endsWith('receipts');
                                                                    const ActionIcon = isPrint ? Printer : FileDown;

                                                                    return (
                                                                        <Button
                                                                            key={document.kind}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 px-2 text-xs"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={document.url}
                                                                                target={isPrint ? '_blank' : undefined}
                                                                                rel={isPrint ? 'noreferrer' : undefined}
                                                                                onClick={() => setOpen(false)}
                                                                            >
                                                                                {isReceipt ? (
                                                                                    <ReceiptText className="size-3.5 text-emerald-700" />
                                                                                ) : (
                                                                                    <FileText className="size-3.5 text-blue-700" />
                                                                                )}
                                                                                <ActionIcon className="size-3.5" />
                                                                                {document.label}
                                                                            </a>
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
