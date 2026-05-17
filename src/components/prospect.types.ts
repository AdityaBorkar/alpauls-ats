export type ProspectItem = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  description: string | null;
  archived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ProspectListResponse = {
  items: ProspectItem[];
  nextCursor: string | null;
};

export type ProspectEventItem = {
  id: number;
  prospectId: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: Date | null;
};
