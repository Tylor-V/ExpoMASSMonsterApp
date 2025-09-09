import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { parseProductDescription, DISCLAIMER_TEXT } from '../utils/parseProductDescription';

interface Props {
  description: string;
}

export default function ProductDescriptionTabs({ description }: Props) {
  const [tab, setTab] = useState<'about' | 'info'>('about');
  const parsed = parseProductDescription(description);

  const renderAbout = () => (
    <View>
      {parsed.quantity && <Text style={styles.quantity}>{parsed.quantity}</Text>}
      {parsed.about && <Text style={styles.text}>{parsed.about}</Text>}
      {parsed.manufactured && <Text style={styles.text}>{parsed.manufactured}</Text>}
      <Text style={styles.disclaimer}>{DISCLAIMER_TEXT}</Text>
    </View>
  );

  const renderInfo = () => (
    <View>
      {Object.entries(parsed.info).map(([header, content]) => (
        <View key={header} style={styles.infoSection}>
          <Text style={styles.header}>{header}:</Text>
          <Text style={styles.text}>{content as string}</Text>
        </View>
      ))}
      {parsed.features.length > 0 && (
        <View style={styles.featuresRow} testID="desc-icons-row">
          {parsed.features.map((f, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Image source={f.asset} style={styles.icon} />
              <Text style={styles.featureLabel}>{f.text}</Text>
            </View>
          ))}
        </View>
      )}
      {parsed.manufactured && <Text style={styles.text}>{parsed.manufactured}</Text>}
      <Text style={styles.disclaimer}>{DISCLAIMER_TEXT}</Text>
    </View>
  );

  return (
    <View>
      <View style={styles.tabRow}>
        {(['about', 'info'] as const).map(key => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.activeTab]}
            onPress={() => setTab(key)}
            testID={`tab-${key}`}
          >
            <Text style={[styles.tabLabel, tab === key && styles.activeTabLabel]}>
              {key === 'about' ? 'About' : 'Info'}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'about' ? renderAbout() : renderInfo()}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.gold,
  },
  tabLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textDark,
  },
  activeTabLabel: {
    fontFamily: fonts.bold,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 26,
    marginBottom: 8,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 8,
  },
  header: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textDark,
  },
  infoSection: {
    marginBottom: 8,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  featureItem: {
    alignItems: 'center',
    margin: 4,
  },
  icon: { width: 32, height: 32, marginBottom: 4 },
  featureLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textDark,
  },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textDark,
    marginTop: 8,
  },
});

