import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {addAccountabilityPoint} from '../firebase/userProfileHelpers';
import {colors} from '../theme';
import env from '../utils/env';

const { GOOGLE_PLACES_API_KEY } = env;

// Timeout helper to avoid hanging if the Firebase request stalls
const SUBMIT_TIMEOUT_MS = 10000;
function withTimeout<T>(promise: Promise<T>, ms: number = SUBMIT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms),
    ),
  ]);
}

export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  // Correct haversine implementation
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function ensureLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function geocodeAddress(address: string) {
  try {
    const input = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${input}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (loc) {
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (e) {
    console.error('geocode error', e);
  }
  return null;
}

const DEFAULT_REGION = {
  latitude: 40.7,
  longitude: -73.9,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

type CheckinLocationSource = 'places' | 'map' | 'geocode' | 'live';

type UserLocationState = {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number | null;
};

const AccountabilityFormScreen = ({navigation}) => {
  const [gymName, setGymName] = useState('');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLoc, setUserLoc] = useState<UserLocationState | null>(null);
  const [locationSource, setLocationSource] = useState<CheckinLocationSource | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [homeWorkout, setHomeWorkout] = useState(false);
  const insets = useSafeAreaInsets();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const submitBtnDisabled = submitting || loading;

  // Get user location on mount
  useEffect(() => {
    let didCancel = false;
    async function fetchLocation() {
      const granted = await ensureLocationPermission();
      if (!granted) {
        if (!didCancel) {
          Alert.alert('Permission Denied', 'Location permission is required for location-based suggestions.');
        }
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!didCancel) {
          const {latitude, longitude, accuracy} = position.coords;
          setUserLoc({
            lat: latitude,
            lng: longitude,
            timestamp: position.timestamp,
            accuracy,
          });
          // Optionally, setCoords here if you want to default to user location
        }
      } catch (err) {
        if (!didCancel) {
          Alert.alert('Location Error', 'Could not get location. Please enable location services.');
        }
      }
    }
    fetchLocation();
    return () => { didCancel = true; };
  }, []);

  const fetchSuggestions = async (q: string) => {
    try {
      const input = encodeURIComponent(`${q} gym`);
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_PLACES_API_KEY}&input=${input}&types=establishment`;
      // Use user location for suggestions if available
      if (userLoc) {
        url += `&location=${userLoc.lat},${userLoc.lng}&radius=50000`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(
        (data.predictions || []).map(p => ({
          name: p.description,
          placeId: p.place_id,
        })),
      );
      setDropdownOpen(true);
    } catch (err) {
      console.error('suggest error', err);
    }
  };

  const handleGymNameChange = (text: string) => {
    setGymName(text);
    setSelectedPlaceId(null);
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    if (text.length < 3) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    fetchTimeout.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelectSuggestion = async (s: any) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.placeId}&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      if (loc) {
        setCoords({lat: loc.lat, lng: loc.lng});
        setLocationSource('places');
        setSelectedPlaceId(s.placeId || null);
      }
      setGymName(s.name);
    } catch (err) {
      console.error('select error', err);
    }
    setDropdownOpen(false);
    setSuggestions([]);
  };

  useEffect(() => {
    if (homeWorkout) {
      setDropdownOpen(false);
    }
  }, [homeWorkout]);

  // Location logic
  const handleGetLocation = async () => {
    const granted = await ensureLocationPermission();
    if (!granted) {
      Alert.alert('Permission Denied', 'Location permission is required.');
      return;
    }
    setLoading(true);
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const {latitude, longitude, accuracy} = position.coords;
        setUserLoc({
          lat: latitude,
          lng: longitude,
          timestamp: position.timestamp,
          accuracy,
        });
        setCoords({lat: latitude, lng: longitude});
        setLocationSource('live');
        setSelectedPlaceId(null);
      } catch (err) {
        Alert.alert(
          'Location Error',
          'Could not get location. Please enable location services.',
        );
      } finally {
        setLoading(false);
      }
  };

  const handleSubmit = async () => {
    if (submitBtnDisabled) return;

    if (!gymName && !homeWorkout) {
      Alert.alert('Required', 'Enter gym name or select Home Workout.');
      return;
    }
    let loc = coords;
    let computedDistanceMiles: number | undefined;
    let sourceForEntry = locationSource;
    let placeIdForEntry = selectedPlaceId;
    if (!loc && !homeWorkout) {
      loc = await geocodeAddress(gymName);
      if (loc) {
        setCoords(loc);
        setLocationSource('geocode');
        setSelectedPlaceId(null);
        sourceForEntry = 'geocode';
        placeIdForEntry = null;
      } else {
        Alert.alert(
          'Required',
          'Choose gym location on map or enable Home Workout.',
        );
        return;
      }
    }
    if (!userLoc && !homeWorkout) {
      Alert.alert('Location', 'Please share your current location.');
      return;
    }
    if (!homeWorkout && userLoc) {
      const ageSec = (Date.now() - userLoc.timestamp) / 1000;
      if (ageSec > 120) {
        Alert.alert(
          'Location too old',
          'Your location is older than 2 minutes. Please tap Share Live Location and try again.',
        );
        return;
      }
      if (typeof userLoc.accuracy === 'number' && userLoc.accuracy > 100) {
        Alert.alert(
          'Location not accurate enough',
          'Please enable precise location, tap Share Live Location, and retry.',
        );
        return;
      }
    }
    if (!homeWorkout && loc && userLoc) {
      const miles = distanceMiles(
        userLoc.lat,
        userLoc.lng,
        loc.lat,
        loc.lng,
      );
      computedDistanceMiles = miles;
      if (miles > 2) {
        Alert.alert(
          'Too Far',
          `You are ${miles.toFixed(
            2,
          )} miles from your gym location. Please check in when closer, or select Home Workout if needed.`,
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const result = await withTimeout(
        addAccountabilityPoint({
          gymName,
          coords: loc,
          homeWorkout,
          metadata: {
            source: sourceForEntry || undefined,
            placeId: placeIdForEntry || undefined,
            locationAccuracyMeters:
              typeof userLoc?.accuracy === 'number' ? userLoc.accuracy : undefined,
            locationAgeSec: userLoc ? Math.round((Date.now() - userLoc.timestamp) / 1000) : undefined,
            distanceMiles: computedDistanceMiles,
          },
        }),
      );
      if (result.alreadyCheckedIn) {
        Alert.alert('Submitted', 'Already checked in today.');
      } else {
        Alert.alert('Submitted', 'Check-in submitted!');
      }
      navigation.goBack();
    } catch (e) {
      if (
        e?.code === 'deadline-exceeded' ||
        e?.code === 'unavailable' ||
        e?.message?.toLowerCase().includes('timed out')
      ) {
        Alert.alert(
          'Check-in not confirmed',
          'We couldn’t confirm your check-in due to a connection issue. Please try again. If you already checked in, the app will prevent duplicates.',
        );
      } else {
        Alert.alert('Error', e.message || 'Could not submit form.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapCoordinateChange = (latitude: number, longitude: number) => {
    setCoords({lat: latitude, lng: longitude});
    setLocationSource('map');
    setSelectedPlaceId(null);
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: '#181818'}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={{flexGrow: 1, paddingBottom: insets.bottom}}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.headerRow, {paddingTop: insets.top + 16}]}>
          <Ionicons
            name="shield-checkmark"
            color="#FFCC00"
            size={27}
            style={{marginRight: 8}}
          />
          <Text style={styles.headerTxt}>Accountability Check-In</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{marginLeft: 'auto'}}>
            <Ionicons name="close-circle-outline" size={29} color="#FFCC00" />
          </TouchableOpacity>
        </View>

        <View style={styles.rewardsCard}>
          <Ionicons name="flame-outline" color="#FFCC00" size={32} />
          <Text style={styles.cardTitle}>Discipline = Rewards</Text>
          <Text style={styles.cardText}>
            Earn points by completing this check-in once per day.
          </Text>
        </View>

        <View style={styles.formBox}>
          <Text style={styles.label}>Gym Name</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter gym name or Home Workout"
              placeholderTextColor="#888"
              value={gymName}
              onChangeText={handleGymNameChange}
              editable={!homeWorkout && !submitting && !loading}
              onBlur={() => setDropdownOpen(false)}
              onFocus={() => gymName.length >= 3 && fetchSuggestions(gymName)}
            />
            {dropdownOpen && suggestions.length > 0 && (
              <View style={styles.dropdown}>
                {suggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectSuggestion(s)}
                  >
                    <Text style={styles.dropdownItemText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              homeWorkout && {backgroundColor: '#FFCC00'},
            ]}
            onPress={() => !submitting && setHomeWorkout(hw => !hw)}
            disabled={submitting}>
            <Ionicons
              name={homeWorkout ? 'checkbox' : 'square-outline'}
              size={18}
              color={homeWorkout ? '#232323' : '#FFCC00'}
            />
            <Text
              style={[styles.toggleBtnTxt, homeWorkout && {color: '#232323'}]}>
              Home Workout
            </Text>
          </TouchableOpacity>
          {!homeWorkout && (
            <>
              <Text style={styles.label}>Select Gym Location</Text>
              <MapView
                testID="mapView"
                region={
                  coords
                    ? {
                        latitude: coords.lat,
                        longitude: coords.lng,
                        latitudeDelta: 0.012,
                        longitudeDelta: 0.012,
                      }
                    : userLoc
                    ? {
                        latitude: userLoc.lat,
                        longitude: userLoc.lng,
                        latitudeDelta: 0.012,
                        longitudeDelta: 0.012,
                      }
                    : {...DEFAULT_REGION}
                }
                showsUserLocation={!!userLoc}
                onPress={e =>
                  !submitting &&
                  handleMapCoordinateChange(
                    e.nativeEvent.coordinate.latitude,
                    e.nativeEvent.coordinate.longitude,
                  )
                }
                pointerEvents={submitting ? 'none' : 'auto'}>
                {coords && (
                  <Marker
                    coordinate={{latitude: coords.lat, longitude: coords.lng}}
                    draggable={!submitting}
                    onDragEnd={e =>
                      !submitting &&
                      handleMapCoordinateChange(
                        e.nativeEvent.coordinate.latitude,
                        e.nativeEvent.coordinate.longitude,
                      )
                    }
                    pinColor="#FFCC00"
                  />
                )}
              </MapView>
              <TouchableOpacity
                style={styles.locBtn}
                onPress={handleGetLocation}
                disabled={submitting}>
                <Ionicons name="navigate-outline" size={16} color="#FFCC00" />
                <Text style={styles.locBtnTxt}>Share Live Location</Text>
              </TouchableOpacity>
              {userLoc && (
                <Text style={styles.statusTxt}>
                  Your current location: {userLoc.lat.toFixed(4)}, {userLoc.lng.toFixed(4)}
                </Text>
              )}
            </>
          )}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              submitBtnDisabled && {backgroundColor: '#bbb', opacity: 0.7},
            ]}
            onPress={handleSubmit}
            disabled={submitBtnDisabled}
            activeOpacity={submitBtnDisabled ? 1 : 0.85}>
            {submitting || loading ? (
              <ActivityIndicator color="#232323" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={21} color="#232323" />
                <Text
                  style={[
                    styles.submitBtnTxt,
                    submitBtnDisabled && {color: '#232323', opacity: 0.7},
                  ]}>
                  Submit Check-In
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.note}>
            You can only submit once every 24 hours to earn your points and rewards!
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingBottom: 13,
    backgroundColor: '#232323',
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
  },
  headerTxt: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 0.7,
  },
  rewardsCard: {
    marginTop: 22,
    backgroundColor: '#232323',
    borderRadius: 19,
    marginHorizontal: 26,
    padding: 23,
    alignItems: 'center',
    elevation: 1,
    marginBottom: 15,
  },
  cardTitle: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 17,
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  cardText: {
    color: '#fff',
    fontSize: 13.5,
    opacity: 0.82,
    marginBottom: 7,
    textAlign: 'center',
  },
  formBox: {
    flex: 1,
    padding: 19,
  },
  label: {
    color: '#232323',
    fontWeight: 'bold',
    marginTop: 9,
    marginBottom: 3,
    fontSize: 14,
    marginLeft: 1,
  },
  input: {
    backgroundColor: '#f6f3e0',
    borderRadius: 7,
    borderColor: '#FFCC00',
    borderWidth: 1.2,
    color: '#232323',
    fontSize: 15,
    marginBottom: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  inputWrapper: { position: 'relative' },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
  dropdownItem: { paddingVertical: 8, paddingHorizontal: 10 },
  dropdownItemText: { color: colors.textDark, fontSize: 14 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 9,
    marginBottom: 17,
    alignSelf: 'flex-start',
  },
  toggleBtnTxt: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  map: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 13,
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  locBtnTxt: {
    color: '#FFCC00',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 7,
  },
  statusTxt: {
    color: '#888',
    fontSize: 12,
    marginBottom: 11,
  },
  submitBtn: {
    backgroundColor: '#FFCC00',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 11,
  },
  submitBtnTxt: {
    color: '#232323',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  note: {
    color: '#bbb',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    alignSelf: 'center',
    opacity: 0.85,
  },
});

export default AccountabilityFormScreen;
