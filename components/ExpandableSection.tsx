import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ExpandableSection = ({title, children, defaultOpen = false}: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const wrap = (child: React.ReactNode) =>
    typeof child === 'string' ? <Text>{child}</Text> : child;
  const renderChildren =
    typeof children === 'function'
      ? children
      : React.Children.map(children, wrap);
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen(!open);
        }}
        activeOpacity={0.8}>
        <Text style={styles.title}>{title}</Text>
        <Icon
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={26}
          color="#FFCC00"
        />
      </TouchableOpacity>
      {open && <View style={styles.content}>{renderChildren}</View>}
    </View>
  );
};

export default React.memo(ExpandableSection);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#232323',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  title: {
    color: '#FFCC00',
    fontSize: 19,
    fontWeight: 'bold',
  },
  content: {
    borderTopWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 15,
    paddingBottom: 8,
    paddingTop: 2,
  },
});