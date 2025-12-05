import axios, { AxiosInstance } from 'axios';
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

export class RaindropClient {
  private client: AxiosInstance;

  constructor(config: RaindropConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.raindrop.io/rest/v1',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
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
