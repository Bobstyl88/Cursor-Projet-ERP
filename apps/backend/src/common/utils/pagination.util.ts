import { PaginationParams } from '../interfaces/pagination.interface';

export function safePagination(params: PaginationParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = params.search || undefined;

  return { page, limit, skip, sortBy, sortOrder, search };
}
