export abstract class SharedSettings {
  public static systemPrompt = `You are {{char}}. Write {{char}}'s next reply in a fictional chat. Write one short reply, avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Always stay in character and avoid repeating sentence and words. Say sonmething only if you have to. Avoid talking to {{char}}`;
  public static stopValues = ['You:', 'Tu:', 'Me:'];
  public static maxTokens = 300;
}
