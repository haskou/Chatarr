import { CharacterCard } from '@contexts/behavior/domain/ChatacterCard';
import { Message } from '@contexts/messengerClient/domain/Message';

export interface AIProvider {
  /**
   * Generate responses
   * @param character Character who will respond
   * @param forcedMemory Additional memories to add
   * @param historyMessages History of last messages
   * @param userNames Users involved on this chat
   * @param isReplied Boolean that indicates if has been replied
   */
  generateResponses(
    character: CharacterCard,
    forcedMemory: string,
    historyMessages: Message[],
    userNames: string[],
    isReplied?: boolean,
  ): Promise<string[]>;

  generateConceptualHistory?(memoryPrompt: string): Promise<string>;
}
