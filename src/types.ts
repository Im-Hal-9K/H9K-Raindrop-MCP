export interface RaindropConfig {
  apiToken: string;
  baseUrl?: string;
}

export interface Raindrop {
  _id: number;
  title: string;
  excerpt?: string;
  note?: string;
  link: string;
  domain?: string;
  cover?: string;
  tags?: string[];
  created?: string;
  lastUpdate?: string;
  collection?: {
    $id: number;
  };
  important?: boolean;
  type?: string;
  highlights?: string[];
}

export interface Collection {
  _id: number;
  title: string;
  description?: string;
  public?: boolean;
  view?: string;
  count?: number;
  cover?: string[];
  parent?: {
    $id: number;
  };
  created?: string;
  lastUpdate?: string;
}

export interface Tag {
  _id: string;
  count: number;
}

export interface SearchParams {
  collectionId?: number;
  search?: string;
  sort?: string;
  perpage?: number;
  page?: number;
  tag?: string[];
}

export interface CreateRaindropParams {
  link: string;
  title?: string;
  excerpt?: string;
  note?: string;
  tags?: string[];
  collectionId?: number;
  important?: boolean;
}

export interface UpdateRaindropParams {
  title?: string;
  excerpt?: string;
  note?: string;
  tags?: string[];
  collectionId?: number;
  important?: boolean;
}

export interface CreateCollectionParams {
  title: string;
  description?: string;
  public?: boolean;
  view?: string;
  parent?: number;
}

export interface UpdateCollectionParams {
  title?: string;
  description?: string;
  public?: boolean;
  view?: string;
  parent?: number;
}
