"use client";

import {
  Search,
  X,
  RotateCcw,
  Filter,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import styles from "./ApplicationsFilters.module.scss";

export interface ApplicationsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStack: string;
  onStackChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  totalResults: number;
  totalAll: number;
}

export function ApplicationsFilters({
  search,
  onSearchChange,
  selectedStack,
  onStackChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortByChange,
  onReset,
  hasActiveFilters,
  totalResults,
  totalAll,
}: ApplicationsFiltersProps) {
  return (
    <div className={styles.container}>
      <div className={styles.mainRow}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por cargo, empresa ou palavra-chave..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => onSearchChange("")}
              aria-label="Limpar pesquisa"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filtersGroup}>
          <div className={styles.selectWrapper}>
            <Layers size={14} className={styles.selectIcon} />
            <select
              className={styles.select}
              value={selectedStack}
              onChange={(e) => onStackChange(e.target.value)}
              aria-label="Filtrar por especialidade"
            >
              <option value="ALL">Todas as Stacks</option>
              <option value="FULLSTACK">Full Stack</option>
              <option value="BACKEND">Backend</option>
              <option value="FRONTEND">Frontend</option>
              <option value="MOBILE">Mobile</option>
              <option value="DEVOPS">DevOps / Cloud</option>
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <Filter size={14} className={styles.selectIcon} />
            <select
              className={styles.select}
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filtrar por status"
            >
              <option value="ALL">Todos os Status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="ANALYZED">Analisada</option>
              <option value="TAILORED">Currículo Adaptado</option>
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <ArrowUpDown size={14} className={styles.selectIcon} />
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              aria-label="Ordenar por"
            >
              <option value="newest">Mais recentes primeiro</option>
              <option value="oldest">Mais antigas primeiro</option>
              <option value="match_desc">Maior aderência ATS</option>
              <option value="match_asc">Menor aderência ATS</option>
              <option value="company_asc">Empresa (A-Z)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={onReset}
              title="Limpar todos os filtros"
            >
              <RotateCcw size={14} />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={styles.countText}>
          Mostrando <strong>{totalResults}</strong>{" "}
          {totalResults === 1 ? "vaga" : "vagas"}{" "}
          {hasActiveFilters && `de um total de ${totalAll}`}
        </span>
      </div>
    </div>
  );
}
