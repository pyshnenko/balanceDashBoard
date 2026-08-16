import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    status: {
      up: string;
      down: string;
    };
  }
  interface PaletteOptions {
    status?: {
      up?: string;
      down?: string;
    };
  }
}
