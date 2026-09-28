import { NavMain } from '@/components/nav-main';
import { NavSection } from '@/components/nav-section';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    ChartNoAxesCombined,
    CircleDollarSign,
    ClipboardList,
    FileClock,
    FileKey2,
    FolderKanban,
    Landmark,
    LayoutGrid,
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
import AppLogo from './app-logo';

export function AppSidebar() {
    const permissions = usePage().props.auth.permissions ?? [];
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard',
            icon: LayoutGrid,
        },
    ];
    const operationsItems: NavItem[] = [
        { title: 'Developments', url: '/administration/developments', icon: Map },
        { title: 'Development phases', url: '/administration/development-phases', icon: FolderKanban },
        { title: 'Stand types', url: '/administration/stand-types', icon: Tags },
        { title: 'Stands', url: '/administration/stands', icon: MapPin },
        { title: 'Clients', url: '/administration/clients', icon: Users },
        { title: 'Stand allocations', url: '/administration/stand-allocations', icon: UserRoundCheck },
    ];
    const receivablesItems: NavItem[] = [
        { title: 'Charges', url: '/administration/account-charges', icon: CircleDollarSign },
        { title: 'Payments', url: '/administration/payments', icon: WalletCards },
        { title: 'Payment allocations', url: '/administration/payment-allocations', icon: ListChecks },
        { title: 'Receipts', url: '/administration/receipts', icon: ReceiptText },
    ];
    const cashControlItems: NavItem[] = [
        { title: 'Cash sessions', url: '/administration/cash-sessions', icon: Wallet },
        { title: 'Bank deposits', url: '/administration/bank-deposits', icon: Landmark },
        { title: 'Reconciliation', url: '/administration/reconciliation-runs', icon: Scale },
    ];
    const expenseItems: NavItem[] = [
        { title: 'Expenses', url: '/administration/expenses', icon: ReceiptText },
        { title: 'Approval queue', url: '/approvals', icon: Stamp },
        { title: 'Petty cash', url: '/administration/petty-cash-entries', icon: PiggyBank },
    ];
    const reportingItems: NavItem[] = [{ title: 'Reports', url: '/reports', icon: ChartNoAxesCombined }];
    const administrationItems: NavItem[] = [
        { title: 'Administration overview', url: '/administration', icon: ShieldCheck },
        { title: 'Organization', url: '/administration/organizations', icon: Building2 },
        { title: 'Branches', url: '/administration/branches', icon: MapPin },
        { title: 'Users & branch access', url: '/administration/users', icon: Users },
        { title: 'Roles', url: '/administration/roles', icon: FileKey2 },
        { title: 'Permissions', url: '/administration/permissions', icon: ListChecks },
        { title: 'System settings', url: '/administration/system-settings', icon: Settings2 },
        { title: 'Document sequences', url: '/administration/document-sequences', icon: ReceiptText },
        { title: 'Currencies', url: '/administration/currencies', icon: Banknote },
        { title: 'Exchange rates', url: '/administration/exchange-rates', icon: CircleDollarSign },
        { title: 'Payment methods', url: '/administration/payment-methods', icon: WalletCards },
        { title: 'Bank accounts', url: '/administration/bank-accounts', icon: Landmark },
        { title: 'Expense categories', url: '/administration/expense-categories', icon: ClipboardList },
        ...(permissions.includes('audit.view') ? [{ title: 'Audit trail', url: '/administration/audit-events', icon: FileClock }] : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {permissions.includes('phase-one.view') && (
                    <>
                        <NavSection title="Property operations" items={operationsItems} />
                        <NavSection title="Charges & payments" items={receivablesItems} />
                        <NavSection title="Cash control" items={cashControlItems} />
                        {permissions.includes('expenses.view') && <NavSection title="Expenses & approvals" items={expenseItems} />}
                        {permissions.includes('reports.view') && <NavSection title="Reporting" items={reportingItems} />}
                        <div className="mt-auto">
                            <NavSection title="Administration & access" items={administrationItems} />
                        </div>
                    </>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
