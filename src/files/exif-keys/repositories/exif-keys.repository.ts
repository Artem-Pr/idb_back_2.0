import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ExifKeys, ExifValueType } from '../entities/exif-keys.entity';
import { Result, success, failure } from '../types/result.type';
import { EXIF_KEYS_CONSTANTS } from '../constants/exif-keys.constants';

export interface IExifKeysRepository {
  findAll(): Promise<ExifKeys[]>;
  findByType(type: ExifValueType): Promise<ExifKeys[]>;
  findExistingKeyNames(): Promise<Result<Set<string>>>;
  saveKeys(keys: ExifKeys[]): Promise<Result<ExifKeys[]>>;
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
   * Finds EXIF keys by type
   */
  async findByType(type: ExifValueType): Promise<ExifKeys[]> {
    return this.repository.find({
      where: { type },
    });
  }

  /**
   * Finds existing key names for duplicate checking
   */
  async findExistingKeyNames(): Promise<Result<Set<string>>> {
    try {
      const existingKeys = await this.repository.find({
        select: EXIF_KEYS_CONSTANTS.DATABASE.SELECT_FIELDS,
      });

      const keyNames = new Set(existingKeys.map((key) => key.name));
      return success(keyNames);
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
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
