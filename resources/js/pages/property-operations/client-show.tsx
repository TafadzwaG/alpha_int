import ClientPaymentDialog, { type ClientPaymentOptions } from '@/components/client-payment-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { InteractionDialog, TaskDialog } from '@/pages/call-centre/clients/show';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowUpRight,
    BadgeCheck,
    Building2,
    CalendarClock,
    CircleDollarSign,
    CreditCard,
    FileDown,
    FileText,
    FolderOpen,
    Hash,
    Landmark,
    MapPin,
    Phone,
    PhoneCall,
    Printer,
    Receipt,
    Sheet,
    TriangleAlert,
    Wallet,
} from 'lucide-react';

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
    account_id: number | null;
    account_no: string | null;
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
    documents: { receipts: number; statements: number };
    actions: { capturePayment: boolean; callCentre: boolean; recordCall: boolean; followUp: boolean; assignTasks: boolean };
    agents: Array<{ value: string; label: string }>;
    campaigns: Array<{ value: string; label: string }>;
    paymentOptions: ClientPaymentOptions;
    verification?: { issued: string; reference: string };
    allocations: Allocation[];
    callHistory: Array<{
        id: number;
        occurred_at: string | null;
        agent: string;
        branch: string | null;
        direction: string;
        duration_seconds: number | null;
        outcome: string | null;
        summary: string | null;
    }>;
};
const money = (amount: number, currency = 'USD') => `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2 }).format(amount)}`;
const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

