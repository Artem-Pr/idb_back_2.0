export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  success: true;
  data: T;
}

export interface Failure<E = Error> {
  success: false;
  error: E;
}

export const success = <T>(data: T): Success<T> => ({
  success: true,
  data,
});

export const failure = <E = Error>(error: E): Failure<E> => ({
  success: false,
  error,
});
