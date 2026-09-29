import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarClock, Landmark, Phone } from 'lucide-react';

type Allocation = {
    id: number;
    stand_no: string;
    development: string;
    branch: string;
    allocated_at: string | null;
    price: number;
    paid: number;
    balance: number;
    currency: string;
    status: string;
    next_due_date: string | null;
    overdue_installments: number;
};
type Props = {
    client: {
        id: number;
        client_no: string;
        name: string;
        phone: string | null;
        branch: string;
        status: string;
        files: Array<{ id: number; file_no: string; branch: string; opened_at: string; status: string }>;
    };
    summary: { allocations: number; purchase_value: number; paid: number; balance: number; overdue_installments: number };
    allocations: Allocation[];
};
const money = (amount: number, currency = 'USD') => `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2 }).format(amount)}`;
const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

export default function ClientShow({ client, summary, allocations }: Props) {
    const currency = allocations[0]?.currency ?? 'USD';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clients', href: '/administration/clients' },
        { title: client.name, href: `/administration/clients/${client.id}` },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div>
                    <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                        <Link href="/administration/clients">
                            <ArrowLeft data-icon="inline-start" /> All clients
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
                        <Badge variant="secondary" className="capitalize">
                            {client.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        {client.client_no} · {client.branch}
                        {client.phone && (
                            <span>
                                {' '}
                                · <Phone className="mx-1 inline size-3.5" />
                                {client.phone}
                            </span>
                        )}
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <Card>
                        <CardHeader>
                            <CardDescription>Stand allocations</CardDescription>
                            <CardTitle>{summary.allocations}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Purchase value</CardDescription>
                            <CardTitle>{money(summary.purchase_value, currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Total paid</CardDescription>
                            <CardTitle>{money(summary.paid, currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Outstanding</CardDescription>
                            <CardTitle>{money(summary.balance, currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Overdue installments</CardDescription>
                            <CardTitle className={summary.overdue_installments ? 'text-destructive' : ''}>{summary.overdue_installments}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
                <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client files</CardTitle>
                            <CardDescription>Operational files held by branch.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {client.files.map((file) => (
                                <div key={file.id} className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{file.file_no}</span>
                                        <Badge variant="outline" className="capitalize">
                                            {file.status}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        <Landmark className="mr-1 inline size-3" />
                                        {file.branch} · opened {date(file.opened_at)}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Stand purchases</CardTitle>
                            <CardDescription>Installment position across all allocations.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Stand</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Paid</TableHead>
                                        <TableHead>Balance</TableHead>
                                        <TableHead>Next due</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-muted-foreground h-28 text-center">
                                                No stand purchases recorded.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {allocations.map((allocation) => (
                                        <TableRow key={allocation.id}>
                                            <TableCell className="font-medium">
                                                {allocation.development} · {allocation.stand_no || 'Unassigned'}
                                            </TableCell>
                                            <TableCell>{allocation.branch}</TableCell>
                                            <TableCell>{money(allocation.price, allocation.currency)}</TableCell>
                                            <TableCell>{money(allocation.paid, allocation.currency)}</TableCell>
                                            <TableCell>{money(allocation.balance, allocation.currency)}</TableCell>
                                            <TableCell className={allocation.overdue_installments ? 'text-destructive' : ''}>
                                                <CalendarClock className="mr-1 inline size-3.5" />
                                                {date(allocation.next_due_date)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" asChild>
                                                    <Link href={`/administration/stand-allocations/${allocation.id}`}>Account</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
