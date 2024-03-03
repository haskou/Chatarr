import { injectable } from 'tsyringe';
import axios from 'axios';
import { ConfigService } from '@config';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { Message } from '@contexts/messengerClient/domain/Message';
import { MessageParser } from '@contexts/behavior/application/MessageParser';
import { CharacterCard } from '@contexts/behavior/domain/ChatacterCard';
import { OpenAIRequest } from './OpenAIRequest';
import { SharedSettings } from '@contexts/shared/application/SharedSettings';

@injectable()
export class OpenAIService implements AIProvider {
  private readonly generateEndpoint =
    'https://api.openai.com/v1/chat/completions';
  private readonly config = new ConfigService().getConfig();
  private readonly defaultParameters: OpenAIRequest = {
    model: this.config.openRouter.model,
    temperature: this.config.botPersonality.temperature,
    messages: [],
    max_tokens: SharedSettings.maxTokens,
    top_p: 1,
    response_format: { type: 'text' },
    stream: false,
  };

  constructor() {}

  public async generateResponses(
    character: CharacterCard,
    forcedMemory: string,
    historyMessages: Message[],
    usernames: string[],
    isReplied?: boolean,
  ): Promise<string[]> {
    const messages = [];

    const datetime =
      historyMessages[historyMessages.length - 1].date.toISOString();
    // Write personality prompt
    messages.push({
      role: 'system',
      content:
        `${SharedSettings.systemPrompt}${character.description}.${character.personality}${forcedMemory}\n\n${character.scenario}.Now is ${datetime}.\\n`.replace(
          /{{char}}/g,
          character.name,
        ),
    });

    // Parse history messages
    historyMessages.forEach((message) => {
      // Give reply context
      if (isReplied)
        messages.push({
          role: 'user',
          name: message.replyAuthor,
          content: `${message.replyMesage.trim()}`,
        });

      messages.push({
        role: 'user',
        name: message.username,
        content: `${message.content.trim()}`,
      });
    });

    const prompt = Object.assign({}, this.defaultParameters, {
      messages: messages.map((m) => {
        m.content = MessageParser.parsePrompt(m.content);
        return m;
      }),
    });

    // Prompt
    console.log(JSON.stringify(prompt, null, 4));
    console.time('prompting!');
    const openRouterResponse = await axios
      .post(`${this.generateEndpoint}`, prompt, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openRouter.apiKey}`,
        },
      })
      .catch((err) => {
        console.error(err.message);
      });
    console.timeEnd('prompting!');

    if (!openRouterResponse || openRouterResponse.status != 200) return;
    console.log(JSON.stringify(openRouterResponse.data, null, 4));
    if (openRouterResponse.data.error) {
      console.log(openRouterResponse);
      return;
    }

    // Clean response
    const responses = MessageParser.parseResponses(
      openRouterResponse.data?.choices
        ?.map((c) => c.message.content)
        .join('\n') || '',
      usernames,
      [],
      character.name,
    );

    return responses;
  }

  public async generateConceptualHistory(
    memoryPrompt: string,
  ): Promise<string> {
    const messages = [];

    // Write personality prompt
    messages.push({
      role: 'system',
      content: MessageParser.parsePrompt(memoryPrompt),
    });

    const prompt = Object.assign({}, this.defaultParameters, {
      messages: messages.map((m) => {
        m.content = MessageParser.parsePrompt(m.content);
        return m;
      }),
    });

    // Prompt
    console.log(JSON.stringify(prompt, null, 4));
    console.time('prompting!');
    const openRouterResponse = await axios
      .post(`${this.generateEndpoint}`, prompt, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openRouter.apiKey}`,
        },
      })
      .catch((err) => {
        console.error(err.message);
      });
    console.timeEnd('prompting!');

    if (!openRouterResponse || openRouterResponse.status != 200) return;
    console.log(JSON.stringify(openRouterResponse.data, null, 4));
    if (openRouterResponse.data.error) return;

    return openRouterResponse.data.choices
      .map((c) => c.message.content)
      .join('\n');
  }
}
