import { OpensearchClient } from "./connection";
import { Client } from "@opensearch-project/opensearch";
import {
  AppStoreSchemaDoc,
  DAppSchemaDoc,
  DeveloperSchemaDoc,
  OpenSearchConnectionOptions,
  PaginationQuery
} from "../../interfaces";

export const methods = {
  PUT: "PUT",
  POST: "POST",
  GET: "GET",
  DELETE: "DELETE"
};
export class OpensearchRequest {
  opensearchClient: Client;
  constructor(options: OpenSearchConnectionOptions) {
    this.opensearchClient = new OpensearchClient(options).client();
  }

  /**
   * will create a empty index
   * add setting of cluster
   * add mapping/schema of docs
   * @param index name of the index
   * @returns index name
   */
  public async createIndex(index: string, settings: object, mappings: object) {
    return this.opensearchClient.indices.create({
      index,
      body: {
        settings,
        mappings
      }
    });
  }

  /**
   * insert a new doc to database
   * @param index index name
   * @param body doc
   * @returns response
   */
  public async createDoc(
    index: string,
    body: DAppSchemaDoc | AppStoreSchemaDoc | DeveloperSchemaDoc
  ) {
    return this.opensearchClient.index({
      index,
      body,
      id: body.id,
      refresh: true
    });
  }

  /**
   * insert multipe docs
   * @param index index name
   * @param body array of docs
   */
  public async createBulkDoc(body: any) {
    return this.opensearchClient.helpers.bulk(body);
  }

  /**
   * do search based on providing query
   * @param index index name
   * @param body query
   * @returns list of docs
   */
  public async search(index: string, body: PaginationQuery): Promise<any> {
    return this.opensearchClient.search({
      index,
      body
    });
  }

  /**
   * delete a doc
   * @param index index name
   * @param id id of doc
   * @returns response
   */
  public async deleteDoc(index: string, id: string) {
    return this.opensearchClient.delete({
      index,
      id
    });
  }

  public async removeAliasName(index: string, alias: string) {
    const allIndexs = await this.opensearchClient.indices.getAlias({
      name: alias
    });
    if (!allIndexs || !allIndexs.body) return;
    Object.keys(allIndexs.body)
      .filter(aI => aI != index)
      .forEach(async aI => {
        await this.opensearchClient.indices.deleteAlias({
          index: aI,
          name: alias
        });
      });
    return;
  }
  public async attachAliasName(index: string, alias: string) {
    return this.opensearchClient.indices.putAlias({ index, name: alias });
  }

  /**
   * insert a new doc to database
   * @param index index name
   * @param body doc
   * @returns response
   */
  public async updateDoc(
    index: string,
    body: DAppSchemaDoc | AppStoreSchemaDoc | DeveloperSchemaDoc
  ): Promise<any> {
    const id = body.id;
    delete body.id;
    return this.opensearchClient.update({
      index,
      id,
      body: { doc: body },
      refresh: true
    } as any);
  }

  /**
   * search for given query and return a scroll id
   * this scroll id context will be remebered for q minutes
   * after if call made again with the same scroll id
   * then the context will be renewed for another 1m
   * @param index index name
   * @param body query
   * @returns response
   */
  public async initiateScrollSearch(
    index: string,
    body: PaginationQuery
  ): Promise<any> {
    return this.opensearchClient.search({
      index,
      body,
      scroll: "30s"
    });
  }
  /**
   * on each call return next page of scroll_id
   * @param scrollId get next page result
   * @returns
   */
  public async scrollDocs(scrollId: string): Promise<any> {
    return this.opensearchClient.scroll({
      scroll: "1m",
      scroll_id: scrollId
    });
  }

  /**
   * delete snapshot of scroll
   * @param scrollIds scroll ids
   * @returns acknowledge
   */
  public async deleteScrollIds(scrollIds: string[]): Promise<any> {
    return this.opensearchClient.clearScroll({
      scroll_id: scrollIds
    });
  }

  /**
   * get all documents based on filters
   * @param index
   * @param body
   * @returns
   */
  public async getTotalDocsCount(
    index: string,
    body: PaginationQuery
  ): Promise<any> {
    return this.opensearchClient.count({
      index,
      body
    });
  }

  /**
   * update multiple docs in a single request
   * @param index string
   * @param body doc[]
   * @returns
   */
  public async updateDocs(index: string, body: any): Promise<any> {
    return this.opensearchClient.bulk({
      index,
      refresh: true,
      body
    });
  }
}
