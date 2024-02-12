import { ConfigService } from '@config';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { MessengerClient } from '@contexts/messengerClient/domain/MessengerClient';
import { CharacterCard } from '../domain/ChatacterCard';
import { ConceptualMemory } from './ConceptualMemory';
import { Message } from '@contexts/messengerClient/domain/Message';

export class BotBehavior {
  private readonly maxRetryGettingMemory = 3;
  private readonly config = new ConfigService().getConfig();
  private readonly debounceTimer: Record<string, NodeJS.Timeout> = {};
  private readonly dmPrompt = `This is a private chat. `;
  private memoryManager: ConceptualMemory;

  public lastResponse = {};

  constructor(
    public messengerClient: MessengerClient,
    public aiProvider: AIProvider,
    public character: CharacterCard,
  ) {
    this.memoryManager = new ConceptualMemory(character);
  }

  /**
   * Prevents executing multiple times the same prompt
   * @param channel Listening channel
   * @param func Function to execute
   * @param delay Time to wait before sending message
   */
  private async debounceMessage(
    channel: string,
    func: { (): Promise<void>; (): void },
    delay = 5000,
  ) {
    clearTimeout(this.debounceTimer[channel]);
    this.debounceTimer[channel] = setTimeout(async () => {
      // Give user time to write
      if (await this.messengerClient.isTypping(channel)) {
        console.log('stopu');
        return await this.debounceMessage(channel, func, delay * 10);
      }
      await func();
    }, delay);
  }

  private async sendResponses(channelId: string, responses: string[]) {
    if (responses)
      for (const response of responses) {
        await this.messengerClient.sendMessage(response, channelId);
        this.lastResponse[channelId] = new Date();
        // Simulate writing speed
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.floor(Math.random() * 2000) + 100),
        );
      }
  }

  public async startListening() {
    // Load memory
    await this.memoryManager.load();
    // Listen new messages
    const listener = await this.messengerClient.listenMessages();
    listener.on('message', (message) => {
      this.processMessage(message);
    });
  }

  public async processMessage(message: Message): Promise<void> {
    this.debounceMessage(message.channelId, async () => {
      // Ignore own messages
      if (message.username == this.character.name) return;

      if (message.content == 'stopLoop') {
        const responses = await this.aiProvider.generateResponses(
          this.character,
          '',
          [message],
          [],
          false,
        );
        await this.sendResponses(message.channelId, responses);
        return;
      }

      // Set "Bot is writting" status on messenger client
      this.messengerClient.setIsTypping(message.channelId);

      // Get response history
      const history = await this.messengerClient.getHistory(
        message.channelId,
        this.config.botPersonality.historyLimit,
      );
      const usernames =
        this.messengerClient.channels[message.channelId].usernames;

      // Integrate memory
      // await this.memoryManager.integrateConcepts(
      //   history,
      //   this.maxRetryGettingMemory,
      // );
      // Load memory on prompt
      const memoryPrompt = await this.memoryManager.getMemoryPrompt(
        history.map((m) => `${m.username}: ${m.content}`).join('\n'),
      );

      // Add context prompt
      let forcedMemory = `${memoryPrompt}`;
      if (message.isDM) forcedMemory += this.dmPrompt;
      forcedMemory += '. ';

      // Get bot responses
      const responses = await this.aiProvider.generateResponses(
        this.character,
        forcedMemory,
        history,
        usernames,
        message.isReplied,
      );

      await this.sendResponses(message.channelId, responses);
    });
  }

  public async startBoring() {
    // Bored spamming
    setInterval(async () => {
      // 1% possibilities each min
      if (Math.random() > 0.01) return;

      // Get random channel
      const channel =
        this.messengerClient.channels[
          Object.keys(this.messengerClient.channels)[
            Math.floor(
              Math.random() * Object.keys(this.messengerClient.channels).length,
            )
          ]
        ];
      const currentDate = new Date();
      // Only between 17 and 1
      if (!(currentDate.getHours() >= 17 || currentDate.getHours() < 1)) return;
      // Last response was 12h ago
      if (
        !(
          this.lastResponse[channel.channelId] &&
          (currentDate.getTime() -
            this.lastResponse[channel.channelId].getTime()) /
            (1000 * 60 * 60) >=
            12
        )
      )
        return;

      console.log(`Generating bored message`);

      // Generate boring response
      await this.processMessage({
        content:
          'Several hours passed. Greet, complain about your boring or propose a conversation theme',
        channelId: channel.channelId,
        username: 'system',
        date: new Date(),
        isReplied: false,
        replyAuthor: '',
        replyMesage: '',
        isMentioned: false,
        isDM: channel.isDM,
      });
    }, 60000);
  }
}
