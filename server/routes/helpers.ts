export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  wantsPagination: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function parsePagination(query: Record<string, any>): PaginationParams {
  const wantsPagination = query.pagination === '1' || query.pagination === 'true';
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(query.limit as string) || 50), 200);
  const offset = (page - 1) * limit;
  return { page, limit, offset, wantsPagination };
}

export function wrapPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): T[] | PaginatedResponse<T> {
  if (!params.wantsPagination) {
    return data;
  }
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
}

export function sliceForPagination<T>(items: T[], params: PaginationParams): { sliced: T[]; total: number } {
  const total = items.length;
  const sliced = items.slice(params.offset, params.offset + params.limit);
  return { sliced, total };
}
