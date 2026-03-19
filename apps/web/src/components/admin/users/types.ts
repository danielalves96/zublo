export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  created: string;
  totp_enabled: boolean;
  is_admin: boolean;
}
