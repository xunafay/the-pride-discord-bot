import { Command } from './command';
import { IContext } from './context';
import { Emojis } from './emojis';
import { discordClient } from './discord';

export async function getParsedReply(command: Command, context: IContext): Promise<string> {
  const user = (context.broker.content.match(/<@!\d+>/) || [])[0] || `<@!${context.broker.author.id}>`;
  let reply = command.config.reply;

  const randomPickRegex = /\${random\.pick (.+)}/;
  if (command.config.reply.includes('${random.pick')) {
    const items = (command.config.reply.match(randomPickRegex) || [])[1].split(' ').filter((item) => item !== ' ' && item !== '');
    const rand = items[Math.floor(Math.random() * items.length)].replace(/^'(.*)'$/, '$1'); // remove quotes around it
    reply = reply.replace(randomPickRegex, rand);
  }
  
  reply = reply
    .replace('${1:}', context.broker.content.replace(/^!\w+ /, ''))
    .replace('${sender}', `<@!${context.broker.author.id}>`)
    .replace('${user}', user)
    .replace('$(count)', (await command.getCount()).toString())
    .replace('${count}', (await command.getCount()).toString())
    .replace('${channel.alias}', 'Annie');
  
  Emojis.getEmojis(discordClient).forEach((emoji) => {
    reply = reply.replace(new RegExp(`(^| )${emoji.name}( |$)`, 'g'), `$1<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>$2`);
  });

  return reply;
}
