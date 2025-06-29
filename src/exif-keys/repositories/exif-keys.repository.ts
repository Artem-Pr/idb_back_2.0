import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { Result, success, failure } from '../types/result.type';

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  type?: ExifValueType;
  searchTerm?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface IExifKeysRepository {
  findAll(): Promise<ExifKeys[]>;
  findPaginated(
    options: PaginationOptions,
  ): Promise<Result<PaginatedResult<ExifKeys>>>;
  findByType(type: ExifValueType): Promise<ExifKeys[]>;
  findExistingKeys(): Promise<Result<Map<string, ExifKeys>>>;
  saveKeys(keys: ExifKeys[]): Promise<Result<ExifKeys[]>>;
  updateKeys(keys: ExifKeys[]): Promise<Result<ExifKeys[]>>;
  findByNames(names: string[]): Promise<ExifKeys[]>;
  clearAll(): Promise<Result<number>>;
}

@Injectable()
export class ExifKeysRepository implements IExifKeysRepository {
  constructor(
    @InjectRepository(ExifKeys)
    private readonly repository: MongoRepository<ExifKeys>,
  ) {}

  /**
   * Finds all EXIF keys
   */
  async findAll(): Promise<ExifKeys[]> {
    return this.repository.find();
  }

  /**
   * Finds EXIF keys with pagination and optional filtering
   */
  async findPaginated(
    options: PaginationOptions,
  ): Promise<Result<PaginatedResult<ExifKeys>>> {
    try {
      const { page = 1, perPage = 50, type, searchTerm } = options;
      const skip = (page - 1) * perPage;

      // Build match stage for filtering
      const matchStage: any = {};
      if (type) {
        matchStage.type = type;
      }
      if (searchTerm) {
        // Use case-insensitive regex for partial matching
        matchStage.name = { $regex: searchTerm, $options: 'i' };
      }

      // Build aggregation pipeline with $facet for single query
      const pipeline = [
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $facet: {
            items: [
              { $sort: { name: 1 } }, // Sort by name for consistent results
              { $skip: skip },
              { $limit: perPage },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      // Execute aggregation
      const result = await this.repository.aggregate(pipeline).toArray();

      if (!result || result.length === 0) {
        return success({
          items: [],
          totalCount: 0,
          page,
          perPage,
          totalPages: 0,
        });
      }

      const aggregationResult = result[0] as unknown as {
        items: ExifKeys[];
        totalCount: { count: number }[];
      };

      const { items, totalCount } = aggregationResult;
      const count = totalCount[0]?.count || 0;
      const totalPages = Math.ceil(count / perPage);

      return success({
        items,
        totalCount: count,
        page,
        perPage,
        totalPages,
      });
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Finds EXIF keys by type
   */
  async findByType(type: ExifValueType): Promise<ExifKeys[]> {
    return this.repository.find({
      where: { type },
    });
  }

  /**
   * Finds all existing keys and returns a map for quick lookups
   */
  async findExistingKeys(): Promise<Result<Map<string, ExifKeys>>> {
    try {
      const existingKeys = await this.repository.find();
      const keyMap = new Map<string, ExifKeys>();
      for (const key of existingKeys) {
        keyMap.set(key.name, key);
      }
      return success(keyMap);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Saves multiple EXIF keys to the database
   */
  async saveKeys(keys: ExifKeys[]): Promise<Result<ExifKeys[]>> {
    try {
      const savedKeys = await this.repository.save(keys);
      return success(savedKeys);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Updates multiple existing EXIF keys
   */
  async updateKeys(keys: ExifKeys[]): Promise<Result<ExifKeys[]>> {
    try {
      const savedKeys = await this.repository.save(keys);
      return success(savedKeys);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Finds EXIF keys by their names
   */
  async findByNames(names: string[]): Promise<ExifKeys[]> {
    if (names.length === 0) {
      return [];
    }

    return this.repository.find({
      where: {
        name: { $in: names },
      },
    });
  }

  /**
   * Clears all EXIF keys from the database
   */
  async clearAll(): Promise<Result<number>> {
    try {
      await this.repository.clear();
      // MongoDB clear() doesn't return affected count, so we return 0 as success indicator
      return success(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle "ns not found" error - collection doesn't exist yet, nothing to clear
      if (errorMessage.includes('ns not found')) {
        return success(0);
      }

      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
