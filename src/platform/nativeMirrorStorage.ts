import { mirrorStorageRemoveItem, mirrorStorageSetItem } from '../capacitor/nativeStorage.ts'

export function mirrorStorageWrite(key: string, value: string): void {
  mirrorStorageSetItem(key, value)
}

export function mirrorStorageDelete(key: string): void {
  mirrorStorageRemoveItem(key)
}
