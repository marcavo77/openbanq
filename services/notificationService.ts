// Open Banque - WhatsApp-style Chat Notification Service

export interface IncomingToastData {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  onOpen: () => void;
}

type ToastListener = (data: IncomingToastData) => void;

class NotificationService {
  private audioContext: AudioContext | null = null;
  private isAudioUnlocked = false;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private originalDocumentTitle: string = typeof document !== 'undefined' ? document.title : 'Open Banque';
  private titleFlashInterval: any = null;
  private isFlashingTitle = false;
  private toastListeners: Set<ToastListener> = new Set();
  private isInitialized = false;

  // Preferences Keys
  private SOUND_KEY = 'openbanque_chat_sound_enabled';
  private PUSH_KEY = 'openbanque_chat_push_enabled';

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Cache original title
    this.originalDocumentTitle = document.title || 'Open Banque';

    // Register Service Worker for mobile/background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          this.swRegistration = reg;
          console.log('✅ Notification Service Worker registered');
        })
        .catch((err) => {
          console.warn('⚠️ Service Worker registration skipped:', err);
        });

      // Listen for notification click message from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'OPEN_CHAT_WITH_USER') {
          window.dispatchEvent(
            new CustomEvent('openbanque:open-chat', {
              detail: { userId: event.data.userId }
            })
          );
        }
      });
    }

    // Auto-unlock Web Audio on first user interaction
    const unlockAudio = () => {
      this.ensureAudioContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.isAudioUnlocked = true;
        });
      } else {
        this.isAudioUnlocked = true;
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('click', unlockAudio, { once: true, passive: true });

    // Stop flashing title when user returns to the tab
    const stopFlashing = () => {
      if (this.isFlashingTitle && document.hasFocus() && !document.hidden) {
        this.stopFlashingTitle();
      }
    };

    window.addEventListener('focus', stopFlashing);
    document.addEventListener('visibilitychange', stopFlashing);
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    return this.audioContext;
  }

  // --- SOUND MANAGEMENT (WhatsApp Chime Synthesizer) ---

  public isSoundEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(this.SOUND_KEY);
    return val === null ? true : val === 'true';
  }

  public setSoundEnabled(enabled: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SOUND_KEY, enabled ? 'true' : 'false');
  }

  /**
   * Plays the iconic WhatsApp incoming message chime:
   * Two harmonious sine waves with exponential decay and slight harmonic overtone.
   * Note 1: 587.33 Hz (D5) -> Note 2: 880 Hz (A5).
   */
  public playIncomingMessageSound() {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Master Gain for pleasant volume
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.28, now);
      masterGain.connect(ctx.destination);

      // --- First Note: D5 (587.33 Hz) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(700, now + 0.08);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.8, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // --- Second Note: A5 (880 Hz) (The crisp bright ping) ---
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.35);

      gain2.gain.setValueAtTime(0.001, now + 0.08);
      gain2.gain.linearRampToValueAtTime(1.0, now + 0.095);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.42);

      // --- Soft overtone for warmth (harmonic shimmer) ---
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1760, now + 0.08);

      gain3.gain.setValueAtTime(0.001, now + 0.08);
      gain3.gain.linearRampToValueAtTime(0.18, now + 0.095);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.08);
      osc3.stop(now + 0.3);
    } catch (e) {
      console.warn('⚠️ Web Audio playback failed:', e);
    }
  }

  // --- WEB PUSH NOTIFICATION MANAGEMENT ---

  public isPushSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isPushSupported()) return 'unsupported';
    return Notification.permission;
  }

  public isPushEnabled(): boolean {
    if (!this.isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    const val = localStorage.getItem(this.PUSH_KEY);
    return val === null ? true : val === 'true';
  }

  public setPushEnabled(enabled: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.PUSH_KEY, enabled ? 'true' : 'false');
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isPushSupported()) return false;

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        this.setPushEnabled(true);
        // Play a test chime to confirm
        this.playIncomingMessageSound();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }

  public showPushNotification({
    title,
    body,
    icon = '/apple-touch-icon.svg',
    tag = 'openbanque-chat',
    userId,
    onClick
  }: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    userId?: string;
    onClick?: () => void;
  }) {
    if (!this.isPushEnabled() || Notification.permission !== 'granted') return;

    try {
      // 1. Try via Service Worker Registration (works even in background)
      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        this.swRegistration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag,
          renotify: true,
          data: { userId, url: window.location.href }
        } as any);
        return;
      }

      // 2. Fallback to standard Notification constructor
      const notification = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag,
        renotify: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onClick) onClick();
      };
    } catch (e) {
      console.warn('⚠️ Push notification trigger failed:', e);
    }
  }

  // --- TAB TITLE FLASHING (WhatsApp Web Style) ---

  public startFlashingTitle(senderName: string, messageText: string) {
    if (typeof document === 'undefined') return;
    if (document.hasFocus() && !document.hidden) return; // Don't flash if user is already looking

    if (!this.isFlashingTitle) {
      this.originalDocumentTitle = document.title || 'Open Banque';
    }

    this.stopFlashingTitle();
    this.isFlashingTitle = true;

    const truncated = messageText.length > 25 ? messageText.substring(0, 22) + '...' : messageText;
    const alertTitle = `(1) 💬 ${senderName}: ${truncated}`;
    let isAlert = true;

    document.title = alertTitle;

    this.titleFlashInterval = setInterval(() => {
      document.title = isAlert ? alertTitle : `🔔 Nouveau message - Open Banque`;
      isAlert = !isAlert;
    }, 1200);
  }

  public stopFlashingTitle() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
    }
    this.isFlashingTitle = false;
    if (typeof document !== 'undefined' && this.originalDocumentTitle) {
      document.title = this.originalDocumentTitle;
    }
  }

  // --- IN-APP TOAST NOTIFICATION EMITTER ---

  public onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  public emitToast(toastData: IncomingToastData) {
    this.toastListeners.forEach((listener) => {
      try {
        listener(toastData);
      } catch (e) {
        console.error('Toast listener error:', e);
      }
    });
  }

  // --- MASTER NOTIFICATION DISPATCHER ---

  /**
   * Dispatches the full WhatsApp-style notification suite:
   * 1. Audio chime (Web Audio)
   * 2. Browser Push notification (Native OS)
   * 3. In-App Toast notification
   * 4. Tab title blinking (if window is not focused)
   */
  public notifyIncomingMessage({
    id,
    senderId,
    senderName,
    senderAvatar,
    content,
    isCurrentChatActive,
    onOpenChat
  }: {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    isCurrentChatActive: boolean;
    onOpenChat: () => void;
  }) {
    const isTabActiveAndVisible = typeof document !== 'undefined' && document.hasFocus() && !document.hidden;

    // If user is actively reading this exact conversation with window focused, don't disturb with popups
    if (isCurrentChatActive && isTabActiveAndVisible) {
      // Soft audio or quiet pass
      this.playIncomingMessageSound();
      return;
    }

    // 1. Play WhatsApp chime
    this.playIncomingMessageSound();

    // 2. Trigger OS Desktop push notification
    this.showPushNotification({
      title: senderName,
      body: content,
      tag: `chat-msg-${senderId}`,
      userId: senderId,
      onClick: onOpenChat
    });

    // 3. Flash browser tab title if not focused
    if (!isTabActiveAndVisible) {
      this.startFlashingTitle(senderName, content);
    }

    // 4. Emit in-app floating toast banner
    this.emitToast({
      id,
      senderId,
      senderName,
      senderAvatar,
      content,
      timestamp: new Date().toISOString(),
      onOpen: onOpenChat
    });
  }
}

export const notificationService = new NotificationService();
