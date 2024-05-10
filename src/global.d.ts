declare namespace TSReset {
  type NonFalsy<T> = T extends false | 0 | '' | null | undefined | 0n
    ? never
    : T;

  type WidenLiteral<T> = T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends bigint
          ? bigint
          : T extends symbol
            ? symbol
            : T;
}

interface ReadonlyArray<T> {
  includes(
    searchElement: T | (TSReset.WidenLiteral<T> & {}),
    fromIndex?: number,
  ): boolean;
}

interface Array<T> {
  includes(
    searchElement: T | (TSReset.WidenLiteral<T> & {}),
    fromIndex?: number,
  ): boolean;
}

interface ObjectConstructor {
  keys<T>(obj: T): Array<keyof T>;
  keys<T extends string>(obj: Record<T, any>): string[];
}
