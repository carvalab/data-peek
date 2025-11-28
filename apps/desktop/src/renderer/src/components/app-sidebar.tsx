'use client'

import { MessageCircleQuestion, Settings2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { ConnectionSwitcher } from '@/components/connection-switcher'
import { ModeToggle } from '@/components/mode-toggle'
import { QueryHistory } from '@/components/query-history'
import { SchemaExplorer } from '@/components/schema-explorer'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/components/ui/sidebar'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0 bg-sidebar/80 backdrop-blur-xl" {...props}>
      <SidebarHeader className="pt-10">
        <ConnectionSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SchemaExplorer />
        <QueryHistory />

        {/* Secondary Navigation */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/settings">
                    <Settings2 className="size-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="https://github.com/your-repo/data-peek" target="_blank" rel="noreferrer">
                    <MessageCircleQuestion className="size-4" />
                    <span>Help</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ModeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
