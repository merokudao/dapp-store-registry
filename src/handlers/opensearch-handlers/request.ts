import { OpensearchClient } from "./connection";
import * as opensearchConfig from "./config.json";
import { Client } from "@opensearch-project/opensearch";
import {
  DAppSchemaDoc,
  OpenSearchConnectionOptions,
  PaginationQuery
} from "../../interfaces";
import { IndicesCreateResponse } from "@opensearch-project/opensearch/api/types";

export const methods = {
  PUT: "PUT",
  POST: "POST",
  GET: "GET",
  DELETE: "DELETE"
};
export class OpensearchRequest {
  private readonly opensearchConfig = opensearchConfig;
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
  public async createIndex(index: string): Promise<IndicesCreateResponse> {
    return this.opensearchClient.indices.create({
      index,
      body: {
        settings: this.opensearchConfig.settings,
        mappings: this.opensearchConfig.mappings
      }
    }) as Promise<any>;
  }

  /**
   * insert a new doc to database
   * @param index index name
   * @param body doc
   * @returns response
   */
  public async createDoc(index: string, body: DAppSchemaDoc): Promise<any> {
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
  public async createBulkDoc(
    index: string,
    body: DAppSchemaDoc[]
  ): Promise<any> {
    return this.opensearchClient.helpers.bulk({
      datasource: body,
      onDocument(doc: DAppSchemaDoc) {
        return { index: { _index: index, _id: doc.id } };
      }
    });
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
  public async deleteDoc(index: string, id: string): Promise<any> {
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
  public async updateDoc(index: string, body: DAppSchemaDoc): Promise<any> {
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
}
