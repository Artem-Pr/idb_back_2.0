import { Readable } from 'stream';
import type { ProcessFile } from '../mediaDB.service';
import type { Tags } from 'exiftool-vendored';
import { Media } from '../entities/media.entity';
import { ObjectId } from 'mongodb';
import { MediaTemp } from '../entities/media-temp.entity';

export function createMockProcessFile(): ProcessFile {
  const mock: ProcessFile = {
    filename: 'mockFile.jpg',
    mimetype: 'image/jpeg',
    originalname: 'original_mock_file.jpg',
    fieldname: 'file',
    encoding: '7bit',
    buffer: Buffer.from(''),
    size: 1024,
    destination: '/tmp',
    path: '/tmp/mockFile.jpg',
    stream: new Readable({
      read() {},
    }),
  };

  return mock;
}

export const exifDataMock: Tags = {
  DateTimeOriginal: '2020-01-01 00:00:00',
  Description: 'test description',
  GPSPosition: '42.5, 42.5',
  ImageSize: '1920x1080',
  Megapixels: 12,
  Rating: 5,
};

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
  media.mimetype = 'image/jpeg';
  media.size = 1024;
  media.megapixels = exifDataMock.Megapixels;
  media.imageSize = exifDataMock.ImageSize;
  media.keywords = ['test', 'media'];
  media.changeDate = Date.now();
  media.originalDate = new Date(
    typeof exifDataMock.DateTimeOriginal === 'string'
      ? exifDataMock.DateTimeOriginal
      : '',
  );
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
