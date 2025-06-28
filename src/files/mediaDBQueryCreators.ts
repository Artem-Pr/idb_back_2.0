import type {
  GetFilesFiltersInputDto,
  GetFilesFoldersDto,
  GetFilesPaginationInputDto,
} from './dto/get-files-input.dto';
import type { Media } from './entities/media.entity';
import { ObjectId } from 'mongodb';
import type { SortingObject } from './types';
import { isEmpty } from 'ramda';
import {
  SUPPORTED_MIMETYPES,
  SUPPORTED_VIDEO_MIMETYPES,
  SupportedImageMimetypes,
} from 'src/common/constants';
import { SupportedMimetypes } from 'src/common/types';
import { escapeFilePathForRegex } from 'src/common/fileNameHelpers';
import { ExifValueType } from 'src/exif-keys/entities/exif-keys.entity';
import { GetFilesExifFilterDto } from './dto/get-files-exif-filter.dto';

export type MongoFilterCondition = Partial<
  Record<
    keyof Media | '$or' | '$and' | '$expr',
    object | Array<MongoFilterCondition>
  >
>;
type MongoAggregationFacet = Partial<
  Record<'response' | 'total' | 'pagination', object[]>
>;
export type MongoAggregationPipeline = Partial<
  | Record<
      '$match' | '$facet' | '$group' | '$project' | '$sort' | '$sample',
      object
    >
  | Record<'$unset', string | string[]>
>[];

interface MongoAggregationIncomingProps {
  conditions?: MongoFilterCondition[];
  additionalAggregation?: MongoAggregationPipeline;
  facet?: MongoAggregationFacet;
  sorting?: SortingObject;
  sample?: { size: number };
}

type FilesFilter = Record<
  Exclude<keyof GetFilesFiltersInputDto, 'includeAllSearchTags' | 'exif'>,
  MongoFilterCondition
