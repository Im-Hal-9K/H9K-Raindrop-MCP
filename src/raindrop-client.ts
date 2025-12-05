import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  RaindropConfig,
  Raindrop,
  Collection,
  Tag,
  SearchParams,
  CreateRaindropParams,
  UpdateRaindropParams,
  CreateCollectionParams,
  UpdateCollectionParams
} from './types.js';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Check if error is retryable
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors (no response) are retryable
    return true;
  }
  const status = error.response.status;
  // Retry on rate limits and server errors
  return status === 429 || (status >= 500 && status < 600);
}

// Format error for better Claude understanding (prevents retry loops)
function formatError(error: AxiosError): string {
  if (!error.response) {
    return `Network error: ${error.message}. The Raindrop.io API may be temporarily unavailable. DO NOT RETRY - this is a connectivity issue.`;
  }

  const status = error.response.status;
  const data = error.response.data as any;

  switch (status) {
    case 400:
      return `Bad request: ${data?.errorMessage || data?.error || 'Invalid parameters provided'}. Please check the input values and DO NOT RETRY with the same parameters.`;
    case 401:
      return 'Authentication failed: Invalid or expired API token. Please check your RAINDROP_API_TOKEN. DO NOT RETRY - user must fix the token.';
    case 403:
      return 'Access denied: You do not have permission for this operation. DO NOT RETRY.';
    case 404:
      return `Not found: The requested resource does not exist. It may have been deleted. DO NOT RETRY.`;
    case 429:
      return 'Rate limited: Too many requests. The server has already retried. Please inform the user to wait before trying again.';
    default:
      if (status >= 500) {
        return `Raindrop.io server error (${status}): The service is temporarily unavailable. Already retried ${MAX_RETRIES} times.`;
      }
      return `API error (${status}): ${data?.errorMessage || data?.error || error.message}. DO NOT RETRY.`;
  }
}

export class RaindropClient {
  private client: AxiosInstance;

  constructor(config: RaindropConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.raindrop.io/rest/v1',
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for retry logic and better error handling
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const config = error.config;
        if (!config) {
          throw new Error(formatError(error));
        }

        // Get retry count from config
        const retryCount = (config as any).__retryCount || 0;

        // Check if we should retry
        if (retryCount < MAX_RETRIES && isRetryableError(error)) {
          (config as any).__retryCount = retryCount + 1;

          // Calculate delay with exponential backoff
          const backoffDelay = RETRY_DELAY_MS * Math.pow(2, retryCount);
          console.error(`Request failed, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

          await delay(backoffDelay);
          return this.client.request(config);
        }

        // No more retries, throw formatted error
        throw new Error(formatError(error));
      }
    );
  }

  // Bookmark (Raindrop) methods
  async getRaindrop(id: number): Promise<Raindrop> {
    const response = await this.client.get(`/raindrop/${id}`);
    return response.data.item;
  }

  async searchRaindrops(params: SearchParams = {}): Promise<{ items: Raindrop[], count: number }> {
    const collectionId = params.collectionId || 0;
    const queryParams: any = {};

    if (params.search) queryParams.search = params.search;
    if (params.sort) queryParams.sort = params.sort;
    if (params.perpage) queryParams.perpage = params.perpage;
    if (params.page) queryParams.page = params.page;
    if (params.tag && params.tag.length > 0) queryParams.tag = params.tag;

    const response = await this.client.get(`/raindrops/${collectionId}`, { params: queryParams });
    return {
      items: response.data.items,
      count: response.data.count
    };
  }

  async createRaindrop(params: CreateRaindropParams): Promise<Raindrop> {
    const data: any = {
      link: params.link,
      pleaseParse: {}
    };

    if (params.title) data.title = params.title;
    if (params.excerpt) data.excerpt = params.excerpt;
    if (params.note) data.note = params.note;
    if (params.tags) data.tags = params.tags;
    if (params.important !== undefined) data.important = params.important;

    const collectionId = params.collectionId || 0;
    if (collectionId !== 0) {
      data.collection = { $id: collectionId };
    }

    const response = await this.client.post('/raindrop', data);
    return response.data.item;
  }

  async updateRaindrop(id: number, params: UpdateRaindropParams): Promise<Raindrop> {
    const data: any = {};

    if (params.title !== undefined) data.title = params.title;
    if (params.excerpt !== undefined) data.excerpt = params.excerpt;
    if (params.note !== undefined) data.note = params.note;
    if (params.tags !== undefined) data.tags = params.tags;
    if (params.important !== undefined) data.important = params.important;
    if (params.collectionId !== undefined) {
      data.collection = { $id: params.collectionId };
    }

    const response = await this.client.put(`/raindrop/${id}`, data);
    return response.data.item;
  }

  async deleteRaindrop(id: number): Promise<void> {
    await this.client.delete(`/raindrop/${id}`);
  }

  // Collection methods
  async getCollections(): Promise<Collection[]> {
    const response = await this.client.get('/collections');
    return response.data.items;
  }

  async getCollection(id: number): Promise<Collection> {
    const response = await this.client.get(`/collection/${id}`);
    return response.data.item;
  }

  async createCollection(params: CreateCollectionParams): Promise<Collection> {
    const data: any = {
      title: params.title
    };

    if (params.description) data.description = params.description;
    if (params.public !== undefined) data.public = params.public;
    if (params.view) data.view = params.view;
    if (params.parent) data.parent = { $id: params.parent };

    const response = await this.client.post('/collection', data);
    return response.data.item;
  }

  async updateCollection(id: number, params: UpdateCollectionParams): Promise<Collection> {
    const data: any = {};

    if (params.title !== undefined) data.title = params.title;
    if (params.description !== undefined) data.description = params.description;
    if (params.public !== undefined) data.public = params.public;
    if (params.view !== undefined) data.view = params.view;
    if (params.parent !== undefined) data.parent = { $id: params.parent };

    const response = await this.client.put(`/collection/${id}`, data);
    return response.data.item;
  }

  async deleteCollection(id: number): Promise<void> {
    await this.client.delete(`/collection/${id}`);
  }

  // Tag methods
  async getTags(): Promise<Tag[]> {
    const response = await this.client.get('/tags');
    return response.data.items;
  }

  async deleteTag(tagName: string): Promise<void> {
    await this.client.delete('/tag', { data: { tags: [tagName] } });
  }

  async renameTag(oldName: string, newName: string): Promise<void> {
    await this.client.put('/tags', {
      replace: [{ old: oldName, new: newName }]
    });
  }

  // User methods
  async getUser(): Promise<any> {
    const response = await this.client.get('/user');
    return response.data.user;
  }
}
