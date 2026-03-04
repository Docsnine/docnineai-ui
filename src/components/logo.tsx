import { Link } from "react-router-dom";
import { useTheme } from "./theme-provider";

function ApplicationLogo({ link, className }: { link?: string; className?: string }) {
    const { theme } = useTheme()

    return (
        <Link to={link || "/"}>
            <img
                src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                alt="Docnine Logo"
                className={`h-8 w-auto ${className || ""}`}
            />
        </Link>
    );
}

export default ApplicationLogo;