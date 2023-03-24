import { DAppSchema } from "./dAppSchema"

export interface CreateIndexRes {
    acknowledged: Boolean,
    shards_acknowledged: Boolean,
    index: string
}

export interface BulkInsertRes {
    total: Number,
    failed:Number,
    retry:Number,
    successful:Number,
    noop:Number,
    time:Number,
    bytes:Number,
    aborted:boolean
}

export interface OpenSearchCompositeQuery {
    bool: {
        must     : Object [],
        must_not : Object [],
        should : Object [],
    }
}

export interface PaginationQuery {
    query: OpenSearchCompositeQuery,
    from: Number,
    size: Number,
    sort: Object[]
}

export interface DAppSchemaSearch extends DAppSchema {
    id: string,
    index: string
}

export interface SearchResult {
    body: {
        took: Number,
        timed_out: Boolean,
        _shards: Object,
        hits: {
            total: {
                value: Number,
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