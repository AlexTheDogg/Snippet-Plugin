export interface Snippet {
  name: string;
  description?: string;
  language?: string;
  prefix?: string;
  body: string[];
  usageCount?: number;
  lastUsed?: number;
}
