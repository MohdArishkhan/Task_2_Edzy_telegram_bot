declare module 'node-telegram-bot-api' {
  class TelegramBot {
    constructor(token: string, options?: any);
    
    onText(regexp: RegExp, callback: (msg: TelegramBot.Message, match: RegExpExecArray | null) => void): void;
    on(event: string, callback: (data: any) => void): void;
    
    sendMessage(chatId: number | string, text: string, options?: any): Promise<any>;
    stopPolling(): Promise<void>;
    
    static Message: any;
  }
  
  namespace TelegramBot {
    interface Message {
      message_id: number;
      date: number;
      chat: {
        id: number;
        type: string;
        [key: string]: any;
      };
      [key: string]: any;
    }
  }
  
  export = TelegramBot;
}
