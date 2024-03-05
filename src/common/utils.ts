export const removeExtraFirstSlash = (value: string): string =>
  value.replace(/^\/+/, '');

export const removeExtraLastSlash = (value: string): string =>
  value.replace(/\/+$/, '');

export const removeExtraSlashes = (value: string): string =>
  value.replace(/^\/+|\/+$/g, '');
