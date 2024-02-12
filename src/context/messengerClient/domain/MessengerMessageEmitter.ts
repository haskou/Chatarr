import { TypedEmitter } from 'tiny-typed-emitter';
import { Message } from './Message';

interface MessengerMessageFunctions {
  message: (data: Message) => void;
}

/**
 * Generic event emitter
 */
export class MessengerMessageEmitter extends TypedEmitter<MessengerMessageFunctions> {
  constructor() {
    super();
  }
}
