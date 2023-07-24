import { format } from "date-fns";

import { OpensearchRequest } from "../../handlers";
import {
  _source,
  settings,
  mappings
} from "../../handlers/opensearch-handlers/appStoresConfig.json";
import {
  DeveloperSchema,
  DeveloperSchemaDoc,
  DocsCountResponse,
  OpenSearchCompositeQuery,
  OpenSearchConnectionOptions,
  PaginationQuery,
  SearchResult,
  StandardResponse
} from "../../interfaces";
import { orderBy, recordsPerPage, recordsPerPageAutoComplete } from "../utils";
import {
  DeveloperSearchPayload,
  FilterOptionsSearch,
  OrderParams
} from "../../interfaces/searchOptions";

const defaultBoost = process.env.DEFAULT_BOOST || "1";
const boostScore = {
  name: parseInt(process.env.BOOST_NAME || defaultBoost),
  description: parseInt(process.env.BOOST_DESCRIPTION || defaultBoost),
  devId: parseInt(process.env.BOOST_APP_STORE_KEY || defaultBoost)
};
export const searchAppStore = {
  indexPrefix: `${process.env.ENVIRONMENT}_dev_nfts`,
  alias: `${process.env.ENVIRONMENT}_dev_nfts_search_index`
};

export const MAX_RESULT_WINDOW = 10000;

export class DappStoreRegistryV1 {
  openSearchApis: OpensearchRequest;
  constructor(openSearchOptions: OpenSearchConnectionOptions) {
    this.openSearchApis = new OpensearchRequest(openSearchOptions);
  }

  /**
   * Prepaire query for search, filters, search by id, tokens, ownerAddress
   * @param search
   * @param payload
   * @returns
   */
  private searchQuery = (search: string, payload: DeveloperSearchPayload) => {
    const query: OpenSearchCompositeQuery = {
      bool: {
        must: [],
        must_not: [],
        should: [],
        filter: []
      }
    };
    const {
      page = 1,
      searchById = false,
      ownerAddress = null,
      tokenIds = "",
      listedOnOrAfter = null,
      listedOnOrBefore = null,
      isListed = "true"
    } = payload;
    let { limit = recordsPerPage, devId = "" } = payload;

    if (devId.length && typeof devId === "string")
      devId = devId.split(",").map((di: string) => di.trim());
    // eslint-disable-next-line no-extra-boolean-cast

    if (listedOnOrAfter)
      query.bool.must.push({ range: { listDate: { gte: listedOnOrAfter } } });
    if (listedOnOrBefore)
      query.bool.must.push({ range: { listDate: { lte: listedOnOrBefore } } });

    if (devId.length) query.bool.must.push({ terms: { devIdKeyword: devId } });
    if (tokenIds.length)
      query.bool.must.push({
        terms: {
          tokenId: tokenIds
            .split(",")
            .map((c: string) => c.trim())
            .filter((c: string) => c.length)
        }
      });

    // search on customer string
    if (!!search && search.length) {
      query.bool.should.push({
        match: { name: { query: search, boost: boostScore.name } }
      });
      query.bool.should.push({
        match: { description: { query: search, boost: boostScore.description } }
      });
      query.bool.should.push({
        match: { devId: { query: search, boost: boostScore.devId } }
      });
      query.bool.filter.push({
        term: { isListed: isListed === "true" ? true : false }
      });
      // query.bool.filter.push({ term: { isVerified: true} });
    }

    if (ownerAddress) query.bool.must.push({ match: { ownerAddress } });

    if (isListed && !searchById && !search && !ownerAddress)
      query.bool.must.push({
        match: { isListed: isListed === "true" ? true : false }
      });

    // if (!ownerAddress)
    //   query.bool.filter.push({ term: { isVerified: true} });

    payload.page = parseInt(page as string);
    payload.page = payload.page > 0 ? payload.page : 1;
    if (limit > recordsPerPage) limit = recordsPerPage;
    const finalQuery: PaginationQuery = {
      _source: _source.searchFields,
      query,
      from: (payload.page - 1) * limit,
      size: limit,
      sort: orderBy((payload.orderBy || {}) as OrderParams)
    };
    return { finalQuery, limit };
  };

