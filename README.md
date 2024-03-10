# Chatarr

Discord/Telegram chatbot with [KoboldcAI](https://github.com/KoboldAI/KoboldAI-Client)/[Koboldcpp](https://github.com/LostRuins/koboldcpp)/[OpenRouter](https://openrouter.ai/) integration.

## TODO LIST

- Docker documentation
- This README.md
- Improve memory (currently doesn't writte new memories)

## Environment variables

You can both create a `.env` file on the root of this project from `.env.example` or define the following environment variables:

| Key                           | Description                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| AI_PROVIDER                   | AI Provider (OpenRouter or Kobold)                                                                     |
| BOT_CHARACTER_CARD_PATH       | Bot character card path https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v1.md |
| BOT_HISTORY_LIMIT             | Maximum number of message history to retrieve                                                          |
| BOT_TEMPERATURE               | Bot temperature                                                                                        |
| DISCORD_BOT_TOKEN             | Discord's bot token from https://discord.com/developers/applications/                                  |
| DISCORD_CHANNEL_BORED_CHANNEL | Discord channel Id where bot will continue conversations or complain about being boring                |
| DISCORD_CHANNEL_CONFINAMENT   | Discord channel Ids separated by comma where bot can read an talk                                      |
| DISCORD_STATUS                | Discord bot custom status                                                                              |
| TELEGRAM_BOT_TOKEN            | Telegram token you receive from @BotFather                                                             |
| TELEGRAM_CHANNEL_CONFINAMENT  | Telegram channel Ids separated by comma where bot can read an talk                                     |
| MESSENGER_CLIENT              | Messenger client (Discord or Telegram)                                                                 |
| KOBOLD_ADDRESS                | Kobold server address                                                                                  |
| OPENROUTER_API_KEY            | OpenRouter API key                                                                                     |
| OPENROUTER_MODEL              | OpenRouter model (https://openrouter.ai/docs#models)                                                   |
| YOU_MODEL                     | You.com models: src/context/AIProvider/infrastructure/You.const.ts                                     |

# Start the bot

Start KoboldAI/KoboldAICpp (if you use it) and then:

```
pnpm start
```
