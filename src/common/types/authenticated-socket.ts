export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedSocketData {
  user: JwtPayload;
}