>;

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class MediaDBQueryCreators {
  ormFindByIdsQuery(ids: string[]) {
    return {
      where: {
        _id: { $in: ids.map((id) => new ObjectId(id)) },
      },
    };
  }

  getUpdateMediaQuery(updatedMedia: Partial<Media>[]) {
    return updatedMedia.map((media) => ({
      updateOne: {
        filter: { _id: media._id },
        update: { $set: media },
      },
    }));
  }

  getReplacementMediaQuery(updatedMedia: Media[]) {
    return updatedMedia.map((media) => ({
      replaceOne: {
        filter: { _id: media._id },
        replacement: media,
      },
    }));
  }

  private getValidDateRange(dateRange: GetFilesFiltersInputDto['dateRange']) {
    if (dateRange) {
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);

      return {
        $gte: startDate,
        $lt: endDate,
      };
    }
    return {};
  }

  private getMongoExifConditions(
    exifFilters: GetFilesExifFilterDto[] | undefined,
  ): MongoFilterCondition | null {
    if (!exifFilters || exifFilters.length === 0) {
      return null;
    }

    const exifConditions = exifFilters
      .map((filter) => {
        const { propertyName, propertyType, condition } = filter;
        const field = `exif.${propertyName}`;

        switch (propertyType) {
          case ExifValueType.NOT_SUPPORTED:
            return (
              condition.isExist
                ? { [field]: { $exists: true, $ne: null } }
                : {
                    $or: [
                      { [field]: { $exists: false } },
                      { [field]: { $eq: null } },
                    ],
                  }
            ) as MongoFilterCondition;

          case ExifValueType.STRING:
          case ExifValueType.STRING_ARRAY:
          case ExifValueType.NUMBER:
            if (propertyType === ExifValueType.NUMBER && condition.rangeMode) {
              if (!condition.rangeValues) {
                return null;
              }
              const [min, max] = condition.rangeValues;
              return { [field]: { $gte: min, $lte: max } };
            }
            return {
              [field]: { $in: condition.values || [] },
            } as MongoFilterCondition;

          case ExifValueType.LONG_STRING:
            if (condition.textValues && condition.textValues.length > 0) {
              const regex = condition.textValues
                .map((v) => `(${escapeRegex(v)})`)
                .join('|');
              return {
                [field]: { $regex: regex, $options: 'i' },
              } as MongoFilterCondition;
            }
            return null;

          default:
            return null;
        }
      })
      .filter((c): c is MongoFilterCondition => c !== null);

    if (exifConditions.length === 0) {
      return null;
    }

    return { $and: exifConditions };
  }

  getMongoFiltersConditions = (
    filesFilter: GetFilesFiltersInputDto,
  ): MongoFilterCondition[] => {
    const allFilters: Omit<FilesFilter, 'exif'> = {
      fileName: {
        originalName: { $regex: filesFilter.fileName, $options: 'i' },
      },
      rating: { rating: { $eq: filesFilter.rating } },
      description: {
        description: { $regex: filesFilter.description, $options: 'i' },
      },
      anyDescription: { description: { $exists: true, $ne: null } },
      searchTags: {
        keywords: {
          [filesFilter.includeAllSearchTags ? '$all' : '$in']:
            filesFilter.searchTags || [],
        },
      },
      excludeTags: { keywords: { $nin: filesFilter.excludeTags || [] } },
      mimetypes: {
        $or: filesFilter.mimetypes?.map((mimetype) => ({ mimetype })),
      },
      dateRange: {
        originalDate: this.getValidDateRange(filesFilter.dateRange),
      },
    };

    const conditions = Object.keys(allFilters)
      .filter((key) => filesFilter[key])
      .map((key) => allFilters[key]);

    const exifConditions = this.getMongoExifConditions(filesFilter.exif);
    if (exifConditions) {
      conditions.push(exifConditions);
    }

    return conditions;
  };

  private getFolderPathExcludeSubFolderRegExp(folderPath: string): RegExp {
    const folderPathEscaped = escapeFilePathForRegex(folderPath);
    return new RegExp(`^/${folderPathEscaped}/[^/]+\\.*$`);
  }

  private getMongoFilesExcludeFilesInSubfoldersCondition(
    folderPath: string,
  ): MongoFilterCondition {
    const folderPathExcludeSubFolderRegExp =
      this.getFolderPathExcludeSubFolderRegExp(folderPath);
    return { filePath: { $regex: folderPathExcludeSubFolderRegExp } };
  }

  getMongoFoldersCondition({
    folderPath,
    showSubfolders,
  }: GetFilesFoldersDto): MongoFilterCondition {
    if (folderPath && !showSubfolders) {
      return this.getMongoFilesExcludeFilesInSubfoldersCondition(folderPath);
    }
    if (folderPath && showSubfolders) {
      return {
        $expr: { $eq: [{ $indexOfCP: ['$filePath', `/${folderPath}/`] }, 0] },
      };
    }

    return {};
  }

  getMongoFilesCondition({
    mimeTypes,
    folderPath,
  }: {
    mimeTypes?: SupportedMimetypes['allFiles'][];
    folderPath?: string;
  }) {
    return {
      $and: [
        this.getMongoFoldersCondition({ folderPath, showSubfolders: true }),
        {
          mimetype: {
            $in: mimeTypes?.length ? mimeTypes : SUPPORTED_MIMETYPES,
          },
        },
      ],
    };
  }

  getMongoEmptyPreviewsCondition(
    mimeTypes?: SupportedMimetypes['allFiles'][],
    folderPath?: string,
  ): MongoFilterCondition {
    const emptyPreviewsConditions = [
      { preview: { $exists: false } },
      { preview: { $eq: null } },
      { preview: { $eq: '' } },
    ];

    const mimeTypesList = mimeTypes?.length ? mimeTypes : SUPPORTED_MIMETYPES;

    return {
      $and: [
        this.getMongoFoldersCondition({ folderPath, showSubfolders: true }),
        { mimetype: { $in: mimeTypesList } },
        { $or: emptyPreviewsConditions },
      ],
    };
  }

  getMongoEmptyFullSizesCondition(
    mimeTypes?: SupportedMimetypes['allFiles'][],
    folderPath?: string,
  ): MongoFilterCondition | null {
    const emptyFullSizesConditions = [
      { fullSizeJpg: { $exists: false } },
      { fullSizeJpg: { $eq: null } },
      { fullSizeJpg: { $eq: '' } },
    ];

    const heicAndVideoMimetypes = [
      ...SUPPORTED_VIDEO_MIMETYPES,
      SupportedImageMimetypes.heic,
    ];

    const mimeTypesToCheckFullSizeOnly = mimeTypes?.length
      ? mimeTypes.filter((mimeType) => heicAndVideoMimetypes.includes(mimeType))
      : heicAndVideoMimetypes;

    return mimeTypesToCheckFullSizeOnly.length
      ? {
          $and: [
            this.getMongoFoldersCondition({ folderPath, showSubfolders: true }),
            { mimetype: { $in: mimeTypesToCheckFullSizeOnly } },
            { $or: emptyFullSizesConditions },
          ],
        }
      : null;
  }

  getMongoDynamicFoldersFacet(): MongoAggregationFacet {
    return {
      response: [
        { $project: { filePath: 1 } }, // includes only the filePath field in the resulting documents
        {
          $group: {
            _id: null,
            filePathSet: { $addToSet: '$filePath' }, // creates a set of unique file paths
          },
        },
        { $unset: ['_id', 'items'] }, // removes the _id field and the items field (if it exists) from the resulting documents
      ],
    };
  }

  getMongoFilesFacet({
    page,
    perPage,
  }: GetFilesPaginationInputDto): MongoAggregationFacet {
    return {
      response: [
        { $skip: page > 0 ? (page - 1) * perPage : 0 },
        { $limit: perPage },
      ],
      total: [
        { $group: { _id: null, filesSizeSum: { $sum: '$size' } } },
        { $unset: '_id' },
      ],
      pagination: [
        { $count: 'resultsCount' },
        {
          $addFields: {
            totalPages: {
              $ceil: {
                $divide: ['$resultsCount', perPage],
              },
            },
          },
        },
        {
          $addFields: {
            currentPage: {
              $cond: [{ $gt: [page, '$totalPages'] }, 1, page],
            },
          },
        },
      ],
    };
  }

  getMongoUsedKeywordsAggregation(): MongoAggregationPipeline {
    return [
      {
        $group: {
          _id: null,
          keywordsSet: { $addToSet: '$keywords' },
        },
      },
      {
        $project: {
          response: {
            $reduce: {
              input: { $concatArrays: '$keywordsSet' },
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] },
            },
          },
        },
      },
      { $unset: '_id' },
    ];
  }

  getMongoFilesDescriptionsAggregation(
    descriptionPart?: string,
    page = 1,
    perPage = 10,
  ): MongoAggregationPipeline {
    const skip = (page - 1) * perPage;

    const matchStage = descriptionPart
      ? {
          description: {
            $regex: descriptionPart,
            $options: 'i',
            $nin: [null, '', ' '],
          },
        }
      : {
          description: {
            $exists: true,
            $nin: [null, '', ' '],
          },
        };

    return [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: '$description',
          description: { $first: '$description' },
        },
      },
      {
        $facet: {
          descriptions: [
            { $skip: skip },
            { $limit: perPage },
            { $project: { description: 1, _id: 0 } },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];
  }

  // getMongoPreviewsAggregation(): MongoAggregationPipeline {
  //   return [
  //     {
  //       $group: {
  //         _id: null,
  //         response: {
  //           $push: {
  //             _id: '$_id',
  //             fullSizeJpg: '$fullSizeJpg',
  //             preview: '$preview',
  //             mimetype: '$mimetype',
  //           },
  //         },
  //       },
  //     },
  //   ];
  // }

  private hasSorting(
    sorting?: MongoAggregationIncomingProps['sorting'],
    sample?: MongoAggregationIncomingProps['sample'],
  ) {
    return Boolean(!sample && sorting && !isEmpty(sorting));
  }

  createMongoAggregationPipeline({
    additionalAggregation,
    conditions,
    facet,
    sample,
    sorting,
  }: MongoAggregationIncomingProps): MongoAggregationPipeline {
    let aggregation: MongoAggregationPipeline = [];
    conditions?.length && aggregation.push({ $match: { $and: conditions } }); // conditionArr.length ? {$and: conditionArr} : {}
    additionalAggregation?.length &&
      (aggregation = [...aggregation, ...additionalAggregation]);
    this.hasSorting(sorting, sample) && aggregation.push({ $sort: sorting });
    sample && aggregation.push({ $sample: sample });
    facet && aggregation.push({ $facet: facet });

    return aggregation;
  }
}
