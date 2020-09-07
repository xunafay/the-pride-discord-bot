import Axios from 'axios';
import { Command, ICommand } from './command';

export class StreamElements {
    static instances: Record<string, StreamElements> = {};

    cachedCommands: { commands: Command[], created: number } | undefined;
    id: string;

    private constructor(id: string) {
      this.id = id;
    }

    static getForUser(id: string): StreamElements {
      let instance = this.instances[id];
      if (!instance) {
        instance = new StreamElements(id);
        this.instances[id] = instance;
      }

      return instance;
    }

    invalidateCache(): void {
      this.cachedCommands = undefined;
    }

    async getCommands(): Promise<Command[]> {
      if ((this.getEpoch() - 3600) > (this.cachedCommands?.created || 0)) {
        console.log('invalidating chached commands');
        this.invalidateCache();
      }

      if (this.cachedCommands) {
        return this.cachedCommands.commands;
      } else {
        const res = await Axios.request<ICommand[]>({
          method: 'GET',
          url: `https://api.streamelements.com/kappa/v2/bot/commands/${this.id}`,
          headers: {
            'Authorization': `Bearer ${process.env['ELEM_TOKEN']}`
          }
        });

        if (res.status !== 200) {
          throw new Error(res.data.toString());
        }

        this.cachedCommands = {
          commands: res.data.map((c) => new Command(c, this)),
          created: this.getEpoch()
        };

        this.cachedCommands.commands.push(new Command({_id: 'faux0', aliases: [], command: 'botbroke', reply: '<@!168706817348730881> i broke', cooldown: {global: 30, user: 0}, keywords: [], action: undefined, regex: '', accessLevel: 100}, this));
        this.cachedCommands.commands.push(new Command({_id: 'faux1', aliases: [], command: 'commands', reply: `You can find a list of all Commands here https://StreamElements.com/${this.id}/commands`, cooldown: {global: 30, user: 60}, action: undefined, keywords: [], regex: '', accessLevel: 100}, this));
        return this.cachedCommands.commands;
      }
    }

    getEpoch(): number {
      return Math.floor(new Date().getTime() / 1000);
    }

    static forEach(cb: (instance: StreamElements, index: number) => void): void {
      Object.keys(this.instances).forEach((key, index) => {
        cb(this.instances[key], index);
      });
    }
}
