export type ReportFrequency = "daily" | "weekly" | "monthly" | "quarterly";

export type ReportRecipient = {
  id: string;
  name: string;
  image: string | null;
};

export type ReportItem = {
  archived: boolean;
  createdAt: string;
  createdBy: string;
  description: string | null;
  frequency: ReportFrequency;
  id: string;
  name: string;
  recipients: ReportRecipient[];
  updatedAt: string;
};
