export interface User {
  id: string;
  phoneNumber: string;
  name?: string;
  createdAt: Date;
}

export interface CreateUserDto {
  phoneNumber: string;
  name?: string;
}

export interface UpdateUserDto {
  name?: string;
}
