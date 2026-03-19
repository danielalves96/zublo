export interface SMTPFormValues {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  authMethod: string;
  senderAddress: string;
  senderName: string;
}
