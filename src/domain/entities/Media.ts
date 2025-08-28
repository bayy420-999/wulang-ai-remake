export interface Media {
  id: string;
  url: string;
  type: string;
  summary?: string;
  userId: string;
  createdAt: Date;
}

export interface CreateMediaDto {
  url: string;
  type: string;
  summary?: string;
  userId: string;
}

export interface UpdateMediaDto {
  summary?: string;
}
