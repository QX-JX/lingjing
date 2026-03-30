declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'pinyin-pro' {
  export function pinyin(
    text: string,
    options?: {
      pattern?: string
      toneType?: string
      type?: string
      multiple?: boolean
    }
  ): string[] | string
}
