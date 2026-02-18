import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { aiRoutePlannerAPI, productsAPI } from '../services/api';
import { useAlert } from '../hooks/useAlert';
import ProductSlider from '../components/ProductSlider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const TERRAIN_CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP * 2) / 3;

const TERRAIN_OPTIONS = [
  {
    id: 'mountain',
    title: 'Dağ',
    subtitle: 'Yüksek rakım',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzeWmAtEfK1uEyxxx4aLjWVhR2Osa6GtyAV1zBi8DooaVccj5lk-mI_b4EpctuDA8ZXaCr7ibjMKkWrdjCuVnLvOd63f-tN-nCmfULS4ylDmaG7s6hKUQwWqM49Tf2vaTo7w8wXHrfJWImhKF7To-glGmWS42Dhyi0tM9R247MLR6ylehsqvcXXlsVCdAlHNk6NnKhVjW6sn24P7bT6Mk7Eq8YRnwKK7sHg34N6DqTLMjZQVJpBd2XWCW_BcVBZtimSdMvNb4Pkmg',
  },
  {
    id: 'forest',
    title: 'Orman',
    subtitle: 'Yoğun ağaçlık',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBglDsOixGNultZxpgpeWDSoYsyvmysS1_NneAY6ThjB-3v11zjttk6wHuQB2th95QxsUILaQAosSmJIP_fpGIhtzviZHAlNgsEruwESHGiC9ajHCFyMUqvg9tUuP1DRYcdm2uihnXTo-M5oXpb2bnKT8kwQwHDGOYDf1MWRPzzHYnKJyDbZLLaBCvbi8aKOhB7C3zxwg03dhyHK3Rn-Uy4XZaRB-PZG5qrB0UgTYezs7MKZcv6tcxXLaX-66BRKzO37tiNj5sYj7Y',
  },
  {
    id: 'seaside',
    title: 'Sahil',
    subtitle: 'Kıyı rotaları',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7KVfLCLxIhxFW1LijwO7Y7470pw1h61Kc5SpEw71ThWCJbim_WzfSARfe8mKzeXD4zwALz-j_SaknbHkglL1-yzLUQ3NieWAfNmXIX9MznDZAiYWqRET0OViXdbvBKVw1Dj6601urXCB6qIwnSstCOV-ED9Xm_8Sw-Pk1KAiufvGZbZNA6DIZWkjSSX2DdrIS6mdG2kSEJy8MA0vsyjtRvQdtvLHv8hACEBzslYQY-GH3zFX0-syc2eIxqmYJuHMfD7PnrPfFHog',
  },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Kolay' },
  { id: 'moderate', label: 'Orta' },
  { id: 'hard', label: 'Zor' },
  { id: 'extreme', label: 'Aşırı' },
];

const PRIMARY = '#19e66b';

