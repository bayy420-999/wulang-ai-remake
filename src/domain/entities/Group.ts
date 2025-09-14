export interface Group {
  id: string;
  groupId: string;
  name?: string;
  createdAt: Date;
}

export interface CreateGroupDto {
  groupId: string;
  name?: string;
}

export interface UpdateGroupDto {
  name?: string;
}
