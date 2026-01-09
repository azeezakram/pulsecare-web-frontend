import * as React from 'react';
import { useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AppProvider, type Navigation, type Router, type Session } from "@toolpad/core/AppProvider";
import { DashboardLayout, ThemeSwitcher, type SidebarFooterProps } from "@toolpad/core/DashboardLayout";
import { Account, AccountPreview, type AccountPreviewProps } from '@toolpad/core/Account';
import { createTheme, useTheme } from "@mui/material/styles";
import { Stack, Box, Divider } from "@mui/material";

import { useAuthStore } from "../store/auth-store";
import { MENU_BY_ROLE } from "../components/navbar/menu.config";
import BreadCrumbs from "../components/bread-crumbs/Breadcrumbs";
import lightLogo from '../assets/static/logo-light.png';
import darkLogo from '../assets/static/logo-dark.png';
import { useUserProfilePicture } from '../features/user/user-service';

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
      <AccountPreview
        variant={mini ? 'condensed' : 'expanded'}
        handleClick={handleClick}
        open={open}
      />
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
      slots={{
        preview: PreviewComponent,
      }}
      slotProps={{
        popover: {
          transformOrigin: { horizontal: 'left', vertical: 'bottom' },
          anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
          disableAutoFocus: true,
          slotProps: {
            paper: {
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: (t) =>
                  `drop-shadow(0px 2px 8px ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'})`,
                mt: 1,
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  bottom: 10,
                  left: 0,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
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
      src={themeObj.palette.mode === 'dark' ? darkLogo : lightLogo}
      alt="Hospital logo"
      style={{ height: 35 }}
    />
  );
}


export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout); 

  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const profileImage = useUserProfilePicture(user?.id || "");

  React.useEffect(() => {
    if (!user) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser, user]);

  const roleLower = role?.toLowerCase();

  const navigation: Navigation = useMemo(() => {
    if (!role) return [];
    const currentRole = role.toUpperCase() as keyof typeof MENU_BY_ROLE;
    return MENU_BY_ROLE[currentRole].map((item) => ({
      segment: item.path.replace(`/dashboard/${roleLower}/`, ""),
      title: item.label,
      icon: <item.icon size={18} />,
    }));
  }, [role, roleLower]);

  // Router Logic
  const currentPath = useMemo(() => {
    const base = `/dashboard/${roleLower}`;
    const path = location.pathname.startsWith(base)
      ? location.pathname.replace(base, '')
      : location.pathname;
    return path || 'home';
  }, [location.pathname, roleLower]);

  const router: Router = useMemo(() => ({
    pathname: currentPath,
    searchParams: new URLSearchParams(),
    navigate: (path) => {
      const target = path.toString().startsWith('/') ? path.toString() : `/${path}`;
      navigate(`/dashboard/${roleLower}${target}`);
    },
  }), [currentPath, navigate, roleLower]);

  // Branding Logic
  const branding = useMemo(() => ({
    title: '',
    logo: <BrandLogo />,
  }), []);

  const session = useMemo<Session | null>(() => ({
    user: {
      name: user?.firstName + " " + user?.lastName || 'User',
      email: user?.email || '',
      image: profileImage.data || '',
    },
  }), [user, profileImage]);

  const authentication = useMemo(() => ({
    signIn: () => {}, 
    signOut: () => {
      logout();
      navigate('/login');
    },
  }), [logout, navigate]);

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
          sidebarFooter: SidebarFooterAccount 
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