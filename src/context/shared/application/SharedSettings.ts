export abstract class SharedSettings {
  public static systemPrompt = `Write {{char}}'s next reply in a fictional chat. Write 1 reply only in internet RP style, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repeating sentence and words.`;
  public static stopValues = ['You:', 'Tu:', 'Me:'];
  public static maxTokens = 300;
}
