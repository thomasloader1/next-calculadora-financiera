import type { PrimeReactPTOptions } from 'primereact/api';

export const cdsPT: PrimeReactPTOptions = {
  button: {
    root: {
      className:
        'inline-flex items-center justify-center font-semibold rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    },
    label: { className: 'font-inherit' },
    loadingIcon: { className: 'animate-spin h-4 w-4' },
  },

  inputtext: {
    root: {
      className:
        'bg-surface border border-rule rounded-input px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150',
    },
  },

  dialog: {
    root: {
      className:
        'bg-surface border border-rule rounded-card shadow-2xl max-w-md w-full mx-4',
    },
    header: {
      className:
        'flex items-center justify-between px-5 py-4 border-b border-rule',
    },
    headerTitle: {
      className: 'text-sm font-semibold text-ink',
    },
    headerIcons: { className: 'flex items-center gap-1' },
    closeButton: {
      className:
        'w-7 h-7 flex items-center justify-center rounded-full hover:bg-paper-2 text-muted hover:text-ink transition-colors',
    },
    content: { className: 'p-5' },
    mask: {
      className:
        'fixed inset-0 bg-ink/40 backdrop-blur-sm z-[100]',
    },
  },

  dropdown: {
    root: {
      className:
        'bg-surface border border-rule rounded-input px-3 py-2.5 text-sm focus:border-accent focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150 cursor-pointer',
    },
    input: { className: 'cursor-pointer' },
    panel: {
      className:
        'bg-surface border border-rule rounded-input shadow-lg mt-1 z-50',
    },
    item: {
      className:
        'px-3 py-2 text-sm cursor-pointer hover:bg-paper-2',
    },
    wrapper: { className: 'flex items-center gap-2' },
  },

  tag: {
    root: {
      className:
        'inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold text-xs tabular-nums',
    },
  },

  inputswitch: {
    root: (options) => ({
      className: `relative inline-flex items-center h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer ${options?.props?.checked ? 'bg-accent' : 'bg-rule'}`,
    }),
    input: {
      className:
        'absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10',
    },
    slider: (options) => ({
      className: `pointer-events-none inline-block h-4 w-4 rounded-full bg-surface shadow-sm transform transition-transform duration-200 ${options?.props?.checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`,
    }),
  },

  tooltip: {
    root: {
      className:
        'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-ink text-surface text-xs leading-relaxed rounded-input shadow-xl pointer-events-none',
    },
    arrow: {
      className:
        'absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-ink',
    },
  },

  inputmask: {
    root: {
      className:
        'bg-surface border border-rule rounded-input px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150 w-full',
    },
  },

  inputtextarea: {
    root: {
      className:
        'bg-surface border border-rule rounded-input px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150 resize-none min-h-[80px]',
    },
  },



  datatable: {
    root: {
      className:
        'bg-surface border border-rule rounded-card overflow-hidden',
    },
    header: {
      className:
        'bg-paper-2 border-b border-rule px-4 py-3',
    },
    bodyRow: {
      className:
        'border-b border-rule last:border-b-0 hover:bg-paper-2/50 transition-colors',
    },
    emptyMessage: {
      className:
        'text-muted text-sm text-center py-8',
    },
    footer: {
      className:
        'bg-paper-2 border-t border-rule px-4 py-2',
    },
    wrapper: {
      className: 'relative overflow-auto',
    },
    table: {
      className: 'w-full border-collapse',
    },
  },

  column: {
    headerCell: {
      className:
        'text-xs font-semibold text-muted px-4 py-2.5 select-none',
    },
    bodyCell: {
      className: 'px-4 py-3 text-sm text-ink',
    },
    sortIcon: {
      className: 'ml-2 text-muted',
    },
    sortBadge: {
      className:
        'ml-2 bg-accent text-accent-ink text-[10px] rounded-full w-5 h-5 flex items-center justify-center',
    },
  },

  paginator: {
    root: {
      className:
        'flex items-center justify-between px-4 py-2.5 bg-paper-2 border-t border-rule text-sm',
    },
    pages: {
      className: 'flex items-center gap-1',
    },
    pageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-input text-sm text-ink hover:bg-surface transition-colors',
    },
    firstPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-input text-muted hover:text-ink hover:bg-surface transition-colors',
    },
    prevPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-input text-muted hover:text-ink hover:bg-surface transition-colors',
    },
    nextPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-input text-muted hover:text-ink hover:bg-surface transition-colors',
    },
    lastPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-input text-muted hover:text-ink hover:bg-surface transition-colors',
    },
    left: {
      className: 'flex items-center gap-2',
    },
    end: {
      className: 'flex items-center gap-2 text-muted',
    },
  },
};
