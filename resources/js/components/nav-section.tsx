import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

export function NavSection({ title, items, defaultOpen = true }: { title: string; items: NavItem[]; defaultOpen?: boolean }) {
    const page = usePage();
    const currentPath = page.url.split(/[?#]/)[0];
    const isSectionRoot = (url: string) => ['/administration', '/accounting', '/call-centre'].includes(url);
    const isActive = (url: string) => currentPath === url || (!isSectionRoot(url) && currentPath.startsWith(`${url}/`));

    return (
        <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
            <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="cursor-pointer">
                        {title}
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                                        <Link href={item.url} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}
