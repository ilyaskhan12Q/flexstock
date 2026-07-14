import { create } from 'zustand';
import { useLanguageStore } from './languageStore';

const speak = (text, lang) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for clear understanding
    if (lang === 'ur') {
      utterance.lang = 'ur-PK';
    } else {
      utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
  }
};

export const useFeedbackStore = create((set, get) => ({
  open: false,
  isSuccess: true,
  title: '',
  message: '',
  voiceEnabled: localStorage.getItem('voiceEnabled') !== 'false', // Default to true

  toggleVoice: () => {
    const nextState = !get().voiceEnabled;
    localStorage.setItem('voiceEnabled', String(nextState));
    set({ voiceEnabled: nextState });
    if (nextState) {
      const lang = useLanguageStore.getState().language;
      const msg = lang === 'ur' ? 'آواز کی مدد فعال ہو گئی ہے' : 'Voice assistance enabled';
      speak(msg, lang);
    } else {
      // Cancel speech immediately if turned off
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  },

  showSuccess: (title, message) => {
    set({ open: true, isSuccess: true, title, message });
    if (get().voiceEnabled) {
      const lang = useLanguageStore.getState().language;
      speak(`${title}. ${message}`, lang);
    }
  },

  showError: (title, message) => {
    set({ open: true, isSuccess: false, title, message });
    if (get().voiceEnabled) {
      const lang = useLanguageStore.getState().language;
      const errorPrefix = lang === 'ur' ? 'خرابی۔ ' : 'Error. ';
      speak(`${errorPrefix}${title}. ${message}`, lang);
    }
  },

  close: () => set({ open: false })
}));

