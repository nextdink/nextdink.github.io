export interface List {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListMember {
  id: string; // Same as userId
  addedAt: Date;
  addedBy: string;
}

export interface CreateListData {
  name: string;
}

export interface UpdateListData {
  name?: string;
}