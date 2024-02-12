import { injectable } from 'tsyringe';
import fs from 'fs/promises';
import {
  ActivityType,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Message as DiscordMessage,
  Partials,
  TextChannel,
} from 'discord.js';
import { ConfigService } from '@config';
import { Channel, MessengerClient } from '../domain/MessengerClient';
import { MessengerMessageEmitter } from '../domain/MessengerMessageEmitter';
import { Message } from '../domain/Message';

@injectable()
export class DiscordClient implements MessengerClient {
  public readonly memoryPath = './memory/';
  private readonly config = new ConfigService().getConfig();
  private confinamentChannels: string[];
  public client: Client;
  public channels: Record<string, Channel>;

  constructor() {
    // Create a new client instance
    this.client = new Client({
      partials: [Partials.Channel],
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });
    // Anounce connection
    this.client.once(Events.ClientReady, (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    });
    // Set confinrament channels
    this.confinamentChannels = this.config.discord.channelConfinament
      .split(',')
      .map((c) => c.trim());
  }
  public async getUsername(): Promise<string> {
    return this.client.user.username;
  }
  /**
   * Parse IDs into user names
   * @param text Text to parse strings from
   */
  private parseIdsToUserNames(text: string) {
    return text.replace(/\<\@(\d)+\>/g, (id) => {
      const foundId = id.substring(2, id.length - 1);
      const nameFound =
        this.client.users.cache.find((u) => u.id == foundId)?.username || id;
      if (nameFound) return `@${nameFound}`;
      return id;
    });
  }
  /**
   * Parse usernames into IDs
   * @param text Text to parse strings from
   */
  private parseUsernamesToIds(text: string) {
    return text.replace(/\@?(\w+)/g, (name) => {
      const foundName = name.substring(
        name.startsWith('@') ? 1 : 0,
        name.length,
      );
      const id = this.client.users.cache.find((u) => u.username == foundName)
        ?.id;
      if (id) return `<@${id}>`;
      return name;
    });
  }

  /**
   * Load memory file
   */
  private async load(): Promise<void> {
    this.channels = JSON.parse(
      await fs
        .readFile(
          `${this.memoryPath}${this.client.user.username}_discord.json`,
          'utf-8',
        )
        .catch(() => `{}`),
    );
  }

  /**
   * Stores the memory file
   */
  private async save(): Promise<void> {
    await fs.mkdir(this.memoryPath, { recursive: true });

    await fs.writeFile(
      `${this.memoryPath}${this.client.user.username}_discord.json`,
      JSON.stringify(this.channels),
    );
  }

  private async parseMessage(message: DiscordMessage): Promise<Message> {
    const isDM = !message.guild;
    const isReplied =
      message.mentions?.repliedUser?.id == this.client.user.id || false;
    // Check if it has been mentioned
    const isMentioned = !![...message.mentions.users.entries()].find(
      (mention) => {
        return !!mention.find((u) => u == this.client.user.id);
      },
    );
    // Get reply message
    let replyMessage = '';
    let replyAuthor = '';
    if (isReplied) {
      const reply = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      replyMessage = reply.content;
      replyAuthor = reply.author.username;
    }

    return {
      channelId: message.channel.id,
      username: message.author.username,
      content: this.parseIdsToUserNames(message.content),
      date: message.createdAt,
      isDM,
      isReplied,
      replyAuthor,
      replyMesage: replyMessage,
      isMentioned,
    };
  }
  public async sendMessage(message: string, channelId: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (
      ![ChannelType.GuildText, ChannelType.DM, ChannelType.GroupDM].includes(
        channel.type,
      )
    )
      return;
    await (channel as TextChannel).send(this.parseUsernamesToIds(message));
  }
  public async connect(): Promise<MessengerClient> {
    await this.client.login(this.config.discord.token);
    if (this.config.discord.status) {
      this.client.on(Events.ClientReady, () => {
        this.setStatus(this.config.discord.status);
      });
    }
    await this.load();
    return this;
  }
  public async setStatus(status: string): Promise<MessengerClient> {
    this.client.user.setActivity(status, {
      type: ActivityType.Custom,
    });
    return this;
  }
  public async deleteMessages(channelId: string) {
    const channel = await this.client.channels.fetch(channelId);
    if ([ChannelType.DM, ChannelType.GroupDM].includes(channel.type))
      await channel.delete();
  }
  public async listenMessages(): Promise<MessengerMessageEmitter> {
    const emitter = new MessengerMessageEmitter();
    this.client.on(Events.MessageCreate, async (message) => {
      // Check if the message comes from a confinament channel
      const isDM = !message.guild;
      if (
        !isDM && // Is not DM
        this.confinamentChannels.length &&
        !this.confinamentChannels.includes(message.channelId)
      )
        return;
      this.channels[message.channelId] = {
        isDM,
        channelId: message.channelId,
        usernames: await this.getUsernames(message.channelId),
      };
      await this.save();
      emitter.emit('message', await this.parseMessage(message));
    });
    return emitter;
  }
  public async getUsernames(channelId: string): Promise<string[]> {
    const channel = await this.client.channels.fetch(channelId);
    if (channel.type == ChannelType.DM) {
      return [channel.recipient.username, this.client.user.username];
    }
    const members = (channel as TextChannel).members;
    return members.map((u) => u.user.username);
  }
  public async getHistory(
    channelId: string,
    maxHistory: number,
  ): Promise<Message[]> {
    const channel = await this.client.channels.fetch(channelId);
    const messages = await (channel as TextChannel).messages.fetch({
      limit: maxHistory,
    });

    return (
      (await Promise.all(messages.map((message) => this.parseMessage(message))))
        // Discord returns messages in reverse order
        .reverse()
    );
  }
  public async setIsTypping(channelId: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await (channel as TextChannel).sendTyping();
  }
  public async isTypping(channelId: string): Promise<boolean> {
    const channel = await this.client.channels.fetch(channelId);
    return (channel as any).typing;
  }
}
