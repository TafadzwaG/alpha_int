import { Card, CardContent } from '@/components/ui/card';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    Banknote,
    CalendarClock,
    ClipboardCheck,
    FileSearch,
    Headphones,
    ListChecks,
    MapPinned,
    Megaphone,
    ReceiptText,
    Users,
} from 'lucide-react';

const actions = [
    { label: 'Clients', detail: 'Find a client account', href: '/administration/clients', icon: Users },
    { label: 'Payments', detail: 'Review payments and receipts', href: '/administration/payments', icon: Banknote },
    { label: 'My work queue', detail: 'Open assigned follow-ups', href: '/call-centre/queue', icon: Headphones },
    { label: 'Find a client', detail: 'Search before a conversation', href: '/call-centre', icon: Users },
    { label: 'Debtors & ageing', detail: 'Review overdue balances', href: '/accounting/debtors', icon: CalendarClock },
    { label: 'Cash sessions', detail: 'Review your cash sessions', href: '/administration/cash-sessions', icon: Banknote },
    { label: 'Receipts', detail: 'Find issued receipts', href: '/administration/receipts', icon: ReceiptText },
    { label: 'Payment allocations', detail: 'Review applied payments', href: '/administration/payment-allocations', icon: ListChecks },
    { label: 'Stand allocations', detail: 'View client purchases', href: '/administration/stand-allocations', icon: MapPinned },
    { label: 'Stands map', detail: 'Browse available stands visually', href: '/administration/stands/map', icon: MapPinned },
    { label: 'Approvals', detail: 'Review the approval queue', href: '/approvals', icon: ClipboardCheck },
    { label: 'Audit trail', detail: 'Inspect recorded changes', href: '/administration/audit-events', icon: FileSearch },
    { label: 'Reports', detail: 'Open management reporting', href: '/reports', icon: ReceiptText },
    { label: 'Campaigns', detail: 'Manage collection campaigns', href: '/call-centre/campaigns', icon: Megaphone },
    { label: 'Call centre reports', detail: 'Review contact performance', href: '/call-centre/reports', icon: ReceiptText },
];
const colors = [
    'bg-blue-700 hover:bg-blue-800',
    'bg-emerald-700 hover:bg-emerald-800',
    'bg-amber-700 hover:bg-amber-800',
    'bg-slate-700 hover:bg-slate-800',
    'bg-cyan-700 hover:bg-cyan-800',
    'bg-rose-700 hover:bg-rose-800',
];
const orders: Record<string, string[]> = {
    operations: ['Stands map', 'Clients', 'Payments', 'Stand allocations', 'Debtors & ageing', 'Approvals'],
    accounting: ['Debtors & ageing', 'Payments', 'Payment allocations', 'Receipts', 'Reports', 'Clients'],
    calls: ['Find a client', 'My work queue', 'Campaigns', 'Call centre reports'],
    audit: ['Audit trail', 'Reports', 'Debtors & ageing', 'Approvals', 'Receipts'],
    cashier: ['Payments', 'Cash sessions', 'Receipts', 'Clients'],
    sales: ['Stands map', 'My work queue', 'Find a client', 'Clients', 'Stand allocations'],
};

export function DashboardQuickActions({ workspace = 'operations' }: { workspace?: string }) {
    const { auth } = usePage<SharedData>().props;
    const order = orders[workspace];
    const visible = (order ? order.flatMap((label) => actions.filter((action) => action.label === label)) : actions)
        .filter((action) => auth.navigationUrls?.includes(action.href))
        .slice(0, 6);
    if (!visible.length) return null;
    return (
        <Card>
            <CardContent className="p-3 sm:p-4">
                <div className="mb-3">
                    <h2 className="font-semibold">Quick actions</h2>
                    <p className="text-muted-foreground text-xs">Frequent workflows for your role</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {visible.map((action, index) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className={`group focus-visible:outline-ring flex min-w-0 items-center gap-3 rounded-md px-3 py-3 text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${colors[index % colors.length]}`}
                        >
                            <action.icon className="size-5 shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{action.label}</span>
                                <span className="mt-0.5 block text-xs text-white/80">{action.detail}</span>
                            </span>
                            <ArrowUpRight className="size-4 shrink-0" />
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
