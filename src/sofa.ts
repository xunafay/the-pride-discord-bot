import nanoDB, { DocumentScope } from 'nano';
import { ServerConfig } from './models/server-config';
import { Counter } from './models/counter';

export let sofa: Sofa;
export function setSofa(db: Sofa): void {
  sofa = db;
}

export class Sofa {
  nano: nanoDB.ServerScope;

  constructor(url: string) {
    this.nano = nanoDB(url);
  }

  public get db(): {
    servers: DocumentScope<ServerConfig>,
    counters: DocumentScope<Counter>,
    } {
    return {
      servers: this.getTable<ServerConfig>('servers'),
      counters: this.getTable<Counter>('counters'),
    };
  }


  async doMigrations(): Promise<void> {
    await Promise.all([
      this.createTableIfNotExists('servers'),
      this.createTableIfNotExists('counters'),
    ]);
  }

  async createTableIfNotExists(table: string): Promise<void> {
    const tables = await this.nano.db.list();
    if (!tables.includes(table)) {
      await this.nano.db.create(table);
    }
  }

  async destroy(): Promise<void> {
    await Promise.all(Object.keys(this.db).map((db) => this.nano.db.destroy(db)));
  }

  getTable<T>(name: string): nanoDB.DocumentScope<T> {
    return this.nano.use<T>(name);
  }
}
