import { injectable } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import setCookie from 'set-cookie-parser';

import { ConfigService } from '@config';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { Message } from '@contexts/messengerClient/domain/Message';
import { MessageParser } from '@contexts/behavior/application/MessageParser';
import { CharacterCard } from '@contexts/behavior/domain/ChatacterCard';
import { SharedSettings } from '@contexts/shared/application/SharedSettings';

import { Cookies, Headers, YouRequest } from './You.interfaces';

@injectable()
export class YouService implements AIProvider {
  private readonly PUBLIC_TOKEN =
    'public-token-live-507a52ad-7e69-496b-aee0-1c9863c7c819';
  private readonly baseUrl = 'https://you.com';
  private readonly createAccountUrl = 'https://web.stytch.com/sdk/v1/passwords';
  private readonly generateEndpoint = `${this.baseUrl}/api/streamingSearch`;
  private readonly getProStateEndpoint = `${this.baseUrl}/api/user/getYouProState`;

  private cookies: Cookies;
  private premiumRequests = 0;

  private readonly config = new ConfigService().getConfig();
  private readonly defaultParameters: YouRequest = {
    q: '',
    domain: 'youchat',
    selectedChatMode: 'custom',
    selectedAIModel: this.config.you.model,
    safeSearch: 'Off',
  };

  constructor() {}

  generateConceptualHistory(_memoryPrompt: string): Promise<string> {
    throw 'Not implemented.';
  }

  async generateResponses(
    character: CharacterCard,
    forcedMemory: string,
    historyMessages: Message[],
    usernames: string[],
  ): Promise<string[]> {
    const messages = [];
    const cookies = await this.getCookies();

    if (!cookies) throw Error('Could not get cookies.');

    let cookieString = this.getCookieString(cookies);
    let headers = this.getHeaders(cookieString);

    // Get pro mode call to set cookies
    const proResponse = await fetch(this.getProStateEndpoint, {
      headers,
    });

    const setCookies = setCookie.parse(proResponse as any);

    Object.entries(setCookies).map(([key, value]) => {
      if (cookies.hasOwnProperty(key)) {
        cookies[key] = String(value); // Convert value to string
      }
    });
    cookies['ai_model'] = this.defaultParameters.selectedAIModel;

    cookieString = this.getCookieString(cookies);
    headers = this.getHeaders(cookieString);

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
      if (message.replyMesage)
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

    const prompt = this.formatPrompt(messages);

    const data: YouRequest = {
      ...this.defaultParameters,
      ...{
        q: prompt,
      },
    };

    const response = await fetch(
      `${this.generateEndpoint}?selectedChatMode=custom&safeSearch=Off&selectedAIModel=${data.selectedAIModel}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      },
    );

    if (!response.body) throw Error('Bad response.');

    const responseText = await response.text();
    const events = responseText.split('\n\n');

    let streamedResponse = '';

    for (const event of events) {
      const dataRegex = /data: (.*$)/gim;
      const matches = dataRegex.exec(event);

      if (matches && matches[1] && matches[1].startsWith('{')) {
        try {
          const eventData = JSON.parse(matches[1].trim());

          if (eventData.hasOwnProperty('youChatToken')) {
            streamedResponse += eventData.youChatToken;
          }
        } catch {}
      }
    }

    console.log(streamedResponse);

    // Clean response
    const responses = MessageParser.parseResponses(
      streamedResponse,
      usernames,
      [],
      character.name,
    );

    return responses;
  }

  private getHeaders(cookies: string): Headers {
    return {
      authority: 'you.com',
      accept: 'text/event-stream',
      'accept-language': 'en-US,en;q=0.9,es;q=0.8,ca;q=0.7,ru;q=0.6',
      'cache-control': 'max-age=0',
      cookie: cookies,
      dnt: '1',
      'sec-ch-ua': `'Chromium';v='122', 'Not(A:Brand';v='24', 'Google Chrome';v='122'`,
      'sec-ch-ua-arch': 'x86',
      'sec-ch-ua-bitness': '64',
      'sec-ch-ua-full-version': '122.0.6261.112',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': 'Windows',
      'sec-ch-ua-platform-version': '15.0.0',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      Referer: `${this.baseUrl}/search?fromSearchBar=true&tbm=youchat`,
    };
  }

  private formatPrompt(messages: Record<string, any>) {
    return (
      messages
        .map((message) => {
          return `${message['role'].toUpperCase()} (${message['name']}): ${
            message['content']
          }`;
        })
        .join('\n') + '\nAssistant:\n'
    );
  }

  private getCookieString(cookies: Cookies) {
    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  async getCookies() {
    if (!this.cookies || this.premiumRequests >= 5) {
      this.cookies = await this.createAccount();
      this.premiumRequests = 0;
    }
    this.premiumRequests += 1;
    return this.cookies;
  }

  private getSDK() {
    return btoa(
      JSON.stringify({
        event_id: `event-id-${uuid()}`,
        app_session_id: `app-session-id-${uuid()}`,
        persistent_id: `persistent-id-${uuid()}`,
        client_sent_at: new Date().toUTCString(),
        timezone: 'Europe/Paris',
        app: { identifier: 'you.com' },
        sdk: { identifier: 'Stytch.js Javascript SDK', version: '3.3.0' },
      }),
    );
  }

  private getCreateAccountAuth() {
    const auth_token = `${this.PUBLIC_TOKEN}:${this.PUBLIC_TOKEN}`;
    const auth = btoa(auth_token);
    return `Basic ${auth}`;
  }

  private getCreateAccountCookies(): Cookies {
    return {
      Authorization: this.getCreateAccountAuth(),
      'X-SDK-Client': this.getSDK(),
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'content-type': 'application/json',
      'sec-ch-ua': `'Chromium';v='122', 'Not(A:Brand';v='24', 'Google Chrome';v='122'`,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': 'Windows',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'x-sdk-parent-host': this.baseUrl,
      Referer: `${this.baseUrl}/`,
    };
  }

  private async createAccount(): Promise<Cookies> {
    const user_uuid = uuid();

    const response = await fetch(this.createAccountUrl, {
      method: 'POST',
      headers: this.getCreateAccountCookies(),
      body: JSON.stringify({
        email: `${user_uuid}@gmail.com`,
        password: `${user_uuid}#?${user_uuid}`,
        session_duration_minutes: 129600,
      }),
    });

    if (!response.ok) {
      return {};
    } else {
      const session = (await response.json())['data'];
      this.cookies = {
        stytch_session: session['session_token'],
        ydc_stytch_session: session['session_token'],
        stytch_session_jwt: session['session_jwt'],
        ydc_stytch_session_jwt: session['session_jwt'],
        safesearch_guest: 'Off',
        you_subscription: 'freemium',
        uuid_guest: uuid(),
        uuid_guest_backup: uuid(),
        daily_query_count: '15',
      };
    }
  }
}
