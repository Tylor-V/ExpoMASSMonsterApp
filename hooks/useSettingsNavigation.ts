import { useNavigation } from '@react-navigation/native';

export const useSettingsNavigation = () => {
  const navigation = useNavigation<any>();

  const goBack = () => {
    navigation.goBack();
  };

  const handleNavigate = (routeName?: string) => () => {
    if (routeName) {
      navigation.navigate(routeName);
    }
  };

  return { goBack, handleNavigate };
};

export default useSettingsNavigation;