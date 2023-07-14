import { createClient } from "redis";

/**
 * return a redis client with function
 */
class RedisClient {
  client: any;
  public async init() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    this.client.on("error", (error: object) => {
      console.log(
        `Error occured while connecting redis client: ${JSON.stringify(error)}`
      );
    });
    await this.client.connect();
  }

  /**
   * get a values
   * @param key key
   * @returns JSON
   */
  public async get(key: string): Promise<string> {
    try {
      const data = await this.client.get(key);
      if (!data) return "";
      return data;
    } catch (error) {
      return "";
    }
  }

  /**
   * set data to redis
   * @param key key
   * @param data JSON
   * @param ttl time in milliseconds
   * @returns
   */
  public async set(key: string, data: string, ttl: number) {
    try {
      return this.client.set(key, data, ttl);
    } catch (error) {
      return false;
    }
  }

  /**
   * invalidate cache
   * @param key cache
   * @returns
   */
  public async delete(key: string) {
    try {
      return this.client.del(key);
    } catch (error) {
      return false;
    }
  }
}

export const redisClient = new RedisClient();
