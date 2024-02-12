import { Message } from './Message';
import { MessengerMessageEmitter } from './MessengerMessageEmitter';

export interface Channel {
  isDM: boolean;
  channelId: string;
  usernames: string[];
  /** Only used as local storage cache */
  messages?: Message[];
}

export interface MessengerClient {
  channels: Record<string, Channel>;
  /**
   * Get messenger client user name
   */
  getUsername(): Promise<string>;
  /**
   * Connect to messenger client
   */
  connect(): Promise<MessengerClient>;
  /**
   * Send status on messenger client (if available)
   * @param status Status to set
   */
  setStatus(status: string): Promise<MessengerClient>;
  /**
   * Delete all messages from the specified channel id
   * @param channelId Channel id to delete messages from
   */
  deleteMessages(channelId: string): Promise<void>;
  /**
   * Sends a message in the specified channelId
   * @param message Message to send
   * @param channelId Channel id where the message will be sent
   */
  sendMessage(
    message: string,
    channelId: string,
    botName?: string,
  ): Promise<void>;
  /**
   * Listen for new messages
   */
  listenMessages(): Promise<MessengerMessageEmitter>;
  /**
   * Get an array of users on this channelId
   * @param channelId Channel to get users from
   */
  getUsernames(channelId: string): Promise<string[]>;
  /**
   * Get history of messages
   * @param channelId Channel to get history from
   * @param maxHistory Max number of messages to get
   */
  getHistory(channelId: string, maxHistory: number): Promise<Message[]>;
  /**
   * Set "Bot is writting" status
   */
  setIsTypping(channelId: string): Promise<void>;

  /**
   * Check if someone is typping in the specified channel
   * @param channelId Channel to check if someone is typping
   */
  isTypping(channelId: string): Promise<boolean>;
}
