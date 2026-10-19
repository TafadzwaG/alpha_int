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
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Banknote,
    BookOpenCheck,
    BookOpenText,
    Building2,
    ChartNoAxesCombined,
    CircleDollarSign,
    ClipboardList,
    FileClock,
    FileInput,
    FileKey2,
    FileUp,
    FolderKanban,
    Headphones,
    Landmark,
    LayoutGrid,
    ListChecks,
    ListTodo,
    Map,
    MapPin,
    Megaphone,
    MessageSquareText,
    PackageSearch,
    Percent,
    PiggyBank,
    ReceiptText,
    Scale,
    ScanSearch,
    ScrollText,
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
    const { auth, branchContext } = usePage<SharedData>().props;
    const permissions = auth.permissions ?? [];
    const visible = (items: NavItem[]) => items.filter((item) => auth.navigationUrls?.includes(item.url));
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard',
            icon: LayoutGrid,
        },
    ];
    const operationsItems: NavItem[] = [
        { title: 'Stands', url: '/administration/stands', icon: MapPin },
        { title: 'Stands map', url: '/administration/stands/map', icon: Map },
        { title: 'Clients', url: '/administration/clients', icon: Users },
        { title: 'Stand allocations', url: '/administration/stand-allocations', icon: UserRoundCheck },
    ];
    const receivablesItems: NavItem[] = [
        { title: 'Charges', url: '/administration/account-charges', icon: CircleDollarSign },
        { title: 'Payments', url: '/administration/payments', icon: WalletCards },
        { title: 'Payment allocations', url: '/administration/payment-allocations', icon: ListChecks },
        { title: 'Receipts', url: '/administration/receipts', icon: ReceiptText },
    ];
    const accountingItems: NavItem[] = [
        { title: 'Accounting dashboard', url: '/accounting', icon: BookOpenCheck },
        { title: 'Accounting control centre', url: '/accounting/control-centre', icon: ShieldCheck },
        { title: 'Daily activity', url: '/accounting/daily-activity', icon: FileInput },
        { title: 'Cash movement', url: '/accounting/cash-movement', icon: Banknote },
        { title: 'Debtors & ageing', url: '/accounting/debtors', icon: FileClock },
        { title: 'Interest review', url: '/accounting/interest-review', icon: Percent },
        { title: 'General ledger', url: '/accounting/general-ledger', icon: BookOpenText },
        { title: 'Financial reports', url: '/accounting/financial-reports', icon: ChartNoAxesCombined },
        { title: 'Suppliers & payables', url: '/accounting/payables', icon: ScrollText },
        { title: 'Supplier reconciliation', url: '/accounting/supplier-reconciliation', icon: ScanSearch },
        { title: 'VAT & tax report', url: '/accounting/tax-report', icon: Percent },
        { title: 'Products & services', url: '/accounting/master-data', icon: PackageSearch },
        { title: 'Accounting setup', url: '/accounting/settings', icon: Settings2 },
    ];
    const callCentreItems: NavItem[] = [
        { title: 'Call centre dashboard', url: '/call-centre', icon: Headphones },
        { title: 'Agent work queue', url: '/call-centre/queue', icon: ListTodo },
        ...(permissions.includes('call-centre.campaigns.manage')
            ? [
                  { title: 'Collection campaigns', url: '/call-centre/campaigns', icon: Megaphone },
                  { title: 'Bulk SMS', url: '/call-centre/bulk-sms', icon: MessageSquareText },
              ]
            : []),
        ...(permissions.includes('call-centre.reports.view')
            ? [{ title: 'Call centre reports', url: '/call-centre/reports', icon: ChartNoAxesCombined }]
            : []),
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
        { title: 'Developments', url: '/administration/developments', icon: Map },
        { title: 'Development phases', url: '/administration/development-phases', icon: FolderKanban },
        { title: 'Stand types', url: '/administration/stand-types', icon: Tags },
        { title: 'Import workbook', url: '/administration/data-import', icon: FileUp },
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
                    {branchContext.active && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild className="h-auto py-2" tooltip={`Switch branch · ${branchContext.active.name}`}>
                                <Link href="/select-branch" prefetch>
                                    <MapPin />
                                    <span className="min-w-0">
                                        <span className="text-muted-foreground block text-[10px] leading-none uppercase">Current branch</span>
                                        <span className="mt-1 block truncate font-medium">{branchContext.active.name}</span>
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {visible(operationsItems).length > 0 && <NavMain items={visible(operationsItems)} label="Property operations" />}
                {visible(callCentreItems).length > 0 && <NavSection title="Call centre" items={visible(callCentreItems)} />}
                {permissions.includes('phase-one.view') && (
                    <>
                        {visible(accountingItems).length > 0 && <NavSection title="Accounting" items={visible(accountingItems)} />}
                        {visible(receivablesItems).length > 0 && <NavSection title="Charges & payments" items={visible(receivablesItems)} />}
                        {visible(cashControlItems).length > 0 && <NavSection title="Cash control" items={visible(cashControlItems)} />}
                        {visible(expenseItems).length > 0 && <NavSection title="Expenses & approvals" items={visible(expenseItems)} />}
                        {visible(reportingItems).length > 0 && <NavSection title="Reporting" items={visible(reportingItems)} />}
                        {visible(administrationItems).length > 0 && (
                            <div className="mt-auto">
                                <NavSection title="Administration & access" items={visible(administrationItems)} defaultOpen={false} />
                            </div>
                        )}
                    </>
                )}
            </SidebarContent>

            <SidebarFooter>
                {auth.navigationUrls?.includes('/administration/audit-events') && (
                    <NavSection title="Activity" items={[{ title: 'Audit trail', url: '/administration/audit-events', icon: FileClock }]} />
                )}

                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
