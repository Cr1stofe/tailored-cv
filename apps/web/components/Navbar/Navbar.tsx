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
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, UserSessionDto } from "@/services/api";
import styles from "./Navbar.module.scss";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSessionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
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

        {session && (
          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <nav
          className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ""} ${!session ? styles.guestNav : ""}`}
        >
          {session ? (
            <>
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className={`${styles.navLink} ${pathname === "/" ? styles.active : ""}`}
                title="Dashboard"
                aria-label="Dashboard"
                aria-current={pathname === "/" ? "page" : undefined}
              >
                <FileText size={16} />
                <span className={styles.navText}>Dashboard</span>
              </Link>

              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className={`${styles.navLink} ${pathname.startsWith("/profile") ? styles.active : ""}`}
                title="Master Profile"
                aria-label="Perfil"
                aria-current={
                  pathname.startsWith("/profile") ? "page" : undefined
                }
              >
                <User size={16} />
                <span className={styles.navText}>Perfil</span>
              </Link>

              <Link
                href="/applications"
                onClick={() => setIsMenuOpen(false)}
                className={`${styles.navLink} ${pathname === "/applications" ? styles.active : ""}`}
                title="Candidaturas"
                aria-label="Candidaturas"
                aria-current={pathname === "/applications" ? "page" : undefined}
              >
                <Briefcase size={16} />
                <span className={styles.navText}>Vagas</span>
              </Link>

              <Link
                href="/applications/new"
                onClick={() => setIsMenuOpen(false)}
                className={styles.newButton}
                title="Nova Vaga"
                aria-label="Nova candidatura"
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
