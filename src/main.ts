import 'reflect-metadata';
import './dependencyInjection';
import fs from 'fs/promises';
import { container } from 'tsyringe';
import { BotBehavior } from './context/behavior/application/BotBehavior';
import { MessengerClient } from '@contexts/messengerClient/domain/MessengerClient';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { CharacterCard } from '@contexts/behavior/domain/ChatacterCard';
import { ConfigService } from '@contexts/shared/application/ConfigService';

async function bootstrap() {
  const config = new ConfigService().getConfig();
  const messengerClient = container.resolve<MessengerClient>(
    config.messengerClient,
  );
  const aiProvider = container.resolve<AIProvider>(config.aiProvider);

  // Load character
  const character: CharacterCard = JSON.parse(
    await fs.readFile(config.botPersonality.characterPath, 'utf8'),
  );

  // Load Bot
  const bot = new BotBehavior(messengerClient, aiProvider, character);

  console.log(`Loaded ${config.messengerClient} messenger client...`);
  console.log(`Loaded ${config.aiProvider} AI provider...`);
  console.log(`Loaded ${character.name} personality...`);

  await messengerClient.connect();
  await bot.startListening();
  await bot.startBoring();
  console.log(`Listening new messages`);
}

bootstrap();
