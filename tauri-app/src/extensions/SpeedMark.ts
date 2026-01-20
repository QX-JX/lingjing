import { Mark, mergeAttributes } from '@tiptap/core';

export interface SpeedMarkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    speedMark: {
      /**
       * 设置速度标记
       */
      setSpeedMark: (attributes: { rate: number }) => ReturnType;
      /**
       * 切换速度标记
       */
      toggleSpeedMark: (attributes: { rate: number }) => ReturnType;
      /**
       * 取消速度标记
       */
      unsetSpeedMark: () => ReturnType;
    };
  }
}

export const SpeedMark = Mark.create<SpeedMarkOptions>({
  name: 'speedMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      rate: {
        default: 1.0,
        parseHTML: (element) => {
          const rate = element.getAttribute('data-speed');
          return rate ? parseFloat(rate) : 1.0;
        },
        renderHTML: (attributes) => {
          if (!attributes.rate || attributes.rate === 1.0) {
            return {};
          }
          return {
            'data-speed': attributes.rate.toString(),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-speed]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const rate = element.getAttribute('data-speed');
          return rate ? { rate: parseFloat(rate) } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'speed-marker border-b-2 border-dashed border-yellow-400 px-1 relative',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSpeedMark:
        (attributes) =>
          ({ commands }) => {
            return commands.setMark(this.name, attributes);
          },
      toggleSpeedMark:
        (attributes) =>
          ({ commands }) => {
            return commands.toggleMark(this.name, attributes);
          },
      unsetSpeedMark:
        () =>
          ({ commands }) => {
            return commands.unsetMark(this.name);
          },
    };
  },
});
