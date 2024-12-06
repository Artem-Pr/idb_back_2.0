import { getEscapedString } from 'src/common/utils';
import type {
  GetFilesFiltersInputDto,
  GetFilesFoldersDto,
  GetFilesPaginationInputDto,
} from './dto/get-files-input.dto';
import type { Media } from './entities/media.entity';
import { ObjectId } from 'mongodb';
import type { SortingObject } from './types';
import { isEmpty } from 'ramda';

export type MongoFilterCondition = Partial<
  Record<keyof Media | '$or' | '$expr', object>
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
  facet?: MongoAggregationFacet;
  sorting?: SortingObject;
  sample?: { size: number };
}

type FilesFilter = Record<
  Exclude<keyof GetFilesFiltersInputDto, 'includeAllSearchTags'>,
  MongoFilterCondition
>;

export class MediaDBQueryCreators {
  ormFindByIdsQuery(ids: string[]) {
    return {
      where: {
        _id: { $in: ids.map((id) => new ObjectId(id)) },
      },
    };
  }

  getUpdateMediaQuery(updatedMedia: Media[]) {
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

  getMongoFiltersConditions = (
    filesFilter: GetFilesFiltersInputDto,
  ): MongoFilterCondition[] => {
    const allFilters: FilesFilter = {
      fileName: {
        originalName: { $regex: filesFilter.fileName, $options: 'i' },
      },
      rating: { rating: { $eq: filesFilter.rating } },
      description: {
        description: { $regex: filesFilter.description, $options: 'i' },
      },
      anyDescription: { description: { $exists: true, $ne: '' } },
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

    return Object.keys(allFilters)
      .filter((key) => filesFilter[key])
      .map((key) => allFilters[key]);
  };

  private getFolderPathExcludeSubFolderRegExp(
    folderPathEscaped: string,
  ): RegExp {
    return new RegExp(`^/${folderPathEscaped}/[^/]+\\.*$`);
  }

  private getMongoFilesExcludeFilesInSubfoldersCondition(
    folderPath: string,
  ): MongoFilterCondition {
    const folderPathEscaped = getEscapedString(folderPath);
    const folderPathExcludeSubFolderRegExp =
      this.getFolderPathExcludeSubFolderRegExp(folderPathEscaped);
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

  getMongoUsedKeywordsAggregation() {
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

  private hasSorting(
    sorting?: MongoAggregationIncomingProps['sorting'],
    sample?: MongoAggregationIncomingProps['sample'],
  ) {
    return Boolean(!sample && sorting && !isEmpty(sorting));
  }

  createMongoAggregationPipeline({
    conditions,
    facet,
    sample,
    sorting,
  }: MongoAggregationIncomingProps): MongoAggregationPipeline {
    const aggregation: MongoAggregationPipeline = [];
    conditions?.length && aggregation.push({ $match: { $and: conditions } }); // conditionArr.length ? {$and: conditionArr} : {}
    this.hasSorting(sorting, sample) && aggregation.push({ $sort: sorting });
    sample && aggregation.push({ $sample: sample });
    facet && aggregation.push({ $facet: facet });

    return aggregation;
  }
}
