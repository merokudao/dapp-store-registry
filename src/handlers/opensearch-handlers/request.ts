import { OpensearchClient } from "./connection";
import * as opensearchConfig from "./config.json";
import { Client } from "@opensearch-project/opensearch";
import { OpenSearchConnectionOptions } from "../../interfaces";

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
  public async createIndex(index: string): Promise<any> {
    return this.opensearchClient.indices.create({
      index,
      body: {
        settings: this.opensearchConfig.settings,
        mappings: this.opensearchConfig.mappings
      }
    });
  }

  /**
   * insert a new doc to database
   * @param index index name
   * @param body doc
   * @returns response
   */
  public async createDoc(index: string, body: any): Promise<any> {
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
  public async createBulkDoc(index: string, body: any[]): Promise<any> {
    return this.opensearchClient.helpers.bulk({
      datasource: body,
      onDocument(doc: any) {
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
  public async search(index: string, body: any): Promise<any> {
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
  public async updateDoc(index: string, body: any): Promise<any> {
    return this.opensearchClient.update({
      index,
      body,
      id: body.id,
      refresh: true
    });
  }
}
