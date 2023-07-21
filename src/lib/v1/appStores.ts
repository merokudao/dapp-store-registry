import { format } from "date-fns";

import { OpensearchRequest } from "../../handlers";
import {
  AppStoreSchemaDoc,
  DocsCountResponse,
  OpenSearchCompositeQuery,
  OpenSearchConnectionOptions,
  SearchResult,
  StandardResponse,
  StoreSchema
} from "../../interfaces";
import { searchFilters } from "../utils";
import {
  AppStoreSearchPayload,
  FilterOptionsSearch
} from "../../interfaces/searchOptions";

export const searchAppStore = {
  indexPrefix: `${process.env.ENVIRONMENT}_app_store`,
  alias: `${process.env.ENVIRONMENT}_app_store_search_index`
};

export const MAX_RESULT_WINDOW = 10000;

export class DappStoreRegistryV1 {
  openSearchApis: OpensearchRequest;
  constructor(openSearchOptions: OpenSearchConnectionOptions) {
    this.openSearchApis = new OpensearchRequest(openSearchOptions);
  }

  public searchQuery = (search: string, payload: AppStoreSearchPayload) => {
    const query: OpenSearchCompositeQuery = {
      bool: {
        must: [],
        must_not: [],
        should: [],
        filter: []
      }
    };
    return {
      search,
      payload,
      query
    };
  };

  /**
   * prepare payload for bulk insert
   * @param index
   * @returns
   */
  public addBulkDocsToIndex = async (
    index: string,
    appStores: StoreSchema[] = []
  ) => {
    if (!appStores.length) return;

    const dappDocs = appStores.map(d => {
      return {
        id: d.key,
        keyKeyword: d.key,
        ...d
      };
    });
    return this.openSearchApis.createBulkDoc(index, dappDocs as any);
  };

  /**
   * create new search index with data from file or gitlab repo
   * @returns acknowledgement
   */
  public createIndex = async () => {
    const indexName = `${searchAppStore.indexPrefix}_${format(
      new Date(),
      "yyyy-MM-dd-HH-mm-ss"
    )}`;
    await this.openSearchApis.createIndex(indexName);
    return {
      status: 200,
      message: ["success"],
      indexName
    };
  };

  /**
   * set alias to deploy a index, remove alias from old index
   * @param indexName
   * @returns
   */
  public liveIndex = async (indexName: string) => {
    // await this.addBulkDocsToIndex(indexName);
    await this.openSearchApis.attachAliasName(indexName, searchAppStore.alias);
    await this.openSearchApis.removeAliasName(indexName, searchAppStore.alias);
    return {
      status: 200,
      message: ["success"],
      indexName
    };
  };

  public async createDoc(appStore: StoreSchema): Promise<StandardResponse> {
    /**
     * have to add if any action have to do onchain
     */
    await this.openSearchApis.createDoc(searchAppStore.alias, {
      id: appStore.key,
      keyKeyword: appStore.key,
      ...appStore
    } as any);
    return {
      status: 200,
      message: ["success"]
    };
  }

  public deleteDapp = async (dappId: string): Promise<StandardResponse> => {
    await this.openSearchApis.deleteDoc(searchAppStore.alias, dappId);
    return {
      status: 200,
      message: ["success"]
    };
  };

  /**
   * Performs search & filter on the dApps in the registry. This always returns the dApps
   * that are listed.
   * @param queryTxt The text to search for
   * @param filterOpts The filter options. Defaults to `{ isListed: true}`
   * @returns The filtered & sorted list of dApps
   */
  public search = async (
    queryTxt: string,
    filterOpts: FilterOptionsSearch = { isListed: "true" }
  ): Promise<StandardResponse> => {
    const { finalQuery, limit } = searchFilters(queryTxt, filterOpts);
    if ((finalQuery.from || 0) + (finalQuery.size || 0) > MAX_RESULT_WINDOW)
      return this.maxWindowError(finalQuery, limit);

    const result: SearchResult = await this.openSearchApis.search(
      searchAppStore.alias,
      finalQuery
    );
    const {
      hits: {
        hits: response,
        total: { value }
      }
    } = result.body || { hits: { hits: [] } };
    const pageCount = Math.ceil(value / limit);
    return {
      status: 200,
      message: ["success"],
      data: response.map(rs => rs._source),
      pagination: {
        page: filterOpts.page as string,
        limit,
        pageCount
      }
    };
  };

  /**
   * search by dapp id
   * @param queryTxt dappId
   * @returns if matches return dappInfo
   */
  public searchById = async (id: string): Promise<StandardResponse> => {
    const { finalQuery } = searchFilters("", {
      dappId: id,
      searchById: true
    });
    const result: SearchResult = await this.openSearchApis.search(
      searchAppStore.alias,
      finalQuery
    );
    const {
      hits: { hits: res }
    } = result.body || { hits: { hits: [] } };
    return {
      status: 200,
      message: ["success"],
      data: res && res.map(rs => rs._source)
    };
  };

