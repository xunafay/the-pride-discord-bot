import Discord, { Client, TextChannel, Message, Collection } from 'discord.js';
import { StreamElements } from './stream-elements';
import { isAdminCommand, executeCommand } from './admin-commands';
import { Context } from './context';
import { Emojis } from './emojis';
import { sofa } from './sofa';
import { MessageBroker } from './message-broker';
import { Counter } from './models/counter';

export let discordClient: Client;

export async function buildClient(): Promise<Discord.Client> {
  const client = new Discord.Client();
  console.log('client created');
  client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);

    client.user?.setPresence({
      activity: { name: ' !commands', type: 'LISTENING' },
      status: 'online'
    })
      .catch(console.error);
  });

  client.on('emojiCreate', () => Emojis.invalidateCache());
  client.on('emojiDelete', () => Emojis.invalidateCache());
  client.on('emojiUpdate', () => Emojis.invalidateCache());

  client.on('message', async (msg) => {
    console.log(msg.content);
    if (msg.content.toLowerCase() === '!itsasecret') { // not anymore after you read this
      msg.delete();
      const secret = await msg.channel.send('shhhh :shushing_face: https://www.youtube.com/watch?v=gMUEFZXkmDA', { embed: { video: undefined } });
      secret.suppressEmbeds();
      setTimeout(() => secret.delete(), 3000);
      return;
    }

    if (msg.content.toLowerCase() === '!megalul') {
      msg.delete();
      msg.channel.send('you better watch yourself');
      msg.channel.send('https://cdn.discordapp.com/attachments/432370886935576596/752340245852324010/aneMEGALUL.jpg');
      return;
    }

    if (msg.content.toLowerCase() === '!megalult') {
      msg.delete();
      const response = msg.channel.send('https://cdn.discordapp.com/attachments/432370886935576596/752340245852324010/aneMEGALUL.jpg');

      setTimeout(async () => {
        (await response).delete();
      }, 1500);
      return;
    }

    if (msg.content.startsWith('!mirror ')) {
      msg.suppressEmbeds(true);
      const match = (/^!mirror (.*\/)?(\w+)$/gm.exec(msg.content) || [])[2];
      if (match) {
        msg.channel.send(`Here is your mirror! (maybe, I didn't check)\nhttps://annie.nyc3.digitaloceanspaces.com/${match}.mp4`);
        return;
      }
    }

    // could implement this to increment counters without having to use stream elements api and oauth
    if (msg.content.toLowerCase() === '!ripxuna') {
      const counter: Counter | undefined = (await sofa.db.counters.find({ selector: { _id: { '$eq': 'ripxunacounter' } } })).docs[0];
      if (!counter) {
        await sofa.db.counters.insert({ _id: 'ripxunacounter', amount: 1 });
      } else {
        counter.amount = counter.amount + 1;
        await sofa.db.counters.insert(counter);
      }

      msg.channel.send(`She's dead <a:anePls:710464789088043089> x${counter?.amount || 1}`);
      return;
    }

    if (!msg.guild) {
      return;
    }

    if (msg.author.bot) {
      return;
    }

    const context = await Context.fromMessage(new MessageBroker(msg));
    if (await isAdminCommand(context)) {
      try {
        if (context.isAdmin()) {
          return await executeCommand(context);
        } else {
          return context.broker.reply('You don\'t have permission to use that command');
        }
      } catch (ex) {
        console.error(ex);
      }
    }

    if (!context.allowedInChannel() || !context.isRegistered() || !context.config.enabled) {
      return;
    }

    for (const command of await StreamElements.getForUser(context.config.seId).getCommands()) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const reply = await command.validatedExecute(context);
        if (reply) {
          context.broker.reply(reply);
          break;
        }
      } catch (err) {
        console.error(err);
        context.broker.reply('Something went wrong, I\'m sorry');
      }
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
  discordClient = client;
  return client;
}
