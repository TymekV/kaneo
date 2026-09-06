import { createFileRoute, Outlet } from "@tanstack/react-router";
import type React from "react";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { SidebarProvider } from "@/components/ui/sidebar";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { usePendingCheckout } from "@/hooks/use-pending-checkout";
import { useUserPreferencesEffects } from "@/hooks/use-user-preferences-effects";
import { useUserPreferencesStore } from "@/store/user-preferences";

export const Route = createFileRoute("/_layout/_authenticated/dashboard")({
  component: DashboardLayoutComponent,
});

function DashboardLayoutComponent() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();
  const { sidebarDefaultOpen } = useUserPreferencesStore();

  usePendingCheckout();
  useUserPreferencesEffects();

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <PageTitle
        title={t("navigation:page.projectsTitle")}
        hideAppName={!workspace?.name}
      />
      <Outlet />
    </SidebarProvider>
  );
}
