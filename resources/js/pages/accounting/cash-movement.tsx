import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Landmark, Scale, WalletCards } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { value: string; label: string };
type Movement = {
    id: number;
    date: string;
    journal_no: string;
    type: string;
    source: string;
    reference: string | null;
    description: string;
    cash_account: string;
    branch: string | null;
    cash_in: number;
    cash_out: number;
    running_balance: number;
};
type Props = {
    summary: { opening_balance: number; cash_in: number; cash_out: number; net_movement: number; closing_balance: number };
    monthly: Array<{ month: string; label: string; cash_in: number; cash_out: number }>;
    movements: Movement[];
    filters: { from: string; to: string; branch_id: number | null };
    branches: Option[];
    currency: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Cash movement', href: '/accounting/cash-movement' },
];
const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

export default function CashMovement({ summary, monthly, movements, filters, branches, currency }: Props) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [branchId, setBranchId] = useState(filters.branch_id ? String(filters.branch_id) : 'all');
    const maximum = Math.max(...monthly.flatMap((row) => [row.cash_in, row.cash_out]), 1);
    const apply = (event: FormEvent) => {
        event.preventDefault();
        router.get('/accounting/cash-movement', { from, to, branch_id: branchId === 'all' ? undefined : branchId }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cash movement" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3">
                            <Link href="/accounting">
                                <ArrowLeft data-icon="inline-start" /> Accounting dashboard
                            </Link>
                        </Button>
                        <Badge variant="secondary" className="mb-2 ml-2">
                            Cashbook
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Cash movement</h1>
                        <p className="text-muted-foreground mt-1 max-w-3xl">
                            Follow money received into bank and cash clearing through to supplier payments, expenses and other cash outflows.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/accounting/general-ledger">Open general ledger</Link>
                    </Button>
                </div>

                <form
                    onSubmit={apply}
                    className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end"
                >
                    <Field>
                        <FieldLabel>From</FieldLabel>
                        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                    </Field>
                    <Field>
                        <FieldLabel>To</FieldLabel>
                        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                    </Field>
                    <Field>
                        <FieldLabel>Branch</FieldLabel>
                        <Select value={branchId} onValueChange={setBranchId}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all">All permitted branches</SelectItem>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.value} value={branch.value}>
                                            {branch.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Button type="submit">Apply</Button>
                </form>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Opening cash', value: summary.opening_balance, icon: Landmark },
                        { label: 'Cash received', value: summary.cash_in, icon: ArrowDownToLine },
                        { label: 'Cash expensed', value: summary.cash_out, icon: ArrowUpFromLine },
                        { label: 'Net movement', value: summary.net_movement, icon: Scale },
                        { label: 'Closing cash', value: summary.closing_balance, icon: WalletCards },
                    ].map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                <CardDescription>{label}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold tracking-tight">{money(value, currency)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Cash in versus cash out</CardTitle>
                        <CardDescription>Posted movement through bank and cash-clearing control accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthly.length ? (
                            <div
                                className="grid min-h-56 items-end gap-4"
                                style={{ gridTemplateColumns: `repeat(${monthly.length}, minmax(60px, 1fr))` }}
                            >
                                {monthly.map((row) => (
                                    <div key={row.month} className="flex h-full flex-col justify-end gap-2">
                                        <div className="flex flex-1 items-end justify-center gap-1">
                                            <div
                                                className="bg-primary w-full rounded-t"
                                                style={{ height: `${Math.max((row.cash_in / maximum) * 100, row.cash_in ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-destructive w-full rounded-t"
                                                style={{ height: `${Math.max((row.cash_out / maximum) * 100, row.cash_out ? 4 : 0)}%` }}
                                            />
                                        </div>
                                        <p className="text-muted-foreground text-center text-xs">{row.label}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
                                No posted cash movement in this period.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <section className="bg-card flex flex-col rounded-xl border">
                    <div className="flex flex-col gap-1 border-b px-4 py-4">
                        <h2 className="font-medium">Cash movement audit trail</h2>
                        <p className="text-muted-foreground text-sm">Every row links the cash impact to its journal and source document.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Journal / source</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Cash account</TableHead>
                                    <TableHead className="text-right">Cash in</TableHead>
                                    <TableHead className="text-right">Cash out</TableHead>
                                    <TableHead className="text-right">Running balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell>{movement.date}</TableCell>
                                        <TableCell>
                                            <p className="font-medium">{movement.journal_no}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {movement.source} · {movement.reference ?? movement.type}
                                            </p>
                                        </TableCell>
                                        <TableCell className="max-w-sm">{movement.description}</TableCell>
                                        <TableCell>{movement.branch ?? 'Organization-wide'}</TableCell>
                                        <TableCell>{movement.cash_account}</TableCell>
                                        <TableCell className="text-primary text-right font-medium">
                                            {movement.cash_in ? money(movement.cash_in, currency) : '—'}
                                        </TableCell>
                                        <TableCell className="text-destructive text-right font-medium">
                                            {movement.cash_out ? money(movement.cash_out, currency) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{money(movement.running_balance, currency)}</TableCell>
                                    </TableRow>
                                ))}
                                {!movements.length && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-muted-foreground h-28 text-center">
                                            No cash movements match the selected period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
