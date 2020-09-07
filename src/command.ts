import { StreamElements } from './stream-elements';
import Axios from 'axios';
import { getParsedReply } from './parser';
import { IContext } from './context';

export interface ICommand {
  keywords: string[];
  reply: string;
  command: string;
  aliases: string[];
  _id: string;
  action: ((command: Command) => void) | undefined
  cooldown: {
    user: number,
    global: number,
  };
  accessLevel: number;
  regex: string;
}

export class Command {
  config: ICommand;
  owner: StreamElements;
  globalCooldown: number;
  userCooldown: Record<string, number>;

  constructor(command: ICommand, owner: StreamElements) {
    this.config = command;
    this.globalCooldown = 0;
    this.userCooldown = {};
    this.owner = owner;
  }

  async execute(context: IContext, skipValidate = false): Promise<string | undefined> {
    if (!skipValidate) {
      if(!this.shouldExecute(context)) {
        return undefined;
      }
    }

    this.globalCooldown = this.getEpoch();
    this.userCooldown[context.broker.author.id] = this.getEpoch();

    if (this.config.action) {
      this.config.action(this);
    }

    return getParsedReply(this, context);
  }

  async validatedExecute(context: IContext): Promise<string | undefined> {
    if (!this.shouldExecute(context)) {
      return;
    }

    if (this.getEpoch() - this.globalCooldown < this.config.cooldown.global) {
      console.log('on global cooldown');
      return undefined;
    }

    const userCooldown = this.userCooldown[context.broker.author.id] || 0;
    if ((this.getEpoch() - userCooldown) < this.config.cooldown.user) {
      console.log('on user cooldown');
      return undefined;
    }

    return this.execute(context, false);
  }

  shouldExecute(context: IContext): boolean {
    if (this.config.accessLevel !== 100) {
      return false;
    }
    const valid = (this.matchesCommand(context) || this.matchesKeyword(context) || this.matchesRegex(context)) && !!this.config.reply;
    const enabled = (context.config.commandOverwrites.find(c => c.id === this.config._id) || {enabled: true}).enabled;
    return valid && enabled;
  }

  matchesCommand(context: IContext): boolean {
    const content = context.broker.content.toLowerCase();
    return !!content.match(`^!${this.config.command.toLowerCase().replace('.', '\\.')}( |$)`)
      || this.config.aliases.some((alias) => content.match(`^!${alias.replace('.', '\\.')}( |$)`)); 
  }

  matchesKeyword(context: IContext): boolean {
    return false; // FIXME enable/disable in config
    const content = context.broker.content.trim().toLocaleLowerCase();
    return this.config.keywords.some(word => content.match(`(^| |:)${word.toLocaleLowerCase()}( |$|:)`));
  }

  matchesRegex(context: IContext): boolean {
    return false; // FIXME enable/disable in config
    if (this.config.regex == null || this.config.regex == '') {
      return false;
    }

    return !!context.broker.content.toLocaleLowerCase().trim().match(this.config.regex);
  }

  getEpoch(): number {
    return Math.floor(new Date().getTime() / 1000);
  }

  async getCount(): Promise<number> {
    const res = await Axios.request<{counter: string, value: number}>({
      method: 'GET',
      url: `https://api.streamelements.com/kappa/v2/bot/${this.owner.id}/counters/${this.config._id}`,
      headers: {
        'Authorization': `Bearer ${process.env['ELEM_TOKEN']}`
      }
    });
  
    if (res.status !== 200) {
      return 0;
    }
  
    return res.data.value;
  }
}
