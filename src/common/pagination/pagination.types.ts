export interface PaginationRequest {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginationOptions {
  page: number;
  perPage: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}
