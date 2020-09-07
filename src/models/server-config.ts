export interface ServerConfig {
  _id: string;
  seId: string;
  prefix: string;
  enabled: boolean;
  adminRoles: Array<string>,
  adminUsers: Array<string>,
  commandOverwrites: Array<{id: string, name: string, enabled: boolean}>,
  channels: Record<string, {enabled: boolean, webhooks?: Array<{key: string, name: string}>} | undefined>,
  defaultChannelPermission: boolean,
}
