import React from 'react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  const { page, pages, total, limit } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate range of page numbers
  const pageNumbers = [];
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(pages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="pagination-container" aria-label="Catalog pagination">
      <div className="pagination-info">
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{total}</strong>
      </div>

      <div className="pagination-buttons">
        <button
          type="button"
          className="page-nav-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {pageNumbers.map((num) => (
          <button
            key={num}
            type="button"
            className={`page-num-btn ${num === page ? 'active' : ''}`}
            onClick={() => onPageChange(num)}
            aria-current={num === page ? 'page' : undefined}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          className="page-nav-btn"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}
