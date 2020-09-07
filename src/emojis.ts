import { Emoji, Client } from 'discord.js';

export class Emojis {
  static instance: Emojis | undefined;
  static cachedEmojis: { emojis: Array<Emoji>, created: number } | undefined;

  private constructor(public client: Client) {}

  static getInstance(client: Client): Emojis {
    if (this.instance == null) {
      this.instance = new Emojis(client);
    }

    return this.instance;
  }

  static invalidateCache(): void {
    this.cachedEmojis = undefined;
  }

  static getEmojis(client: Client): Array<Emoji> {
    if ((this.getEpoch() - 3600) > (this.cachedEmojis?.created || 0)) {
      console.log('invalidating cached emojis');
      this.invalidateCache();
    }

    if (this.cachedEmojis == null) {
      let emojis: Emoji[] = [];
      for (const guild of client.guilds.cache.array()) {
        emojis = emojis.concat(guild.emojis.cache.array());
      }

      this.cachedEmojis = { created: this.getEpoch(), emojis };
    }
    
    return this.cachedEmojis.emojis;
  }

  static getEpoch(): number {
    return Math.floor(new Date().getTime() / 1000);
  }  
}
