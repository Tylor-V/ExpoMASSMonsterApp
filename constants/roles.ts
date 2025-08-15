import { colors } from '../theme';

export const ROLE_COLORS = {
  admin: '#FF4545',
  moderator: colors.success,
  experienced: colors.purple,
  coach: colors.accent,
  member: colors.accent,
};

export const ROLE_TAGS: { [key: string]: string } = {
  admin: 'ADMIN',
  moderator: 'MOD',
  experienced: 'EXPERT',
  coach: 'COACH',
  member: 'MEMBER',
};