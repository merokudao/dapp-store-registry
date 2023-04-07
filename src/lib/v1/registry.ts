import { format } from "date-fns";

import { OpensearchRequest } from "../../handlers";
import { AddDappPayload, DAppSchema, DeleteDappPayload, FilterOptions, OpenSearchConnectionOptions, Pagination, SearchResult, StrandardResponse } from "../../interfaces";
import { DappStoreRegistry} from "../"
import { recordsPerPage, searchFilters } from "../utils";
import debug from "debug";

export const searchRegistry = {
    indexPrefix : `${process.env.environment}_dapp_registries`,
    alias: `${process.env.environment}_dapp_search_index`
}
export class DappStoreRegistryV1 {
    opensearchApis: OpensearchRequest;
    dappStoreRegistory: DappStoreRegistry;
    constructor( opensearchOptions: OpenSearchConnectionOptions) {
      this.opensearchApis = new OpensearchRequest(opensearchOptions);
      this.dappStoreRegistory = new DappStoreRegistry()
    }

    /**
     * prepare payload for bulk insert
     * @param index 
     * @returns 
     */
    public addBulkDocsToIndex = async (index: string, dapps: DAppSchema[] = []): Promise<any> => {
        if (!dapps.length) {
            const dappsResponse = await this.dappStoreRegistory.registry();
            dapps = dappsResponse.dapps;
        }

        if(!dapps.length) return;

        const dappDocs = dapps.map(d => {
        return {
            id: d.dappId,
            ...d
        }
        });
        return this.opensearchApis.createBulkDoc(index, dappDocs);
    };

    /**
     * create new search index with data from file or gitlab repo
     * @returns acknowledgement
     */
    public createIndex = async () => {
        const indexName = `${searchRegistry.indexPrefix}_${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}`;
        await this.opensearchApis.createIndex(indexName);
        return {
            status: 200,
            message: ["success"],
            indexName,
        }
    }

    /**
     * set alias to deploy a index, remove alias from old index
     * @param indexName 
     * @returns 
     */
    public liveIndex = async (indexName: string) => {
        // await this.addBulkDocsToIndex(indexName);
        await this.opensearchApis.attachAliasName(indexName, searchRegistry.alias);
        await this.opensearchApis.removeAliasName(indexName, searchRegistry.alias);
        return {
            status: 200,
            message: ["success"],
            indexName,
        }
    }

    /**
     * Returns the list of dApps that are listed in the registry. You can optionally
     * filter the results.
     * @param filterOpts The filter options. Defaults to `{ isListed: true}`
     * @returns The list of dApps that are listed in the registry
     */
    public dApps = async (
        filterOpts: FilterOptions = { isListed: true }
    ): Promise<{ response: DAppSchema[], pagination: Pagination}> => {
        const query = searchFilters('', filterOpts);
        const result: SearchResult = await this.opensearchApis.search(searchRegistry.alias, query);
        const { hits: { hits: response, total: { value } } } = result.body || { hits: { hits: []} };
        const pageCount = parseInt(`${value/recordsPerPage}`, 10);
        return {
            response,
            pagination: {
                page: filterOpts.page,
                limit: recordsPerPage,
                pageCount,
            }
        };
    }

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
    public async addOrUpdateDapp(payload: AddDappPayload): Promise<StrandardResponse> {
        const {
            name,
            email,
            githubID,
            dapp,
            org = undefined
        } = payload;
        /**
         * have to add if any action have to do onchain
         */
        debug(`deleting the app, name: ${name}, email: ${email}, githubId: ${githubID}, org: ${org}`);
        const res = await this.opensearchApis.createDoc(searchRegistry.alias, {id:dapp.dappId, ...dapp})
        return {
            status: 200,
            message: ["success"],
            data: [res]
        }
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
    public deleteDapp = async (payload: DeleteDappPayload): Promise<StrandardResponse> => {
        const {
            name,
            email,
            githubID,
            dappId,
            org = undefined
        } = payload;
        /**have to write code  for on chain actions*/
        debug(`deleting the app, name: ${name}, email: ${email}, githubId: ${githubID}, org: ${org}`);
        const res = await this.opensearchApis.deleteDoc(searchRegistry.alias, dappId)
        return {
            status: 200,
            message: ["success"],
            data: [res]
        }
    }

    /**
     * Performs search & filter on the dApps in the registry. This always returns the dApps
     * that are listed.
     * @param queryTxt The text to search for
     * @param filterOpts The filter options. Defaults to `{ isListed: true}`
     * @returns The filtered & sorted list of dApps
     */
    public search = async (
        queryTxt: string,
        filterOpts: FilterOptions = { isListed: true }
      ): Promise<{ response: DAppSchema[], pagination: Pagination}>=> {
        const query = searchFilters(queryTxt, filterOpts);
        const result: SearchResult = await this.opensearchApis.search(searchRegistry.alias, query);
        const { hits: { hits: response, total: { value } } } = result.body || { hits: { hits: []} };
        const pageCount = parseInt(`${value/recordsPerPage}`, 10);
        return {
          response,
          pagination: {
            page: filterOpts.page,
            limit: recordsPerPage,
            pageCount,
          }
        };
    };
    
    /**
     * search by dapp id
     * @param queryTxt dappId
     * @returns if matches return dappInfo
     */
    public searchByDappId = async (queryTxt: string): Promise<DAppSchema[]> => {
        const query = searchFilters('', { dappId: queryTxt });
        const result: SearchResult = await this.opensearchApis.search(searchRegistry.alias, query);
        const { hits: { hits: res } } = result.body || { hits: { hits: []} };
        return res;
    };
}
