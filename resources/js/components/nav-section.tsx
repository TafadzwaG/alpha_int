import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

export function NavSection({ title, items }: { title: string; items: NavItem[] }) {
    const page = usePage();
    const currentPath = page.url.split(/[?#]/)[0];
    const isActive = (url: string) => currentPath === url || (url !== '/administration' && currentPath.startsWith(`${url}/`));
    const containsActiveItem = items.some((item) => isActive(item.url));

    return (
        <Collapsible defaultOpen={containsActiveItem} className="group/collapsible">
            <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger>
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
