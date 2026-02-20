/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { createTheme, useColorScheme } from "@mui/material/styles";
import { Account, AccountPreview, type AccountPreviewProps } from "@toolpad/core/Account";
import { AppProvider, type Navigation, type Router, type Session } from "@toolpad/core/AppProvider";
import { DashboardLayout, ThemeSwitcher, type SidebarFooterProps } from "@toolpad/core/DashboardLayout";
import * as React from "react";
import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import darkLogo from "../assets/static/logo/logo-dark.png";
import lightLogo from "../assets/static/logo/logo-light.png";
import BreadCrumbs from "../components/bread-crumbs/Breadcrumbs";
import { MENU_BY_ROLE } from "../components/navbar/menu.config";
import { useUserProfilePicture } from "../features/user/user-service";
import { useAuthStore } from "../store/auth-store";

const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-toolpad-color-scheme" },
  colorSchemes: { light: true, dark: true },
  typography: { fontFamily: "'Inter', sans-serif" },
});

function AccountSidebarPreview(props: AccountPreviewProps & { mini: boolean }) {
  const { handleClick, open, mini } = props;
  return (
    <Stack direction="column" p={0}>
      <Divider />
      <AccountPreview variant={mini ? "condensed" : "expanded"} handleClick={handleClick} open={open} />
    </Stack>
  );
}


function SidebarFooterAccount({ mini }: SidebarFooterProps) {
  const PreviewComponent = React.useMemo(() => {
    return function Component(props: AccountPreviewProps) {
      return <AccountSidebarPreview {...props} mini={mini} />;
    };
  }, [mini]);

  return (
    <Account
      slots={{ preview: PreviewComponent }}
      slotProps={{
        popover: {
          transformOrigin: { horizontal: "left", vertical: "bottom" },
          anchorOrigin: { horizontal: "right", vertical: "bottom" },
          disableAutoFocus: true,
          slotProps: {
            paper: {
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: (t) =>
                  `drop-shadow(0px 2px 8px ${t.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.32)"
                  })`,
                mt: 1,
                "&::before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  bottom: 10,
                  left: 0,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            },
          },
        },
      }}
    />
  );
}

function toPascalCaseRole(input?: string | null) {
  if (!input) return "";
  return input
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function roleChipProps(roleRaw?: string | null) {
  const r = (roleRaw ?? "").toUpperCase();
  if (r.includes("ADMIN")) return { color: "secondary" as const };
  if (r.includes("DOCTOR")) return { color: "success" as const };
  if (r.includes("NURSE")) return { color: "info" as const };
  return { color: "default" as const };
}

function RoleChip({ roleName }: { roleName?: string | null }) {
  const roleLabel = toPascalCaseRole(roleName);
  const chipColor = roleChipProps(roleName).color;

  if (!roleLabel) return null;

  return (
    <Chip
      label={roleLabel}
      size="small"
      color={chipColor}
      variant="filled"
      clickable={false}
      sx={{
        fontWeight: 900,
        borderRadius: 999,
        textDecoration: "none",
        "& *": { textDecoration: "none" },
      }}
    />
  );
}


function BrandLeft({ roleName }: { roleName?: string | null }) {
  const { mode } = useColorScheme();

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <img
        src={mode === "dark" ? lightLogo : darkLogo}
        alt="Hospital logo"
        style={{ height: 35 }}
      />
      <RoleChip roleName={roleName} />
    </Stack>
  );
}

function ClockPill() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Typography
      sx={{
        fontWeight: 900,
        fontSize: 13,
        px: 1.2,
        py: 0.6,
        borderRadius: 999,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: (t) =>
          t.palette.mode === "dark"
            ? "0 8px 18px rgba(0,0,0,0.35)"
            : "0 8px 18px rgba(0,0,0,0.12)",
        color: "text.primary",
        whiteSpace: "nowrap",
      }}
    >
      {now.toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </Typography>
  );
}

function BrandBar({ roleName }: { roleName?: string | null }) {
  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <BrandLeft roleName={roleName} />

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <ClockPill />
      </Box>

      <Box sx={{ width: 28 }} />
    </Box>
  );
}

function roleToGroup(role?: string | null): "admin" | "doctor" | "nurse" | null {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === "ADMIN" || r === "SUPER_ADMIN") return "admin";
  if (r === "DOCTOR" || r === "SUPER_DOCTOR") return "doctor";
  if (r === "NURSE" || r === "SUPER_NURSE") return "nurse";
  return null;
}

function roleToMenuRole(role?: string | null): keyof typeof MENU_BY_ROLE | null {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === "SUPER_ADMIN") return "ADMIN";
  if (r === "SUPER_DOCTOR") return "DOCTOR";
  if (r === "SUPER_NURSE") return "NURSE";
  return r as keyof typeof MENU_BY_ROLE;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  React.useEffect(() => {
    if (!user) fetchCurrentUser();
  }, [fetchCurrentUser, user]);

  const group = roleToGroup(role);
  const menuRole = roleToMenuRole(role);

  React.useEffect(() => {
    if (role && !group) navigate("/login", { replace: true });
  }, [role, group, navigate]);

  const shouldFetchImage = Boolean(user?.id && user?.imageUrl);
  const imgQuery = useUserProfilePicture(String(user?.id ?? ""), { enabled: shouldFetchImage });

  const navigation: Navigation = useMemo(() => {
    if (!menuRole) return [];
    const menu = MENU_BY_ROLE[menuRole] ?? [];
    return menu.map((item) => ({
      segment: item.path.replace(`/dashboard/${group}/`, ""),
      title: item.label,
      icon: <item.icon size={18} />,
    }));
  }, [menuRole, group]);

  const currentPath = useMemo(() => {
    if (!group) return "home";
    const base = `/dashboard/${group}`;
    const path = location.pathname.startsWith(base) ? location.pathname.replace(base, "") : location.pathname;
    return path || "home";
  }, [location.pathname, group]);

  const router: Router = useMemo(
    () => ({
      pathname: currentPath,
      searchParams: new URLSearchParams(),
      navigate: (path) => {
        if (!group) return;
        const target = path.toString().startsWith("/") ? path.toString() : `/${path}`;
        navigate(`/dashboard/${group}${target}`);
      },
    }),
    [currentPath, navigate, group]
  );

  const roleName = user?.role?.name ?? (role as any)?.name ?? (role as any);

  const branding = useMemo(
    () => ({
      title: "",
      logo: <BrandBar roleName={roleName} />,
    }),
    [roleName]
  );

  const session = useMemo<Session | null>(
    () => ({
      user: {
        name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "User",
        email: user?.email || "",
        image: imgQuery.data || "",
      },
    }),
    [user, imgQuery.data]
  );

  const authentication = useMemo(
    () => ({
      signIn: () => { },
      signOut: () => {
        logout();
        navigate("/login");
      },
    }),
    [logout, navigate]
  );


  return (
    <AppProvider navigation={navigation} router={router} theme={theme} branding={branding} session={session} authentication={authentication}>
      <DashboardLayout
        slots={{
          toolbarActions: () => <ThemeSwitcher />,
          sidebarFooter: SidebarFooterAccount,
        }}
      >
        <Box sx={{ p: 3 }}>
          <BreadCrumbs />
          <Outlet />
        </Box>
      </DashboardLayout>
    </AppProvider>
  );
}