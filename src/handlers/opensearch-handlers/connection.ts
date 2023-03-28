import { Client } from "@opensearch-project/opensearch";

import { OpenSearchConnectionOptions } from "../../interfaces";

/**
 * a client to interact with opensearch server
 * return client
 */
export class OpensearchClient {
    connection: string;
    constructor(options: OpenSearchConnectionOptions){
        this.connection = options.connection;
    }
    public client (): Client {
        return new Client({
            node: this.connection,
            ssl: {
                rejectUnauthorized: false,
                // ca: fs.readFileSync(ca_certs_path),
                // You can turn off certificate verification (rejectUnauthorized: false) if you're using self-signed certificates with a hostname mismatch.
                // cert: fs.readFileSync(client_cert_path),
                // key: fs.readFileSync(client_key_path)
            },
        })
    }

};

