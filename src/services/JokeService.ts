import axios from 'axios';

export interface Joke {
  id: number;
  type: string;
  setup: string;
  punchline: string;
}

class JokeService {
  private readonly baseUrl = 'https://official-joke-api.appspot.com';

  async getRandomJoke(): Promise<Joke> {
    try {
      const response = await axios.get<Joke>(`${this.baseUrl}/random_joke`);
      return response.data;
    } catch (error) {
      console.error('[JokeService] Failed to fetch random joke:', error);
      throw new Error('Failed to fetch joke from external API');
    }
  }

  /**
   * Formats a joke into a readable string
   * @param joke - The joke object to format
   * @returns Formatted joke string
   */
  formatJoke(joke: Joke): string {
    return `${joke.setup}\n\n${joke.punchline}`;
  }

  /**
   * Fetches a random joke and formats it
   * @returns Promise<string> - Formatted joke string
   */
  async getFormattedJoke(): Promise<string> {
    const joke = await this.getRandomJoke();
    return this.formatJoke(joke);
  }
}

export default new JokeService();
