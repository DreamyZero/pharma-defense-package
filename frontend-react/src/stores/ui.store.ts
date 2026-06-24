import { makeAutoObservable } from 'mobx';

const STORAGE_KEY = 'pharma_mobile_preview';

function applyMobilePreviewClass(enabled: boolean) {
  document.documentElement.classList.toggle('mobile-preview', enabled);
}

class UiStore {
  mobilePreview = false;

  constructor() {
    makeAutoObservable(this);
    const saved = sessionStorage.getItem(STORAGE_KEY) === '1';
    this.mobilePreview = saved;
    if (saved) applyMobilePreviewClass(true);
  }

  enableMobilePreview() {
    this.mobilePreview = true;
    sessionStorage.setItem(STORAGE_KEY, '1');
    applyMobilePreviewClass(true);
  }

  disableMobilePreview() {
    this.mobilePreview = false;
    sessionStorage.removeItem(STORAGE_KEY);
    applyMobilePreviewClass(false);
  }
}

export const uiStore = new UiStore();
