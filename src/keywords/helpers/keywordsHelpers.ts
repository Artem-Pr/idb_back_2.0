import type { ExifKeywords, Media } from 'src/files/entities/media.entity';

export const getKeywordsFromMediaList = (mediaList: Media[]): ExifKeywords => {
  const keywords = mediaList
    .map(({ keywords }) => keywords)
    .filter(Boolean)
    .flat();

  return Array.from(new Set(keywords));
};
