import type { MediaOutput } from '../types';

export interface Pagination {
  currentPage: number;
  nPerPage: number;
  resultsCount: number;
  totalPages: number;
}

export interface GetFilesOutputDto {
  dynamicFolders: string[];
  files: MediaOutput[];
  filesSizeSum: number;
  searchPagination: Pagination;
}
