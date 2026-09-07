export interface ApiList<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

export interface ApiItem<T> {
  data: T;
}
