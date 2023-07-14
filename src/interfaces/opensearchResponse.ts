import { DAppSchema } from "./dAppSchema";

export interface CreateIndexRes {
  acknowledged: boolean;
  shards_acknowledged: boolean;
  index: string;
}

export interface BulkInsertRes {
  total: number;
  failed: number;
  retry: number;
  successful: number;
  noop: number;
  time: number;
  bytes: number;
  aborted: boolean;
}

export interface OpenSearchCompositeQuery {
  bool: {
    must: object[];
    must_not: object[];
    should: object[];
    filter: object[];
  };
}

export interface PaginationQuery {
  _source: string[];
  query: OpenSearchCompositeQuery;
  from?: number;
  size: number;
  sort: object[];
}

export interface DAppSearchDataSchema extends DAppSchema {
  tokenId?: string;
  ownerAddress?: string;
  metrics?: object;
}

export interface DAppSchemaSearch {
  id: string;
  index: string;
  _source: DAppSearchDataSchema;
}

export interface SearchResult {
  body: {
    took: number;
    timed_out: boolean;
    _shards: object;
    _scroll_id?: string;
    hits: {
      total: {
        value: number;
        relation: string;
      };
      max_score: string;
      hits: DAppSchemaSearch[];
    };
  };
}

export interface OpenSearchConnectionOptions {
  connection: string;
}

export interface Pagination {
  page?: string;
  pageCount?: number;
  limit?: number;
}

export interface StandardResponse {
  status: number;
  message?: string[];
  data?: object[];
  pagination?: Pagination;
  scrollId?: string;
}

export interface AddDappPayload {
  name?: string;
  email?: string;
  accessToken?: string;
  githubID?: string;
  dapp: DAppSchema;
  org?: string | undefined;
}

export interface DeleteDappPayload {
  name: string;
  email: string;
  accessToken: string;
  githubID: string;
  dappId: string;
  org: string | undefined;
}

export interface FinalQuery {
  finalQuery: PaginationQuery;
  limit: number;
}

export interface DAppSchemaDoc extends DAppSchema {
  id?: string;
  nameKeyword: string;
  subCategoryKeyword?: string;
  dappIdKeyword: string;
}
