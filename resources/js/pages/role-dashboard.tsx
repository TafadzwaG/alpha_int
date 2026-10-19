import { DashboardQuickActions } from '@/components/dashboard-quick-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Activity, Banknote, CalendarClock, ClipboardCheck, PhoneCall, ReceiptText, Users } from 'lucide-react';

const icons = {
    audit: ClipboardCheck,
    activity: Activity,
    cash: Banknote,
    payments: ReceiptText,
    clock: CalendarClock,
    clients: Users,
    phone: PhoneCall,
};
const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
];
type IconKey = keyof typeof icons;
type Props = {
    title: string;
    description: string;
    branch: string;
    cards: { label: string; value: number; icon: IconKey }[];
    actions: { label: string; href: string; icon: IconKey }[];
    items: { title: string; detail: string | null }[];
};

export default function RoleDashboard({ title, description, branch, cards, items }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }]}>
            <Head title={title} />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div>
                    <Badge variant="secondary">{branch}</Badge>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground mt-1">{description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card, index) => {
                        const Icon = icons[card.icon];
                        return (
                            <Card key={card.label}>
                                <CardHeader className="flex-row items-center justify-between">
                                    <CardDescription>{card.label}</CardDescription>
                                    <span className={`rounded-lg p-2 ${colors[index % colors.length]}`}>
                                        <Icon className="size-5" />
                                    </span>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-semibold">{card.value.toLocaleString()}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                <DashboardQuickActions workspace={title === 'Audit dashboard' ? 'audit' : title === 'Cashier dashboard' ? 'cashier' : 'sales'} />
                <Card>
                    <CardHeader>
                        <CardTitle>Recent activity and upcoming work</CardTitle>
                        <CardDescription>For your current branch and assigned work.</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 py-3">
                                <Activity className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                <div>
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                        {!items.length && <p className="text-muted-foreground py-4 text-sm">No activity or assigned work to show yet.</p>}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
