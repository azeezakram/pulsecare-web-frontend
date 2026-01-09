import { Link, useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="text-sm text-slate-600">
      <ol className="flex items-center gap-2">
        <li>
          <Link to="/" className="hover:underline">Home</Link>
        </li>
        {paths.map((segment, index) => {
          const url = "/" + paths.slice(0, index + 1).join("/");
          return (
            <li key={url} className="flex items-center gap-2">
              <span>/</span>
              <Link to={url} className="capitalize hover:underline">
                {segment.replace("-", " ")}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