  /**
   * Preppaire query for autocomplete search
   * @param search
   * @param payload
   * @returns
   */
  private searchAutoComplete = (
    search: string,
    payload: DeveloperSearchPayload
  ) => {
    const query: OpenSearchCompositeQuery = {
      bool: {
        must: [],
        must_not: [],
        should: [],
        filter: []
      }
    };

    query.bool.should.push({
      match: {
        legalName: { query: search, fuzziness: 6, boost: boostScore.name }
      }
    });
    query.bool.should.push({
      match: { description: { query: search, boost: boostScore.description } }
    });
    query.bool.should.push({
      match: {
        devId: { query: search, fuzziness: "AUTO", boost: boostScore.devId }
      }
    });
    query.bool.filter.push({ term: { isListed: true } });
    // query.bool.filter.push({ term: { isVerified: true} });

    const finalQuery: PaginationQuery = {
      _source: _source.autocompleteFields,
      query,
      from: 0,
      size: recordsPerPageAutoComplete,
      sort: orderBy((payload.orderBy || {}) as OrderParams)
    };
    return { finalQuery };
  };

  /**
   * prepare payload for bulk insert
   * @param index
   * @returns
   */
  public addBulkDocsToIndex = async (
    index: string,
    developers: DeveloperSchema[] = []
  ) => {
    if (!developers.length) return;

    const appStoreDocs = developers.map(d => {
      return {
        id: d.devId,
        devIdKeyword: d.devId,
        ...d
      };
    });
    const appStoreDocsBulk = {
      datasource: appStoreDocs,
      onDocument(doc: DeveloperSchema) {
        return { index: { _index: index, _id: doc.devId } };
      }
    };
    return this.openSearchApis.createBulkDoc(appStoreDocsBulk);
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
    await this.openSearchApis.createIndex(indexName, settings, mappings);
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

  public async createDoc(
    developer: DeveloperSchema
  ): Promise<StandardResponse> {
    /**
     * have to add if any action have to do onchain
     */
    await this.openSearchApis.createDoc(searchAppStore.alias, {
      id: developer.devId,
      devIdKeyword: developer.devId,
      ...developer
    });
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
    filterOpts: DeveloperSearchPayload = { isListed: "true" }
  ): Promise<StandardResponse> => {
    const { finalQuery, limit } = this.searchQuery(queryTxt, filterOpts);
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
    const { finalQuery } = this.searchQuery("", {
      devId: id,
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
    filterOpts: DeveloperSearchPayload = { isListed: "true" }
  ): Promise<StandardResponse> => {
    const { finalQuery } = this.searchAutoComplete(queryTxt, filterOpts);
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
    const { finalQuery } = this.searchQuery("", {
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
  public async updateDoc(
    developer: DeveloperSchema
  ): Promise<StandardResponse> {
    /**
     * have to add if any action have to do onchain
     */
    await this.openSearchApis.updateDoc(searchAppStore.alias, {
      id: developer.devId,
      devIdKeyword: developer.devId,
      ...developer
    });
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
    filterOpts: DeveloperSearchPayload
  ): Promise<StandardResponse> {
    const { scrollId = null } = filterOpts;
    let result: SearchResult;
    if (scrollId) result = await this.openSearchApis.scrollDocs(scrollId);
    else {
      const { finalQuery } = this.searchQuery("", filterOpts);
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
    filterOpts: DeveloperSearchPayload = { isListed: "true" }
  ): Promise<DocsCountResponse> {
    const { finalQuery } = this.searchQuery("", filterOpts);
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
  public async updateDocs(index: string, body: DeveloperSchemaDoc[]) {
    const chunks = [];
    while (body.length > 0) {
      let chunk = body.splice(0, 10000);
      chunk = chunk.reduce((aggs: any[], doc: DeveloperSchemaDoc) => {
        aggs = aggs.concat([
          { update: { _index: index, _id: doc.devId } },
          { doc }
        ]);
        return aggs;
      }, []);
      chunks.push(chunk);
    }
    return Promise.allSettled(
      chunks.map(chunk => this.openSearchApis.updateDocs(index, chunk))
    );
  }
}
