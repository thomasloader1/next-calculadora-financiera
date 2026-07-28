import type { PrimeReactPTOptions } from 'primereact/api';

export const cdsPT: PrimeReactPTOptions = {
  button: {
    root: {
      className:
        'inline-flex items-center justify-center font-semibold rounded-cds-pill transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cds-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    },
    label: { className: 'font-inherit' },
    loadingIcon: { className: 'animate-spin h-4 w-4' },
  },

  inputtext: {
    root: {
      className:
        'bg-cds-canvas dark:bg-cds-dark border border-cds-border rounded-cds-sm px-3 py-2.5 text-sm text-cds-foreground dark:text-white placeholder:text-cds-muted focus:border-cds-primary focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150',
    },
  },

  dialog: {
    root: {
      className:
        'bg-cds-canvas dark:bg-cds-dark border border-cds-border rounded-cds-lg shadow-2xl max-w-md w-full mx-4',
    },
    header: {
      className:
        'flex items-center justify-between px-5 py-4 border-b border-cds-border',
    },
    headerTitle: {
      className: 'text-sm font-semibold text-cds-foreground dark:text-white',
    },
    headerIcons: { className: 'flex items-center gap-1' },
    closeButton: {
      className:
        'w-7 h-7 flex items-center justify-center rounded-cds-full hover:bg-cds-surface dark:hover:bg-cds-surface-dark text-cds-muted hover:text-cds-foreground transition-colors',
    },
    content: { className: 'p-5' },
    mask: {
      className:
        'fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]',
    },
  },

  dropdown: {
    root: {
      className:
        'bg-cds-canvas dark:bg-cds-dark border border-cds-border rounded-cds-sm px-3 py-2.5 text-sm focus:border-cds-primary focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150 cursor-pointer',
    },
    input: { className: 'cursor-pointer' },
    panel: {
      className:
        'bg-cds-canvas dark:bg-cds-dark border border-cds-border rounded-cds-sm shadow-lg mt-1',
    },
    item: {
      className:
        'px-3 py-2 text-sm cursor-pointer hover:bg-cds-surface dark:hover:bg-cds-surface-dark',
    },
    wrapper: { className: 'flex items-center gap-2' },
  },

  tag: {
    root: {
      className:
        'inline-flex items-center gap-1 rounded-cds-pill px-3 py-1 font-semibold text-xs tabular-nums',
    },
  },

  inputswitch: {
    root: {
      className:
        'relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cds-primary focus-visible:ring-offset-2 cursor-pointer',
    },
    slider: {
      className:
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200',
    },
  },

  tooltip: {
    root: {
      className:
        'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-cds-dark text-cds-canvas text-xs leading-relaxed rounded-cds-md shadow-xl pointer-events-none',
    },
    arrow: {
      className:
        'absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-cds-dark',
    },
  },

  inputtextarea: {
    root: {
      className:
        'bg-cds-canvas dark:bg-cds-dark border border-cds-border rounded-cds-sm px-3 py-2.5 text-sm text-cds-foreground dark:text-white placeholder:text-cds-muted focus:border-cds-primary focus:shadow-[0_0_0_2px_rgba(0,82,255,0.15)] outline-none transition-colors duration-150 resize-none min-h-[80px]',
    },
  },

  datatable: {
    root: {
      className:
        'bg-cds-canvas dark:bg-cds-dark border border-cds-border rounded-cds-lg overflow-hidden',
    },
    header: {
      className:
        'bg-cds-surface dark:bg-cds-surface-dark border-b border-cds-border px-4 py-3',
    },
    bodyRow: {
      className:
        'border-b border-cds-border last:border-b-0 hover:bg-cds-surface/50 dark:hover:bg-cds-surface-dark/50 transition-colors',
    },
    emptyMessage: {
      className:
        'text-cds-muted text-sm text-center py-8',
    },
    footer: {
      className:
        'bg-cds-surface dark:bg-cds-surface-dark border-t border-cds-border px-4 py-2',
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
        'text-xs font-semibold text-cds-muted uppercase tracking-wider px-4 py-2.5 select-none',
    },
    bodyCell: {
      className: 'px-4 py-3 text-sm text-cds-foreground',
    },
    sortIcon: {
      className: 'ml-2 text-cds-muted',
    },
    sortBadge: {
      className:
        'ml-2 bg-cds-primary text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center',
    },
  },

  paginator: {
    root: {
      className:
        'flex items-center justify-between px-4 py-2.5 bg-cds-surface dark:bg-cds-surface-dark border-t border-cds-border text-sm',
    },
    pages: {
      className: 'flex items-center gap-1',
    },
    pageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-cds-sm text-sm text-cds-foreground hover:bg-cds-canvas dark:hover:bg-cds-dark transition-colors',
    },
    firstPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-cds-sm text-cds-muted hover:text-cds-foreground hover:bg-cds-canvas dark:hover:bg-cds-dark transition-colors',
    },
    prevPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-cds-sm text-cds-muted hover:text-cds-foreground hover:bg-cds-canvas dark:hover:bg-cds-dark transition-colors',
    },
    nextPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-cds-sm text-cds-muted hover:text-cds-foreground hover:bg-cds-canvas dark:hover:bg-cds-dark transition-colors',
    },
    lastPageButton: {
      className:
        'w-8 h-8 flex items-center justify-center rounded-cds-sm text-cds-muted hover:text-cds-foreground hover:bg-cds-canvas dark:hover:bg-cds-dark transition-colors',
    },
    left: {
      className: 'flex items-center gap-2',
    },
    end: {
      className: 'flex items-center gap-2 text-cds-muted',
    },
  },
};
