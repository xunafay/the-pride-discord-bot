import { MessageOptions } from 'discord.js';
import { IContext } from './context';
import Axios from 'axios';
import { StreamElements } from './stream-elements';
import { Emojis } from './emojis';

export async function isAdminCommand(context: IContext): Promise<boolean> {
  return context.getRawCommand().startsWith(context.config.prefix);
}

export async function executeCommand(context: IContext): Promise<void> {
  const command = commands.find((c) => c.name == context.getCommand());
  if (command) {
    return command.action(context, command);
  }
}

type Response = {
  message: string;
  fallback?: string;
  options?: MessageOptions
}

type Command = {
  name: string,
  action: (context: IContext, command: Command) => Promise<void>,
  subcommands: Command[],
  description: string,
}

function subcommand(context: IContext, command: Command) {
  let subFound = false;
  context.enterSubcommand();
  for (const c of command.subcommands) {
    if (c.name == context.getCommand()) {
      c.action(context, c);
      subFound = true;
    }
  }

  if (!subFound) {
    context.broker.reply(`valid subcommands are ${command.subcommands.map(c => '`' + c.name + '`').join(', ')}`);
  }
}

const commands: Command[] = [
  {
    name: 'help',
    description: 'List all commands',
    async action(context) {
      const msg = commands.map(c => '`' + context.config.prefix + c.name + '`' + `: ${c.description}`).join('\n');
      context.broker.reply(msg);
    },
    subcommands: []
  },
  {
    name: 'health',
    description: 'Validate bot health',
    async action(context) {
      if (context.config._id) {
        context.broker.reply(':white_check_mark: All is well');
      } else {
        context.broker.reply(':exclamation: Either this server isn\'t registered or im dead');
      }
    },
    subcommands: []
  },
  {
    name: 'version',
    description: 'Get bot version',
    async action(context) {
      return context.broker.reply(process.env.BOT_VERSION || 'I\'m improperly configured');
    },
    subcommands: [],
  },
  {
    name: 'channel',
    description: 'Set channel specific settings',
    async action(context, command) {
      subcommand(context, command);
    },
    subcommands: [
      {
        name: 'webhooks',
        description: '',
        async action(context, command) {
          subcommand(context, command);
        },
        subcommands: [
          {
            name: 'list',
            description: '',
            async action(context) {
              const id = context.broker.channel.id;
              let channel = context.config.channels[id];
              if (channel == null) {
                channel = {enabled: context.config.defaultChannelPermission, webhooks: []};
                context.config.channels[id] = channel;
              }

              if (channel.webhooks == null) {
                channel.webhooks = [];
              }
              
              const hooks = channel.webhooks.map((hook) => hook.name).join(', ');
              context.broker.reply(hooks, {ifEmpty: 'No webhooks registered for this channel'});
            },
            subcommands: []
          },
          {
            name: 'create',
            description: '',
            async action(context) {
              context.broker.reply('TODO');
            },
            subcommands: []
          }
        ],
      },
      {
        name: 'status',
        description: 'Show current channel status',
        subcommands: [],
        async action(context) {
          const enabled = (context.config.channels[context.broker.channel.id] || {enabled: context.config.defaultChannelPermission}).enabled;
          if (enabled) {
            context.broker.reply('I am watching this channel');
          } else {
            context.broker.reply('I am not watching this channel');
          }
        }
      },      
      {
        name: 'disable',
        description: 'Disable me in current channel',
        subcommands: [],
        async action(context) {
          context.config.channels[context.broker.channel.id] = {enabled: false, webhooks: []};
          await context.commitConfig();
          return context.broker.reply('I will no longer watch this channel');
        }
      },
      {
        name: 'enable',
        description: 'Enable me in current channel',
        subcommands: [],
        async action(context) {
          context.config.channels[context.broker.channel.id] = {enabled: true, webhooks: []};
          await context.commitConfig();
          return context.broker.reply('I will watch this channel with great interest');
        }
      }
    ]
  },
  {
    name: 'admin',
    description: 'Manage users and roles who can edit my configuration',
    async action(context, command) {
      subcommand(context, command);
    },
    subcommands: [
      {
        name: 'roles',
        description: 'Manage roles',
        async action(context, command) {
          subcommand(context, command);
        },
        subcommands: [
          {
            name: 'add',
            description: '',
            async action(context) {
              context.enterSubcommand();
              if (!context.parsed.every(r => r.match('<@&\\d+>'))) {
                return context.broker.reply('Some of these are not valid roles');
              }

              const roles = context.parsed.map((r) => (r.match('<@&(\\d+)>') || [])[1]);
              
              context.config.adminRoles.push(...roles);
              context.config.adminRoles = [...new Set(context.config.adminRoles)];
              context.commitConfig();
              context.broker.reply('Added roles to se admins');
            },
            subcommands: []
          },
          {
            name: 'remove',
            description: '',
            async action(context) {
              context.enterSubcommand();
              if (!context.parsed.every(r => r.match('<@&\\d+>'))) {
                return context.broker.reply('Some of these are not valid roles');
              }

              const roles = context.parsed.map((r) => (r.match('<@&(\\d+)>') || [])[1]);
              for (const role of roles) {
                const index = context.config.adminRoles.indexOf(role);
                if (index > -1) {
                  context.config.adminRoles.splice(index, 1);
                }
              }

              context.commitConfig();
              context.broker.reply('Removed roles from se admins');
            },
            subcommands: []
          },
          {
            name: 'list',
            description: '',
            async action(context) {
              const reply = context.config.adminRoles.map((u) => `<@&${u}>`).join(', ');
              context.broker.reply(reply, {ifEmpty: 'No roles are allowed to configure me. Add some with `se!admin roles add @Admin`', allowMentions: false});
            },
            subcommands: []
          }
        ]
      },
      {
        name: 'users',
        description: 'Manage users',
        async action(context, command) {
          subcommand(context, command);
        },
        subcommands: [
          {
            name: 'add',
            description: '',
            async action(context) {
              context.enterSubcommand();
              console.log(context.broker.content);
              if (!context.parsed.every(r => r.match('<@!\\d+>'))) {
                return context.broker.reply('Some of these are not valid users');
              }

              const users = context.parsed.map((r) => (r.match('<@!(\\d+)>') || [])[1]);
              
              context.config.adminUsers.push(...users);
              context.config.adminUsers = [...new Set(context.config.adminUsers)];
              context.commitConfig();
              context.broker.reply('Added users to se admins');
            },
            subcommands: []
          },
          {
            name: 'remove',
            description: '',
            async action(context) {
              context.enterSubcommand();
              if (!context.parsed.every(r => r.match('<@!\\d+>'))) {
                return context.broker.reply('Some of these are not valid users');
              }

              const users = context.parsed.map((r) => (r.match('<@!(\\d+)>') || [])[1]);
              for (const user of users) {
                const index = context.config.adminUsers.indexOf(user);
                if (index > -1) {
                  context.config.adminUsers.splice(index, 1);
                }
              }

              context.commitConfig();
              context.broker.reply('Removed users from se admins');
            },
            subcommands: []
          },
          {
            name: 'list',
            description: '',
            async action(context) {
              const reply = context.config.adminUsers.map((u) => `<@${u}>`).join(', ');
              context.broker.reply(
                reply,
                {ifEmpty: 'No users are allowed to configure me. Add some with `se!admin users add @Admin`', allowMentions: false}
              );
            },
            subcommands: []
          }
        ]
      },
    ]
  },
  {
    name: 'register',
    description: 'Register a stream elements account, I require this',
    async action(context) {
      if (context.config._id) {
        return context.broker.reply('This server has already been registered!');
      }

      const seName = context.getMessage();
      if (!seName || seName == '') {
        return context.broker.reply('Please specify a streamelements account like `se!register accountName`');
      }

      const res = await Axios({
        method: 'GET',
        url: `https://api.streamelements.com/kappa/v2/channels/${seName}`,
      });

      if (res.status !== 200) {
        return context.broker.reply('Could not find a streamelements account with that name');
      }

      context.config = {
        _id: context.broker.guild.id || '',
        adminRoles: [],
        adminUsers: [],
        channels: {},
        defaultChannelPermission: true,
        enabled: true,
        prefix: 'se!',
        commandOverwrites: [],
        seId: res.data._id
      };

      await context.commitConfig();
      return context.broker.reply(`Succesfully registered! See \`${context.config.prefix}help\` for more information`);
    },
    subcommands: []
  },
  {
    name: 'enable',
    description: 'Enable me globally',
    async action(context) {
      if (context.config?.enabled) {
        return context.broker.reply('I am already enabled');
      } else {
        context.config.enabled = true;
        await context.commitConfig();
        return context.broker.reply('I am now enabled, greetings!');
      }
    },
    subcommands: []
  },
  {
    name: 'disable',
    description: 'Disable me globally',
    async action(context) {
      if (!context.config?.enabled) {
        return context.broker.reply('I am already disabled');
      } else {
        context.config.enabled = false;
        await context.commitConfig();
        return context.broker.reply('I am now disabled, goodbye');
      }
    },
    subcommands: []
  },
  {
    name: 'command',
    description: 'Manage stream element commands for discord',
    async action(context, command) {
      subcommand(context, command);
    },
    subcommands: [
      {
        name: 'disable',
        description: 'Disable a command on discord',
        async action(context) {
          const command = (await StreamElements.getForUser(context.config.seId)
            .getCommands())
            .find(c => c.config.command === context.getMessage().replace('!', ''));

          if (command) {
            const existing = context.config.commandOverwrites.find(c => c.id === command.config._id);
            if (existing) {
              existing.enabled = false;
            } else {
              context.config.commandOverwrites.push({
                enabled: false,
                name: command.config.command,
                id: command.config._id
              });
            }

            await context.commitConfig();
            context.broker.reply('Disabled command');
          } else {
            context.broker.reply('There is no command with that name');
          }
        },
        subcommands: []
      },
      {
        name: 'enable',
        description: 'Enable a command on discord',
        async action(context) {
          const command = (await StreamElements.getForUser(context.config.seId)
            .getCommands())
            .find(c => c.config.command === context.getMessage().replace('!', ''));

          if (command) {
            const existing = context.config.commandOverwrites.find(c => c.id === command.config._id);
            if (existing) {
              existing.enabled = true;
            } else {
              context.config.commandOverwrites.push({
                enabled: true,
                name: command.config.command,
                id: command.config._id
              });
            }

            await context.commitConfig();
            context.broker.reply('Enabled command');
          } else {
            context.broker.reply('There is no command with that name');
          }
        },
        subcommands: []
      },
      {
        name: 'list',
        description: 'List disabled commands',
        async action(context) {
          const commands = context.config.commandOverwrites.filter(c => !c.enabled).map((c) => c.name).join(', ');
          context.broker.reply('Disabled commands:\n' + commands);
        },
        subcommands: []
      }
    ],
  },
  {
    name: 'clearcache',
    description: 'Force invalidate the command and emoji chache',
    async action(context) {
      StreamElements.getForUser(context.config.seId).invalidateCache();
      Emojis.invalidateCache();
      context.broker.reply('Cache cleared');
    },
    subcommands: []
  }
];
