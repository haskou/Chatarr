import { container } from 'tsyringe';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { DiscordClient } from '@contexts/messengerClient/infrastructure/DiscordClient';
import { TelegramClient } from '@contexts/messengerClient/infrastructure/TelegramClient';
import { KoboldService } from '@contexts/AIProvider/infrastructure/Kobold/KoboldService';
import { MessengerClient } from '@contexts/messengerClient/domain/MessengerClient';
import { OpenRouterService } from '@contexts/AIProvider/infrastructure/OpenRouter/OpenRouterService';
import { OpenAIService } from '@contexts/AIProvider/infrastructure/OpenAI/OpenAIService';

container.register<MessengerClient>('Discord', DiscordClient);
container.register<MessengerClient>('Telegram', TelegramClient);
container.register<AIProvider>('Kobold', KoboldService);
container.register<AIProvider>('OpenRouter', OpenRouterService);
container.register<AIProvider>('OpenAI', OpenAIService);
