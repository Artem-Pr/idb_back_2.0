import type { MongoFilterCondition } from './mediaDBQueryCreators';
import { MediaDBQueryCreators } from './mediaDBQueryCreators';
import { ObjectId } from 'mongodb';
import type {
  GetFilesFiltersInputDto,
  GetFilesFoldersDto,
  GetFilesPaginationInputDto,
} from './dto/get-files-input.dto';
import type { SortingObject } from './types';
import {
  SupportedImageMimetypes,
  SupportedVideoMimeTypes,
} from 'src/common/constants';
import { createMediaMock } from './__mocks__/mocks';
import type { Media } from './entities/media.entity';

describe('MediaDBQueryCreators', () => {
  let mediaDBQueryCreators: MediaDBQueryCreators;

  beforeEach(() => {
    mediaDBQueryCreators = new MediaDBQueryCreators();
  });

  describe('ormFindByIdsQuery', () => {
    it('should return a query object with ObjectId array', () => {
      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const query = mediaDBQueryCreators.ormFindByIdsQuery(ids);
      expect(query).toEqual({
        where: {
          _id: {
            $in: [new ObjectId(ids[0]), new ObjectId(ids[1])],
          },
        },
      });
    });
  });

  describe('getUpdateMediaQuery', () => {
    it('should return update media query object', () => {
      const mediaMock1: Media = createMediaMock({ name: 'mediaMock1' });
      const mediaMock2: Media = createMediaMock({ name: 'mediaMock2' });

      const query = mediaDBQueryCreators.getUpdateMediaQuery([
        mediaMock1,
        mediaMock2,
      ]);
      expect(query).toEqual([
        {
          updateOne: {
            filter: { _id: mediaMock1._id },
            update: { $set: mediaMock1 },
          },
        },
        {
          updateOne: {
            filter: { _id: mediaMock2._id },
            update: { $set: mediaMock2 },
          },
        },
      ]);
    });
  });

  describe('getValidDateRange', () => {
    it('should return date range object', () => {
      const dateRange: [string, string] = ['2022-01-01', '2022-12-31'];
      const result = mediaDBQueryCreators['getValidDateRange'](dateRange);
      expect(result).toEqual({
        $gte: new Date(dateRange[0]),
        $lt: new Date(dateRange[1]),
      });
    });

    it('should return an empty object when dateRange is undefined', () => {
      const result = mediaDBQueryCreators['getValidDateRange'](undefined);
      expect(result).toEqual({});
    });
  });

  describe('getMongoFiltersConditions', () => {
    it('should return an array of Mongo filter conditions', () => {
      const filesFilter: GetFilesFiltersInputDto = {
        fileName: 'test',
        rating: 5,
        description: 'test description',
        includeAllSearchTags: true,
        searchTags: ['tag1'],
        excludeTags: ['tag2'],
        mimetypes: [SupportedImageMimetypes.jpeg],
        dateRange: ['2022-01-01', '2022-12-31'],
      };

      const result =
        mediaDBQueryCreators.getMongoFiltersConditions(filesFilter);
      expect(result).toEqual([
        { originalName: { $regex: 'test', $options: 'i' } },
        { rating: { $eq: 5 } },
        { description: { $regex: 'test description', $options: 'i' } },
        { keywords: { $all: ['tag1'] } },
        { keywords: { $nin: ['tag2'] } },
        { $or: [{ mimetype: 'image/jpeg' }] },
        {
          originalDate: {
            $gte: new Date('2022-01-01'),
            $lt: new Date('2022-12-31'),
          },
        },
      ]);
    });
  });

  describe('getFolderPathExcludeSubFolderRegExp', () => {
    it('should return a regular expression to exclude subfolders', () => {
      const regExp =
        mediaDBQueryCreators['getFolderPathExcludeSubFolderRegExp']('path');
      expect(regExp).toEqual(/^\/path\/[^/]+\.*$/);
    });
  });

  describe('getMongoFilesExcludeFilesInSubfoldersCondition', () => {
    it('should return a Mongo filter condition to exclude files in subfolders', () => {
      const condition =
        mediaDBQueryCreators['getMongoFilesExcludeFilesInSubfoldersCondition'](
          'path',
        );
      expect(condition).toEqual({ filePath: { $regex: /^\/path\/[^/]+\.*$/ } });
    });
  });

  describe('getMongoFoldersCondition', () => {
    it('should return a Mongo filter condition for folders without subfolders', () => {
      const folderFilter: GetFilesFoldersDto = {
        folderPath: 'path',
        showSubfolders: false,
      };
      const condition =
        mediaDBQueryCreators.getMongoFoldersCondition(folderFilter);
      expect(condition).toEqual({ filePath: { $regex: /^\/path\/[^/]+\.*$/ } });
    });

    it('should return a Mongo filter condition for folders with subfolders', () => {
      const folderFilter: GetFilesFoldersDto = {
        folderPath: 'path',
        showSubfolders: true,
      };
      const condition =
        mediaDBQueryCreators.getMongoFoldersCondition(folderFilter);
      expect(condition).toEqual({
        $expr: { $eq: [{ $indexOfCP: ['$filePath', '/path/'] }, 0] },
      });
    });

    it('should return an empty object when folderFilter is undefined', () => {
      const condition = mediaDBQueryCreators.getMongoFoldersCondition({});
      expect(condition).toEqual({});
    });
  });

  describe('getMongoDynamicFoldersFacet', () => {
    it('should return the dynamic folders facet', () => {
      const facet = mediaDBQueryCreators.getMongoDynamicFoldersFacet();
      expect(facet).toEqual({
        response: [
          { $project: { filePath: 1 } },
          { $group: { _id: null, filePathSet: { $addToSet: '$filePath' } } },
          { $unset: ['_id', 'items'] },
        ],
      });
    });
  });

  describe('getMongoFilesFacet', () => {
    it('should return the files facet', () => {
      const pagination: GetFilesPaginationInputDto = { page: 1, perPage: 10 };
      const facet = mediaDBQueryCreators.getMongoFilesFacet(pagination);
      expect(facet).toEqual({
        response: [{ $skip: 0 }, { $limit: 10 }],
        total: [
          { $group: { _id: null, filesSizeSum: { $sum: '$size' } } },
          { $unset: '_id' },
        ],
        pagination: [
          { $count: 'resultsCount' },
          {
            $addFields: {
              totalPages: { $ceil: { $divide: ['$resultsCount', 10] } },
            },
          },
          {
            $addFields: {
              currentPage: { $cond: [{ $gt: [1, '$totalPages'] }, 1, 1] },
            },
          },
        ],
      });
    });
  });

  describe('getMongoUsedKeywordsAggregation', () => {
    it('should return the used keywords aggregation', () => {
      const aggregation =
        mediaDBQueryCreators.getMongoUsedKeywordsAggregation();
      expect(aggregation).toEqual([
        { $group: { _id: null, keywordsSet: { $addToSet: '$keywords' } } },
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
      ]);
    });
  });

  describe('createMongoAggregationPipeline', () => {
    const conditions: MongoFilterCondition[] = [
      { filePath: { $regex: /.*\.jpg$/ } },
    ];
    const facet = { response: [{ $skip: 0 }] };
    const sorting: SortingObject = { rating: 1 };
    const sample = { size: 10 };

    it('should create a Mongo aggregation pipeline with sorting', () => {
      const pipeline = mediaDBQueryCreators.createMongoAggregationPipeline({
        conditions,
        facet,
        sorting,
      });

      expect(pipeline).toEqual([
        { $match: { $and: conditions } },
        { $sort: sorting },
        { $facet: facet },
      ]);
    });

    it('should create a Mongo aggregation pipeline with sample', () => {
      const pipeline = mediaDBQueryCreators.createMongoAggregationPipeline({
        conditions,
        facet,
        sorting,
        sample,
      });

      expect(pipeline).toEqual([
        { $match: { $and: conditions } },
        { $sample: sample },
        { $facet: facet },
      ]);
    });

    it('should create a Mongo aggregation pipeline without sorting and sample', () => {
      const conditions: MongoFilterCondition[] = [
        { filePath: { $regex: /.*\.jpg$/ } },
      ];
      const facet = { response: [{ $skip: 0 }] };

      const pipeline = mediaDBQueryCreators.createMongoAggregationPipeline({
        conditions,
        facet,
      });

      expect(pipeline).toEqual([
        { $match: { $and: conditions } },
        { $facet: facet },
      ]);
    });
  });

  describe('getMongoEmptyPreviewsCondition', () => {
    it('should return correct condition without mimeTypes and folderPath', () => {
      const result = mediaDBQueryCreators.getMongoEmptyPreviewsCondition();
      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with mimeTypes', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedVideoMimeTypes.mp4,
      ];
      const result =
        mediaDBQueryCreators.getMongoEmptyPreviewsCondition(mimeTypes);

      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with folderPath', () => {
      const folderPath = 'path/to/folder';
      const result = mediaDBQueryCreators.getMongoEmptyPreviewsCondition(
        undefined,
        folderPath,
      );
      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with mimeTypes and folderPath', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedVideoMimeTypes.mp4,
      ];
      const folderPath = 'path/to/folder';
      const result = mediaDBQueryCreators.getMongoEmptyPreviewsCondition(
        mimeTypes,
        folderPath,
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('getMongoFilesCondition', () => {
    it('should return correct condition without mimeTypes and folderPath', () => {
      const result = mediaDBQueryCreators.getMongoFilesCondition({});
      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with mimeTypes', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedVideoMimeTypes.mp4,
      ];
      const result = mediaDBQueryCreators.getMongoFilesCondition({ mimeTypes });

      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with folderPath', () => {
      const folderPath = 'path/to/folder';
      const result = mediaDBQueryCreators.getMongoFilesCondition({
        folderPath,
      });
      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with mimeTypes and folderPath', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedVideoMimeTypes.mp4,
      ];
      const folderPath = 'path/to/folder';
      const result = mediaDBQueryCreators.getMongoFilesCondition({
        mimeTypes,
        folderPath,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe('getMongoEmptyFullSizesCondition', () => {
    it('should return correct condition without mimeTypes and folderPath', () => {
      const result = mediaDBQueryCreators.getMongoEmptyFullSizesCondition();
      expect(result).toMatchSnapshot();
    });

    it('should return null for not correct MimeTypes', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedImageMimetypes.dng,
        SupportedImageMimetypes.png,
      ];
      const result =
        mediaDBQueryCreators.getMongoEmptyFullSizesCondition(mimeTypes);
      expect(result).toBeNull();
    });

    it('should return correct condition with mimeTypes', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedVideoMimeTypes.mp4,
      ];
      const result =
        mediaDBQueryCreators.getMongoEmptyFullSizesCondition(mimeTypes);
      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with folderPath', () => {
      const folderPath = 'path/to/folder';
      const result = mediaDBQueryCreators.getMongoEmptyFullSizesCondition(
        undefined,
        folderPath,
      );
      expect(result).toMatchSnapshot();
    });

    it('should return correct condition with mimeTypes and folderPath', () => {
      const mimeTypes = [
        SupportedImageMimetypes.jpeg,
        SupportedVideoMimeTypes.mp4,
      ];
      const folderPath = 'path/to/folder';
      const result = mediaDBQueryCreators.getMongoEmptyFullSizesCondition(
        mimeTypes,
        folderPath,
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('getMongoFilesDescriptionsAggregation', () => {
    it('should return correct aggregation pipeline with default parameters', () => {
      const result =
        mediaDBQueryCreators.getMongoFilesDescriptionsAggregation();

      expect(result).toEqual([
        {
          $match: {
            description: {
              $exists: true,
              $nin: [null, '', ' '],
            },
          },
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
              { $skip: 0 },
              { $limit: 10 },
              { $project: { description: 1, _id: 0 } },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should return correct aggregation pipeline with description filter', () => {
      const descriptionPart = 'test';
      const result =
        mediaDBQueryCreators.getMongoFilesDescriptionsAggregation(
          descriptionPart,
        );

      expect(result).toEqual([
        {
          $match: {
            description: {
              $regex: 'test',
              $options: 'i',
              $nin: [null, '', ' '],
            },
          },
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
              { $skip: 0 },
              { $limit: 10 },
              { $project: { description: 1, _id: 0 } },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should return correct aggregation pipeline with custom pagination', () => {
      const page = 2;
      const perPage = 5;
      const result = mediaDBQueryCreators.getMongoFilesDescriptionsAggregation(
        undefined,
        page,
        perPage,
      );

      expect(result).toEqual([
        {
          $match: {
            description: {
              $exists: true,
              $nin: [null, '', ' '],
            },
          },
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
              { $skip: 5 },
              { $limit: 5 },
              { $project: { description: 1, _id: 0 } },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });

    it('should return correct aggregation pipeline with all parameters', () => {
      const descriptionPart = 'test';
      const page = 3;
      const perPage = 20;
      const result = mediaDBQueryCreators.getMongoFilesDescriptionsAggregation(
        descriptionPart,
        page,
        perPage,
      );

      expect(result).toEqual([
        {
          $match: {
            description: {
              $regex: 'test',
              $options: 'i',
              $nin: [null, '', ' '],
            },
          },
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
              { $skip: 40 },
              { $limit: 20 },
              { $project: { description: 1, _id: 0 } },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);
    });
  });
});
