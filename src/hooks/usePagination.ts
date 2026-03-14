import { useState, useEffect } from "react"

interface UsePaginationOptions {
  initialPage?: number
  pagelimit?: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, pagelimit = 20 } = options
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)

  const goToPage = (page: number) => {
    if (page < 1) return
    if (page > totalPages) return
    setCurrentPage(page)
  }

  const goToPrevious = () => goToPage(currentPage - 1)
  const goToNext = () => goToPage(currentPage + 1)

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  return {
    currentPage,
    totalPages,
    setTotalPages,
    goToPage,
    goToPrevious,
    goToNext,
    canGoPrevious,
    canGoNext,
    limit: pagelimit,
  }
}
