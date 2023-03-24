import { DAppSchema } from "./dAppSchema"

export interface CreateIndexRes {
    acknowledged: boolean,
    shards_acknowledged: boolean,
    index: string
}

export interface BulkInsertRes {
    total: number,
    failed: number,
    retry: number,
    successful: number,
    noop: number,
    time: number,
    bytes: number,
    aborted: boolean
}

export interface OpenSearchCompositeQuery {
    bool: {
        must     : object [],
        must_not : object [],
        should : object [],
    }
}

export interface PaginationQuery {
    query: OpenSearchCompositeQuery,
    from: number,
    size: number,
    sort: object[]
}

export interface DAppSchemaSearch extends DAppSchema {
    id: string,
    index: string
}

export interface SearchResult {
    body: {
        took: number,
        timed_out: boolean,
        _shards: object,
        hits: {
            total: {
                value: number,
                relation: string
            },
            max_score: string,
            hits: DAppSchemaSearch[]
        }

    }
}

export interface OpenSearchConnectionOptions {
    connection: string,
}

export interface Pagination {
    page?: string,
    pageCount?: number,
    limit?: number,
}