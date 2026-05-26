// Declarações de módulos para assets estáticos
// Permite importar PNGs diretamente em arquivos TypeScript/TSX
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}
