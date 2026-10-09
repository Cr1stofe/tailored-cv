"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ApplicationsPagination.module.scss";

export interface ApplicationsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export function ApplicationsPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: ApplicationsPaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={styles.container}>
      <span className={styles.info}>
        Exibindo {startItem}-{endItem} de {totalItems} candidaturas
      </span>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <div className={styles.pageNumbers}>
          {getPageNumbers().map((page, idx) =>
            typeof page === "number" ? (
              <button
                key={`page-${page}`}
                type="button"
                className={`${styles.pageButton} ${currentPage === page ? styles.active : ""}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            ) : (
              <span key={`ellipsis-${idx}`} className={styles.ellipsis}>
                {page}
              </span>
            ),
          )}
        </div>

        <button
          type="button"
          className={styles.navButton}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Próxima página"
        >
          <span>Próxima</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