export default function AiRoutePlannerScreen({ navigation }) {
  const alert = useAlert();

  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [placeInfo, setPlaceInfo] = useState(null);

  const [selectedTerrain, setSelectedTerrain] = useState('mountain');
  const [durationDays, setDurationDays] = useState(3);
  const [difficulty, setDifficulty] = useState('moderate');
  const [selectedGear, setSelectedGear] = useState(['2 Kişilik Çadır', 'Trekking Botu']);
  const [gearInput, setGearInput] = useState('');

  const [generating, setGenerating] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return;
    let cancelled = false;
    setWeatherLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m&timezone=Europe/Istanbul`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.current) setWeather(data.current);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    setProductsLoading(true);
    const temp = weather?.temperature_2m ?? 15;
    const code = weather?.weather_code ?? 0;
    const wind = weather?.wind_speed_10m ?? 0;
    const isRain = code >= 61 && code <= 67;
    const isCold = temp < 10;
    const isWindy = wind > 30;
    const queries = [];
    if (isRain) queries.push('yağmurluk', 'mont');
    else if (isCold) queries.push('mont', 'polar', 'bere');
    else if (isWindy) queries.push('rüzgarlık', 'mont');
    else queries.push('çadır', 'uyku tulumu', 'trekking');
    productsAPI.getAll({ limit: 50, page: 1 })
      .then((res) => {
        if (cancelled) return;
        const raw = res?.data?.data?.products || res?.data?.data || [];
        const arr = Array.isArray(raw) ? raw : [];
        const seen = new Set();
        let out = [];
        for (const q of queries) {
          const match = arr.filter((p) => {
            const id = p.id || p._id;
            if (seen.has(id)) return false;
            const n = ((p.name || '') + ' ' + (p.category || '')).toLowerCase();
            if (n.includes(q)) { seen.add(id); return true; }
            return false;
          });
          out = out.concat(match);
        }
        if (out.length < 6) {
          arr.forEach((p) => {
            const id = p.id || p._id;
            if (!seen.has(id) && out.length < 8) { seen.add(id); out.push(p); }
          });
        }
        const final = out.length > 0 ? out.slice(0, 8) : arr.slice(0, 8);
        setRecommendedProducts(final);
      })
      .catch(() => setRecommendedProducts([]))
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [userLocation, routeData, weather?.temperature_2m, weather?.weather_code, weather?.wind_speed_10m]);

  const requestLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('AI rota için konum izni gerekiyor.');
        alert.show('İzin Gerekli', 'Lütfen ayarlardan konum izni verin.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      try {
        const places = await Location.reverseGeocodeAsync(current.coords);
        if (places?.[0]) {
          setPlaceInfo({ city: places[0].city || places[0].subregion, country: places[0].country || '' });
        }
      } catch (_) {}
    } catch (_) {
      setLocationError('Konum alınamadı.');
    } finally {
      setLocationLoading(false);
    }
  };

  const toggleGear = (item) => {
    setSelectedGear((prev) => (prev.includes(item) ? prev.filter((g) => g !== item) : [...prev, item]));
  };

  const addCustomGear = () => {
    const v = gearInput.trim();
    if (v && !selectedGear.includes(v)) {
      setSelectedGear((prev) => [...prev, v]);
      setGearInput('');
    }
  };

  const changeDuration = (d) => {
    setDurationDays((prev) => Math.max(1, Math.min(14, prev + d)));
  };

  const handleGenerateRoute = async () => {
    if (!userLocation) {
      alert.show('Konum Gerekli', 'Rota oluşturmak için konumunuzu alın.');
      requestLocation();
      return;
    }
    try {
      setGenerating(true);
      setRouteError(null);
      setRouteData(null);
      const payload = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        city: placeInfo?.city || null,
        country: placeInfo?.country || null,
        terrain: selectedTerrain,
        durationDays,
        difficulty,
        gear: selectedGear,
      };
      const response = await aiRoutePlannerAPI.generateCampingRoute(payload);
      const data = response.data;
      if (!data?.success || !data?.data?.text) throw new Error(data?.message || 'Rota oluşturulamadı');
      const rawText = (data.data.text || '').trim();
      let parsed = null;
      try {
        const jsonStr = rawText.match(/\{[\s\S]*\}/)?.[0] || rawText;
        parsed = JSON.parse(jsonStr);
      } catch (_) {}
      if (parsed && typeof parsed === 'object') {
        const s = parsed.summary;
        if (typeof s === 'string' && (s.startsWith('{') || s.includes('"routeTitle"') || s.includes('"stops"'))) {
          parsed.summary = '';
        }
      }
      setRouteData(
        parsed && typeof parsed === 'object'
          ? parsed
          : { routeTitle: 'AI Rota Önerisi', summary: '', durationDays, distanceKm: null, elevationGainM: null, totalTimeHours: null, stops: [], activities: [], recommendedGear: [], safetyTips: [] },
      );
    } catch (error) {
      setRouteError(error.response?.data?.message || error.message || 'Rota oluşturulamadı.');
      alert.show('Hata', error.response?.data?.message || error.message);
    } finally {
      setGenerating(false);
    }
  };

  const openPlaceInMaps = (placeName) => {
    if (!placeName || typeof placeName !== 'string') return;
    const dest = encodeURIComponent(placeName.trim());
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    Linking.openURL(url).catch(() => alert.show('Hata', 'Google Haritalar açılamadı.'));
  };

  const openInGoogleMaps = async () => {
    if (!routeData || !userLocation) return;
    const stops = Array.isArray(routeData.stops) ? routeData.stops : [];
    const region = stops.length > 0 ? (stops[stops.length - 1]?.name || placeInfo?.city) : placeInfo?.city;
    const searchQuery = `kamp alanı ${region || 'Türkiye'}`.trim();
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
    try {
      await Linking.openURL(url);
    } catch (_) {
      alert.show('Hata', 'Google Haritalar açılamadı.');
    }
  };

  const getWeatherIcon = (code) => {
    if (code >= 95) return 'thunderstorm';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 61 && code <= 67) return 'rainy';
    if (code >= 51 && code <= 57) return 'rainy';
    if (code >= 1 && code <= 3) return 'cloudy';
    return 'sunny';
  };

  const getWeatherLabel = (code) => {
    if (code >= 95) return 'Fırtına';
    if (code >= 71 && code <= 77) return 'Kar';
    if (code >= 61 && code <= 67) return 'Yağmurlu';
    if (code >= 51 && code <= 57) return 'Çiseleyen';
    if (code >= 1 && code <= 3) return 'Bulutlu';
    return 'Açık';
  };

  const renderPreview = () => {
    if (generating) {
      return (
        <View style={styles.previewCard}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Rota hazırlanıyor...</Text>
        </View>
      );
    }
    if (routeError) {
      return (
        <View style={styles.previewCard}>
          <Ionicons name="alert-circle" size={40} color={COLORS.error} />
          <Text style={styles.mapPlaceholderText}>{routeError}</Text>
        </View>
      );
    }
    if (!routeData) {
      return (
        <View style={styles.previewCard}>
          <Text style={styles.mapPlaceholderText}>Tercihlerinizi seçip AI rota oluşturun</Text>
        </View>
      );
    }

    const stops = Array.isArray(routeData.stops) ? routeData.stops : [];
    const displayStops = stops.length > 0 ? stops : (placeInfo?.city ? [{ name: placeInfo.city, description: 'Kamp bölgesi' }] : []);

    return (
      <View style={styles.previewCard}>
        <Text style={styles.routeTitle}>{routeData.routeTitle || 'AI Rota Önerisi'}</Text>
        {routeData.summary && !String(routeData.summary).startsWith('{') ? (
          <Text style={styles.routeDesc}>{routeData.summary}</Text>
        ) : null}

        {/* Durak Noktaları - Tıklanınca navigasyona yönlendirir */}
        {displayStops.length > 0 && (
          <View style={styles.stopsSection}>
            <Text style={styles.stopsSectionTitle}>Durak Noktaları</Text>
            <Text style={styles.stopsHint}>Konuma gitmek için tıklayın (araba ile)</Text>
            {displayStops.map((s, i) => (
              <TouchableOpacity key={i} style={styles.stopItem} onPress={() => openPlaceInMaps(s.name)} activeOpacity={0.7}>
                <View style={styles.stopItemInner}>
                  <Ionicons name="navigate" size={18} color={PRIMARY} />
                  <View style={styles.stopTextWrap}>
                    <Text style={styles.stopName}>{s.name || 'Bilinmeyen'}</Text>
                    {s.description ? <Text style={styles.stopDesc}>{s.description}</Text> : null}
                    {Array.isArray(s.activities) && s.activities.length > 0 && (
                      <Text style={styles.stopActivities}>{s.activities.join(' • ')}</Text>
                    )}
                  </View>
                  <Ionicons name="car" size={18} color={COLORS.gray400} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {Array.isArray(routeData.activities) && routeData.activities.length > 0 && (
          <View style={styles.activitiesSection}>
            <Text style={styles.activitiesSectionTitle}>Yapılabilecek Aktiviteler</Text>
            <View style={styles.activitiesTags}>
              {routeData.activities.map((a, i) => (
                <View key={i} style={styles.activityTag}>
                  <Text style={styles.activityTagText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.aiDisclaimer}>Yapay zeka hata yapabilir. Bilgileri mutlaka kontrol edin.</Text>

        <View style={styles.statsRow}>
          {routeData.distanceKm != null && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>MESAFE</Text>
                <Text style={styles.statValue}>{Number(routeData.distanceKm).toFixed(1)} km</Text>
              </View>
              <View style={styles.statDivider} />
            </>
          )}
          {routeData.elevationGainM != null && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>İRTİFA</Text>
                <Text style={styles.statValue}>{routeData.elevationGainM} m</Text>
              </View>
              <View style={styles.statDivider} />
            </>
          )}
          {routeData.totalTimeHours != null && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SÜRE</Text>
              <Text style={styles.statValue}>
                {Math.floor(routeData.totalTimeHours)}s {Math.round((routeData.totalTimeHours % 1) * 60)}dk
              </Text>
            </View>
          )}
        </View>

        {Array.isArray(routeData.safetyTips) && routeData.safetyTips.length > 0 && (
          <View style={styles.safetySection}>
            <Text style={styles.safetySectionTitle}>Güvenlik İpuçları</Text>
            {routeData.safetyTips.map((tip, i) => (
              <View key={i} style={styles.safetyTipItem}>
                <Ionicons name="shield-checkmark-outline" size={16} color={PRIMARY} />
                <Text style={styles.safetyTipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Rota Planlayıcı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Bir sonraki macera{'\n'}<Text style={styles.heroHighlight}>nerede?</Text></Text>
        </View>

        {locationLoading && (
          <View style={styles.locationRow}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={styles.locationText}>Konum alınıyor...</Text>
          </View>
        )}
        {!locationLoading && placeInfo?.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={PRIMARY} />
            <Text style={styles.locationText}>{placeInfo.city}{placeInfo.country ? `, ${placeInfo.country}` : ''}</Text>
            <TouchableOpacity onPress={requestLocation}>
              <Text style={[styles.locationRefresh, { color: PRIMARY }]}>Yenile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Terrain */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Arazi Tipi Seç</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PhysicalStores')}>
              <Text style={[styles.viewMap, { color: PRIMARY }]}>Haritayı Gör</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.terrainGrid}>
            {TERRAIN_OPTIONS.map((item) => {
              const active = selectedTerrain === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.terrainCard, active && styles.terrainCardActive]}
                  onPress={() => setSelectedTerrain(item.id)}
                  activeOpacity={0.9}
                >
                  {active && (
                    <View style={styles.terrainCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />
                    </View>
                  )}
                  <Image source={{ uri: item.image }} style={styles.terrainImage} resizeMode="cover" />
                  <View style={styles.terrainTextWrap}>
                    <Text style={[styles.terrainTitle, active && { color: PRIMARY }]}>{item.title}</Text>
                    <Text style={[styles.terrainSubtitle, active && styles.terrainSubtitleActive]}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Süre</Text>
            <Text style={[styles.durationValue, { color: PRIMARY }]}>{durationDays} Gün</Text>
          </View>
          <View style={styles.sliderWrap}>
            <TouchableOpacity style={styles.sliderBtn} onPress={() => changeDuration(-1)}>
              <Ionicons name="remove" size={18} color={COLORS.textMain} />
            </TouchableOpacity>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${((durationDays - 1) / 13) * 100}%` }]} />
            </View>
            <TouchableOpacity style={styles.sliderBtn} onPress={() => changeDuration(1)}>
              <Ionicons name="add" size={18} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 Gün</Text>
            <Text style={styles.sliderLabel}>2 Hafta</Text>
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Zorluk</Text>
            <View style={styles.difficultyTag}>
              <Text style={styles.difficultyTagText}>{DIFFICULTY_OPTIONS.find((d) => d.id === difficulty)?.label || 'Orta'}</Text>
            </View>
          </View>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_OPTIONS.map((opt) => {
              const active = difficulty === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.difficultyBtn, active && styles.difficultyBtnActive]}
                  onPress={() => setDifficulty(opt.id)}
                >
                  <Text style={[styles.difficultyBtnText, active && styles.difficultyBtnTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Gear */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mevcut Ekipmanım</Text>
          <View style={styles.gearTags}>
            {selectedGear.map((item) => (
              <TouchableOpacity key={item} style={styles.gearTag} onPress={() => toggleGear(item)}>
                <Ionicons name="bonfire-outline" size={14} color={COLORS.gray600} />
                <Text style={styles.gearTagText}>{item}</Text>
                <Ionicons name="close" size={14} color={COLORS.gray500} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.gearInputWrap}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.gray400} style={styles.gearInputIcon} />
            <TextInput
              style={styles.gearInput}
              placeholder="Ekipman ekle (örn. Uyku Tulumu)"
              placeholderTextColor={COLORS.gray400}
              value={gearInput}
              onChangeText={setGearInput}
              onSubmitEditing={addCustomGear}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Hava Durumu - Her zaman göster (konum varsa) */}
        {userLocation && (
          <View style={styles.weatherSection}>
            <Text style={styles.weatherSectionTitle}>Anlık Hava Durumu</Text>
            {weatherLoading ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : weather ? (
              <View style={styles.weatherRow}>
                <Ionicons name={getWeatherIcon(weather.weather_code)} size={32} color={PRIMARY} />
                <View style={styles.weatherInfo}>
                  <Text style={styles.weatherTemp}>{Math.round(weather.temperature_2m)}°C</Text>
                  <Text style={styles.weatherLabel}>{getWeatherLabel(weather.weather_code)}</Text>
                  <Text style={styles.weatherExtra}>
                    Nem %{weather.relative_humidity_2m} • Rüzgar {Math.round(weather.wind_speed_10m)} km/s
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.weatherUnavailable}>Yükleniyor...</Text>
            )}
          </View>
        )}

        {renderPreview()}

        {/* Ürün Önerileri - Her zaman göster */}
        <View style={styles.gearRecSection}>
          {productsLoading ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 16 }} />
          ) : recommendedProducts.length > 0 ? (
            <ProductSlider
              title="Size Özel Ürün Önerileri"
              products={recommendedProducts.map((p) => ({ ...p, id: p.id || p._id }))}
              onSeeAll={() => navigation.navigate('Shop')}
              onProductPress={(p) => navigation.navigate('ProductDetail', { product: p })}
              onFavorite={() => {}}
            />
          ) : null}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.genBtn, generating && styles.genBtnDisabled]}
          onPress={handleGenerateRoute}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={COLORS.black} />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color={COLORS.black} />
              <Text style={styles.genBtnText}>AI Rota Oluştur</Text>
            </>
          )}
        </TouchableOpacity>
        {!!routeData && (
          <TouchableOpacity style={styles.mapsBtn} onPress={openInGoogleMaps}>
            <Ionicons name="navigate-outline" size={18} color={COLORS.black} />
            <Text style={styles.mapsBtnText}>Google Haritalarda Aç</Text>
          </TouchableOpacity>
        )}
      </View>

      {alert.AlertComponent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(246,248,247,0.9)',
  },
  backBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 48 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  hero: { paddingTop: 16, paddingBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: COLORS.textMain, lineHeight: 34 },
  heroHighlight: { color: PRIMARY },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  locationText: { fontSize: 13, color: COLORS.textMain, flex: 1 },
  locationRefresh: { fontSize: 12, fontWeight: '600' },
  section: { marginTop: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain },
  viewMap: { fontSize: 12, fontWeight: '600' },
  terrainGrid: { flexDirection: 'row', gap: CARD_GAP },
  terrainCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    padding: 8,
  },
  terrainCardActive: { borderColor: PRIMARY, backgroundColor: 'rgba(25,230,107,0.1)' },
  terrainCheck: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  terrainImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  terrainTextWrap: { alignItems: 'center', marginTop: 8 },
  terrainTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  terrainSubtitle: { fontSize: 10, color: COLORS.gray500, marginTop: 2 },
  durationValue: { fontSize: 18, fontWeight: '700' },
  sliderWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  sliderTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.gray200, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 4, backgroundColor: PRIMARY },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sliderLabel: { fontSize: 11, color: COLORS.gray400 },
  difficultyTag: { backgroundColor: '#fef9c3', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  difficultyTagText: { fontSize: 11, fontWeight: '700', color: '#a16207' },
  difficultyRow: { flexDirection: 'row', gap: 4, height: 48 },
  difficultyBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyBtnActive: { backgroundColor: PRIMARY },
  difficultyBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.gray600 },
  difficultyBtnTextActive: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  gearTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gearTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  gearTagText: { fontSize: 13, fontWeight: '500', color: COLORS.textMain },
  gearInputWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  gearInputIcon: { position: 'absolute', left: 12, zIndex: 1 },
  gearInput: {
    flex: 1,
    height: 48,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
  },
  previewCard: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: COLORS.gray200 },
  loadingText: { marginTop: 8, fontSize: 14, color: COLORS.gray500 },
  weatherSection: { backgroundColor: COLORS.gray50, borderRadius: 12, padding: 16, marginBottom: 16 },
  weatherSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 12 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  weatherInfo: { flex: 1 },
  weatherTemp: { fontSize: 28, fontWeight: '700', color: COLORS.textMain },
  weatherLabel: { fontSize: 14, color: COLORS.gray600, marginTop: 2 },
  weatherExtra: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  weatherUnavailable: { fontSize: 13, color: COLORS.gray500 },
  stopsHint: { fontSize: 11, color: COLORS.gray500, marginBottom: 8 },
  stopItemInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopTextWrap: { flex: 1 },
  shopLinkBtn: { paddingVertical: 16, alignItems: 'center', gap: 4 },
  shopLinkText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  previewSectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray400, letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  previewBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  mapBox: { height: 192, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  mapImage: { width: '100%', height: '100%' },
  mapPlaceholderText: { marginTop: 8, fontSize: 13, color: COLORS.gray600 },
  routeTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textMain, marginTop: 16, marginBottom: 4 },
  routeDesc: { fontSize: 14, color: COLORS.gray500, marginBottom: 12 },
  stopsSection: { marginTop: 12, marginBottom: 12 },
  stopsSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  stopItem: { marginBottom: 10, padding: 12, borderRadius: 8, backgroundColor: COLORS.gray50, borderLeftWidth: 3, borderLeftColor: PRIMARY },
  stopName: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },
  stopDesc: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  stopActivities: { fontSize: 11, color: COLORS.gray600, marginTop: 4 },
  activitiesSection: { marginTop: 12, marginBottom: 12 },
  activitiesSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  activitiesTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityTag: { backgroundColor: COLORS.gray100, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  activityTagText: { fontSize: 12, color: COLORS.textMain, fontWeight: '500' },
  aiDisclaimer: { fontSize: 11, color: COLORS.gray500, fontStyle: 'italic', marginTop: 8, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  statItem: {},
  statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.gray400 },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.gray200 },
  gearRecSection: { marginTop: 16 },
  gearRecHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gearRecTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  shopAll: { fontSize: 13, fontWeight: '600' },
  gearRecList: { flexDirection: 'row', gap: 16, paddingVertical: 8 },
  gearRecCard: { minWidth: 140 },
  gearRecCardInner: {
    aspectRatio: 3 / 4,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearRecName: { fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginTop: 8 },
  gearRecDesc: { fontSize: 11, color: COLORS.gray500 },
  safetySection: { marginTop: 16 },
  safetySectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  safetyTipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  safetyTipText: { flex: 1, fontSize: 12, color: COLORS.gray600 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  genBtnDisabled: { opacity: 0.7 },
  genBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(25,230,107,0.15)',
  },
  mapsBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.black },
});
