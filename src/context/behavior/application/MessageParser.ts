import { ConfigService } from '@config';

export abstract class MessageParser {
  private static readonly config = new ConfigService().getConfig();

  /**
   * Parses the received text by kobold and returns an array of bot responses
   * @param koboldResponse
   * @returns Array of bot responses
   */
  public static parseResponses(
    response: string,
    usernames: string[],
    stopParameters: string[],
    botName: string,
    breakLines?: boolean,
  ): string[] {
    const parsedText = response
      // Remove bot name when it talks
      .replace(new RegExp('\n?s?@?' + botName + ':s?'), '')
      // Remove user name at givin turn
      .replace(/\n?\s*@?[\w]+:\s?\n?$/, '')
      // ISO date
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\n*/, '')
      // Remove ¿
      .replace(/¿/g, '')
      // Remove ¡
      .replace(/¡/g, '');

    let responses: string[];

    // Split by new lines
    if (breakLines) {
      responses = parsedText.split(/\n+/);
    } else {
      responses = [parsedText];
    }
    responses = responses
      .map((answer) => {
        // Remove senseless messages
        if (answer.match(/^[\W一-龯]+$/)) return;
        let cleanAnswer = answer
          // Remove initial @
          .replace(/^@/g, '');

        // Remove final stopParameter
        for (const stopParameter of stopParameters) {
          cleanAnswer = cleanAnswer.replace(
            new RegExp(stopParameter + '$', 'g'),
            '',
          );
        }

        // Remove username messages only
        if (usernames.includes(cleanAnswer)) return;
        return cleanAnswer.trim();
      })
      .filter((answer) => !!answer && !stopParameters.includes(answer));

    return [...new Set(responses)];
  }

  /**
   * Parses a prompt
   * @param prompt Prompt to parse
   * @returns Parsed prompt
   */
  public static parsePrompt(prompt: string): string {
    return (
      prompt
        // Remove emojis
        .replace(
          /([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
          '',
        )
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
    );
  }
}
