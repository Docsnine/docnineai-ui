import CTA from "@/components/CTA";
import Footer from "@/components/footer";
import TopHeader from "@/components/header";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
    return (
        <div>
            <TopHeader />

            <main className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}