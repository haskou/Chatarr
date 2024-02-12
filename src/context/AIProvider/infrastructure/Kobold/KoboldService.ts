import { injectable } from 'tsyringe';
import axios from 'axios';
import { ConfigService } from '@config';
import { KoboldPromptRequest } from './KoboldPromptRequest';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { Message } from '@contexts/messengerClient/domain/Message';
import { MessageParser } from '@contexts/behavior/application/MessageParser';
import { CharacterCard } from '@contexts/behavior/domain/ChatacterCard';
import { SharedSettings } from '@contexts/shared/application/SharedSettings';

@injectable()
export class KoboldService implements AIProvider {
  private readonly generateEndpoint = '/api/v1/generate';
  private readonly config = new ConfigService().getConfig();
  private readonly defaultParameters: KoboldPromptRequest = {
    max_context_length: 4096,
    max_length: SharedSettings.maxTokens,
    rep_pen: 1.1,
    temperature: this.config.botPersonality.temperature,
    top_p: 0.5,
    top_k: 0,
    top_a: 0.75,
    typical: 0.19,
    tfs: 0.97,
    rep_pen_range: 1024,
    rep_pen_slope: 0.7,
    sampler_order: [6, 5, 4, 3, 2, 1, 0],
    memory: '',
    min_p: 0,
    presence_penalty: 0,
    prompt: '',
    quiet: false,
    use_default_badwordsids: false,
    stop_sequence: SharedSettings.stopValues,
  };

  constructor() {}

  public async generateResponses(
    character: CharacterCard,
    forcedMemory: string,
    historyMessages: Message[],
    usernames: string[],
    isReplied?: boolean,
  ): Promise<string[]> {
    let historyPrompt = '';
    // Parse history messages
    historyMessages.forEach((message) => {
      // Give reply context
      if (isReplied)
        historyPrompt = `> @${message.replyAuthor}: ${message.replyMesage}`;
      historyPrompt += `@${message.username}: ${message.content}\n`;
    });

    const datetime =
      historyMessages[historyMessages.length - 1].date.toISOString();
    const prompt = Object.assign({}, this.defaultParameters, {
      prompt: MessageParser.parsePrompt(
        `${SharedSettings.systemPrompt}${character.description}.${character.personality}\\n\\n${forcedMemory}\n\n${character.scenario}.\\nNow is ${datetime}.\\n`.replace(
          /{{char}}/g,
          character.name,
        ) + `\\n\\n${historyPrompt}\\n${character.name}: `,
      ),
      stop_sequence: this.defaultParameters.stop_sequence.concat(
        ...usernames.map((u) => `${u}:`),
      ),
    });

    // Prompt
    console.log(JSON.stringify(prompt, null, 4));
    console.time('prompting!');
    const koboldResponse = await axios
      .post(`${this.config.kobold.address}${this.generateEndpoint}`, prompt, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .catch((err) => {
        console.error(err.message);
      });
    console.timeEnd('prompting!');

    if (!koboldResponse || koboldResponse.status != 200) return;

    // Clean response
    console.log(JSON.stringify(koboldResponse.data, null, 4));
    const responses = MessageParser.parseResponses(
      koboldResponse.data.results[0].text,
      usernames,
      prompt.stop_sequence,
      character.name,
      true,
    );

    return responses;
  }

  public async generateConceptualHistory(
    memoryPrompt: string,
  ): Promise<string> {
    const prompt = Object.assign({}, this.defaultParameters, {
      prompt: MessageParser.parsePrompt(memoryPrompt),
    });
    // Prompt
    console.log(JSON.stringify(prompt, null, 4));
    console.time('prompting!');
    const koboldResponse = await axios
      .post(`${this.config.kobold.address}${this.generateEndpoint}`, prompt, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .catch((err) => {
        console.error(err.message);
      });
    console.timeEnd('prompting!');

    if (!koboldResponse || koboldResponse.status != 200) return;

    // Clean response
    console.log(JSON.stringify(koboldResponse.data, null, 4));

    return koboldResponse.data.results[0].text;
  }
}
