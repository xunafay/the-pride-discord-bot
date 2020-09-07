import { ServerConfig } from './models/server-config';
import { sofa } from './sofa';
import { IMessageBroker } from './message-broker';

export interface IContext {
  config: ServerConfig;
  broker: IMessageBroker;
  parsed: string[];

  isAdmin(): boolean;
  allowedInChannel(): boolean;

  getCommand(): string;
  getRawCommand(): string;
  getMessage(): string;
  enterSubcommand(): void;
  commitConfig(): Promise<void>;
}

export class Context implements IContext {
  parsed: string[] = [];

  constructor(
    public broker: IMessageBroker,
    public config: ServerConfig
  ) {
    this.parsed = this.broker.content.split(' ');
  }

  static async fromMessage(broker: IMessageBroker): Promise<Context> {
    try {
      const config = await sofa.db.servers.get(broker.guild.id);
      return new Context(broker, config);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Context(broker, {enabled: false, prefix: 'se!'} as any);
    }
  }

  isAdmin(): boolean {
    if (this.broker.author.id === this.broker.guild.ownerId) {
      return true;
    }

    if (!this.config._id) {
      return false;
    }

    const diff = this.broker.author.roles.filter(r => this.config.adminRoles.includes(r.id));
    if ((diff || []).length > 0) {
      return true;
    }

    if (this.config.adminUsers.includes(this.broker.author.id)) {
      return true;
    }

    return false;
  }

  allowedInChannel(): boolean {
    return (this.config.channels[this.broker.channel.id] || { enabled: this.config.defaultChannelPermission }).enabled;
  }

  /** Get the command name if there is any */
  getCommand(): string {
    return (this.parsed[0] || '').replace(this.config.prefix, '');
  }

  getRawCommand(): string {
    return this.parsed[0];
  }

  /** Get the message after the command */
  getMessage(): string {
    return this.parsed.slice(1).join(' ');
  }

  enterSubcommand(): void {
    this.parsed.shift();
  }

  /** Save changes made to the config */
  async commitConfig(): Promise<void> {
    await sofa.db.servers.insert(this.config);
  }

  isRegistered(): boolean {
    return !!this.config._id;
  }
}

