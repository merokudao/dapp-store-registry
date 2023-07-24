import { format } from "date-fns";

import { OpensearchRequest } from "../../handlers";
import {
  AddDappPayload,
  DAppSchema,
  DAppSchemaDoc,
  DeleteDappPayload,
  DocsCountResponse,
  OpenSearchConnectionOptions,
  SearchResult,
  StandardResponse
} from "../../interfaces";
import { DappStoreRegistry } from "../";
import { searchFilters } from "../utils";
import debug from "debug";
import { FilterOptionsSearch } from "../../interfaces/searchOptions";

export const searchRegistry = {
  indexPrefix: `${process.env.ENVIRONMENT}_dapp_registries`,
  alias: `${process.env.ENVIRONMENT}_dapp_search_index`
};

export const MAX_RESULT_WINDOW = 10000;

export class DappStoreRegistryV1 {
  openSearchApis: OpensearchRequest;
  dappStoreRegistry: DappStoreRegistry;
  constructor(openSearchOptions: OpenSearchConnectionOptions) {
    this.openSearchApis = new OpensearchRequest(openSearchOptions);
    this.dappStoreRegistry = new DappStoreRegistry();
  }

  /**
   * prepare payload for bulk insert
   * @param index
   * @returns
   */
  public addBulkDocsToIndex = async (
    index: string,
    dapps: DAppSchema[] = []
  ) => {
    if (!dapps.length) {
      const dappsResponse = await this.dappStoreRegistry.registry();
      dapps = dappsResponse.dapps.map(x => {
        return { ...x, minted: false };
      });
    }

    if (!dapps.length) return;

    const dappDocs = dapps.map(d => {
      return {
        id: d.dappId,
        nameKeyword: d.name,
        subCategoryKeyword: d.subCategory,
        dappIdKeyword: d.dappId,
        ...d
      } as DAppSchemaDoc;
    });
    const dappsDocsBulk = {
      datasource: dappDocs,
      onDocument(doc: DAppSchemaDoc) {
        return { index: { _index: index, _id: doc.id } };
      }
    };
    return this.openSearchApis.createBulkDoc(dappsDocsBulk);
  };

  /**
   * create new search index with data from file or gitlab repo
   * @returns acknowledgement
   */
  public createIndex = async () => {
    const indexName = `${searchRegistry.indexPrefix}_${format(
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
    await this.openSearchApis.attachAliasName(indexName, searchRegistry.alias);
    await this.openSearchApis.removeAliasName(indexName, searchRegistry.alias);
    return {
      status: 200,
      message: ["success"],
      indexName
    };
  };

  /**
   * Returns the list of dApps that are listed in the registry. You can optionally
   * filter the results.
   * @param filterOpts The filter options. Defaults to `{ isListed: true}`
   * @returns The list of dApps that are listed in the registry
   */
  public dApps = async (
    filterOpts: FilterOptionsSearch = { isListed: "true" }
  ): Promise<StandardResponse> => {
    const { finalQuery, limit } = searchFilters("", filterOpts);

    if ((finalQuery.from || 0) + (finalQuery.size || 0) > MAX_RESULT_WINDOW)
      return this.maxWindowError(finalQuery, limit);

    const result: SearchResult = await this.openSearchApis.search(
      searchRegistry.alias,
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
   * add new dapp to index, when new app is registered on dapp store
   * @param name
   * @param email
   * @param accessToken
   * @param githubID
   * @param dapp
   * @param org
   * @returns acknowledge
   */
  public async addOrUpdateDapp(
    payload: AddDappPayload
  ): Promise<StandardResponse> {
    const { name, email, githubID, dapp, org = undefined } = payload;
    /**
     * have to add if any action have to do onchain
     */
    debug(
      `deleting the app, name: ${name}, email: ${email}, githubId: ${githubID}, org: ${org}`
    );
    await this.openSearchApis.createDoc(searchRegistry.alias, {
      id: dapp.dappId,
      nameKeyword: dapp.name,
      subCategoryKeyword: dapp.subCategory as string,
      dappIdKeyword: dapp.dappId,
      ...dapp
    });
    return {
      status: 200,
      message: ["success"]
    };
  }

  /**
   * delete the dapp from index, not longer exists the dapp on our dappstore kit
   * @param name
   * @param email
   * @param accessToken
   * @param githubID
   * @param dappId dappId of the dapp
   * @param org
   * @returns acknowledgement
   */
  public deleteDapp = async (
    payload: DeleteDappPayload
  ): Promise<StandardResponse> => {
    const { name, email, githubID, dappId, org = undefined } = payload;
    /**have to write code  for on chain actions*/
    debug(
      `deleting the app, name: ${name}, email: ${email}, githubId: ${githubID}, org: ${org}`
    );
    await this.openSearchApis.deleteDoc(searchRegistry.alias, dappId);
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
      searchRegistry.alias,
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
  public searchByDappId = async (
    queryTxt: string
  ): Promise<StandardResponse> => {
    const { finalQuery } = searchFilters("", {
      dappId: queryTxt,
      searchById: true
    });
    const result: SearchResult = await this.openSearchApis.search(
      searchRegistry.alias,
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
      searchRegistry.alias,
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
      searchRegistry.alias,
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
  public async updateDapp(payload: AddDappPayload): Promise<StandardResponse> {
    const { dapp } = payload;
    /**
     * have to add if any action have to do onchain
     */
    await this.openSearchApis.updateDoc(searchRegistry.alias, {
      id: dapp.dappId,
      nameKeyword: dapp.name,
      subCategoryKeyword: dapp.subCategory,
      dappIdKeyword: dapp.dappId,
      ...dapp
    });
    return {
      status: 200,
      message: ["success"]
    };
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
        searchRegistry.alias,
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
      searchRegistry.alias,
      finalQuery
    );
    return {
      status: 200,
      message: ["success"],
      countRes: res.body
    };
  }

  /**
   * get all dapp Ids matched for query
   * @param dappId
   * @returns all Matched dappIds
   */
  public async getDappIDs(dappId: string): Promise<DocsCountResponse> {
    const { finalQuery } = searchFilters("", {
      dappId,
      searchById: true
    });
    Object.assign(finalQuery, { _source: ["dappId"] });
    const result: SearchResult = await this.openSearchApis.search(
      searchRegistry.alias,
      finalQuery
    );
    const {
      hits: { hits: res }
    } = result.body || { hits: { hits: [] } };
    return {
      status: 200,
      message: ["success"],
      countRes: {
        count: res.length,
        dappIds: res && res.map(rs => rs._source.dappId)
      }
    };
  }

  /**
   * update multiple docs
   * @param index string
   * @param body { isVerfied: true, dappId }
   * @returns
   */
  public async updateDocs(index: string, body: DAppSchemaDoc[]) {
    const chunks = [];
    while (body.length > 0) {
      let chunk = body.splice(0, 10000);
      chunk = chunk.reduce((aggs: any[], doc: DAppSchemaDoc) => {
        aggs = aggs.concat([
          { update: { _index: index, _id: doc.dappId } },
          { doc }
        ]);
        return aggs;
      }, []);
      chunks.push(chunk);
      chunks.push(chunk);
    }
    return Promise.allSettled(
      chunks.map(chunk => this.openSearchApis.updateDocs(index, chunk))
    );
  }
}
