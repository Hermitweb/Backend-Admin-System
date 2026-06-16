export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ErrorResponse {
  code: number;
  message: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}