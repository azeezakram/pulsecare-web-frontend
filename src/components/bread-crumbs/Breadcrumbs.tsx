import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { MENU_BY_ROLE } from "../navbar/menu.config";

export default function BreadCrumbs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);

  if (!role) return null;

  const pathnames = pathname.split("/").filter((x) => x);

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link 
        underline="hover" 
        color="inherit" 
        onClick={() => navigate("/dashboard")}
        sx={{ cursor: 'pointer' }}
      >
        Dashboard
      </Link>

      {pathnames.map((value, index) => {
        if (value === "dashboard" || value.toUpperCase() === role) return null;

        const isLast = index === pathnames.length - 1;
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;

        const menuItem = MENU_BY_ROLE[role as keyof typeof MENU_BY_ROLE]?.find(
          (item) => item.path === routeTo
        );

        const label = menuItem ? menuItem.label : value.replace(/-/g, " ");

        return isLast ? (
          <Typography 
            key={routeTo} 
            color="text.primary" 
            sx={{ textTransform: "capitalize" }}
          >
            {label}
          </Typography>
        ) : (
          <Link
            key={routeTo}
            underline="hover"
            color="inherit"
            onClick={() => navigate(routeTo)}
            sx={{ textTransform: "capitalize", cursor: "pointer" }}
          >
            {label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}