export default function ClientShow({
    client,
    summary,
    documents,
    allocations,
    callHistory,
    verification,
    actions,
    agents,
    campaigns,
    paymentOptions,
}: Props) {
    const { flash } = usePage<SharedData>().props;
    const currency = allocations[0]?.currency ?? 'USD';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clients', href: '/administration/clients' },
        { title: client.name, href: `/administration/clients/${client.id}` },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <Button variant="ghost" size="sm" className="-ml-3 self-start" asChild>
                    <Link href="/administration/clients">
                        <ArrowLeft data-icon="inline-start" /> All clients
                    </Link>
                </Button>
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="excel" size="sm" asChild>
                        <a href={`/administration/clients/${client.id}/export/excel`}>
                            <Sheet data-icon="inline-start" />
                            Export Excel
                        </a>
                    </Button>
                    <Button variant="pdf" size="sm" asChild>
                        <a href={`/administration/clients/${client.id}/export/pdf`}>
                            <FileDown data-icon="inline-start" />
                            Export PDF
                        </a>
                    </Button>
                </div>
                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                <Card className="ring-foreground/10 border-0 shadow-none ring-1">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm">Client actions</CardTitle>
                        <CardDescription>Record activity and manage this client's accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 p-4 pt-2">
                        {actions.capturePayment && <ClientPaymentDialog options={paymentOptions} />}
                        {actions.recordCall && (
                            <InteractionDialog
                                client={client}
                                allocations={allocations.map((item) => ({
                                    accountId: item.account_id,
                                    accountNo: item.account_no,
                                    standNo: item.stand_no,
                                }))}
                                agents={agents}
                                campaigns={campaigns}
                            />
                        )}
                        {actions.followUp && <TaskDialog client={client} agents={agents} canAssign={actions.assignTasks} />}
                        {client.phone && (
                            <Button variant="outline" asChild>
                                <a href={`tel:${client.phone}`}>
                                    <Phone data-icon="inline-start" />
                                    Call client
                                </a>
                            </Button>
                        )}
                        {actions.callCentre && (
                            <Button variant="outline" asChild>
                                <Link href={`/call-centre/clients/${client.id}`}>
                                    <PhoneCall data-icon="inline-start" />
                                    Call centre workspace
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-emerald-200 bg-emerald-50/40 shadow-none dark:border-emerald-900 dark:bg-emerald-950/10">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <FileText className="size-4 text-emerald-700 dark:text-emerald-300" />
                            Client document centre
                        </CardTitle>
                        <CardDescription>
                            Print or download every issued POS receipt and all account statements associated with {client.name}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 p-4 pt-2">
                        <Button variant="outline" disabled={documents.receipts === 0} asChild={documents.receipts > 0}>
                            {documents.receipts > 0 ? (
                                <a href={`/administration/clients/${client.id}/receipts/print`} target="_blank" rel="noreferrer">
                                    <Printer data-icon="inline-start" />
                                    Print all receipts ({documents.receipts})
                                </a>
                            ) : (
                                <span title="No issued receipts are available">
                                    <Printer data-icon="inline-start" /> No receipts to print
                                </span>
                            )}
                        </Button>
                        <Button variant="pdf" disabled={documents.receipts === 0} asChild={documents.receipts > 0}>
                            {documents.receipts > 0 ? (
                                <a href={`/administration/clients/${client.id}/receipts/pdf`}>
                                    <FileDown data-icon="inline-start" /> Download all receipts
                                </a>
                            ) : (
                                <span>
                                    <FileDown data-icon="inline-start" /> Download receipts
                                </span>
                            )}
                        </Button>
                        <Button variant="outline" disabled={documents.statements === 0} asChild={documents.statements > 0}>
                            {documents.statements > 0 ? (
                                <a href={`/administration/clients/${client.id}/statement/print`} target="_blank" rel="noreferrer">
                                    <Printer data-icon="inline-start" />
                                    Print statement ({documents.statements})
                                </a>
                            ) : (
                                <span title="No client account is available">
                                    <Printer data-icon="inline-start" /> No statement to print
                                </span>
                            )}
                        </Button>
                        <Button variant="pdf" disabled={documents.statements === 0} asChild={documents.statements > 0}>
                            {documents.statements > 0 ? (
                                <a href={`/administration/clients/${client.id}/statement/pdf`}>
                                    <FileDown data-icon="inline-start" /> Download statement
                                </a>
                            ) : (
                                <span>
                                    <FileDown data-icon="inline-start" /> Download statement
                                </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>
                {verification && (
                    <Alert>
                        <BadgeCheck aria-hidden="true" />
                        <AlertDescription>
                            Verified client reference: {verification.reference}. Export issued {new Date(verification.issued).toLocaleString('en-ZW')}
                            . The current record is shown below for comparison with the PDF.
                        </AlertDescription>
                    </Alert>
                )}
                <section className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1" aria-label="Client profile">
                    <div className="bg-primary h-2" />
                    <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
                        <Avatar className="size-16 rounded-2xl">
                            <AvatarFallback className="bg-primary/10 text-primary rounded-2xl text-xl font-semibold">
                                {client.name
                                    .split(' ')
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((name) => name[0])
                                    .join('')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Client overview</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{client.name}</h1>
                                <Badge variant="secondary" className="gap-1 capitalize">
                                    <BadgeCheck aria-hidden="true" className="size-3" />
                                    {client.status}
                                </Badge>
                            </div>
                            <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                                <span className="flex items-center gap-2">
                                    <Hash aria-hidden="true" className="size-4" />
                                    {client.client_no}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Building2 aria-hidden="true" className="size-4" />
                                    {client.branch}
                                </span>
                                {client.phone ? (
                                    <a href={`tel:${client.phone}`} className="hover:text-foreground flex items-center gap-2">
                                        <Phone aria-hidden="true" className="size-4" />
                                        {client.phone}
                                    </a>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Phone aria-hidden="true" className="size-4" />
                                        No phone recorded
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="bg-muted/50 flex items-center gap-3 rounded-lg px-4 py-3">
                            <FolderOpen aria-hidden="true" className="text-muted-foreground size-5" />
                            <div>
                                <p className="text-xl font-semibold tabular-nums">{client.files.length}</p>
                                <p className="text-muted-foreground text-xs">Client files</p>
                            </div>
                        </div>
                    </div>
                </section>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Stand allocations', value: summary.allocations, icon: MapPin, detail: 'Recorded purchases' },
                        {
                            label: 'Purchase value',
                            value: money(summary.purchase_value, currency),
                            icon: CircleDollarSign,
                            detail: 'Total contracted value',
                        },
                        { label: 'Total paid', value: money(summary.paid, currency), icon: Receipt, detail: 'Payments received' },
                        { label: 'Outstanding', value: money(summary.balance, currency), icon: Wallet, detail: 'Remaining balance' },
                        { label: 'Overdue installments', value: summary.overdue_installments, icon: TriangleAlert, detail: 'Installments past due' },
                    ].map(({ label, value, icon: Icon, detail }) => (
                        <Card key={label} className="ring-foreground/10 border-0 shadow-none ring-1">
                            <CardHeader className="gap-3 p-4 pb-2">
                                <div className="flex items-center justify-between gap-2">
                                    <CardDescription>{label}</CardDescription>
                                    <Icon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                </div>
                                <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-muted-foreground text-xs">{detail}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <Card className="ring-foreground/10 min-w-0 border-0 shadow-none ring-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FolderOpen aria-hidden="true" className="text-muted-foreground size-5" />
                                Client files
                            </CardTitle>
                            <CardDescription>Operational files held by branch.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {client.files.length === 0 && (
                                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                                    No client files recorded.
                                </p>
                            )}
                            {client.files.map((file) => (
                                <div key={file.id} className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2 font-medium">
                                            <FileText aria-hidden="true" className="text-muted-foreground size-4" />
                                            {file.file_no}
                                        </span>
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
                    <Card className="ring-foreground/10 min-w-0 border-0 shadow-none ring-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Landmark aria-hidden="true" className="text-muted-foreground size-5" />
                                Stand purchases
                            </CardTitle>
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
                                            <TableCell colSpan={7} className="h-56 text-center">
                                                <div className="flex flex-col items-center gap-2 py-8">
                                                    <div className="bg-muted mb-2 rounded-full p-4">
                                                        <Landmark aria-hidden="true" className="text-muted-foreground size-6" />
                                                    </div>
                                                    <p className="font-medium">No stand purchases yet</p>
                                                    <p className="text-muted-foreground text-sm">
                                                        Purchases and installment balances will appear here once recorded.
                                                    </p>
                                                </div>
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
                                                    <Link href={`/administration/stand-allocations/${allocation.id}`}>
                                                        <CreditCard data-icon="inline-start" />
                                                        Account
                                                        <ArrowUpRight data-icon="inline-end" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <Card className="ring-foreground/10 min-w-0 border-0 shadow-none ring-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PhoneCall aria-hidden="true" className="text-muted-foreground size-5" />
                            Call history<Badge variant="secondary">{callHistory.length}</Badge>
                        </CardTitle>
                        <CardDescription>Phone conversations and outcomes, most recent first.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date / agent</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Direction</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Outcome</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {callHistory.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-36 text-center">
                                            <PhoneCall aria-hidden="true" className="text-muted-foreground mx-auto mb-3 size-6" />
                                            <p className="font-medium">No calls recorded yet</p>
                                            <p className="text-muted-foreground mt-1 text-sm">Calls logged by the call centre will appear here.</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {callHistory.map((call) => (
                                    <TableRow key={call.id}>
                                        <TableCell>
                                            <p>{call.occurred_at ? new Date(call.occurred_at).toLocaleString('en-ZW') : '�'}</p>
                                            <p className="text-muted-foreground text-xs">{call.agent}</p>
                                        </TableCell>
                                        <TableCell>{call.branch ?? '�'}</TableCell>
                                        <TableCell className="capitalize">{call.direction ?? '�'}</TableCell>
                                        <TableCell>
                                            {call.duration_seconds == null
                                                ? '�'
                                                : `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{call.outcome?.replaceAll('_', ' ') ?? '�'}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-md whitespace-normal">{call.summary ?? '�'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
