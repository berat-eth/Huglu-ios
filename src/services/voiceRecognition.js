import Voice from '@react-native-voice/voice';
import { Platform, PermissionsAndroid } from 'react-native';

class VoiceRecognitionService {
  constructor() {
    this.isListening = false;
    this.recognitionTimeout = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.isVoiceAvailable = false;
    
    // Voice modülünün yüklenip yüklenmediğini kontrol et
    this.initializeVoice();
  }

  async initializeVoice() {
    try {
      if (!Voice) {
        console.warn('⚠️ Voice modülü yüklenmedi');
        this.isVoiceAvailable = false;
        return;
      }

      // Voice event listeners
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      
      this.isVoiceAvailable = true;
      console.log('✅ Voice modülü başlatıldı');
    } catch (error) {
      console.error('❌ Voice modülü başlatma hatası:', error);
      this.isVoiceAvailable = false;
    }
  }

  onSpeechStart(e) {
    console.log('🎤 Konuşma başladı:', e);
  }

  onSpeechEnd(e) {
    console.log('🛑 Konuşma bitti:', e);
  }

  onSpeechResults(e) {
    console.log('✅ Ses tanıma sonuçları:', e.value);
    if (e.value && e.value.length > 0) {
      const transcript = e.value[0];
      this.onResultCallback?.(transcript);
    }
  }

  onSpeechPartialResults(e) {
    console.log('📝 Kısmi sonuçlar:', e.value);
    if (e.value && e.value.length > 0 && this.onPartialResultCallback) {
      this.onPartialResultCallback(e.value[0]);
    }
  }

  onSpeechError(e) {
    console.error('❌ Ses tanıma hatası:', e.error);
    this.onErrorCallback?.(e.error?.message || 'Ses tanıma hatası');
  }

  /**
   * Ses tanıma iznini kontrol et ve iste
   */
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Mikrofon İzni',
            message: 'Sesli arama kullanmak için mikrofon iznine ihtiyacımız var.',
            buttonNeutral: 'Daha Sonra Sor',
            buttonNegative: 'İptal',
            buttonPositive: 'Tamam',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Mikrofon izni verildi');
          return true;
        } else {
          console.warn('⚠️ Mikrofon izni reddedildi');
          // İzin reddedildi - hata callback'i çağrılacak
          // Alert gösterimi kullanıldığı component'te yapılacak
          return false;
        }
      }
      
      // iOS için izin otomatik olarak istenir
      return true;
    } catch (error) {
      console.error('❌ İzin hatası:', error);
      return false;
    }
  }

  /**
   * Ses tanıma özelliğinin desteklenip desteklenmediğini kontrol et
   */
  async isAvailable() {
    try {
      // Voice modülü yüklenmemişse false döndür
      if (!this.isVoiceAvailable || !Voice) {
        console.warn('⚠️ Voice modülü kullanılamıyor');
        return false;
      }

      // Voice.isAvailable metodunu kontrol et
      if (typeof Voice.isAvailable !== 'function') {
        console.warn('⚠️ Voice.isAvailable metodu bulunamadı');
        return false;
      }

      const available = await Voice.isAvailable();
      return available === 1 || available === true;
    } catch (error) {
      console.error('❌ Ses tanıma kullanılabilirlik kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * Desteklenen dilleri getir
   */
  async getSupportedLocales() {
    try {
      if (!Voice) {
        return ['tr-TR', 'en-US']; // Fallback
      }
      const locales = await Voice.getSupportedLocales();
      return locales;
    } catch (error) {
      console.error('❌ Dil listesi alınamadı:', error);
      return ['tr-TR', 'en-US']; // Fallback
    }
  }

  /**
   * Sesli aramayı başlat
   * @param {Object} options - Ses tanıma seçenekleri
   * @param {Function} onResult - Sonuç callback fonksiyonu
   * @param {Function} onError - Hata callback fonksiyonu
   */
  async startListening(options = {}, onResult, onError) {
    try {
      // Voice modülü kontrolü
      if (!this.isVoiceAvailable || !Voice) {
        console.warn('⚠️ Ses tanıma özelliği kullanılamıyor');
        onError?.('Desteklenmiyor');
        return false;
      }

      // İzin kontrolü
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        onError?.('İzin verilmedi');
        return false;
      }

      // Kullanılabilirlik kontrolü
      const available = await this.isAvailable();
      if (!available) {
        console.warn('⚠️ Ses tanıma cihazda desteklenmiyor');
        onError?.('Desteklenmiyor');
        return false;
      }

      // Callback'leri kaydet
      this.onResultCallback = onResult;
      this.onErrorCallback = onError;
      this.onPartialResultCallback = options.onPartialResult;

      // Ses tanımayı başlat
      this.isListening = true;
      
      const locale = options.lang || 'tr-TR';
      await Voice.start(locale);
      console.log('🎤 Ses tanıma başlatıldı:', locale);

      // Otomatik durdurma (10 saniye)
      this.recognitionTimeout = setTimeout(() => {
        if (this.isListening) {
          console.log('⏱️ Ses tanıma zaman aşımı');
          this.stopListening();
          onError?.('Zaman aşımı');
        }
      }, 10000);

      return true;
    } catch (error) {
      console.error('❌ Ses tanıma başlatma hatası:', error);
      this.isListening = false;
      onError?.(error.message);
      return false;
    }
  }

  /**
   * Sesli aramayı durdur
   */
  async stopListening() {
    try {
      if (this.isListening && Voice) {
        await Voice.stop();
        this.isListening = false;
        
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout);
          this.recognitionTimeout = null;
        }
        
        // Callback'leri temizle
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onPartialResultCallback = null;
        
        console.log('🛑 Ses tanıma durduruldu');
      }
    } catch (error) {
      console.error('❌ Ses tanıma durdurma hatası:', error);
    }
  }

  /**
   * Ses tanıma servisini temizle
   */
  async destroy() {
    try {
      if (Voice) {
        await Voice.destroy();
        Voice.removeAllListeners();
      }
    } catch (error) {
      console.error('❌ Ses tanıma temizleme hatası:', error);
    }
  }

  /**
   * Ses tanıma durumunu getir
   */
  getIsListening() {
    return this.isListening;
  }

  /**
   * Ses tanıma ayarlarını yapılandır
   */
  async configure(options = {}) {
    try {
      // Gelecekte ek yapılandırma seçenekleri eklenebilir
      console.log('⚙️ Ses tanıma yapılandırıldı:', options);
      return true;
    } catch (error) {
      console.error('❌ Yapılandırma hatası:', error);
      return false;
    }
  }
}

// Singleton instance
const voiceRecognitionService = new VoiceRecognitionService();

export default voiceRecognitionService;
