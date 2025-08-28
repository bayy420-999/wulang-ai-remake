import { User, CreateUserDto, UpdateUserDto } from '../../entities/User';

export interface IUserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
  hasConversationHistory(userId: string): Promise<boolean>;
}
