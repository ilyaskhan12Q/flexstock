import { create } from 'zustand';

const speak = (text) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for clear understanding
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
      speak('Voice assistance enabled');
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
      speak(`${title}. ${message}`);
    }
  },

  showError: (title, message) => {
    set({ open: true, isSuccess: false, title, message });
    if (get().voiceEnabled) {
      speak(`Error. ${title}. ${message}`);
    }
  },

  close: () => set({ open: false })
}));
