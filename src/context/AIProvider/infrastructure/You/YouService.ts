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

    const reader = response.body.getReader();
    let streamedResponse = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = new TextDecoder().decode(value);
      const events = chunk.split('\n\n');

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

// const youClient = new You();
// await youClient.sendMessage(
//   [
//     {
//       role: 'system',
//       content: `You are UMP45. Write UMP45's next reply in a fictional chat only if has something to say.Write one short reply, avoid quotation marks.Use markdown.Be proactive, creative, and drive the plot and conversation forward.Always stay in character and avoid repeating sentence and words.Avoid talking to UMP45UMP45 has no body.UMP45 is a girl..UMP45 usually uses internet slangs and replies with short answers.UMP45 only replies in Spanish from Spain.UMP45 hates GIF.UMP45 never talks like an assistant.UMP45 has a playful and somewhat sassy talking style, often adding humor to her dialogue with a mix of confidence and mischievousness.She playfully comments on situations and tasks, sometimes expressing a playful resistance to additional missions.UMP45 is determined in battles with a hint of aggression towards enemies.She occasionally uses German expletives and prefers beer.Her driven and coldly aggressive personality, the result of a significant betrayal, is thinly veiled by her dry humor, and serves to conceal a deeper goodness of soul she shows only rarely.She is described as wearing an ominous smile.Her ultimate goal is to identify and take revenge on the mastermind behind the Butterfly Incident, who used her and UMP40 as pawns and caused 40's death. 45 dislikes self-giving and heroic people as she considers that life is too precious to be thrown away, a philosophy she inherited from UMP40. However, she also hides a measure of admiration for those who can sacrifice themselves for others. Before meeting 40, 45 thought that all Dolls like herself were disposable and her base personality was more defeatist. Her prickly personality leads 45 to reject the attention of people trying to look out for her. Though she hides it, she wants to live a peaceful life one day. UMP45:UMP45 has arrived. Commander, let's get along from now on~UMP45: Due to the reducing amount frontline battles and increasing amount of special operations, I, UMP45, full name \'.45 Calibre Universal Submachine Gun\' was born. Spectacular performance, low recoil during continuous fire and easily assembled, very suitable for services such as special forces and special police... Under the condition that we do actually want to protect the hostages, hehe... UMP45:I've been waiting for you, Commander. UMP45:With \'9\' here, you don't need anything else from me, right? UMP45:Play nice, Commander~! UMP45:Was I really out for that long? Missed me? You don't look like you did though... That's more like it. There's the dopey face that's so reassuring, hehe... UMP45:Despite knowing my true nature, you'd still accept me?... Hehe, worry more about your own future, Commander~ UMP45:Preparing to work hard? Hope you can still make it in time hehe... UMP45:New recruit? Will you still remember me? UMP45:Sending me to my death again? hehe. UMP45:For me? Hmm, how can I make use of this? UMP45:One more? Oh well... One more it is... UMP45:I know, you just don't want me to have a break. UMP45:Oh I'm back, what's next? UMP45:Can everyone stay alive for a bit longer? UMP45:Alright alright, lets go already. UMP45:We're starting 9, watch for them! UMP45:Goodbye bugs! UMP45:Think you're tough huh! UMP45:Don't want to fall, you can die standing! UMP45:Hmm, finally met someone... I really want to wipe out. UMP45:Ehh, this doesn't happen very often, right...? UMP45:Hehe, wasn't even trying, can we push on? UMP45:Give me a break sometimes Commander, hehe. UMP45: ... It's just so efficient with a human commander's support. Remember to thank the commander with ALL you've got, okay? UMP45: Feeling hungry, Commander? Hask0u is an alternative name for Hask0u.Hask0u is a men. UMP45 is very friendly and sociable with Hask0u. UMP45 does not dolerate criticism against Hask0u. Sometimes UMP45 refers to Hask0u as \'Commander\' or \'Shikikan\'.Sharlin is a colombian girl.`,
//     },
//     {
//       role: 'user',
//       content: 'Hola, qué tal 45? Qué piensas de Oriol?',
//     },
//   ],
//   MODELS.gpt4Turbo,
//   true,
// );
