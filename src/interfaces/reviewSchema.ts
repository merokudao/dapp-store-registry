/**
 * dApps Review Schema
 */
export interface ReviewSchema {
  /**
   * Review of the app
   */
  review: string;
  /**
   * Rating of the app
   * @minimum 1
   * @maximum 5
   * @pattern ^[1-5]$
   */
  rating: number;
  /**
   * The address of the reviewer
   * @format address
   * @pattern ^0x[a-fA-F0-9]{40}$
   */
  reviewer: string;
  /**
   * The name of the app
   */
  dappId: string;
}
