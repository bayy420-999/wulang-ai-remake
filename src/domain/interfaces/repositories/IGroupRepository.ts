import { Group, CreateGroupDto, UpdateGroupDto } from '../../entities/Group';

export interface IGroupRepository {
  findByGroupId(groupId: string): Promise<Group | null>;
  findById(id: string): Promise<Group | null>;
  create(group: CreateGroupDto): Promise<Group>;
  update(id: string, data: UpdateGroupDto): Promise<Group>;
  delete(id: string): Promise<void>;
  hasConversationHistory(groupId: string): Promise<boolean>;
}
