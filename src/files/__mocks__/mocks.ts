import { Media } from '../entities/media.entity';
import { ObjectId } from 'mongodb';
import { MediaTemp } from '../entities/media-temp.entity';
import type { ProcessFile } from '../types';
import type { UploadFileOutputDto } from '../dto/upload-file-output.dto';
import { omit } from 'ramda';
import { SupportedImageMimetypes } from 'src/common/constants';
import { ExifDateTime } from 'exiftool-vendored';

const dateTimeOriginalMock = new ExifDateTime(
  2019,
  9,
  19,
  12,
  0,
  0,
  0,
  undefined,
  '2019:09:19 12:00:00',
);

export const exifDataMock = {
  DateTimeOriginal: dateTimeOriginalMock,
  Description: 'test description',
  GPSPosition: '42.5, 42.5',
  ImageSize: '1920x1080',
  Megapixels: 12,
  Rating: 5,
};

export const uploadFileMock: UploadFileOutputDto = {
  properties: {
    id: '665a0291b9e676b1015cf8b9',
    changeDate: null,
    duplicates: [
      {
        exif: exifDataMock,
        filePath: '/main/для теста базы/IMG_1728.heic',
        mimetype: SupportedImageMimetypes.heic,
        originalName: 'IMG_1728.heic',
        staticPreview:
          'http://localhost:3000/previews/image-heic/preview/2023.07.02 - originalDate/9eec89c3e7cf18920302f4e55d10aa52-preview.jpg',
        staticPath:
          'http://localhost:3000/previews/image-heic/fullSize/2023.07.02 - originalDate/9eec89c3e7cf18920302f4e55d10aa52-fullSize.jpg',
        staticVideoFullSize: null,
      },
      {
        exif: exifDataMock,
        filePath: '/main/SD/IMG_1728.heic',
        mimetype: SupportedImageMimetypes.heic,
        originalName: 'IMG_1728.heic',
        staticPreview:
          'http://localhost:3000/previews/image-heic/preview/2023.07.02 - originalDate/f7d6132c59acb526c1df74f438c744fa-preview.jpg',
        staticPath:
          'http://localhost:3000/previews/image-heic/fullSize/2023.07.02 - originalDate/f7d6132c59acb526c1df74f438c744fa-fullSize.jpg',
        staticVideoFullSize: null,
      },
    ],
    description: exifDataMock.Description,
    exif: exifDataMock,
    filePath: null,
    imageSize: '2268x4032',
    keywords: [],
    megapixels: 9.1,
    mimetype: SupportedImageMimetypes.heic,
    originalDate: new Date('2023-07-02T17:36:33.000Z'),
    originalName: 'IMG_1728.heic',
    rating: 4,
    size: 1950900,
    staticPath:
      'http://localhost:3000/previews/5136bc14-512f-47f9-a551-304bb254f528-fullSize.jpg',
    staticPreview:
      'http://localhost:3000/temp/5136bc14-512f-47f9-a551-304bb254f528-preview.jpg',
    staticVideoFullSize: null,
    timeStamp: '00:00:00.000',
  },
};

export class UploadFileMock {
  _properties: UploadFileOutputDto['properties'] = uploadFileMock.properties;

  constructor({ properties }: Partial<UploadFileOutputDto> = {}) {
    properties && (this.properties = properties);
  }

  set exif(exif: UploadFileOutputDto['properties']['exif']) {
    this._properties.exif = exif;
  }
  addExif(exif: UploadFileOutputDto['properties']['exif']) {
    this._properties.exif = { ...this._properties.exif, ...exif };
  }

  set properties(properties: UploadFileOutputDto['properties']) {
    this._properties = properties;
  }
  addProperties(properties: Partial<UploadFileOutputDto['properties']>) {
    this._properties = { ...this._properties, ...properties };
  }

  set duplicates(duplicates: UploadFileOutputDto['properties']['duplicates']) {
    this._properties.duplicates = duplicates;
  }

  addDuplicates(duplicates: UploadFileOutputDto['properties']['duplicates']) {
    this._properties.duplicates = [
      ...this._properties.duplicates,
      ...duplicates,
    ];
  }

  set staticPath(staticPath: UploadFileOutputDto['properties']['staticPath']) {
    this._properties.staticPath = staticPath;
  }

  set staticPreview(
    staticPreview: UploadFileOutputDto['properties']['staticPreview'],
  ) {
    this._properties.staticPreview = staticPreview;
  }

  updateFromMedia(media: Media) {
    if (media.exif) {
      this.addExif(media.exif);
    }

    const properties: UploadFileOutputDto['properties'] = {
      id: media._id.toString(),
      duplicates: [],
      filePath: null,
      staticPath: this._properties.staticPath,
      staticPreview: this._properties.staticPreview,
      staticVideoFullSize: null,
      ...omit(['filePath', 'preview', 'fullSizeJpg', '_id'], media),
    };

    this.properties = {
      ...this._properties,
      ...properties,
    };
  }

  get uploadFile(): UploadFileOutputDto {
    return {
      properties: this._properties,
    };
  }
}

export function createMockProcessFile(): ProcessFile {
  const mock: ProcessFile = {
    filename: 'mockFile.jpg',
    mimetype: SupportedImageMimetypes.jpg,
    originalname: 'original_mock_file.jpg',
    size: 1024,
  };

  return mock;
}

export function createMediaMock({
  id = new ObjectId(),
  name = 'mockFile',
  originalNameWithoutExt = 'original_mock_file',
}: {
  id?: ObjectId;
  name?: string;
  originalNameWithoutExt?: string;
} = {}): Media {
  const media = new Media();

  media._id = id;
  media.originalName = `${originalNameWithoutExt}.jpg`;
  media.mimetype = SupportedImageMimetypes.jpg;
  media.size = 1024;
  media.megapixels = exifDataMock.Megapixels;
  media.imageSize = exifDataMock.ImageSize;
  media.keywords = ['test', 'media'];
  media.changeDate = new Date('2023-07-02T17:36:33.000Z').getTime();
  media.originalDate = exifDataMock.DateTimeOriginal.toDate();
  media.filePath = `/path/to/${name}.jpg`;
  media.preview = `/path/to/${name}-preview.jpg`;
  media.fullSizeJpg = `/path/to/${name}-fullSize.jpg`;
  media.rating = exifDataMock.Rating;
  media.description = exifDataMock.Description;
  media.timeStamp = '00:00:00.100';
  media.exif = exifDataMock;

  return media;
}

export function createMediaTempMock({
  id = new ObjectId(),
  name = 'mockTempFile',
  originalNameWithoutExt = 'original_mock_temp_file',
}: {
  id?: ObjectId;
  name?: string;
  originalNameWithoutExt?: string;
} = {}): MediaTemp {
  const mediaTemp = createMediaMock({
    id,
    name,
    originalNameWithoutExt,
  });
  return mediaTemp;
}
