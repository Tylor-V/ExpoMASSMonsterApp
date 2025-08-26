export type SettingsOption = {
  icon: string;
  label: string;
  routeName?: string;
  red?: boolean;
  iconColor?: string;
  chevronColor?: string;
};

export const settingsGroups: SettingsOption[][] = [
  [
    { icon: 'person-outline', label: 'Account', routeName: 'Account' },
    { icon: 'wifi-outline', label: 'Online Status', routeName: 'OnlineStatus' },
    { icon: 'calendar-outline', label: 'Workout History', routeName: 'WorkoutHistory' },
    { icon: 'nutrition-outline', label: 'Nutrition Calculator' },
  ],
  [
    { icon: 'notifications-outline', label: 'Notifications', routeName: 'NotificationsScreen' },
    { icon: 'help-circle-outline', label: 'Help & FAQ', routeName: 'HelpFAQ' },
    { icon: 'document-text-outline', label: 'Terms & Privacy', routeName: 'TermsPrivacy' },
    { icon: 'heart-outline', label: 'Donate & Support', routeName: 'DonateSupport' },
  ],
  [
    { icon: 'logo-usd', label: 'Become Affiliated' },
    { icon: 'share-social-outline', label: 'Refer a Friend' },
    {
      icon: 'log-out-outline',
      label: 'Sign Out',
      red: true,
      iconColor: '#E53935',
      chevronColor: '#E53935',
    },
  ],
];

export default settingsGroups;