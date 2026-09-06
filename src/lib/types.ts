export type Account = {
  username: string;
  displayName: string;
};

export type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type Task = {
  id: string;
  startDate: string;
  assignedTo: string;
  createdBy: string;
  summary: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
};
