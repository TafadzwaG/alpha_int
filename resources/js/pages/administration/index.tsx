import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    ChartNoAxesCombined,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    Database,
    FileClock,
    FolderKanban,
    Landmark,
    ListChecks,
    Map,
    MapPin,
    PiggyBank,
    ReceiptText,
    Scale,
    Settings2,
    ShieldCheck,
    Stamp,
    Tags,
    UserRoundCheck,
    Users,
    Wallet,
    WalletCards,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Administration', href: '/administration' }];

const groups = [
    {
        title: 'Property operations',
        description: 'Set up developments and connect clients to available stands.',
        items: [
            { title: 'Developments', href: '/administration/developments', icon: Map },
            { title: 'Development phases', href: '/administration/development-phases', icon: FolderKanban },
            { title: 'Stand types', href: '/administration/stand-types', icon: Tags },
            { title: 'Stands', href: '/administration/stands', icon: MapPin },
            { title: 'Clients', href: '/administration/clients', icon: Users },
            { title: 'Stand allocations', href: '/administration/stand-allocations', icon: UserRoundCheck },
        ],
    },
    {
        title: 'Organization setup',
        description: 'Define the business, its branches and controlled numbering.',
        items: [
            { title: 'Organization', href: '/administration/organizations', icon: Building2 },
            { title: 'Branches', href: '/administration/branches', icon: MapPin },
            { title: 'System settings', href: '/administration/system-settings', icon: Settings2 },
            { title: 'Document sequences', href: '/administration/document-sequences', icon: ReceiptText },
        ],
    },
    {
        title: 'Charges & payments',
        description: 'Post charges, receive payments, allocate funds and review issued receipts.',
        items: [
            { title: 'Charges', href: '/administration/account-charges', icon: CircleDollarSign },
            { title: 'Payments', href: '/administration/payments', icon: WalletCards },
            { title: 'Payment allocations', href: '/administration/payment-allocations', icon: ListChecks },
            { title: 'Receipts', href: '/administration/receipts', icon: ReceiptText },
        ],
    },
    {
        title: 'Cash control',
        description: 'Control cashier sessions, bank deposits and daily reconciliation.',
        items: [
            { title: 'Cash sessions', href: '/administration/cash-sessions', icon: Wallet },
            { title: 'Bank deposits', href: '/administration/bank-deposits', icon: Landmark },
            { title: 'Reconciliation', href: '/administration/reconciliation-runs', icon: Scale },
        ],
    },
    {
        title: 'Expenses & approvals',
        description: 'Capture expenditure, approve requests and control petty cash movements.',
        items: [
            { title: 'Expenses', href: '/administration/expenses', icon: ReceiptText },
            { title: 'Approval queue', href: '/approvals', icon: Stamp },
            { title: 'Petty cash', href: '/administration/petty-cash-entries', icon: PiggyBank },
            { title: 'Management reports', href: '/reports', icon: ChartNoAxesCombined },
        ],
    },
    {
        title: 'Access control',
        description: 'Control who can use the ERP and what they can access.',
        items: [
            { title: 'Users & branch access', href: '/administration/users', icon: Users },
            { title: 'Roles', href: '/administration/roles', icon: ShieldCheck },
            { title: 'Permissions', href: '/administration/permissions', icon: ListChecks },
        ],
    },
    {
        title: 'Master data',
        description: 'Maintain the reference records used by operational modules.',
        items: [
            { title: 'Currencies', href: '/administration/currencies', icon: Banknote },
            { title: 'Exchange rates', href: '/administration/exchange-rates', icon: FileClock },
            { title: 'Payment methods', href: '/administration/payment-methods', icon: WalletCards },
            { title: 'Bank accounts', href: '/administration/bank-accounts', icon: Landmark },
            { title: 'Expense categories', href: '/administration/expense-categories', icon: ClipboardList },
        ],
    },
];

type Props = {
    summary: { branches: number; users: number; roles: number; auditEvents: number | null };
    canViewAudit: boolean;
    recentEvents: Array<{ id: number; event_type: string; subject: string; actor: string; occurred_at: string }>;
};

export default function Administration({ summary, canViewAudit, recentEvents }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Administration & access control" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Operations foundation
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Administration & access control</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            Manage property operations, the organization, access controls and the master data used across the ERP.
                        </p>
                    </div>
                    {canViewAudit && (
                        <Button variant="outline" asChild>
                            <Link href="/administration/audit-events">
                                <Database data-icon="inline-start" /> View audit trail
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Branches', summary.branches],
                        ['Users', summary.users],
                        ['Roles', summary.roles],
                        ...(canViewAudit ? [['Audit events', summary.auditEvents] as [string, number | null]] : []),
                    ].map(([label, value]) => (
                        <Card key={label}>
                            <CardContent className="p-4">
                                <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">{label}</p>
                                <p className="mt-2 text-2xl font-semibold">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="flex flex-col gap-5">
                        {groups.map((group) => (
                            <Card key={group.title}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{group.title}</CardTitle>
                                    <CardDescription>{group.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-2 sm:grid-cols-2">
                                    {group.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="hover:bg-accent group flex items-center gap-3 rounded-lg border p-3 transition-colors"
                                        >
                                            <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-md">
                                                <item.icon className="size-4" />
                                            </span>
                                            <span className="flex-1 font-medium">{item.title}</span>
                                            <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {canViewAudit && (
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle className="text-base">Recent changes</CardTitle>
                                <CardDescription>Latest configuration activity.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {recentEvents.length === 0 && (
                                    <p className="text-muted-foreground text-sm">Changes will appear here as Phase 1 records are managed.</p>
                                )}
                                {recentEvents.map((event) => (
                                    <div key={event.id} className="border-primary border-l-2 pl-3">
                                        <p className="font-medium">{event.event_type.replaceAll('.', ' ')}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {event.subject} · {event.actor}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">{new Date(event.occurred_at).toLocaleString()}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
