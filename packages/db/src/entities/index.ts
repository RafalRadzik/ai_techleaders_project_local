import { AuthRateLimit } from './auth/rate-limit.entity';
import { User } from './auth/user.entity';
import { MentorProfile } from './mentors/mentor-profile.entity';

export {
  User,
  USER_ROLES,
  USER_ROLES_CHECK,
  type IUser,
  type UserRole,
} from './auth/user.entity';
export { AuthRateLimit, type IAuthRateLimit } from './auth/rate-limit.entity';
export { MentorProfile, type IMentorProfile } from './mentors/mentor-profile.entity';
export { baseProperties } from './base.entity';

/** Every entity the ORM should discover. Keep this in sync when adding entities. */
export const entities = [User, MentorProfile, AuthRateLimit];
