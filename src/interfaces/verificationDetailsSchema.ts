export interface VerificationDetails {
  verification: {
    icon: string;
    verified: {
      resultURL: string;
      icon: string;
      description?: string;
      type: string;
      vendor: string;
      verificationExpires: string;
      verifiedOn: string;
    }[];
  };
}
