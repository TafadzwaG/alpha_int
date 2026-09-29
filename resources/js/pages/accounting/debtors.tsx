import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { type AgingBucket, type Debtor, type Paginated } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Debtors & ageing', href: '/accounting/debtors' },
];

type Props = {
    currency: string;
    summary: {
        totalReceivables: number;
        overdueReceivables: number;
        over90: number;
        debtorCount: number;
        overdueDebtorCount: number;
    };
    aging: AgingBucket[];
    debtors: Paginated<Debtor>;
    filters: { search: string; bucket: string };
};

const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

const overdueVariant = (days: number): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (days > 90) return 'destructive';
    if (days > 60) return 'default';
    if (days > 0) return 'secondary';
    return 'outline';
};

export default function Debtors({ currency, summary, aging, debtors, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [bucket, setBucket] = useState(filters.bucket || 'all');

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/accounting/debtors',
            Object.fromEntries(Object.entries({ search, bucket: bucket === 'all' ? '' : bucket }).filter(([, value]) => value)),
            { preserveState: true, replace: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setBucket('all');
        router.get('/accounting/debtors', {}, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Debtors and ageing" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/accounting">
                                <ArrowLeft data-icon="inline-start" /> Accounting dashboard
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Users className="text-primary size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Debtors and ageing</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            See who owes you, how much is outstanding, and how long each balance has been overdue.
                        </p>
                    </div>
                    <Badge variant="secondary">{money(summary.totalReceivables, currency)} outstanding</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {aging.map((item) => (
                        <Link key={item.key} href={`/accounting/debtors?bucket=${item.key}`} preserveState>
                            <Card className={cn('h-full transition-shadow hover:shadow-sm', filters.bucket === item.key && 'ring-ring ring-2')}>
                                <CardHeader className="pb-2">
                                    <CardDescription>{item.label}</CardDescription>
                                    <CardTitle>{money(item.total, currency)}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-xs">
                                        {item.accounts} debtor{item.accounts === 1 ? '' : 's'}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Debtor schedule</CardTitle>
                        <CardDescription>
                            Base-currency balances from posted charges less allocations from approved payments. Draft and void charges are excluded.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <form onSubmit={applyFilters}>
                            <FieldGroup className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px_auto] md:items-end">
                                <Field>
                                    <FieldLabel htmlFor="debtor-search">Search debtors</FieldLabel>
                                    <Input
                                        id="debtor-search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Client, account, branch or phone"
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="ageing-bucket">Ageing bucket</FieldLabel>
                                    <Select value={bucket} onValueChange={setBucket}>
                                        <SelectTrigger id="ageing-bucket">
                                            <SelectValue placeholder="All buckets" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="all">All buckets</SelectItem>
                                                {aging.map((item) => (
                                                    <SelectItem key={item.key} value={item.key}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className="flex gap-2">
                                    <Button type="submit">
                                        <Search data-icon="inline-start" /> Apply
                                    </Button>
                                    {(filters.search || filters.bucket) && (
                                        <Button type="button" variant="outline" onClick={clearFilters}>
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </FieldGroup>
                        </form>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Debtor</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Oldest due</TableHead>
                                    <TableHead className="text-right">Current</TableHead>
                                    <TableHead className="text-right">1–30</TableHead>
                                    <TableHead className="text-right">31–60</TableHead>
                                    <TableHead className="text-right">61–90</TableHead>
                                    <TableHead className="text-right">90+</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtors.data.map((debtor) => (
                                    <TableRow key={debtor.account_id}>
                                        <TableCell>
                                            <p className="font-medium">{debtor.client}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {debtor.client_no} · {debtor.phone ?? 'No phone'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{debtor.account_no}</p>
                                            <p className="text-muted-foreground text-xs">{debtor.branch}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{date(debtor.oldest_due_date)}</p>
                                            <Badge variant={overdueVariant(debtor.days_overdue)}>
                                                {debtor.days_overdue > 0 ? `${debtor.days_overdue} days` : 'Current'}
                                            </Badge>
                                        </TableCell>
                                        {['current', '1-30', '31-60', '61-90', '90-plus'].map((key) => (
                                            <TableCell key={key} className="text-right">
                                                {debtor.aging[key] > 0 ? money(debtor.aging[key], currency) : '—'}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-semibold">{money(debtor.outstanding, currency)}</TableCell>
                                    </TableRow>
                                ))}
                                {debtors.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-muted-foreground h-32 text-center">
                                            No debtors match the selected filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {debtors.links.length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-muted-foreground text-xs">
                                    Showing {debtors.from ?? 0}–{debtors.to ?? 0} of {debtors.total} debtors
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {debtors.links.map((link, index) => (
                                        <Button
                                            key={`${link.label}-${index}`}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            asChild={Boolean(link.url)}
                                        >
                                            {link.url ? (
                                                <Link href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