  public autoComplete = async (
    queryTxt: string,
    filterOpts: FilterOptionsSearch = { isListed: "true" }
  ): Promise<StandardResponse> => {
    const { finalQuery } = searchFilters(queryTxt, filterOpts, true);
    const result: SearchResult = await this.openSearchApis.search(
      searchAppStore.alias,
      finalQuery
    );
    const {
      hits: { hits: response }
    } = result.body || { hits: { hits: [] } };
    return {
      status: 200,
      message: ["success"],
      data: response && response.map(rs => rs._source)
    };
  };

  /**
   * search by Owner Address
   * @param ownerAddress dappId
   * @returns if matches return dappInfo
   */
  public searchOwnerAddress = async (
    ownerAddress: string
  ): Promise<StandardResponse> => {
    const { finalQuery } = searchFilters("", {
      ownerAddress
    });
    const result: SearchResult = await this.openSearchApis.search(
      searchAppStore.alias,
      finalQuery
    );
    const {
      hits: { hits: res }
    } = result.body || { hits: { hits: [] } };
    return {
      status: 200,
      message: ["success"],
      data: res && res.map(rs => rs._source)
    };
  };

  /**
   *  update dapp to index, when new app is registered on dapp store
   * @param name
   * @param dapp
   * @param org
   * @returns acknowledge
   */
  public async updateDoc(appStore: StoreSchema): Promise<StandardResponse> {
    /**
     * have to add if any action have to do onchain
     */
    await this.openSearchApis.updateDoc(searchAppStore.alias, {
      id: appStore.key,
      keyKeyword: appStore.key,
      ...appStore
    } as any);
    return { status: 200, message: ["success"] };
  }

  /**
   * retrun Error response if
   * @param finalQuery quey
   * @param limit limit
   * @returns response
   */
  private maxWindowError(
    finalQuery: FilterOptionsSearch,
    limit: number
  ): StandardResponse {
    return {
      status: 400,
      message: ["Error: Reached max page allowed, use filters to search"],
      data: [],
      pagination: {
        page: finalQuery.page as string,
        limit,
        pageCount: (finalQuery.page as number) - 1
      }
    };
  }

  /**
   * call scroll docs
   * @param filterOpts payload fields
   * @returns
   */
  public async scrollDocs(
    filterOpts: FilterOptionsSearch
  ): Promise<StandardResponse> {
    const { scrollId = null } = filterOpts;
    let result: SearchResult;
    if (scrollId) result = await this.openSearchApis.scrollDocs(scrollId);
    else {
      const { finalQuery } = searchFilters("", filterOpts);
      delete finalQuery.from;
      Object.assign(finalQuery, { size: filterOpts.size || 200 });
      Object.assign(finalQuery, {
        _source: filterOpts._source || finalQuery._source
      });
      result = await this.openSearchApis.initiateScrollSearch(
        searchAppStore.alias,
        finalQuery
      );
    }
    const {
      body: {
        hits: { hits: res },
        _scroll_id
      }
    } = result || { body: { hits: { hits: [] }, _scroll_id: null } };
    return {
      status: 200,
      message: ["success"],
      scrollId: _scroll_id,
      data: res && res.map(rs => rs._source)
    };
  }

  /**
   * delete scroll snapshots
   * @param ids scroll ids
   * @returns
   */
  public async deleteScroller(ids: string[]) {
    return this.openSearchApis.deleteScrollIds(ids);
  }

  public async getTotalDocsCount(
    filterOpts: FilterOptionsSearch = { isListed: "true" }
  ): Promise<DocsCountResponse> {
    const { finalQuery } = searchFilters("", filterOpts);
    delete finalQuery._source;
    delete finalQuery.from;
    delete finalQuery.size;
    delete finalQuery.sort;
    const res = await this.openSearchApis.getTotalDocsCount(
      searchAppStore.alias,
      finalQuery
    );
    return {
      status: 200,
      message: ["success"],
      countRes: res.body
    };
  }

  /**
   * update multiple docs
   * @param index string
   * @param body { isVerfied: true, dappId }
   * @returns
   */
  public async updateDocs(index: string, body: AppStoreSchemaDoc[]) {
    const chunks = [];
    while (body.length > 0) {
      chunks.push(body.splice(0, 10000));
    }
    return Promise.allSettled(
      chunks.map(chunk => this.openSearchApis.updateDocs(index, chunk as any))
    );
  }
}
