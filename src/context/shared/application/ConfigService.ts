import { Property, TSConvict } from 'ts-convict';
import dotenv from 'dotenv';

const koboldProvider = 'Kobold';
const openRouterProvider = 'OpenRouter';
const discordMessenger = 'Discord';
const telegramMessenger = 'Telegram';

export class DiscordConfig {
  @Property({
    doc: `Discord's bot token from https://discord.com/developers/applications/`,
    format: String,
    env: 'DISCORD_BOT_TOKEN',
    sensitive: true,
    nullable: process.env.MESSENGER_CLIENT == discordMessenger,
    default: undefined,
  })
  token: string;

  // @Property({
  //   doc: `Discord channel Id where bot will complain about being boring`,
  //   format: String,
  //   env: 'DISCORD_CHANNEL_BORED_CHANNEL',
  //   nullable: false,
  //   default: undefined,
  // })
  // boredChannel: string;

  @Property({
    doc: `Discord channel Ids separated by comma where bot can read an talk`,
    format: String,
    env: 'DISCORD_CHANNEL_CONFINAMENT',
    nullable: true,
    default: undefined,
  })
  channelConfinament: string;

  @Property({
    doc: `Discord bot custom status`,
    format: String,
    env: 'DISCORD_STATUS',
    nullable: true,
    default: undefined,
  })
  status: string;
}

export class TelegramConfig {
  @Property({
    doc: `Telegram token you receive from @BotFather`,
    format: String,
    env: 'TELEGRAM_BOT_TOKEN',
    sensitive: true,
    nullable: process.env.MESSENGER_CLIENT == telegramMessenger,
    default: undefined,
  })
  token: string;

  // @Property({
  //   doc: `Discord channel Id where bot will complain about being boring`,
  //   format: String,
  //   env: 'DISCORD_CHANNEL_BORED_CHANNEL',
  //   nullable: false,
  //   default: undefined,
  // })
  // boredChannel: string;

  @Property({
    doc: `Telegram channel Ids separated by comma where bot can read an talk`,
    format: String,
    env: 'TELEGRAM_CHANNEL_CONFINAMENT',
    nullable: true,
    default: undefined,
  })
  channelConfinament: string;
}

export class KoboldConfig {
  @Property({
    doc: `Kobold server address`,
    format: String,
    env: 'KOBOLD_ADDRESS',
    nullable: process.env.AI_PROVIDER == koboldProvider,
    default: '  ',
  })
  address: string;
}

export class OpenRouterConfig {
  @Property({
    doc: `OpenRouter API key`,
    format: String,
    env: 'OPENROUTER_API_KEY',
    senseitive: true,
    nullable: process.env.AI_PROVIDER == openRouterProvider,
    default: undefined,
  })
  apiKey: string;

  @Property({
    doc: `OpenRouter model (https://openrouter.ai/docs#models)`,
    format: String,
    env: 'OPENROUTER_MODEL',
    nullable: process.env.AI_PROVIDER == openRouterProvider,
    default: undefined,
  })
  model: string;
}

export class BotPersonalityConfig {
  @Property({
    doc: `Bot character card path`,
    format: String,
    env: 'BOT_CHARACTER_CARD_PATH',
    nullable: false,
    default: undefined,
  })
  characterPath: string;

  @Property({
    doc: `Bot temperature`,
    format: Number,
    env: 'BOT_TEMPERATURE',
    nullable: false,
    default: 0.7,
  })
  temperature: number;

  @Property({
    doc: `Number of messages used a history`,
    format: Number,
    env: 'BOT_HISTORY_LIMIT',
    nullable: false,
    default: 10,
  })
  historyLimit: number;
}

export class Config {
  @Property(DiscordConfig)
  discord: DiscordConfig;

  @Property(TelegramConfig)
  telegram: TelegramConfig;

  @Property(KoboldConfig)
  kobold: KoboldConfig;

  @Property(OpenRouterConfig)
  openRouter: OpenRouterConfig;

  @Property(BotPersonalityConfig)
  botPersonality: BotPersonalityConfig;

  @Property({
    doc: `Messenger client (Discord or Telegram)`,
    format: String,
    env: 'MESSENGER_CLIENT',
    nullable: false,
    default: undefined,
    enum: [discordMessenger, telegramMessenger],
  })
  messengerClient: string;

  @Property({
    doc: `AI Provider (OpenRouter or Kobold)`,
    format: String,
    env: 'AI_PROVIDER',
    nullable: false,
    default: undefined,
    enum: [openRouterProvider, koboldProvider],
  })
  aiProvider: string;
}

/**
 * Provides configuration to the application. After instance it call getConfig function
 */
export class ConfigService {
  private static config: Config;
  constructor() {
    if (!ConfigService.config) {
      dotenv.config();
      ConfigService.config = new TSConvict<Config>(Config).load();
    }
  }

  /**
   * Returns application configuration
   * @returns Configuration
   */
  public getConfig(): Config {
    return ConfigService.config;
  }
}
