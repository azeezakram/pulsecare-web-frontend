import * as React from "react";
import { useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AppProvider, type Navigation, type Router, type Session } from "@toolpad/core/AppProvider";
import { DashboardLayout, ThemeSwitcher, type SidebarFooterProps } from "@toolpad/core/DashboardLayout";
import { Account, AccountPreview, type AccountPreviewProps } from "@toolpad/core/Account";
import { createTheme, useTheme } from "@mui/material/styles";
import { Stack, Box, Divider } from "@mui/material";

import { useAuthStore } from "../store/auth-store";
import { MENU_BY_ROLE } from "../components/navbar/menu.config";
import BreadCrumbs from "../components/bread-crumbs/Breadcrumbs";
import lightLogo from "../assets/static/logo-light.png";
import darkLogo from "../assets/static/logo-dark.png";
import { useUserProfilePicture } from "../features/user/user-service";

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
                  `drop-shadow(0px 2px 8px ${
                    t.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.32)"
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

function BrandLogo() {
  const themeObj = useTheme();
  return (
    <img
      src={themeObj.palette.mode === "dark" ? darkLogo : lightLogo}
      alt="Hospital logo"
      style={{ height: 35 }}
    />
  );
}

// ✅ Map SUPER roles to the same dashboard group
function roleToGroup(role?: string | null): "admin" | "doctor" | "nurse" | null {
  if (!role) return null;
  const r = role.toUpperCase();
  if (r === "ADMIN" || r === "SUPER_ADMIN") return "admin";
  if (r === "DOCTOR" || r === "SUPER_DOCTOR") return "doctor";
  if (r === "NURSE" || r === "SUPER_NURSE") return "nurse";
  return null;
}

// ✅ Map SUPER roles to base menu role
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

  const group = roleToGroup(role); // admin/doctor/nurse
  const menuRole = roleToMenuRole(role);

  // If role is not recognized, kick to login or a safe page
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

  const branding = useMemo(
    () => ({
      title: "",
      logo: <BrandLogo />,
    }),
    []
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
      signIn: () => {},
      signOut: () => {
        logout();
        navigate("/login");
      },
    }),
    [logout, navigate]
  );

  return (
    <AppProvider
      navigation={navigation}
      router={router}
      theme={theme}
      branding={branding}
      session={session}
      authentication={authentication}
    >
      <DashboardLayout
        slots={{
          toolbarActions: ThemeSwitcher,
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
