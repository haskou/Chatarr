import fs from 'fs/promises';
import { CharacterCard } from '../domain/ChatacterCard';
import { Message } from '@contexts/messengerClient/domain/Message';
import { AIProvider } from '@contexts/AIProvider/domain/AIProvider';
import { ConfigService } from '@contexts/shared/application/ConfigService';
import { container } from 'tsyringe';

export interface MemorySchema {
  content: string;
  keys: string[];
}

export class ConceptualMemory {
  public readonly memoryPath = './memory/';
  public readonly historyPrompt = `Generate a JSON object where the key is the user name and the value is an array of 3 words summarizing this conversation`;
  public memory: MemorySchema[];
  private aiProvider: AIProvider;
  private config = new ConfigService().getConfig();

  constructor(private character: CharacterCard) {
    this.aiProvider = container.resolve(this.config.aiProvider);
  }

  public findKey(key: string): string[] {
    return this.memory
      .filter((m) => m.keys.includes(key))
      .map((m) => m.content);
  }

  public async load(): Promise<void> {
    this.memory = JSON.parse(
      await fs
        .readFile(`${this.memoryPath}${this.character.name}.json`, 'utf-8')
        .catch(() => `{}`),
    );
  }

  /**
   * Stores the memory file
   * @param usersnames Optional, stores each username as unknown. Useful for first time
   */
  public async save(): Promise<MemorySchema[]> {
    await fs.mkdir(this.memoryPath, { recursive: true });

    // Delete own concepts
    delete this.memory[this.character.name];

    await fs.writeFile(
      `${this.memoryPath}${this.character.name}.json`,
      JSON.stringify(this.memory),
    );

    return this.memory;
  }

  public async getMemoryPrompt(historyPrompt: string): Promise<string> {
    if (!this.memory || !Object.keys(this.memory).length) {
      await this.save();
    }

    const requiredConcepts: string[] = [];
    this.memory.forEach((m) => {
      const key = m.keys.find((k) =>
        historyPrompt.toLowerCase().includes(k.toLowerCase()),
      );
      const contepts = this.findKey(key);
      if (contepts)
        requiredConcepts.push(
          ...contepts.map((c) => c.replace(/{{key}}/g, key)),
        );
    });

    return ([...new Set(requiredConcepts)].join('.') + '\\n').replace(
      /{{char}}/g,
      this.character.name,
    );
  }

  public async integrateConcepts(
    history: Message[],
    retries: number,
  ): Promise<MemorySchema[]> {
    if (retries-- <= 0) return;
    const prompt = `${this.historyPrompt}\n\n${history
      .map((m) => `${m.username}: ${m.content}`)
      .join('\n')}`;
    const response = await this.aiProvider.generateConceptualHistory(prompt);
    let newConcepts: MemorySchema[];

    try {
      try {
        const jsonRaw = response.match(/\{[^}]+\}/);
        newConcepts = JSON.parse(jsonRaw[0]);
      } catch {
        newConcepts = await this.integrateConcepts(history, retries);
      }
      if (newConcepts) Object.assign(this.memory, newConcepts);
      return this.save();
    } catch {
      return this.memory;
    }
  }
}
