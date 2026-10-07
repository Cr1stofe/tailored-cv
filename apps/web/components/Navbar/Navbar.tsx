"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  User,
  Briefcase,
  Plus,
  Sparkles,
  LogIn,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { api, UserSessionDto } from "@/services/api";
import styles from "./Navbar.module.scss";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSessionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const data = await api.getSession();
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [pathname, checkSession]);

  const handleLogout = async () => {
    try {
      await api.logout();
      setSession(null);
      toast.info("Sessão finalizada");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Erro ao encerrar sessão");
    }
  };

  const isAuthPage = pathname === "/login";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoArea}>
          <Link href="/" className={styles.brand}>
            <div className={styles.iconWrapper}>
              <Sparkles size={18} />
            </div>
            <span>Tailored CV</span>
          </Link>
          <span className={styles.badge}>Never invent. Only reframe.</span>
        </div>

        <nav className={styles.nav}>
          {session ? (
            <>
              <Link
                href="/"
                className={`${styles.navLink} ${pathname === "/" ? styles.active : ""}`}
                title="Dashboard"
              >
                <FileText size={16} />
                <span className={styles.navText}>Dashboard</span>
              </Link>

              <Link
                href="/profile"
                className={`${styles.navLink} ${pathname.startsWith("/profile") ? styles.active : ""}`}
                title="Master Profile"
              >
                <User size={16} />
                <span className={styles.navText}>Perfil</span>
              </Link>

              <Link
                href="/applications"
                className={`${styles.navLink} ${pathname === "/applications" ? styles.active : ""}`}
                title="Candidaturas"
              >
                <Briefcase size={16} />
                <span className={styles.navText}>Vagas</span>
              </Link>

              <Link
                href="/applications/new"
                className={styles.newButton}
                title="Nova Vaga"
              >
                <Plus size={16} />
                <span className={styles.newButtonText}>Nova Vaga</span>
              </Link>

              <div className={styles.userArea}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={styles.logoutButton}
                  title="Encerrar sessão"
                >
                  <LogOut size={14} />
                  <span className={styles.logoutText}>Sair</span>
                </button>
              </div>
            </>
          ) : (
            !isLoading &&
            !isAuthPage && (
              <Link href="/login" className={styles.loginButton}>
                <LogIn size={16} />
                <span>Entrar</span>
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
