import { colors } from '../theme';

export const ROLE_COLORS = {
  admin: colors.grayLight,
  moderator: colors.success,
  experienced: colors.purple,
  coach: colors.yellow,
  member: colors.accent,
};

export const ROLE_TAGS: { [key: string]: string } = {
  admin: 'ADMIN',
  moderator: 'MOD',
  experienced: 'EXPERT',
  coach: 'COACH',
  member: 'MEMBER',
};