"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, LogIn, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import styles from "./login.module.scss";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await api.login(values);
      toast.success("Autenticação realizada com sucesso!");
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Credenciais inválidas";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginCard}>
      <div className={styles.header}>
        <div className={styles.brandIcon}>
          <Sparkles size={22} />
        </div>
        <h1>Acessar Tailored CV</h1>
        <p>Faça login para gerenciar seus currículos e vagas</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="email">E-mail</label>
          <div className={styles.inputWrapper}>
            <Mail size={16} className={styles.fieldIcon} />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              disabled={isLoading}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>
              {errors.email.message}
            </span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">Senha</label>
          <div className={styles.inputWrapper}>
            <Lock size={16} className={styles.fieldIcon} />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register("password")}
            />
          </div>
          {errors.password && (
            <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>
              {errors.password.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <LogIn size={16} />
              <span>Entrar na Plataforma</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.loginWrapper}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
