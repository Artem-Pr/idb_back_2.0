import {
  PaginationOptions,
  PaginationMeta,
  PaginatedResponse,
} from './pagination.types';

export class PaginationHelpers {
  /**
   * Build pagination options from request parameters
   */
  static buildPaginationOptions(
    page: number = 1,
    perPage: number = 50,
  ): PaginationOptions {
    const normalizedPage = Math.max(1, page);
    const normalizedPerPage = Math.min(Math.max(1, perPage), 1000); // Limit max per page
    const skip = (normalizedPage - 1) * normalizedPerPage;

    return {
      page: normalizedPage,
      perPage: normalizedPerPage,
      skip,
    };
  }

  /**
   * Build pagination metadata
   */
  static buildPaginationMeta(
    totalCount: number,
    page: number,
    perPage: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalCount / perPage);

    return {
      page,
      perPage,
      totalCount,
      totalPages,
    };
  }

  /**
   * Build paginated response
   */
  static buildPaginatedResponse<T>(
    items: T[],
    totalCount: number,
    page: number,
    perPage: number,
  ): PaginatedResponse<T> {
    const meta = this.buildPaginationMeta(totalCount, page, perPage);

    return {
      items,
      ...meta,
    };
  }
}
