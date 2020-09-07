import { Message } from 'discord.js';

export interface MessageOpts {
  allowMentions: boolean,
  ifEmpty: string
}

export type Id = {id: string};
export type Author = { id: string, name: string, roles: Array<{ id: string, name: string }>}
export interface IMessageBroker {
  reply(message: string, opts?: Partial<MessageOpts>): void; 
  readonly author: Author;
  readonly channel: Id;
  readonly content: string;
  readonly guild: Id & {ownerId: string};
}

export class MessageBroker implements IMessageBroker {
  constructor(public message: Message) { }

  
  public get author(): Author {
    return {
      id: this.message.author.id,
      name: this.message.author.username,
      roles: (this.message.member?.roles.cache.map((r) => ({id: r.id, name: r.name}))) || []
    };
  }

  public get channel(): Id {
    return { id: this.message.channel.id };
  }

  public get content(): string {
    return this.message.content;
  }

  public get guild(): Id & {ownerId: string} {
    if (!this.message.guild) {
      throw new Error('Message does not come from guild');
    }

    return { id: this.message.guild.id, ownerId: this.message.guild.ownerID };
  }

  async reply(message: string, opts?: Partial<MessageOpts>): Promise<void> {
    const reply = (message == '' ? opts?.ifEmpty : message) || '';
    if (reply == '') {
      throw new Error('No blank messages allowed');
    }

    const allowMentions = opts?.allowMentions || false;
    if (allowMentions) {
      await this.message.channel.send(message);
    } else {
      await this.message.channel.send(message, {allowedMentions: {parse: []}});
    }
  }
}
