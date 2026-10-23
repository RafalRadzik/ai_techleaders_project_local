export { getEnv, type AppEnv } from './config/env';
export { createLogger, type Logger } from './logger';
export { systemClock, type Clock } from './time/clock';
export {
  getContainer,
  withRequestScope,
  withScope,
  withSessionCookieScope,
  type Cradle,
} from './container/index';
export {
  readSessionCookie,
  SESSION_COOKIE_NAME,
  SessionService,
  type IssuedSession,
  type SessionClaims,
} from './services/auth/session.service';
export {
  TokenService,
  type PurposeTokenClaims,
  type SignPurposeTokenInput,
} from './services/auth/token.service';
export {
  GITHUB_CALLBACK_PATH,
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  NoVerifiedEmailError,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from './services/auth/github-identity.port';
export {
  AccountNotLinkedError,
  LastRoleError,
  UserService,
  type AccountNotLinkedReason,
  type AssignableRole,
  type GithubSignIn,
  type RoleChange,
  type UserCreateInput,
  type UserDto,
} from './services/auth/user.service';
export {
  clearOauthStateCookie,
  createOauthState,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_PURPOSE,
  OAUTH_STATE_TTL_SECONDS,
  verifyOauthState,
  type OauthState,
  type OauthStateDeps,
} from './services/auth/oauth-state';
export {
  SIGN_IN_CANCELLED_LOCATION,
  SIGN_IN_ERRORS,
  SIGN_IN_PATH,
  signInErrorLocation,
  signInFailure,
  type SignInError,
} from './services/auth/sign-in-redirect';
export { homeFor, liveRoles } from './services/auth/roles';
export { EventBus, type EventHandler, type EventId, type EventMap } from './events/index';

// Reusable HTTP layer (typed errors, route wrappers, auth guards).
export * from './http/index';

// Convenience re-export so the app can report DB health without importing `db`.
export { checkDbConnection } from '@devmentor/db';
