import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store"; // wherever your store is

export default function BreadCrumbs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role); // must be inside component

  if (!role) return null; // handle if role not loaded yet

  const parts = pathname.replace("/dashboard/", "").split("/");

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link underline="hover" color="inherit" onClick={() => navigate("/dashboard")}>
        Dashboard
      </Link>

      {parts.map((part, idx) => {
        const route = `/dashboard/${parts.slice(0, idx + 1).join("/")}`;
        const isLast = idx === parts.length - 1;

        return isLast ? (
          <Typography key={route} color="text.primary" sx={{ textTransform: "capitalize" }}>
            {part.replace("-", " ")}
          </Typography>
        ) : (
          <Link
            key={route}
            underline="hover"
            color="inherit"
            onClick={() => navigate(route)}
            sx={{ textTransform: "capitalize", cursor: "pointer" }}
          >
            {part.replace("-", " ")}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
